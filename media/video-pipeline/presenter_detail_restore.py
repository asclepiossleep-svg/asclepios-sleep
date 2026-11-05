#!/usr/bin/env python3
"""Claire: put the source still's real fine detail back into the animated face (owner review #142).

Diagnosis (presenter_sharpness_diag.py): LivePortrait's face re-generation removes ~31 % of
the fine detail in the eyes and hair and lip-sync another ~13 % at the mouth; body, blazer,
desk and background are untouched. So nothing is invented here: for every frame the
high-resolution v05r1 still is aligned to the animated head with dense optical flow, and
its own high-frequency detail (pores, lashes, brows, hair strands) replaces the soft
generated detail where the alignment is reliable. Where the frame differs from the still
(blinks, the open mouth, teeth) the generated detail is kept. Only the head region is
touched; everything else is copied unchanged. Own code, OpenCV only.

    python3 presenter_detail_restore.py <in.mp4> <still.png> <out.mp4> [--strength 1.0]
"""
import argparse
import atexit
import shutil
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np

HEAD = (660, 40, 1010, 470)     # x0, y0, x1, y1: head, hair and neck in the 1672x940 frame
SIGMA = 1.4                     # fine detail band: what LivePortrait / MuseTalk soften
MID, MID_W = 3.5, 0.6           # mid band (1.4-3.5 px) restored at 60 %
MOUTH = ((840, 287), (52, 30))  # centre, axes: generated detail kept here (teeth, lips moving)


def highpass(x, s):
    return x - cv2.GaussianBlur(x, (0, 0), s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("still"); ap.add_argument("out")
    ap.add_argument("--strength", type=float, default=1.0)
    ap.add_argument("--tol", type=float, default=7.0, help="low-pass difference (0-255) where trust falls to zero")
    a = ap.parse_args()

    still = cv2.imread(a.still)
    x0, y0, x1, y1 = HEAD
    tmp = Path(tempfile.mkdtemp()); atexit.register(shutil.rmtree, tmp, True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", a.inp, str(tmp / "%06d.png")], check=True)
    files = sorted(tmp.glob("*.png"))
    fh, fw = cv2.imread(str(files[0])).shape[:2]
    st = still[:fh, :fw].astype(np.float32)
    st_h = st[y0:y1, x0:x1]
    st_g = cv2.cvtColor(st_h.astype(np.uint8), cv2.COLOR_BGR2GRAY)

    hh, ww = y1 - y0, x1 - x0
    yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    edge = np.ones((hh, ww), np.float32)
    edge = cv2.GaussianBlur(cv2.copyMakeBorder(edge[20:-20, 20:-20], 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=0),
                            (0, 0), 8)
    mouth = np.zeros((hh, ww), np.float32)
    (mx, my), (ax_, ay_) = MOUTH
    cv2.ellipse(mouth, (mx - x0, my - y0), (ax_, ay_), 0, 0, 360, 1.0, -1)
    mouth = cv2.GaussianBlur(mouth, (0, 0), 6)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    stats = []
    for f in files:
        fr = cv2.imread(str(f)).astype(np.float32)
        head = fr[y0:y1, x0:x1]
        g = cv2.cvtColor(head.astype(np.uint8), cv2.COLOR_BGR2GRAY)
        flow = dis.calc(g, st_g, None)                       # frame pixel -> still pixel
        warped = cv2.remap(st_h, xx + flow[..., 0], yy + flow[..., 1], cv2.INTER_CUBIC,
                           borderMode=cv2.BORDER_REFLECT)
        # trust: the warped still must match the frame at low frequency (same content, same place)
        # compare structure (band 3-12 px), not absolute colour: lip-sync shifts skin tone slightly,
        # which must not block the detail transfer, while a blink or an open mouth still differs here
        bp = lambda x: cv2.GaussianBlur(x, (0, 0), 3) - cv2.GaussianBlur(x, (0, 0), 12)
        d = np.abs(bp(warped) - bp(head)).mean(2)
        trust = np.clip(1 - d / a.tol, 0, 1)
        trust = cv2.GaussianBlur(trust, (0, 0), 2.5) * edge * (1 - mouth) * a.strength
        t3 = trust[..., None]
        # fine band (pores, lash and hair edges) fully, mid band (brows, lash lines, strands) partly
        fine_h, fine_w = highpass(head, SIGMA), highpass(warped, SIGMA)
        mid_h = cv2.GaussianBlur(head, (0, 0), SIGMA) - cv2.GaussianBlur(head, (0, 0), MID)
        mid_w = cv2.GaussianBlur(warped, (0, 0), SIGMA) - cv2.GaussianBlur(warped, (0, 0), MID)
        out = head + t3 * (fine_w - fine_h) + MID_W * t3 * (mid_w - mid_h)
        fr[y0:y1, x0:x1] = out
        cv2.imwrite(str(f), np.clip(fr, 0, 255).astype(np.uint8))
        stats.append(float(trust.mean()))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", "25", "-i", str(tmp / "%06d.png"),
                    "-i", a.inp, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-crf", "14", "-preset", "slow",
                    "-pix_fmt", "yuv420p", "-c:a", "copy", a.out], check=True)
    print(f"frames={len(files)} mean_trust={np.mean(stats):.3f} min_trust={np.min(stats):.3f}")


if __name__ == "__main__":
    main()
