#!/usr/bin/env python3
"""Whole-clip mouth-sync QA for a presenter segment (#142).

Mouth activity is the dark open-mouth area inside the mouth ellipse. The ellipse follows the
face, which is tracked on the eyes/nose. The signal is smoothed over 3 frames. The voice
signal is the RMS envelope per video frame. Reported per clip:
  lag_ms     best cross-correlation offset in [-160, +160] ms (+ = mouth later than voice)
  corr       Pearson r at that offset
  corr_0     Pearson r at zero offset
  agree      share of frames where "voice on" (envelope above 15 % of its 95th percentile)
             matches "mouth moving" (activity above its median)
Pass: |lag_ms| <= 80 and corr >= 0.45. agree is reported but not used to pass or fail:
on matched, approved takes it measured 0.62-0.68 (calibration 2026-11-06, evidence/a02_yue_sync_calibration.json),
so it does not separate good takes from bad ones. A take whose mouth was animated to different audio measured
corr 0.29 (P05, 15 s), against 0.53-0.65 for matched takes. Short clips (< 3 s) separate less clearly.

    python3 presenter_sync_qa.py <out.json> <still.png> <bbox> <video.mp4>=<voice.wav> ...
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import presenter_sync_check as sc  # noqa: E402
from presenter_pause_close import FPS  # noqa: E402

MAXLAG = 4


def mouth_activity(video, still, bbox):
    """Open-mouth darkness per frame. The face is tracked by template-matching the still's nose and eye
    patch (above the mouth, untouched by lip-sync), so head motion does not count as mouth motion."""
    import cv2
    import shutil
    import subprocess
    import tempfile
    x1, y1, x2, y2 = map(int, bbox.split(","))
    src = cv2.cvtColor(cv2.imread(str(still)), cv2.COLOR_BGR2GRAY)
    bw, bh = x2 - x1, y2 - y1
    cx, cy = x1 + bw // 2, y1 + int(bh * 0.74)          # mouth centre (same geometry as presenter_sync_check)
    ax, ay = int(bw * 0.24), int(bh * 0.10)
    ty1, ty2 = y1 + int(bh * 0.30), y1 + int(bh * 0.58)  # eyes/nose band
    tmpl = src[ty1:ty2, x1 + 20:x2 - 20]
    R = 40
    tmp = Path(tempfile.mkdtemp())
    try:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(video), "-vf", "format=gray", str(tmp / "%06d.png")],
                       check=True)
        out = []
        for f in sorted(tmp.glob("*.png")):
            g = cv2.imread(str(f), cv2.IMREAD_GRAYSCALE)
            win = g[ty1 - R:ty2 + R, x1 + 20 - R:x2 - 20 + R]
            _, _, _, loc = cv2.minMaxLoc(cv2.matchTemplate(win, tmpl, cv2.TM_CCOEFF_NORMED))
            dx, dy = loc[0] - R, loc[1] - R
            m = np.zeros(g.shape, np.uint8)
            cv2.ellipse(m, (cx + dx, cy + dy), (ax, ay), 0, 0, 360, 1, -1)
            px = g[m > 0].astype(np.float32)
            skin = np.percentile(px, 80)
            out.append(float(np.mean(np.clip(skin * 0.6 - px, 0, None))))   # dark inner-mouth / teeth-gap energy
    finally:
        shutil.rmtree(tmp, True)
    return np.array(out)


def smooth(x, k=3):
    return np.convolve(x, np.ones(k) / k, mode="same")


def corr_at(a, b, L):
    a2 = a[max(0, L):len(a) + min(0, L)]; b2 = b[max(0, -L):len(b) - max(0, L)]
    return float(np.corrcoef(a2, b2)[0, 1])


def check(video, wav, still, bbox):
    mouth = smooth(mouth_activity(video, still, bbox))
    env = smooth(sc.audio_env(Path(wav), len(mouth)))
    voiced = np.nonzero(env > 1e-4)[0]
    n = min(len(mouth), int(voiced[-1]) + 4) if len(voiced) else len(mouth)   # skip the silent closing hold
    mouth, env = mouth[1:n], env[1:n]
    lags = {L: corr_at(mouth, env, L) for L in range(-MAXLAG, MAXLAG + 1)}
    best = max(lags, key=lags.get)
    von = env > 0.15 * np.percentile(env, 95)
    mon = mouth > np.median(mouth)
    agree = float(np.mean(von == mon))
    r = {"video": Path(video).name, "voice": Path(wav).name, "frames": int(n), "lag_ms": best * 1000 // FPS,
         "corr": round(lags[best], 3), "corr_0": round(lags[0], 3), "agree": round(agree, 3)}
    r["pass"] = abs(r["lag_ms"]) <= 80 and r["corr"] >= 0.45
    return r


def main():
    out, still, bbox = sys.argv[1], sys.argv[2], sys.argv[3]
    rows = []
    for pair in sys.argv[4:]:
        v, a = pair.split("=", 1)
        rows.append(check(v, a, still, bbox)); print(json.dumps(rows[-1]))
    Path(out).write_text(json.dumps({"method": __doc__.strip().splitlines()[0], "bbox": bbox, "results": rows},
                                    indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
