#!/usr/bin/env python3
"""Claire Lee v05 studio still: one-time source retouch (owner request #142 6644776676).

Own code, no model. Works in LAB on the face only:
  1. removes the two small red marks below the inner eye corners (present in
     the v05 source, carried into every frame by the animation)
  2. reduces under-eye redness and lifts its shadow a little
  3. evens skin colour gently (low-frequency a*/b* only)
  4. softens lines: mid-frequency lightness detail is reduced, fine detail
     (pores) is kept at full strength
Eyes, lashes, brows, lips and nostrils are masked out; no pixel moves, so the
face shape, identity, framing, blazer, logo and background are unchanged.

    python3 presenter_retouch.py <v05.png> <out.png> [--report <before_after.png>]
"""
import argparse

import cv2
import numpy as np

# v05 still, 1672x941 (same points the motion stage uses)
EYES = [(795, 202), (882, 194)]
MOUTH = (843, 288)
SPOTS = [(806, 210), (870, 206)]           # red marks found by a*-peak search, still + P01-P05
FACE_BOX = (735, 95, 955, 365)


def ellipse(shape, c, axes, angle=0, blur=0):
    m = np.zeros(shape, np.float32)
    cv2.ellipse(m, (int(c[0]), int(c[1])), (int(axes[0]), int(axes[1])), angle, 0, 360, 1.0, -1)
    return cv2.GaussianBlur(m, (0, 0), blur) if blur else m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--report")
    ap.add_argument("--even", type=float, default=0.35, help="skin colour evening strength")
    ap.add_argument("--lines", type=float, default=0.32, help="mid-frequency (line) reduction")
    ap.add_argument("--undereye", type=float, default=0.55, help="under-eye redness reduction")
    a = ap.parse_args()

    img = cv2.imread(a.src)
    x0, y0, x1, y1 = FACE_BOX
    crop = img[y0:y1, x0:x1].copy()
    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB).astype(np.float32)
    L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    sh = L.shape
    off = lambda p: (p[0] - x0, p[1] - y0)

    # skin mask: skin-coloured pixels, minus eyes, brows, lips; feathered
    ycc = cv2.cvtColor(crop, cv2.COLOR_BGR2YCrCb)
    skin = cv2.inRange(ycc, (60, 135, 85), (255, 180, 135)).astype(np.float32) / 255
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    keep = np.zeros(sh, np.float32)
    for e in EYES:
        keep = np.maximum(keep, ellipse(sh, off(e), (21, 10)))                       # eye + lashes
        keep = np.maximum(keep, ellipse(sh, (off(e)[0], off(e)[1] - 17), (26, 8)))   # brow
    keep = np.maximum(keep, ellipse(sh, off(MOUTH), (44, 19)))                       # lips
    keep = cv2.GaussianBlur(keep, (0, 0), 2.5)
    skin = cv2.GaussianBlur(skin, (0, 0), 2.0) * (1 - np.clip(keep * 1.4, 0, 1))

    # 1. red marks: pull a*/b* (and a darker L) toward the surrounding skin
    for s in SPOTS:
        c = off(s)
        m = ellipse(sh, c, (8, 6), blur=2.5)
        ring = (ellipse(sh, c, (18, 14)) - ellipse(sh, c, (11, 9))) * (1 - keep)
        sel = ring > 0.5
        ta, tb, tl = np.median(A[sel]), np.median(B[sel]), np.median(L[sel])
        # the mark sits on the lower-lid skin just under the lash line: protect only the
        # eye opening itself (dark iris/sclera/lash pixels), not the whole eye ellipse
        m = m * (1 - np.clip((140 - L) / 40, 0, 1))
        A -= (A - ta) * m * 0.95
        B -= (B - tb) * m * 0.80
        L += np.maximum(tl - L, 0) * m * 0.45

    # 2. under-eye: reduce redness above the cheek reference, lift shadow slightly
    for e in EYES:
        c = (off(e)[0] + 2, off(e)[1] + 14)
        m = ellipse(sh, c, (24, 8), blur=3.0) * (1 - np.clip(keep * 1.6, 0, 1))
        cheek = ellipse(sh, (c[0], c[1] + 26), (16, 8)) > 0.5
        ra, rl = np.median(A[cheek]), np.median(L[cheek])
        A -= np.maximum(A - ra, 0) * m * a.undereye
        L += np.maximum(rl - L, 0) * m * 0.30

    # 3. gentle colour evening (low frequency only)
    for ch in (A, B):
        ch += (cv2.GaussianBlur(ch, (0, 0), 7) - ch) * skin * a.even

    # 4. lines: reduce mid-frequency lightness, keep pores (fine) and form (low)
    g1, g6 = cv2.GaussianBlur(L, (0, 0), 1.0), cv2.GaussianBlur(L, (0, 0), 5.0)
    fine, mid = L - g1, g1 - g6
    L[:] = g6 + mid * (1 - a.lines * skin) + fine

    lab = np.dstack([L, A, B]).clip(0, 255).astype(np.uint8)
    out = img.copy()
    out[y0:y1, x0:x1] = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    cv2.imwrite(a.out, out)
    d = np.abs(out.astype(int) - img.astype(int)).sum(2)
    ys, xs = np.nonzero(d > 3)
    print(f"changed px>3: {len(xs)}; bbox x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}; outside face box: "
          f"{int(((xs < x0) | (xs >= x1) | (ys < y0) | (ys >= y1)).sum())}")
    if a.report:
        k = 3
        before = cv2.resize(img[y0:y1, x0:x1], None, fx=k, fy=k, interpolation=cv2.INTER_LANCZOS4)
        after = cv2.resize(out[y0:y1, x0:x1], None, fx=k, fy=k, interpolation=cv2.INTER_LANCZOS4)
        cv2.imwrite(a.report, np.hstack([before, np.full((before.shape[0], 12, 3), 255, np.uint8), after]))


if __name__ == "__main__":
    main()
