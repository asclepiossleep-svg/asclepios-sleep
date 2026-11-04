#!/usr/bin/env python3
"""Claire Lee — lip-sync test from one still + one audio track, MuseTalk V1.5 core.

Licences (verified 2026-11-04): MuseTalk code MIT, weights MIT ("any purpose,
even commercially"); sd-vae-ft-mse MIT; whisper-tiny Apache-2.0.
MuseTalk's optional preprocessing models (mmpose/DWPose, S3FD, BiSeNet face
parsing) are NOT used: the source is a single fixed still, so the face box is
measured once by hand and the paste-back uses a feathered lower-face mask.

Only the lower face is regenerated; eyes, hair, wardrobe and background stay
the source pixels. A very small whole-frame sway (sub-pixel scale/offset) is
added so the shot doesn't read as a frozen photo. No blinks are synthesised.

Run inside a venv with torch/diffusers/transformers, from anywhere:
  MUSETALK_REPO=... python presenter_lipsync_musetalk.py \
      --image still.png --audio voice.wav --out talk.mp4 [--seconds 5]
"""
import argparse
import math
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import cv2
import numpy as np
import torch

REPO = Path(os.environ["MUSETALK_REPO"])
sys.path.insert(0, str(REPO))
os.chdir(REPO)  # MuseTalk loads ./models/... relative paths

from transformers import WhisperModel  # noqa: E402
from musetalk.utils.audio_processor import AudioProcessor  # noqa: E402
from musetalk.utils.utils import datagen, load_all_model  # noqa: E402

FPS = 25


def lower_face_mask(h, w):
    """Feathered ellipse over mouth + jaw inside the crop (crop-local coords)."""
    m = np.zeros((h, w), np.float32)
    cv2.ellipse(m, (w // 2, int(h * 0.74)), (int(w * 0.40), int(h * 0.30)), 0, 0, 360, 1.0, -1)
    m[: int(h * 0.50)] = 0  # never touch the eyes / nose bridge
    k = max(3, (min(h, w) // 8) | 1)
    return cv2.GaussianBlur(m, (k, k), 0)[..., None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--bbox", default="150,92,338,318", help="x1,y1,x2,y2 face box in the still")
    ap.add_argument("--seconds", type=float, default=None)
    ap.add_argument("--batch", type=int, default=8)
    a = ap.parse_args()
    torch.set_num_threads(os.cpu_count() or 4)
    t0 = time.time()

    audio = Path(a.audio).resolve()
    if a.seconds:
        cut = Path(tempfile.mkdtemp()) / "cut.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(audio), "-t", str(a.seconds),
                        "-ar", "16000", "-ac", "1", str(cut)], check=True)
        audio = cut

    device = torch.device("cpu")
    vae, unet, pe = load_all_model(unet_model_path="models/musetalkV15/unet.pth", vae_type="sd-vae",
                                   unet_config="models/musetalkV15/musetalk.json", device=device)
    timesteps = torch.tensor([0], device=device)
    ap_ = AudioProcessor(feature_extractor_path="models/whisper")
    whisper = WhisperModel.from_pretrained("models/whisper").to(device=device, dtype=torch.float32).eval()
    whisper.requires_grad_(False)
    feats, length = ap_.get_audio_feature(str(audio))
    chunks = ap_.get_whisper_chunk(feats, device, torch.float32, whisper, length, fps=FPS,
                                   audio_padding_length_left=2, audio_padding_length_right=2)

    frame = cv2.imread(str(Path(a.image).resolve()))
    x1, y1, x2, y2 = map(int, a.bbox.split(","))
    y2 = min(y2 + 10, frame.shape[0])  # v1.5 extra margin
    crop = cv2.resize(frame[y1:y2, x1:x2], (256, 256), interpolation=cv2.INTER_LANCZOS4)
    latent = vae.get_latents_for_unet(crop)
    mask = lower_face_mask(y2 - y1, x2 - x1)

    frames = []
    gen = datagen(whisper_chunks=chunks, vae_encode_latents=[latent], batch_size=a.batch, delay_frame=0, device=device)
    with torch.no_grad():
        for wb, lb in gen:
            pred = unet.model(lb.to(torch.float32), timesteps, encoder_hidden_states=pe(wb)).sample
            for r in vae.decode_latents(pred):
                r = cv2.resize(r.astype(np.uint8), (x2 - x1, y2 - y1)).astype(np.float32)
                f = frame.astype(np.float32).copy()
                roi = f[y1:y2, x1:x2]
                f[y1:y2, x1:x2] = roi * (1 - mask) + r * mask
                frames.append(f.astype(np.uint8))
    infer_s = time.time() - t0

    # gentle sway: ~0.4% scale breathing + <=1.5 px drift, slow sinusoids
    h, w = frame.shape[:2]
    tmp = Path(tempfile.mkdtemp())
    for i, f in enumerate(frames):
        t = i / FPS
        s = 1.0 + 0.004 * math.sin(2 * math.pi * t / 5.3)
        dx, dy = 1.5 * math.sin(2 * math.pi * t / 7.1), 1.0 * math.sin(2 * math.pi * t / 4.7 + 1)
        M = cv2.getRotationMatrix2D((w / 2, h * 0.35), 0.15 * math.sin(2 * math.pi * t / 6.1), s)
        M[:, 2] += (dx, dy)
        cv2.imwrite(str(tmp / f"{i:06d}.png"), cv2.warpAffine(f, M, (w, h), borderMode=cv2.BORDER_REFLECT))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", str(tmp / "%06d.png"),
                    "-i", str(audio), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac",
                    "-shortest", a.out], check=True)
    print(f"frames={len(frames)} infer_s={infer_s:.1f} total_s={time.time() - t0:.1f}")


if __name__ == "__main__":
    main()
