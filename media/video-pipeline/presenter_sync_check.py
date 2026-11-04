#!/usr/bin/env python3
"""Per-sentence lip-sync offset check for the Claire Lee tests.

Mouth signal: per-frame mean absolute difference, inside the mouth ellipse,
between the video frame and the source still's closed-lips mouth (aligned via
the same sway). Audio signal: RMS envelope per video frame. For each sentence
(split at silences >= 0.2 s) the cross-correlation lag in [-8, +8] frames is
reported: +N frames (+N*40 ms) means the mouth moves LATER than the voice,
-N means EARLIER.

    python3 presenter_sync_check.py <video.mp4> <dry.wav> <still.png> [bbox]
"""
import json
import subprocess
import sys
import atexit
import shutil
import tempfile
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from presenter_pause_close import FPS, silences, sway  # noqa: E402

MAXLAG = 8


def audio_env(wav: Path, n: int):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = 16000 // FPS
    n_audio = len(x) // hop
    env = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-12) if i < n_audio else 0.0
                    for i in range(n)])
    return env


def main(video, wav, still, bbox="150,92,338,318", ref_frames=None, temporal=False):
    x1, y1, x2, y2 = map(int, bbox.split(",")); y2 += 10
    src = cv2.imread(str(still)); h, w = src.shape[:2]
    bw, bh = x2 - x1, y2 - y1
    mask = np.zeros((h, w), np.float32)
    cv2.ellipse(mask, (x1 + bw // 2, y1 + int(bh * 0.74)), (int(bw * 0.28), int(bh * 0.14)), 0, 0, 360, 1.0, -1)
    tmp = Path(tempfile.mkdtemp()); atexit.register(shutil.rmtree, tmp, True)  # frames are large
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(video), str(tmp / "%06d.png")], check=True)
    files = sorted(tmp.glob("*.png"))
    mouth = []
    refs = sorted(Path(ref_frames).glob("*.png")) if ref_frames else None
    prev = None
    for i, f in enumerate(files):
        fr = cv2.imread(str(f)).astype(np.float32)
        if temporal:  # no reference: mouth-region change between consecutive frames
            hh, ww = fr.shape[:2]
            m = mask[:hh, :ww] > 0.5
            mouth.append(0.0 if prev is None else float(np.abs(fr - prev)[m].mean()))
            prev = fr
            continue
        if refs:  # motion clip: compare with the same motion frame's relaxed closed lips
            hh, ww = fr.shape[:2]
            ref = cv2.imread(str(refs[min(i, len(refs) - 1)]))[:hh, :ww].astype(np.float32)
            m = mask[:hh, :ww] > 0.5
        else:
            M = sway(i, w, h)
            ref = cv2.warpAffine(src, M, (w, h), borderMode=cv2.BORDER_REFLECT).astype(np.float32)
            m = cv2.warpAffine(mask, M, (w, h)) > 0.5
        mouth.append(np.abs(fr - ref)[m].mean())
    mouth = np.array(mouth)
    env = audio_env(wav, len(mouth))
    gaps = [g for g in silences(wav)]
    bounds, prev = [], 0.0
    for s, e in gaps:
        if s - prev > 0.5:
            bounds.append((prev, s))
        prev = e
    voiced = np.nonzero(env > 1e-5)[0]
    total = min(len(mouth), (voiced[-1] + 1) if len(voiced) else len(mouth)) / FPS  # ignore the silent closing hold
    if total - prev > 0.5:
        bounds.append((prev, total))
    out = []
    for s, e in bounds:
        a, b = int(s * FPS), min(len(mouth), int(e * FPS) + 1)
        m_, e_ = mouth[a:b], env[a:b]
        m_ = (m_ - m_.mean()) / (m_.std() + 1e-9); e_ = (e_ - e_.mean()) / (e_.std() + 1e-9)
        best = max(range(-MAXLAG, MAXLAG + 1),
                   key=lambda L: np.mean(m_[max(0, L):len(m_) + min(0, L)] * e_[max(0, -L):len(e_) - max(0, L)]))
        r = float(np.corrcoef(m_[max(0, best):len(m_) + min(0, best)], e_[max(0, -best):len(e_) - max(0, best)])[0, 1])
        out.append({"start_s": round(s, 2), "end_s": round(e, 2), "lag_frames": best, "lag_ms": best * 1000 // FPS,
                    "corr": round(r, 2)})
    print(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("wav"); ap.add_argument("still")
    ap.add_argument("bbox", nargs="?", default="150,92,338,318"); ap.add_argument("--ref-frames")
    ap.add_argument("--temporal", action="store_true", help="reference-free: frame-to-frame mouth change")
    x = ap.parse_args()
    main(Path(x.video), Path(x.wav), Path(x.still), x.bbox, x.ref_frames, x.temporal)
