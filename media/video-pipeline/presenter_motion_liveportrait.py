#!/usr/bin/env python3
"""Claire Lee — natural head/eye/expression motion from one still (LivePortrait).

Licences (verified 2026-11-04): LivePortrait code MIT (KwaiVGI/LivePortrait
LICENSE), weights MIT (HF card). InsightFace models are NOT used (non-commercial):
the face is located from 5 hand-measured points on the single still, refined
with LivePortrait's own landmark.onnx (MIT, same HF repo).

Motion is scheduled from the voice track, not looped:
  * blinks every ~2.6-4.4 s (seeded), placed in pauses where possible
  * smile rises at phrase starts / the greeting and settles; relaxed base
  * small nod (pitch dip) at each sentence end
  * slow, non-repeating head drift (incommensurate sines, seeded phases)
  * lips held relaxed-closed (MuseTalk drives the mouth afterwards)

    LIVEPORTRAIT_REPO=... python presenter_motion_liveportrait.py \
        --image still.png --audio voice.wav --out frames_dir --pts "x,y x,y x,y x,y x,y"
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import torch

REPO = Path(os.environ["LIVEPORTRAIT_REPO"])
sys.path.insert(0, str(REPO))

from src.config.inference_config import InferenceConfig  # noqa: E402
from src.live_portrait_wrapper import LivePortraitWrapper  # noqa: E402
from src.utils.camera import get_rotation_matrix  # noqa: E402
from src.utils.crop import crop_image, paste_back, prepare_paste_back  # noqa: E402
from src.utils.human_landmark_runner import LandmarkRunner  # noqa: E402
from src.utils.retargeting_utils import calc_eye_close_ratio  # noqa: E402

FPS = 25


def silences(wav):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "silencedetect=noise=-35dB:d=0.2",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    s = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    e = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    return list(zip(s, e + [1e9] * (len(s) - len(e))))


def bump(t, c, w):
    """smooth raised-cosine bump centred at c, half-width w"""
    x = (t - c) / w
    return 0.5 * (1 + math.cos(math.pi * x)) if abs(x) < 1 else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--pts", required=True, help="5 points: left eye, right eye, nose, left mouth, right mouth")
    ap.add_argument("--seconds", type=float, default=None)
    ap.add_argument("--tail", type=float, default=0.6)
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--base-smile", type=float, default=-0.25)
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)
    torch.set_num_threads(os.cpu_count() or 4)

    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                "default=nw=1:nk=1", a.audio], capture_output=True, text=True).stdout)
    if a.seconds:
        dur = min(dur, a.seconds)
    total = dur + a.tail
    n = int(round(total * FPS))
    gaps = [(s, min(e, dur)) for s, e in silences(a.audio) if s < dur]
    speech = []
    prev = 0.0
    for s, e in gaps:
        if s - prev > 0.3:
            speech.append((prev, s))
        prev = e
    if dur - prev > 0.3:
        speech.append((prev, dur))

    cfg = InferenceConfig(flag_force_cpu=True, flag_use_half_precision=False)
    lp = LivePortraitWrapper(inference_cfg=cfg)
    lmr = LandmarkRunner(ckpt_path=str(REPO / "pretrained_weights/liveportrait/landmark.onnx"), onnx_provider="cpu")

    img_bgr = cv2.imread(a.image)
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pts5 = np.array([[float(v) for v in p.split(",")] for p in a.pts.split()], np.float32)
    lmk = lmr.run(img, pts5)                       # 203 points, refined by LivePortrait's own model
    crop = crop_image(img, lmk, dsize=512, scale=2.3, vy_ratio=-0.125, flag_do_rot=True)
    I_s = lp.prepare_source(cv2.resize(crop["img_crop"], (256, 256), interpolation=cv2.INTER_AREA))
    x_info = lp.get_kp_info(I_s)
    f_s = lp.extract_feature_3d(I_s)
    x_s = lp.transform_keypoint(x_info)
    mask_ori = prepare_paste_back(cfg.mask_crop, crop["M_c2o"], dsize=(img.shape[1], img.shape[0]))
    src_eye = float(calc_eye_close_ratio(lmk[None]).mean())   # the still's own eye-open ratio

    # --- schedule ---------------------------------------------------------
    blinks, t = [], 0.7 + rng.uniform(0, 0.5)
    while t < total - 0.3:
        near = [s for s, e in gaps if abs(s - t) < 0.8 and e - s > 0.15]
        bt = (near[0] + 0.05) if near else t
        blinks.append(bt)
        t = bt + rng.uniform(2.6, 4.4)
    smile_peaks = [s + 0.25 for s, _ in speech] + [dur + 0.25]          # phrase starts + closing smile
    nods = [e - 0.05 for _, e in speech]                                 # sentence ends
    ph = rng.uniform(0, 2 * math.pi, 6)
    sched = {"source_eye_ratio": round(src_eye, 3), "blinks_s": [round(b, 2) for b in blinks], "smile_peaks_s": [round(x, 2) for x in smile_peaks],
             "nods_s": [round(x, 2) for x in nods], "speech_s": speech, "frames": n}

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    p0, y0, r0 = x_info["pitch"], x_info["yaw"], x_info["roll"]
    with torch.no_grad():
        for i in range(n):
            t = i / FPS
            eye_close = max([bump(t, b + 0.08, 0.09) for b in blinks] + [0.0])
            smile = a.base_smile + 0.55 * max([bump(t, c, 0.55) for c in smile_peaks] + [0.0])
            if t > dur:
                smile = max(smile, 0.45)  # warm closing smile hold
            nod = max([bump(t, c, 0.28) for c in nods] + [0.0])
            dp = -2.2 * nod + 0.7 * math.sin(2 * math.pi * t / 4.3 + ph[0]) + 0.3 * math.sin(2 * math.pi * t / 1.9 + ph[1])
            dy = 1.4 * math.sin(2 * math.pi * t / 6.7 + ph[2]) + 0.4 * math.sin(2 * math.pi * t / 2.3 + ph[3])
            dr = 0.7 * math.sin(2 * math.pi * t / 5.9 + ph[4]) + 0.2 * math.sin(2 * math.pi * t / 1.7 + ph[5])
            R_d = get_rotation_matrix(p0 + dp, y0 + dy, r0 + dr)
            delta = x_info["exp"].clone()
            # LivePortrait's own smile edit (gradio_pipeline.update_delta_new_smile)
            for k, ax, w in [(20, 1, -0.01), (14, 1, -0.02), (17, 1, 0.0065), (17, 2, 0.003),
                             (13, 1, -0.00275), (16, 1, -0.00275), (3, 1, -0.0035), (7, 1, -0.0035)]:
                delta[0, k, ax] += smile * w
            x_d = x_info["scale"] * (x_info["kp"] @ R_d + delta) + x_info["t"]
            # eyes: from the still's own open ratio toward closed during a blink
            eye_target = [[src_eye * (1 - 0.95 * eye_close)]]
            x_d = x_d + lp.retarget_eye(x_s, lp.calc_combined_eye_ratio(eye_target, lmk))
            # lips relaxed-closed
            x_d = x_d + lp.retarget_lip(x_s, lp.calc_combined_lip_ratio([0.0], lmk))
            x_d = lp.stitching(x_s, x_d)
            o = lp.parse_output(lp.warp_decode(f_s, x_s, x_d)["out"])[0]
            frame = paste_back(o, crop["M_c2o"], img, mask_ori)
            cv2.imwrite(str(out / f"{i:06d}.png"), cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
    (out / "schedule.json").write_text(json.dumps(sched, indent=2))
    print(json.dumps(sched))


if __name__ == "__main__":
    main()
