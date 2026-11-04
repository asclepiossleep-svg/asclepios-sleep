#!/usr/bin/env python3
"""ASCLEPIOS HEALTH opening page with the official logo (owner request, #142).

Starts from the approved 01 brand-opening still (its background art is kept),
removes only the plain-text wordmark and tagline by inpainting, then places the
official full logo (symbol + ASCLEPIOS HEALTH, pixels unchanged, white ground
multiplied away) and the English tagline. English only. The source still is read,
never modified; the result is written to a new file.

    python3 make_opening_page.py <01_still.jpg> <official_logo.jpeg> <out.jpg>
"""
import argparse

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

TAGLINE = "Starting with the cell. Working with the rhythms of life."
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"   # same face as the approved stills
INK = (23, 35, 51)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("still"); ap.add_argument("logo"); ap.add_argument("out")
    ap.add_argument("--text-box", default="360,260,1320,470", help="x0,y0,x1,y1 of the old wordmark + tagline")
    ap.add_argument("--logo-h", type=float, default=0.50, help="logo height as a fraction of the page height")
    ap.add_argument("--logo-cy", type=float, default=0.36, help="logo centre y as a fraction of the page height")
    a = ap.parse_args()

    src = cv2.imread(a.still)
    h, w = src.shape[:2]
    x0, y0, x1, y1 = map(int, a.text_box.split(","))
    g = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
    mask = np.zeros((h, w), np.uint8)
    mask[y0:y1, x0:x1] = (g[y0:y1, x0:x1] < 200).astype(np.uint8) * 255   # dark text pixels only
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
    clean = cv2.inpaint(src, mask, 9, cv2.INPAINT_TELEA)
    page = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))

    logo = Image.open(a.logo).convert("RGB")
    bbox = ImageChops.difference(logo, Image.new("RGB", logo.size, (255, 255, 255))).convert("L") \
        .point(lambda v: 255 if v > 24 else 0).getbbox()
    logo = logo.crop(bbox)
    lh = int(h * a.logo_h)
    logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    lx, ly = (w - logo.width) // 2, int(h * a.logo_cy - lh / 2)
    region = page.crop((lx, ly, lx + logo.width, ly + lh))
    page.paste(ImageChops.multiply(region, logo), (lx, ly))   # white ground drops out, ink stays exact

    d = ImageDraw.Draw(page)
    f = ImageFont.truetype(FONT, int(h * 0.034))
    tw = d.textlength(TAGLINE, font=f)
    d.text(((w - tw) / 2, ly + lh + int(h * 0.045)), TAGLINE, font=f, fill=INK)
    page.save(a.out, quality=95)
    print(f"logo {logo.size} at ({lx},{ly}); tagline y={ly + lh + int(h * 0.045)}; page {w}x{h}")


if __name__ == "__main__":
    main()
