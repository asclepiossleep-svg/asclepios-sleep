#!/usr/bin/env python3
"""Cut the owner-supplied Manus A02 Cantonese narration into the project's per-segment WAVs (#142, 2026-11-06).

The corrected Manus narration (generate_speech, yue-HK, voice Callirrhoe) is ONE continuous WAV (191.08 s, 24 kHz mono, sha256 c13d1d9a...).
build.py expects one WAV per spoken segment, so this cuts it at the pauses recorded in
evidence/a02_yue_manus_split.json. That file holds the cut points and each output's sha256. The
cut points were found by matching silence gaps to the script's character counts, then checked
by speech recognition on every segment. Two cuts were moved after that check:
17 | P04 at 134.56/135.02 s and P04 | 18 at 140.04/140.43 s.
No re-voicing, no level change. The file is cut only, with a small margin so no syllable is clipped.

    python3 presenter_yue_manus_split.py <manus.wav> <out_dir> [split.json]
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC_SHA = "c13d1d9ab25fd416b0b3e37887b7a776bb6ef72de3de3916cb8347f2336355bf"


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    split = Path(sys.argv[3]) if len(sys.argv) > 3 else HERE / "evidence" / "a02_yue_manus_split.json"
    sha = hashlib.sha256(src.read_bytes()).hexdigest()
    if sha != SRC_SHA:
        raise SystemExit(f"STOP: {src} sha256 {sha} is not the approved corrected narration {SRC_SHA}")
    out.mkdir(parents=True, exist_ok=True)
    bad = []
    for s in json.loads(split.read_text(encoding="utf-8"))["segments"]:
        st, en = s["cut"]
        wav = out / f"{s['tag']}.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-ss", f"{st:.3f}", "-to", f"{en:.3f}",
                        "-c:a", "pcm_s16le", str(wav)], check=True)
        if hashlib.sha256(wav.read_bytes()).hexdigest() != s["sha256"]:
            bad.append(wav.name)
        print(s["shot"], s["tag"], st, en)
    if bad:
        raise SystemExit("checksum differs (ffmpeg version?): " + ", ".join(bad))


if __name__ == "__main__":
    main()
