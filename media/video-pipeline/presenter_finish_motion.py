#!/usr/bin/env python3
"""Finish a Claire lip-sync clip made on LivePortrait motion frames.

  * pauses: lower face eases back to the motion frame's relaxed closed lips
    (ramps kept inside silences, speech frames untouched)
  * tail: continues with the motion frames' closing smile (3-frame ease)
  * breathing: a small shoulder/torso rise timed to inhalations before each
    phrase — only the body below the neck is warped (face/head untouched),
    the bottom edge stays fixed; this is not a whole-frame move

    python3 presenter_finish_motion.py <lipsync_raw.mp4> <motion_frames_dir> <dry.wav> <out.mp4> \
        [--bbox x1,y1,x2,y2] [--neck-y 470] [--breath-px 3.0]
"""
import argparse
import math
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np

from presenter_pause_close import FPS, RAMP, silences


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw"); ap.add_argument("frames"); ap.add_argument("wav"); ap.add_argument("out")
    ap.add_argument("--bbox", default="197,121,444,417")
    ap.add_argument("--neck-y", type=int, default=470)
    ap.add_argument("--breath-px", type=float, default=3.0)
    a = ap.parse_args()
    x1, y1, x2, y2 = map(int, a.bbox.split(",")); y2 += 10
    refs = sorted(Path(a.frames).glob("*.png"))
    tmp = Path(tempfile.mkdtemp())
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", a.raw, str(tmp / "r%06d.png")], check=True)
    raws = sorted(tmp.glob("r*.png"))
    h, w = cv2.imread(str(raws[0])).shape[:2]   # encoded size (even); motion frames are cropped to match
    bw, bh = x2 - x1, y2 - y1
    mouth = np.zeros((h, w), np.float32)
    cv2.ellipse(mouth, (x1 + bw // 2, y1 + int(bh * 0.74)), (int(bw * 0.34), int(bh * 0.22)), 0, 0, 360, 1.0, -1)
    mouth = cv2.GaussianBlur(mouth, (31, 31), 0)[..., None]
    gaps = silences(Path(a.wav))
    speech_starts = [0.0] + [e for s, e in gaps if e < 1e8]

    # breathing displacement field (rows below the neck move up, bottom edge fixed)
    yy = np.arange(h, dtype=np.float32)
    w_rows = np.clip((yy - (a.neck_y - 30)) / 60.0, 0, 1) * np.clip((h - yy) / (h - a.neck_y), 0, 1)
    map_x = np.tile(np.arange(w, dtype=np.float32), (h, 1))

    def breath(t):
        # inhale over 0.45 s before each phrase start, slow exhale over the phrase
        v = 0.0
        for s0 in speech_starts:
            if s0 - 0.45 <= t <= s0:
                v = max(v, 0.5 * (1 - math.cos(math.pi * (t - (s0 - 0.45)) / 0.45)))
            elif s0 < t <= s0 + 2.5:
                v = max(v, 0.5 * (1 + math.cos(math.pi * (t - s0) / 2.5)))
        return v

    n_out = len(refs)
    blended = 0
    for i in range(n_out):
        t = i / FPS
        ref = cv2.imread(str(refs[i]))[:h, :w].astype(np.float32)
        if i < len(raws):
            fr = cv2.imread(str(raws[i])).astype(np.float32)
            a_ = 0.0
            for s, e in gaps:
                if e - s >= 2 * RAMP + 0.04 and s <= t <= e:
                    a_ = max(a_, min(1.0, (t - s) / RAMP, (e - t) / RAMP))
            if a_ > 0:
                fr = fr * (1 - mouth * a_) + ref * mouth * a_
                blended += 1
        else:
            k = i - len(raws)
            last = cv2.imread(str(raws[-1])).astype(np.float32)
            a_ = min(1.0, (k + 1) / 4)
            fr = last * (1 - mouth * a_) + ref * mouth * a_ if a_ < 1 else ref
            if a_ < 1:  # outside the mouth the motion frame continues
                fr = ref * (1 - mouth) + fr * mouth
        b = breath(t) * a.breath_px
        if b > 0.05:
            map_y = (yy + b * w_rows)[:, None].repeat(w, 1)
            fr = cv2.remap(fr, map_x, map_y.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        cv2.imwrite(str(tmp / f"o{i:06d}.png"), fr.astype(np.uint8))
    total = n_out / FPS
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", str(tmp / "o%06d.png"),
                    "-i", a.wav, "-map", "0:v", "-map", "1:a", "-vf", "crop=trunc(iw/2)*2:trunc(ih/2)*2", "-af", f"apad,atrim=0:{total:.3f}",
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
                    "-t", f"{total:.3f}", a.out], check=True)
    print(f"frames={n_out} lipsync={len(raws)} pause_blended={blended} gaps={[(round(s,2), round(min(e, 99),2)) for s, e in gaps]}")


if __name__ == "__main__":
    main()
