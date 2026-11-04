# Presenter (Claire Lee) — tool & model licence review

ASCLEPIOS-VIDEO-001 · issue #142 · reviewed 2026-11-04 from official sources
(fetched from the projects' own GitHub repositories; line numbers refer to
those files on their default branch at review time).

Use case being assessed: brand educational video for ASCLEPIOS HEALTH
(commercial organisation), free/local tools only.

## Voice

| Component | Version used | Licence (official source) | Commercial use | Status |
|---|---|---|---|---|
| Kokoro-82M weights + voices (`bf_emma`) | v1.0 (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) | Apache-2.0 — `hexgrad/kokoro` `LICENSE`; README L5: "Apache-licensed weights … production environments" | Allowed | **Used (EN)** |
| kokoro-onnx runtime | 0.6.1 (PyPI) | MIT — `thewh1teagle/kokoro-onnx` `LICENSE` | Allowed | **Used (EN)** |
| espeak-ng (incl. `yue` voice) | 1.51 (Ubuntu package) | GPL-3.0 — `espeak-ng/espeak-ng` `COPYING`; GPL governs the software, not generated audio | Allowed | Used for a **Cantonese pronunciation reference only** (formant synthesis, not natural) |
| sherpa-onnx `vits-cantonese-hf-xiaomaiiwn` | tts-models release | Runtime Apache-2.0 (`k2-fsa/sherpa-onnx` `LICENSE`); training code MIT (`csukuangfj/vits-cantonese` `LICENSE`, © Jaehyeon Kim). **Weights** come from `huggingface.co/xiaomaiiwn/vits-cantonese` (per the model's own build script). That model card, the weights licence, the training data and the speaker consent can't be read from here (Hugging Face is blocked by this environment's network policy). | **Unverified** | **Not used** (unverified, not declared forbidden) |
| CosyVoice (Cantonese-capable) | — | Code Apache-2.0 (`FunAudioLLM/CosyVoice` `LICENSE`). Weights are hosted on Hugging Face/ModelScope, both blocked; their weights licence is unverified | Unverified | Candidate once the network allows |

## Lip-sync / talking head

| Component | Licence (official source) | Commercial use | Status |
|---|---|---|---|
| SadTalker code | Apache-2.0 (`OpenTalker/SadTalker` `LICENSE` L5; README L42: "removed the non-commercial restriction") | Code allowed | — |
| SadTalker released weights (`SadTalker_V0.0.2_*.safetensors`) | These bundle (a) the ExpNet audio encoder, whose architecture and training init came from **Wav2Lip** (`src/audio2exp_models/networks.py` L49–60 loads `wav2lip.pth` into `audio_encoder`), and Wav2Lip is "personal/research/non-commercial purposes" only (`Rudrabha/Wav2Lip` README L310); (b) a face renderer from the face-vid2vid reproduction `zhanglonghao1992/One-Shot_Free-View_Neural_Talking_Head_Synthesis`, which has **no LICENSE file** (so no rights are granted); (c) the Deep3DFaceRecon 3DMM extractor (`epoch_20`, MIT code by Microsoft), trained on **BFM09**, whose terms are on `faces.dmi.unibas.ch` (unreachable here) | **Not cleared**: the Apache-2.0 code licence doesn't relicense the third-party-derived weights | **Not used** |
| Wav2Lip | Non-commercial (README L310) | No | Excluded |
| MuseTalk | Code MIT; README L540–543: "The trained model are available for any purpose, even commercially"; dependencies (whisper MIT, sd-vae-ft-mse CreativeML OpenRAIL-M, DWPose, S3FD) must follow their own licences | Allowed, subject to the dependencies' terms | **Suitable**, but the weights are on Hugging Face (**blocked**); CPU-only here, so slow |
| facexlib / GFPGAN | MIT / Apache-2.0 with third-party parts | — | Not needed without SadTalker |

## Presentation rule (repo)

`AGENTS.md` §4 L143–144, and `apps/api/src/domain/demoSeed.ts` L48–50, which reads: "Never depict an AI-generated or role-played 'medical professional' (e.g. in a white coat) endorsing a product, even in an internal-only draft."

The white lab coat is the rule's own example. The planned film includes P04/18 ("the ASCLEPIOS HEALTH approach … nutritional support"), delivered by a branded white-coated AI presenter for a brand that sells supplements, so the conflict stands. An "AI-generated presenter" label is required but doesn't resolve it.

**Minimum wardrobe change (face, hair, age and ethnicity unchanged):**
1. Remove the white lab coat (outer layer only). Keep the existing teal top.
2. Move the ASCLEPIOS HEALTH mark off clinical-style clothing, e.g. a small pin on the teal top, or the on-screen lower-third only.
3. No stethoscope, ID badge, scrubs or other clinical props.
