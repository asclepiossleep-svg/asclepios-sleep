#!/usr/bin/env python3
"""Face QA for Claire segments (owner request #142 6644776676).

For each segment, before (v05) vs after (v05r1):
  * close-up face pairs at several timestamps -> one comparison sheet
  * per-frame redness of the two former red-mark areas (LAB a* above the
    local skin level, max inside a small window so head motion is covered)
  * flicker: frame-to-frame change of that redness and of skin texture energy

    python3 presenter_face_qa.py <before_dir> <after_dir> <out_dir> tag [tag ...]
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

SPOTS = [(806, 210), (870, 206)]
FACE = (740, 100, 950, 360)
WIN = 12


def frames(path):
    tmp = Path(tempfile.mkdtemp())
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-vf",
                    f"crop={FACE[2] - FACE[0]}:{FACE[3] - FACE[1]}:{FACE[0]}:{FACE[1]}", str(tmp / "%05d.png")],
                   check=True)
    fs = sorted(tmp.glob("*.png"))
    out = [cv2.imread(str(f)) for f in fs]
    for f in fs:
        f.unlink()
    tmp.rmdir()
    return out


def redness(fr):
    a = cv2.cvtColor(fr, cv2.COLOR_BGR2LAB).astype(np.float32)[..., 1]
    d = cv2.GaussianBlur(a - cv2.GaussianBlur(a, (0, 0), 6), (0, 0), 1.2)
    vals = []
    for x, y in SPOTS:
        x, y = x - FACE[0], y - FACE[1]
        vals.append(float(d[y - WIN:y + WIN, x - WIN:x + WIN].max()))
    return vals


def texture(fr):
    g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    cheek = g[150:200, 40:90]          # her right cheek, below the eye, in the face crop
    return float(np.abs(cheek - cv2.GaussianBlur(cheek, (0, 0), 1.5)).mean())


def main():
    before, after, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    report, rows = {}, []
    for tag in sys.argv[4:]:
        fb, fa = frames(before / f"{tag}.mp4"), frames(after / f"{tag}.mp4")
        n = min(len(fb), len(fa))
        rb = np.array([redness(f) for f in fb[:n]]); ra = np.array([redness(f) for f in fa[:n]])
        ta = np.array([texture(f) for f in fa[:n]]); tb = np.array([texture(f) for f in fb[:n]])
        report[tag] = {
            "frames": n,
            "red_mark_peak_before": [round(float(v), 2) for v in rb.max(0)],
            "red_mark_peak_after": [round(float(v), 2) for v in ra.max(0)],
            "red_mark_mean_after": [round(float(v), 2) for v in ra.mean(0)],
            "red_flicker_after_max_step": round(float(np.abs(np.diff(ra, axis=0)).max()), 2) if n > 1 else 0,
            "texture_before_mean": round(float(tb.mean()), 3), "texture_after_mean": round(float(ta.mean()), 3),
            "texture_flicker_after_cv": round(float(ta.std() / max(ta.mean(), 1e-6)), 3),
        }
        for t in np.linspace(0.08, 0.92, 4):
            i = int(t * (n - 1))
            k = 2
            pair = np.hstack([cv2.resize(fb[i], None, fx=k, fy=k, interpolation=cv2.INTER_LANCZOS4),
                              np.full((fb[i].shape[0] * k, 8, 3), 255, np.uint8),
                              cv2.resize(fa[i], None, fx=k, fy=k, interpolation=cv2.INTER_LANCZOS4)])
            cv2.putText(pair, f"{tag} {i / 25:.2f}s  before | after", (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (0, 0, 200), 2)
            rows.append(pair)
    w = max(r.shape[1] for r in rows)
    rows = [np.hstack([r, np.full((r.shape[0], w - r.shape[1], 3), 255, np.uint8)]) for r in rows]
    for j in range(0, len(rows), 8):
        cv2.imwrite(str(out / f"face_compare_{j // 8 + 1}.jpg"), np.vstack(rows[j:j + 8]), [cv2.IMWRITE_JPEG_QUALITY, 88])
    (out / "face_qa.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
