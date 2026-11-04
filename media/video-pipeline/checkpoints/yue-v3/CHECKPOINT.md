# Checkpoint: Claire Lee, Cantonese presenter (V3), paused

ASCLEPIOS-VIDEO-001 · issue #142 · saved 2026-11-04 · branch `media/asclepios-video-001`

**Status:** NOT APPROVED. This is a working test, not a production asset.
Owner feedback, verbatim in summary: tone is good, but **Cantonese diction isn't accurate yet and the lip-sync isn't in sync yet**. Paused by the owner, with the order "English first, Cantonese later". Resume from this step. Don't start over.

**Caveats (owner-requested wording):**
- An ASR character error rate of 0% only means the recognised text matched. **It does not confirm the Cantonese pronunciation.** That needs a native listener.
- The lip-sync lag figures are automated measurements. **They still need real viewing.**

## Where it stands

| Item | File (this folder) | Notes |
|---|---|---|
| Best voice so far | `voice/V3_cv2_instruct.flac` (5.04 s) | CosyVoice2-0.5B, instruct `用粤语说这句话<|endofprompt|>`, text in simplified-character Cantonese `大家好，我系 Claire Lee，大家嘅健康科普主持人。`, prompt = `V1_sft_tc` (the 300M-SFT built-in `粤语女` voice, so the same timbre) |
| Voice A/B | `voice/V1_sft_tc.flac`, `V2_sft_sc.flac`, `V4_cv2_split_name.flac`, `diction_results.json` | whisper-large-v3-turbo (yue) CER: V1 0.583 · V2 0.292 · V3 0.000 · V4 0.000 (V4 joins sound unnatural, 7.3 s) |
| Earlier 13 s voice | `voice/C_name_zh_13s_300M.flac` | 300M-SFT. Superseded by the V3 method |
| 5 s V3 lip-sync test | `video/claire_yue_v3_5s_720p.mp4` + `.srt` | per-sentence lag −80 / 0 / 0 ms. Articulation is shallow (the smile in the source still limits mouth shapes) |
| Earlier 13.6 s test | `video/claire_yue_13s_720p.mp4` + `.srt` | the owner's "not passed" review was of this clip |
| Presenter still | `image/claire_v06_teal_test.png` | v0.6 board front portrait, white coat recoloured to a teal jacket, logo removed (`presenter_wardrobe_test.py`). Face and hair untouched. TEST wardrobe, not v0.7 |
| Environment lock | `venv-requirements.lock.txt` | Python 3.11 venv (uv) |
| Integrity | `SHA256SUMS` | |

**Still to supply (owner/designer):** a front portrait in the same likeness with **relaxed, naturally closed lips** (no broad smile), plus a non-white-coat wardrobe (v0.7). The current smiling still limits the mouth shapes.

## Scripts (committed in `media/video-pipeline/`)
`presenter_yue_diction_test.py` (voice A/B + ASR), `presenter_yue_cosyvoice.py`, `presenter_wardrobe_test.py`, `presenter_lipsync_musetalk.py`, `run_presenter_lipsync_test.sh`, `presenter_pause_close.py`, `presenter_sync_check.py`, `presenter_compose.py`

## Models (large; not stored here; re-download from these exact sources)

| Model | Source | Revision | Licence |
|---|---|---|---|
| CosyVoice-300M-SFT | `huggingface.co/FunAudioLLM/CosyVoice-300M-SFT` | `fbb71de2afe387ed854eebd80b9f3d078c6b9869` | Apache-2.0 |
| CosyVoice2-0.5B | `huggingface.co/FunAudioLLM/CosyVoice2-0.5B` | `eec1ae6c79877dbd9379285cf8789c9e0879293d` | Apache-2.0 |
| CosyVoice code | `github.com/FunAudioLLM/CosyVoice` (recursive, Matcha-TTS submodule) | `074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc` | Apache-2.0 |
| whisper-large-v3-turbo (ASR check) | `huggingface.co/openai/whisper-large-v3-turbo` | `41f01f3fe87f28c78e2fbf8b568835947dd65ed9` | MIT |
| MuseTalk V1.5 (`musetalkV15/unet.pth`, `musetalk.json`) | `huggingface.co/TMElyralab/MuseTalk` | `2bcb936e2fddb4d86db4c62fd45b387d0c061571` | MIT |
| MuseTalk code | `github.com/TMElyralab/MuseTalk` | `0a89dec45a0192b824e3cf4daf96c239440c5ed8` | MIT |
| sd-vae-ft-mse | `huggingface.co/stabilityai/sd-vae-ft-mse` | `31f26fdeee1355a5c34592e401dd41e45d25a493` | MIT |
| whisper-tiny (MuseTalk audio) | `huggingface.co/openai/whisper-tiny` | `169d4a4341b33bc18d8881c4b69c2e104e1cc0af` | Apache-2.0 |
| u2net_human_seg (rembg) | `github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx` | sha256 `01eb6a29…1c73c` | Apache-2.0 |

Network allow-list needed: `huggingface.co`, `us.aws.cdn.hf.co`, `cdn-lfs.huggingface.co`, `www.modelscope.cn`. Download with `HF_HUB_DISABLE_XET=1`, because `cas-server.xethub.hf.co` is blocked.

## Restart (fresh cloud session)
```bash
W=<scratch dir>; mkdir -p $W/cosy/models $W/muse
# 1. env (Python 3.11)
uv venv -p /usr/bin/python3.11 $W/cosy/venv && . $W/cosy/venv/bin/activate
uv pip install "setuptools<70" wheel && uv pip install torch==2.3.1 torchaudio==2.3.1 torchvision==0.18.1 numpy==1.26.4
uv pip install --no-build-isolation openai-whisper==20231117
uv pip install -r media/video-pipeline/checkpoints/yue-v3/venv-requirements.lock.txt
# 2. code + models
git clone --recursive https://github.com/FunAudioLLM/CosyVoice $W/cosy/CosyVoice && git -C $W/cosy/CosyVoice checkout 074ca6dc
git clone https://github.com/TMElyralab/MuseTalk $W/muse/MuseTalk && git -C $W/muse/MuseTalk checkout 0a89dec4
cd $W/cosy/models && HF_HUB_DISABLE_XET=1 python -c "from huggingface_hub import snapshot_download as d; \
  d('FunAudioLLM/CosyVoice-300M-SFT', local_dir='CosyVoice-300M-SFT', revision='fbb71de2afe387ed854eebd80b9f3d078c6b9869'); \
  d('FunAudioLLM/CosyVoice2-0.5B', local_dir='CosyVoice2-0.5B', revision='eec1ae6c79877dbd9379285cf8789c9e0879293d'); \
  d('openai/whisper-large-v3-turbo', local_dir='whisper-large-v3-turbo', revision='41f01f3fe87f28c78e2fbf8b568835947dd65ed9')"
cd $W/muse/MuseTalk && HF_HUB_DISABLE_XET=1 python -c "from huggingface_hub import snapshot_download as d; \
  d('TMElyralab/MuseTalk', local_dir='models', allow_patterns=['musetalkV15/*'], revision='2bcb936e2fddb4d86db4c62fd45b387d0c061571'); \
  d('stabilityai/sd-vae-ft-mse', local_dir='models/sd-vae', allow_patterns=['config.json','diffusion_pytorch_model.bin']); \
  d('openai/whisper-tiny', local_dir='models/whisper', allow_patterns=['config.json','pytorch_model.bin','preprocessor_config.json'])"
# 3. restore still + voice from this checkpoint
mkdir -p $W/claire $W/diction && cp media/video-pipeline/checkpoints/yue-v3/image/claire_v06_teal_test.png $W/claire/
ffmpeg -i media/video-pipeline/checkpoints/yue-v3/voice/V3_cv2_instruct.flac $W/diction/V3_cv2_instruct.wav
# 4. next step = full 13 s with the V3 method (voice per sentence, then lip-sync, pause-close, sync check, compose)
COSYVOICE_REPO=$W/cosy/CosyVoice COSYVOICE_MODELS=$W/cosy/models python media/video-pipeline/presenter_yue_diction_test.py $W/diction
PRESENTER_WORK=$W PRESENTER_AUDIO=$W/diction/V3_cv2_instruct.wav PRESENTER_TAG=v3s1 bash media/video-pipeline/run_presenter_lipsync_test.sh full
python media/video-pipeline/presenter_sync_check.py $W/lipsync/v3s1_full_raw.mp4 $W/diction/V3_cv2_instruct.wav $W/claire/claire_v06_teal_test.png
```
Running downloaded model code in a cloud session needs explicit owner approval, because the session's safety check flags "Code from External".
