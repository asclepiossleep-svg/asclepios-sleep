#!/usr/bin/env python3
"""Dry (no music) presenter voice tests for Claire Lee — ASCLEPIOS-VIDEO-001.

Writes WAV + SRT + settings JSON per variant. Free/local only:
  EN : Kokoro-82M (Apache-2.0 weights) via kokoro-onnx (MIT), voice bf_emma
  YUE: espeak-ng (GPL-3.0 software; generated audio is unrestricted) — a
       pronunciation reference only, NOT a natural voice.

    KOKORO_MODEL_DIR=... python3 presenter_voice_test.py <out_dir>
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402  (reuses caption splitting + SRT writer)

EN_TEXT = ("Hello, I'm Claire Lee, your health-education presenter. Welcome to ASCLEPIOS HEALTH. "
           "Today, let's explore why healthy ageing involves considering not only what we take, "
           "but when we take it.")
YUE_TEXT = ("大家好，我係 Claire Lee，大家嘅健康科普主持人。歡迎嚟到 ASCLEPIOS HEALTH！"
            "今次想同大家分享，點解講抗衰老，除咗食啲乜，幾時食都咁值得留意。")
ASCLEPIOS_G2P = "ɐsklˈɛpɪˌəʊz"      # Kokoro/espeak default ("as-KLEP-ee-ohz")
ASCLEPIOS_ALT = "æsklˈiːpiɒs"        # override ("as-KLEE-pee-oss")


def srt_for(wav: Path, text: str, cjk: bool) -> Path:
    d = build.duration(wav)
    lead = 0.05
    cues = build.split_cues(text, lead, d - 0.05, 22 if cjk else 76, cjk=cjk)
    out = wav.with_suffix("")
    build.write_captions(cues, out, "Inter SemiBold", None if cjk else 38, 72)
    return out.with_suffix(".srt")


def main(out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    import soundfile as sf
    from kokoro_onnx import Kokoro
    md = Path(os.environ.get("KOKORO_MODEL_DIR", Path(__file__).resolve().parent / "models"))
    k = Kokoro(str(md / "kokoro-v1.0.onnx"), str(md / "voices-v1.0.bin"))
    report = []
    ph = k.tokenizer.phonemize(EN_TEXT, "en-gb")
    for tag, phon in [("A_default", ph), ("B_asKLEEpeeoss", ph.replace(ASCLEPIOS_G2P, ASCLEPIOS_ALT))]:
        t0 = time.time()
        samples, sr = k.create(phon, voice="bf_emma", speed=0.95, lang="en-gb", is_phonemes=True)
        wav = out_dir / f"claire_en_{tag}_dry.wav"
        sf.write(wav, samples, sr)
        srt = srt_for(wav, EN_TEXT, cjk=False)
        report.append({"file": wav.name, "srt": srt.name, "language": "en-GB", "engine": "Kokoro-82M v1.0 (onnx)",
                       "voice_id": "bf_emma", "speed": 0.95, "phonemes": phon,
                       "duration_s": round(len(samples) / sr, 2), "render_s": round(time.time() - t0, 1),
                       "text": EN_TEXT})
    # Cantonese reference via espeak-ng (female variant f3), pronunciation check only
    t0 = time.time()
    wav = out_dir / "claire_yue_espeak_REFERENCE_dry.wav"
    subprocess.run(["espeak-ng", "-v", "yue+f3", "-s", "150", "-w", str(wav), YUE_TEXT], check=True)
    srt = srt_for(wav, YUE_TEXT, cjk=True)
    report.append({"file": wav.name, "srt": srt.name, "language": "yue (Hong Kong Cantonese)",
                   "engine": f"espeak-ng {subprocess.run(['espeak-ng', '--version'], capture_output=True, text=True).stdout.split()[3]}",
                   "voice_id": "yue+f3", "speed_wpm": 150, "duration_s": round(build.duration(wav), 2),
                   "render_s": round(time.time() - t0, 1), "text": YUE_TEXT,
                   "note": "formant synthesiser: pronunciation reference only, not a natural voice"})
    (out_dir / "voice_test_settings.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
