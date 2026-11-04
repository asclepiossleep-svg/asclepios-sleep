#!/usr/bin/env python3
"""Claire Lee (studio still) — subtle hand and shoulder motion, my own code (no model).

What it does (2D warps of the still's own pixels, nothing generated):
  * shoulders/torso: breathing rise before each phrase, shoulders move most,
    fading to zero at the forearms; head stays with LivePortrait
  * hands: small wrist roll about the desk-contact point (contact stays fixed),
    plus a tiny finger/knuckle adjustment of the upper hand, at phrase
    boundaries and in the closing hold, with a very slow micro-drift
  * everything outside Claire's body mask (desk, coffee, notebook, room) is
    never displaced

Limitations: fingers can't bend independently (no hand model); motion is kept
small so the warp stays invisible.

    python3 presenter_body_motion.py <in.mp4> <source_still.png> <dry.wav> <out.mp4> [options]
"""
import argparse
import math
import subprocess
import atexit
import shutil
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from presenter_pause_close import FPS, silences


def bump(t, c, w):
    x = (t - c) / w
    return 0.5 * (1 + math.cos(math.pi * x)) if abs(x) < 1 else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("still"); ap.add_argument("wav"); ap.add_argument("out")
    ap.add_argument("--hands", default="870,845,230,70", help="clasped-hands ellipse cx,cy,ax,ay")
    ap.add_argument("--contact-y", type=int, default=900)
    ap.add_argument("--fingers", default="930,830,70,35", help="upper-hand finger ellipse cx,cy,ax,ay")
    ap.add_argument("--neck-y", type=int, default=430)
    ap.add_argument("--forearm-y", type=int, default=780)
    ap.add_argument("--breath-px", type=float, default=2.5)
    a = ap.parse_args()

    from rembg import new_session, remove
    still = Image.open(a.still).convert("RGB")
    P = np.asarray(remove(still, session=new_session("u2net_human_seg"), only_mask=True)).astype(np.float32) / 255
    P = cv2.GaussianBlur(P, (9, 9), 0)
    h, w = P.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    cx, cy, ax_, ay_ = map(float, a.hands.split(","))
    H = np.zeros((h, w), np.float32)
    cv2.ellipse(H, (int(cx), int(cy)), (int(ax_), int(ay_)), 0, 0, 360, 1.0, -1)
    H = cv2.GaussianBlur(H, (41, 41), 0) * P
    Hv = np.clip((a.contact_y - yy) / 110.0, 0, 1)          # zero at the desk contact, full at the knuckles
    fx, fy, fa, fb = map(float, a.fingers.split(","))
    F = np.zeros((h, w), np.float32)
    cv2.ellipse(F, (int(fx), int(fy)), (int(fa), int(fb)), 0, 0, 360, 1.0, -1)
    F = cv2.GaussianBlur(F, (31, 31), 0) * P
    wB = np.clip((yy - a.neck_y) / 50.0, 0, 1) * np.clip((a.forearm_y - yy) / 140.0, 0, 1)
    B = wB * P * (1 - H)

    gaps = silences(Path(a.wav))
    starts = [0.0] + [e for s, e in gaps if e < 1e8]
    speech_end = next((s for s, e in gaps if e > 1e8), None)
    if speech_end is None:  # voice file ends without trailing silence: the closing hold starts at its end
        speech_end = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                           "default=nw=1:nk=1", a.wav], capture_output=True, text=True).stdout)
    pause_mids = [(s + e) / 2 for s, e in gaps if e < 1e8]
    hand_events = pause_mids + ([speech_end + 0.35] if speech_end else [])
    finger_events = [st + 0.9 for st in starts[1:]] + ([speech_end + 0.7] if speech_end else [])

    def breath(t):
        v = 0.0
        for s0 in starts:
            if s0 - 0.45 <= t <= s0:
                v = max(v, 0.5 * (1 - math.cos(math.pi * (t - (s0 - 0.45)) / 0.45)))
            elif s0 < t <= s0 + 2.5:
                v = max(v, 0.5 * (1 + math.cos(math.pi * (t - s0) / 2.5)))
        return v

    tmp = Path(tempfile.mkdtemp()); atexit.register(shutil.rmtree, tmp, True)  # frames are large
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", a.inp, str(tmp / "%06d.png")], check=True)
    files = sorted(tmp.glob("*.png"))
    for i, f in enumerate(files):
        t = i / FPS
        fr = cv2.imread(str(f))
        fh, fw = fr.shape[:2]
        # wrist roll (deg) about the contact point + tiny drift
        th = 0.9 * max([bump(t, c, 0.45) for c in hand_events] + [0.0]) + 0.12 * math.sin(2 * math.pi * t / 5.7)
        r = math.radians(th)
        px, py = cx, float(a.contact_y)
        rx = (math.cos(r) - 1) * (xx - px) - math.sin(r) * (yy - py)
        ry = math.sin(r) * (xx - px) + (math.cos(r) - 1) * (yy - py)
        fing = max([bump(t, c, 0.35) for c in finger_events] + [0.0])
        lift = 1.0 * max([bump(t, c, 0.45) for c in hand_events] + [0.0])
        dx = rx * H * Hv + 2.0 * fing * F
        dy = ry * H * Hv + 1.3 * fing * F - (a.breath_px * breath(t) + lift) * B
        mx = (xx - dx)[:fh, :fw].astype(np.float32)
        my = (yy - dy)[:fh, :fw].astype(np.float32)
        cv2.imwrite(str(f), cv2.remap(fr, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", str(tmp / "%06d.png"),
                    "-i", a.inp, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "copy", a.out], check=True)
    print(f"frames={len(files)} hand_events={[round(x, 2) for x in hand_events]} "
          f"finger_events={[round(x, 2) for x in finger_events]}")


if __name__ == "__main__":
    main()
