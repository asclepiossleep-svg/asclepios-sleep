#!/usr/bin/env python3
"""Claire Lee — test wardrobe edit (no white coat) from the approved v0.6 board.

Deterministic, non-generative edit. Face, hair, skin and the teal top are left
pixel-identical. Only the white lab-coat pixels are changed:
  1. person mask: rembg / U^2-Net (MIT / Apache-2.0)
  2. coat mask: person pixels that are bright and unsaturated, below the chin
  3. coat recoloured to a deep teal jacket, keeping the original fabric shading
  4. the embroidered pocket wordmark is removed with OpenCV inpainting
  5. the background is replaced with a clean pale grey-blue
This is a TEST stand-in until the designer supplies a v0.7 board.

    python presenter_wardrobe_test.py <board.jpg> <out_dir>
"""
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

BOARD_CROP = (40, 60, 530, 776)          # left front portrait on the v0.6 board JPEG (bottom edge trimmed)
BOARD_CROP_PNG = (53, 79, 696, 1019)     # same region on Claire_Lee_Approved_Reference_v0.6.png (1536x1024)
BG = np.array([233, 238, 243], np.float32)   # pale grey-blue (RGB)
COAT_TEAL = np.array([24, 96, 92], np.float32)
COAT_NAVY = np.array([26, 40, 74], np.float32)
INNER_LIGHT_BLUE = np.array([176, 204, 232], np.float32)


def main(board: Path, out: Path, crop=BOARD_CROP, coat_rgb=COAT_TEAL, inner_rgb=None, name="claire_v06_teal_test.png"):
    out.mkdir(parents=True, exist_ok=True)
    im = Image.open(board).convert("RGB").crop(crop)
    rgb = np.asarray(im).astype(np.float32)
    h, w, _ = rgb.shape
    alpha = np.asarray(remove(im, session=new_session("u2net_human_seg"), only_mask=True)).astype(np.float32) / 255
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)

    hsv = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    sat, val = hsv[..., 1] / 255, hsv[..., 2] / 255
    yy = np.arange(h)[:, None].repeat(w, 1)
    chin = int(h * 0.47)                  # below the chin/neck line only
    coat = (alpha > 0.5) & (val > 0.62) & (sat < 0.16) & (yy > chin)
    coat = cv2.morphologyEx(coat.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    coat = cv2.morphologyEx(coat, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    # grow into the greyish anti-aliased fringe (collar/hair edge, coat/blouse seam)
    fringe = (alpha > 0.2) & (sat < 0.28) & (val > 0.42) & (yy > chin - 25)
    grown = cv2.dilate(coat.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
    coat |= grown & fringe

    # 4. remove pocket wordmark first (dark teal letters on the coat): inpaint them from coat fabric
    letters = (alpha > 0.5) & (yy > chin) & (sat > 0.2) & (val < 0.75)
    x0, x1, y0, y1 = int(w * 0.74), int(w * 0.98), int(h * 0.66), int(h * 0.76)
    zone = np.zeros_like(letters); zone[y0:y1, x0:x1] = True
    letters &= zone
    letters = cv2.dilate(letters.astype(np.uint8), np.ones((5, 5), np.uint8))
    clean = cv2.inpaint(rgb.astype(np.uint8), letters * 255, 5, cv2.INPAINT_TELEA).astype(np.float32)
    coat |= letters.astype(bool)

    # 3. recolour: keep shading (luminance relative to the coat's median white)
    lum = cv2.cvtColor(clean.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    ref = np.median(lum[coat]) if coat.any() else 230
    shade = np.clip(lum / ref, 0.55, 1.15)[..., None]
    dyed = np.clip(coat_rgb * shade * 1.05, 0, 255)
    m = cv2.GaussianBlur(coat.astype(np.float32), (5, 5), 0)[..., None]
    person = clean * (1 - m) + dyed * m

    if inner_rgb is not None:
        # teal inner top -> light blue, keeping its fabric shading (hue band of the teal top only)
        hue = hsv[..., 0]
        inner = (alpha > 0.5) & (yy > chin) & (hue > 70) & (hue < 100) & (sat > 0.18) & ~coat
        inner = cv2.morphologyEx(inner.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)
        il = cv2.cvtColor(clean.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
        iref = np.median(il[inner]) if inner.any() else 90
        ish = np.clip(il / iref, 0.6, 1.25)[..., None]
        mi = cv2.GaussianBlur(inner.astype(np.float32), (5, 5), 0)[..., None]
        person = person * (1 - mi) + np.clip(inner_rgb * ish, 0, 255) * mi

    # 5. clean background
    a = alpha[..., None]
    final = person * a + BG * (1 - a)
    Image.fromarray(final.astype(np.uint8)).save(out / name)
    Image.fromarray((coat * 255).astype(np.uint8)).save(out / "coat_mask.png")
    print("coat pixels:", int(coat.sum()), "of", h * w)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("board"); ap.add_argument("out")
    ap.add_argument("--variant", choices=["teal", "navy"], default="teal")
    a = ap.parse_args()
    if a.variant == "navy":   # owner 2026-11-04: dark blue outerwear + light blue innerwear, from the v0.6 PNG
        main(Path(a.board), Path(a.out), BOARD_CROP_PNG, COAT_NAVY, INNER_LIGHT_BLUE, "claire_v06_navy_lightblue_test.png")
    else:
        main(Path(a.board), Path(a.out))
