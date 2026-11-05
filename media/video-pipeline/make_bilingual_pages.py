#!/usr/bin/env python3
"""Cantonese edition: bilingual page text (owner order #142, 2026-11-05).

Sources (no new wording):
  * Chinese wording/layout: the approved Manus stills (Drive A02_HANDOFF unzipped
    folder 1XVSwo65ZThru7nxVCb4QSkPdyOr69ex8), used unchanged except as below.
  * English wording: the accepted English master's stills (exact words).
  * Brand: official ASCLEPIOS HEALTH logo; Chinese name 阿斯康; Chinese slogan
    從細胞出發，配合生命的節律 (A04/A07, #142 6648229450); English slogan as on
    the accepted English opening page.

What it writes (new files; the source JPGs are never modified):
  01/20  opening and closing: Manus brand art with its text replaced by the official
         logo + 阿斯康 + Chinese slogan + English slogan
  02/04/08/19  life pages whose approved title is Chinese-only: the English master
         title is added as a smaller line under the Chinese title, matching its
         colour and alignment (science pages already carry English labels)

    python3 make_bilingual_pages.py <manus_dir> <official_logo> <out_dir>
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SANS_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
SANS_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
HK = 3                      # face index of "Noto Sans CJK HK" inside the .ttc
INK = (34, 40, 52)

ZH_NAME = "阿斯康"
ZH_SLOGAN = "從細胞出發，配合生命的節律"
EN_SLOGAN = "Starting with the cell. Working with the rhythms of life."

# page: (english lines, x, y_top, size, colour, align, shadow)
LIFE = {
    "02_Why_Timing_Matters": (["Healthy ageing: why timing matters"], 1053, 466, 30, (43, 43, 43), "left", False),
    "04_Delayed_Lunch": (["Busy again? Lunch delayed again?"], 942, 280, 32, (43, 43, 43), "left", False),
    "08_Daily_Movement": (["Every step", "powered by your cells"], 942, 412, 36, (255, 255, 255), "left", True),
    "19_Invitation_to_Explore": (["Begin with understanding yourself", "Explore the next step"], 1246, 450, 34,
                                 (255, 255, 255), "center", True),
}


def font(path, size):
    try:
        return ImageFont.truetype(path, size, index=HK)
    except OSError:
        return ImageFont.truetype(SANS_REG, size, index=HK)


def draw_lines(img, lines, x, y, size, colour, align, shadow):
    f = font(SANS_REG, size)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    yy = y
    for ln in lines:
        w = d.textlength(ln, font=f)
        xx = x - w / 2 if align == "center" else x
        if shadow:
            ds.text((xx + 1, yy + 2), ln, font=f, fill=(0, 0, 0, 230), stroke_width=3, stroke_fill=(0, 0, 0, 200))
        d.text((xx, yy), ln, font=f, fill=colour + (255,))
        yy += int(size * 1.32)
    base = img.convert("RGBA")
    if shadow:
        base = Image.alpha_composite(base, sh.filter(ImageFilter.GaussianBlur(4)))
        base = Image.alpha_composite(base, sh.filter(ImageFilter.GaussianBlur(9)))
    return Image.alpha_composite(base, layer).convert("RGB"), yy


def brand_page(src, logo_path, out):
    img = cv2.imread(str(src))
    h, w = img.shape[:2]
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = np.zeros((h, w), np.uint8)
    x0, y0, x1, y1 = 150, 220, 1520, 500   # the Manus name/slogan lines span ~x 237-1452
    mask[y0:y1, x0:x1] = (g[y0:y1, x0:x1] < 205).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
    page = Image.fromarray(cv2.cvtColor(cv2.inpaint(img, mask, 9, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB))

    logo = Image.open(logo_path).convert("RGB")
    bbox = ImageChops.difference(logo, Image.new("RGB", logo.size, (255, 255, 255))).convert("L") \
        .point(lambda v: 255 if v > 24 else 0).getbbox()
    logo = logo.crop(bbox)
    lh = int(h * 0.40)
    logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    lx, ly = (w - logo.width) // 2, int(h * 0.085)
    page.paste(ImageChops.multiply(page.crop((lx, ly, lx + logo.width, ly + lh)), logo), (lx, ly))

    d = ImageDraw.Draw(page)
    y = ly + lh + int(h * 0.035)
    for text, fp, size, track in [(ZH_NAME, SANS_BOLD, int(h * 0.050), 0.22), (ZH_SLOGAN, SANS_REG, int(h * 0.036), 0.08),
                                  (EN_SLOGAN, SANS_REG, int(h * 0.028), 0.0)]:
        f = font(fp, size)
        widths = [d.textlength(c, font=f) for c in text]
        total = sum(widths) + track * size * (len(text) - 1)
        xx = (w - total) / 2
        for c, cw in zip(text, widths):
            d.text((xx, y), c, font=f, fill=INK)
            xx += cw + track * size
        y += int(size * 1.55)
    page.save(out, quality=95)
    return y


def main():
    src, logo, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    for n in ("01_Brand_Opening", "20_Brand_Ending"):
        yb = brand_page(src / f"{n}.jpg", logo, out / f"{n}_bilingual_logo_v1.jpg")
        print(n, "text bottom y", yb)
    for n, (lines, x, y, size, col, align, shadow) in LIFE.items():
        img, yb = draw_lines(Image.open(src / f"{n}.jpg").convert("RGB"), lines, x, y, size, col, align, shadow)
        img.save(out / f"{n}_bilingual_v1.jpg", quality=95)
        print(n, "english bottom y", yb)


if __name__ == "__main__":
    main()
