#!/usr/bin/env python3
"""Claire Lee — English presenter lines for the A02 film (owner spec, issue #142).

Same voice as the film narration (Kokoro bf_emma, speed 0.95, en-GB, default
G2P = the pronunciation used in the owner-reviewed film preview).
Title wording uses the owner's later positioning ("health-education presenter")
in place of the earlier spec phrase; swap TITLE below if the owner prefers.

    KOKORO_MODEL_DIR=... python3 presenter_en_lines.py <out_dir>
"""
import json
import os
import sys
from pathlib import Path

TITLE = "your health-education presenter"   # spec original: "your guide to healthy ageing and cellular maintenance"
LINES = {
    # on camera after 01; the next sentence continues as voice-over on still 02 (02's own narration is not re-read)
    "open_cam": f"Hello, I'm Claire Lee, {TITLE}. Welcome to ASCLEPIOS HEALTH.",
    "open_vo": "Today, let's explore why healthy ageing involves considering not only what we take, "
               "but when we take it.",
    # P02: after 05, before 06 (first sentence of A02 shot 06)
    "p02_cam": "So, is taking a supplement enough?",
    # P03: opening of 12 (first sentence of A02 shot 12)
    "p03_cam": "But cellular activity also follows a timetable.",
    # P04: opening of 18 (first sentence of A02 shot 18)
    "p04_cam": "This is the ASCLEPIOS HEALTH approach: a whole-system perspective, respect for biological "
               "rhythms, and practical application.",
    # ending after 19, before 20
    "end_cam": "That's all for today. We'll be sharing more videos, exploring cells, how the body works, and "
               f"everyday life, to help you understand what healthy ageing really means. I'm Claire Lee, {TITLE}. "
               "See you next time. Bye for now!",
}


def main(out: Path):
    import soundfile as sf
    from kokoro_onnx import Kokoro
    md = Path(os.environ["KOKORO_MODEL_DIR"])
    k = Kokoro(str(md / "kokoro-v1.0.onnx"), str(md / "voices-v1.0.bin"))
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for tag, text in LINES.items():
        s, sr = k.create(text, voice="bf_emma", speed=0.95, lang="en-gb")
        sf.write(out / f"{tag}.wav", s, sr)
        meta[tag] = {"text": text, "duration_s": round(len(s) / sr, 2), "voice": "bf_emma", "speed": 0.95,
                     "phonemes": k.tokenizer.phonemize(text, "en-gb")}
    (out / "en_lines.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    for t, m in meta.items():
        print(t, m["duration_s"], "s")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
