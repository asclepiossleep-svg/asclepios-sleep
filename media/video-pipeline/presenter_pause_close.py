#!/usr/bin/env python3
"""Close Claire's mouth naturally in speech pauses (post-process, no re-inference).

MuseTalk tends to leave the lips slightly parted through short pauses. In every
silence of >= 0.2 s (and before the first word / after the last), the lower face
is cross-faded (80 ms ramps) back to the source still's closed, smiling lips,
warped with the exact same per-frame sway used by presenter_lipsync_musetalk.py.

    python3 presenter_pause_close.py <raw.mp4> <still.png> <dry.wav> <out_raw.mp4> [bbox]
"""
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

FPS = 25
RAMP = 0.08
TAIL_FRAMES = 15  # 0.6 s closing smile


def silences(wav: Path):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "silencedetect=noise=-35dB:d=0.2",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    s = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    e = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    return list(zip(s, e + [1e9] * (len(s) - len(e))))


def sway(i, w, h):
    t = i / FPS
    s = 1.0 + 0.004 * math.sin(2 * math.pi * t / 5.3)
    M = cv2.getRotationMatrix2D((w / 2, h * 0.35), 0.15 * math.sin(2 * math.pi * t / 6.1), s)
    M[:, 2] += (1.5 * math.sin(2 * math.pi * t / 7.1), 1.0 * math.sin(2 * math.pi * t / 4.7 + 1))
    return M


def main(raw, still, wav, out, bbox="150,92,338,318"):
    x1, y1, x2, y2 = map(int, bbox.split(",")); y2 += 10
    src = cv2.imread(str(still))
    h, w = src.shape[:2]
    mask = np.zeros((h, w), np.float32)
    bw, bh = x2 - x1, y2 - y1
    cv2.ellipse(mask, (x1 + bw // 2, y1 + int(bh * 0.74)), (int(bw * 0.34), int(bh * 0.22)), 0, 0, 360, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (31, 31), 0)
    gaps = silences(wav)
    tmp = Path(tempfile.mkdtemp())
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(raw), str(tmp / "%06d.png")], check=True)
    files = sorted(tmp.glob("*.png"))
    n_closed = 0
    for i, f in enumerate(files):
        t = i / FPS
        a = 0.0
        for s, e in gaps:
            # ramps stay INSIDE the silence so speech frames are never altered
            if e - s >= 2 * RAMP + 0.04 and s <= t <= e:
                a = max(a, min(1.0, (t - s) / RAMP, (e - t) / RAMP))
        if a <= 0:
            continue
        n_closed += 1
        M = sway(i, w, h)
        still_w = cv2.warpAffine(src, M, (w, h), borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        m = cv2.warpAffine(mask, M, (w, h))[..., None] * a
        fr = cv2.imread(str(f)).astype(np.float32)
        cv2.imwrite(str(f), (fr * (1 - m) + still_w * m).astype(np.uint8))
    # closing hold: ease the last frames to closed lips, then hold a natural smile
    n = len(files)
    for k in range(TAIL_FRAMES):
        i = n + k
        M = sway(i, w, h)
        cv2.imwrite(str(tmp / f"{i + 1:06d}.png"), cv2.warpAffine(src, M, (w, h), borderMode=cv2.BORDER_REFLECT))
    last = cv2.imread(str(files[-1])).astype(np.float32)
    for k in range(3):  # ease into the hold AFTER the last spoken frame
        i = n + k
        a = (k + 1) / 4
        M = sway(i, w, h)
        still_w = cv2.warpAffine(src, M, (w, h), borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        m = cv2.warpAffine(mask, M, (w, h))[..., None] * a
        last_w = cv2.warpAffine(last, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        cv2.imwrite(str(tmp / f"{i + 1:06d}.png"), (last_w * (1 - m) + still_w * m).astype(np.uint8))
    total = (n + TAIL_FRAMES) / FPS
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", str(tmp / "%06d.png"),
                    "-i", str(wav), "-map", "0:v", "-map", "1:a", "-af", f"apad,atrim=0:{total:.3f}",
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
                    "-t", f"{total:.3f}", str(out)], check=True)
    print(f"gaps={[(round(s, 2), round(e, 2)) for s, e in gaps]} frames_blended={n_closed}/{len(files)}")


if __name__ == "__main__":
    main(*map(Path, sys.argv[1:5]), *(sys.argv[5:6]))
