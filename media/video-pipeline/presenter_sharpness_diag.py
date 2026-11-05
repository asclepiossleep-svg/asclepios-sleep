#!/usr/bin/env python3
"""Where does Claire lose resolution? (owner review #142, 2026-11-05)

Measures fine detail (mean |I - Gauss(I, 1.2)| on luminance, 1672x940 frame
coordinates) in fixed regions for one matched frame through every stage, and
writes a side-by-side crop sheet.

    python3 presenter_sharpness_diag.py <out_dir> <frame_index> stage=path[@t] ...

A path is a PNG/JPG (used as is), a directory of numbered PNGs (frame_index is
used), or a video (frame_index/25 s, or the explicit @t seconds). Frames are
resized to 1672x940 with Lanczos so every stage is measured on the same grid.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

W, H = 1672, 940
REGIONS = {  # x0, y0, x1, y1 in the v05 frame
    "eyes": (775, 175, 915, 225),
    "mouth": (795, 255, 885, 315),
    "hair": (705, 140, 770, 330),
    "chest_logo": (985, 560, 1045, 620),
    "notebook": (1360, 850, 1500, 905),
}
CROP = (690, 100, 980, 420)   # face + hair close-up for the sheet


def load(spec, idx):
    p, _, t = spec.partition("@")
    p = Path(p)
    if p.is_dir():
        files = sorted(p.glob("*.png"))
        img = cv2.imread(str(files[min(idx, len(files) - 1)]))
    elif p.suffix.lower() in (".png", ".jpg", ".jpeg"):
        img = cv2.imread(str(p))
    else:
        ts = float(t) if t else idx / 25
        tmp = Path(tempfile.mkdtemp()) / "f.png"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{ts:.3f}", "-i", str(p), "-frames:v", "1",
                        str(tmp)], check=True)
        img = cv2.imread(str(tmp))
    h, w = img.shape[:2]
    native = f"{w}x{h}"
    if (w, h) != (W, H):
        if abs(w / h - W / H) > 0.01:          # 1920x1080 film frame: the segment is scaled 1672->1920, same aspect
            img = cv2.resize(img, (W, int(round(h * W / w))), interpolation=cv2.INTER_LANCZOS4)[:H]
        img = cv2.resize(img, (W, H), interpolation=cv2.INTER_LANCZOS4)
    return img, native


def detail(img, box):
    x0, y0, x1, y1 = box
    g = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(np.float32)
    return float(np.abs(g - cv2.GaussianBlur(g, (0, 0), 1.2)).mean())


def main():
    out, idx = Path(sys.argv[1]), int(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    rows, crops = {}, []
    for arg in sys.argv[3:]:
        name, _, spec = arg.partition("=")
        img, native = load(spec, idx)
        rows[name] = {"native": native, **{k: round(detail(img, b), 3) for k, b in REGIONS.items()}}
        x0, y0, x1, y1 = CROP
        c = cv2.resize(img[y0:y1, x0:x1], None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
        cv2.putText(c, name, (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 220), 2)
        crops.append(c)
    (out / "sharpness.json").write_text(json.dumps(rows, indent=2))
    sheet = np.hstack([np.hstack([c, np.full((c.shape[0], 6, 3), 255, np.uint8)]) for c in crops])
    cv2.imwrite(str(out / "sharpness_crops.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 90])
    w = max(len(k) for k in rows)
    print(" " * w, *[f"{k:>11}" for k in REGIONS], "  native")
    for k, v in rows.items():
        print(f"{k:<{w}}", *[f"{v[r]:>11.3f}" for r in REGIONS], " ", v["native"])


if __name__ == "__main__":
    main()
