#!/usr/bin/env python3
"""Claire Lee — natural Cantonese dry-voice test with CosyVoice-300M-SFT.

Licences (verified 2026-11-04, see PRESENTER_LICENCE_REVIEW.md):
  CosyVoice code Apache-2.0 (FunAudioLLM/CosyVoice LICENSE);
  CosyVoice-300M-SFT weights apache-2.0 (Hugging Face model card metadata);
  built-in SFT speaker '粤语女' (no voice cloning of any person).

Run inside the CosyVoice venv (Python 3.11):
  COSYVOICE_REPO=... COSYVOICE_MODEL=... python presenter_yue_cosyvoice.py <out_dir>
"""
import json
import os
import sys
import time
from pathlib import Path

repo = Path(os.environ["COSYVOICE_REPO"])
sys.path[:0] = [str(repo), str(repo / "third_party" / "Matcha-TTS")]

import torch  # noqa: E402
import torchaudio  # noqa: E402
from cosyvoice.cli.cosyvoice import CosyVoice  # noqa: E402

TEXTS = {
    # owner-approved trial wording (title = 健康科普主持人)
    "A_caps": "大家好，我係 Claire Lee，大家嘅健康科普主持人。歡迎嚟到 ASCLEPIOS HEALTH！"
              "今次想同大家分享，點解講抗衰老，除咗食啲乜，幾時食都咁值得留意。",
    # same text, brand written in title case (caps can be read letter by letter)
    "B_titlecase": "大家好，我係 Claire Lee，大家嘅健康科普主持人。歡迎嚟到 Asclepios Health！"
                   "今次想同大家分享，點解講抗衰老，除咗食啲乜，幾時食都咁值得留意。",
}
SPEAKER = "粤语女"


def main(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 4)
    t0 = time.time()
    cv = CosyVoice(os.environ["COSYVOICE_MODEL"], load_jit=False, fp16=False)
    load_s = time.time() - t0
    spks = cv.list_available_spks()
    print("speakers:", spks)
    if SPEAKER not in spks:
        raise SystemExit(f"STOP: built-in speaker {SPEAKER} not in model: {spks}")
    report = {"engine": "CosyVoice-300M-SFT", "speaker": SPEAKER, "speakers_available": spks,
              "model_load_s": round(load_s, 1), "device": "cpu", "speed": 1.0, "clips": []}
    for tag, text in TEXTS.items():
        t1 = time.time()
        chunks = [c["tts_speech"] for c in cv.inference_sft(text, SPEAKER, stream=False, speed=1.0)]
        wav = torch.cat(chunks, dim=1)
        path = out / f"claire_yue_cosyvoice_{tag}_dry.wav"
        torchaudio.save(str(path), wav, cv.sample_rate)
        report["clips"].append({"file": path.name, "text": text, "sample_rate": cv.sample_rate,
                                "duration_s": round(wav.shape[1] / cv.sample_rate, 2),
                                "render_s": round(time.time() - t1, 1)})
    (out / "yue_voice_settings.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
