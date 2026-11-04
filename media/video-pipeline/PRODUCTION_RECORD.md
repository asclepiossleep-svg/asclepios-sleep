# ASCLEPIOS HEALTH video production record

ASCLEPIOS-VIDEO-001 (issue #142) · English A02 film with presenter Claire Lee · 2026-11-04

This file records how the film was made, why each choice was made, and how
to reuse the method for the Cantonese, Mandarin and later films without
working it all out again. To find any asset, see `ASSET_INDEX.md`. For
storage, see `STORAGE_PLAN.md`. For licences, see `PRESENTER_LICENCE_REVIEW.md`.

## 1. Decisions of record

Each decision gives its source on #142 or in the owner's session; the issue holds the full text.

| # | Decision | Source |
|---|---|---|
| D1 | Free and local production only: no paid API, cloud GPU, credits or purchases. A single Rex executor; no merge, deploy or workflow changes | owner, initial brief |
| D2 | Use the 21 supplied stills and the A02 text verbatim, in the original order. No self-made pages or illustrations without approval | owner |
| D3 | Captions 1.5× size, with style adapted to each background. Layout **Proposal A**: a temporary zoom toward each still's own text (originals unaltered) | owner chose "A" |
| D4 | Music: an original procedural "melodic" score at −17 dB, ducked under speech, with a 2.5 s tail | owner accepted |
| D5 | English first, then Cantonese (paused at `checkpoints/yue-v3`), then Mandarin | owner, standing workflow 6640765382 |
| D6 | Presenter Claire Lee uses the **v05 studio still**: white business blazer, blue top, chest logo, coffee and notebook, seated studio, no clinical props or credentials | owner handoff 6640728838 |
| D7 | No "AI-generated" label and no presenter title in speech or captions | owner correction 6640077234 |
| D8 | Claire's lines are the owner amendment (6633840244): P01 is the opening; P02–P04 are the first sentence of A02 shots 06/12/18 moved on camera (not read twice); P05 is the farewell | owner |
| D9 | All English captions at **bottom centre** | owner, final brief |
| D10 | The extra official logo goes only on the opening/company introduction and the closing page | owner |
| D11 | The **opening page was rebuilt with the official logo**, English only. The corner card is removed from 01 so the logo isn't doubled; the card stays on P01 and 20 | owner, 2026-11-04 |
| D11b | The **closing page (20) also carries the official logo**, built the same way as the opening; the corner card is now only on P01 | owner, 2026-11-04 |
| D12 | Cut (one frame), not crossfade, into and out of presenter shots, so the mouth never moves during a fade | Rex, disclosed in the preview |
| D13 | The 1920×1080 master was owner-authorised without a second preview round | owner, 2026-11-04 |
| D14 | No InsightFace (non-commercial). Each tool's licence is verified before use; installs that hit "Code from External" ran only after owner approval, and that check was never bypassed | owner approvals in session |

## 2. Pipeline and parameters

```
voice lines ─► Kokoro TTS ────────────────────────────────┐
v05 still ─► LivePortrait (motion) ─► MuseTalk (lip-sync) ├► build.py ─► master MP4 + SRT/VTT/ASS + qa.json
          ─► pause-close ─► hand/shoulder warps ─► P0x.mp4┘
stills + A02 text + music_gen ────────────────────────────┘
```

### Narration and voice
- Kokoro-82M v1.0 (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) via `kokoro-onnx` 0.6.1, with voice `bf_emma`, speed 0.95, `en-gb`, default G2P ("ASCLEPIOS" pronunciation A).
- Lead-in 1.2 s; 0.55 s between segments. Per-shot holds: 2.5 s after 13 and 15; 1.2 s after 07, 09, 10, 11 and 17; 0.4 s after each Claire line, 0.9 s after P05.

### Mix and master
- Speech: high-pass 70 Hz, compressor (−20 dB, 2.5:1).
- Music at −17 dB, sidechain-ducked (threshold 0.015, 10:1, release 600 ms).
- Two-pass loudnorm to **−16 LUFS / −1.5 dBTP**, LRA 11, 48 kHz stereo AAC 192k.

### Captions
- Inter SemiBold at 72 px (48 × 1.5) on a 1920×1080 canvas, max 38 characters per line, two lines, balanced splitting, and short clauses folded into the next.
- Style by background brightness: "Diagram" (navy on white), "Photo" (white on a translucent navy box; always used for presenter shots) or "Dark".
- Bottom centre (ASS alignment 2). Reading speed ≤ 20 characters per second.

### Visuals
- Stills are fitted without cropping. Proposal A focus is `[cx, cy, zoom]` per shot.
- Crossfade 0.8 s between stills and a one-frame cut at presenter shots. Each clip carries 3 spare frames (fix `c25adb5`).
- Logo card: the official logo on a white rounded card, height 150 px at 1080p, 40 px margin, top-right, during the named shots only.

### Claire segments (`presenter_render_segments.sh`)
- **Motion:** LivePortrait (rev `9b294b3`, HF weights `82a4fa6`). It runs without InsightFace, using the 5 manual points `795,202 882,194 840,260 807,290 880,286` and its own `landmark.onnx`.
  - The motion schedule comes from the voice: blinks every ~2.6–4.4 s (seed 11), placed in pauses; smile peaks at phrase starts, with a closing smile ≥ 0.45; −2.2° nods at sentence ends; slow head drift.
  - Base smile −0.25; lips retargeted to 0 (relaxed and closed). Tail 0.45 s, or 1.0 s for the farewell.
- **Lip-sync:** MuseTalk V1.5 (repo rev `0a89dec`), with sd-vae-ft-mse and whisper-tiny, on CPU. Face bbox `757,120,930,350`, run on the LivePortrait frames.
- **Finish:** lips close during silences, with ramps kept inside the pauses; a 3-frame ease into the tail; `--breath-px 0` (the breathing comes from the body step).
- **Body:** own-code warps inside the rembg `u2net_human_seg` body mask only.
  - Wrist roll ≤ 0.9° about the desk-contact point (y 900); finger nudge 2.0/1.3 px; a 1 px lift at pauses; shoulder breathing 2.5 px between neck y 430 and forearm y 780.
  - The desk, coffee, notebook and room are never moved.
- **Speed:** about 15–45 min CPU per segment (3–12 s of speech) on 4 vCPU.

### Opening page (`make_opening_page.py`)
- Starts from the 01 still: the dark text pixels inside box `360,260,1320,470` are inpainted (Telea, radius 9).
- The official full logo (white ground multiplied away, ink unchanged) is placed at 50 % of page height, centred at y 0.36.
- English tagline in DejaVu Sans, as on the approved stills. In-film zoom `[0.5, 0.42, 1.2]`.

## 3. Tool versions (this session)

| Tool | Version |
|---|---|
| FFmpeg | 6.1.1 (Ubuntu 6.1.1-3ubuntu5), libass, loudnorm, sidechaincompress, xfade |
| Python | 3.11; system Python for `build.py` (Kokoro); venv `cosy/venv` for the presenter stages |
| kokoro-onnx | 0.6.1 |
| torch / diffusers / transformers | 2.3.1 / 0.29.0 / 4.51.3 |
| onnxruntime / rembg | 1.18.0 / 2.0.59 |
| LivePortrait | git `9b294b3`, weights HF rev `82a4fa6` |
| MuseTalk | git `0a89dec`, V1.5 UNet |
| whisper-large-v3-turbo | ASR check only (Cantonese) |
| CosyVoice-300M-SFT, CosyVoice2-0.5B | Cantonese (paused); see `checkpoints/yue-v3/CHECKPOINT.md` |

The full Python lock is in `checkpoints/yue-v3/venv-requirements.lock.txt`. Licences are in `PRESENTER_LICENCE_REVIEW.md`.

### Environment notes
- Download Hugging Face models with `HF_HUB_DISABLE_XET=1`, because the xet host is blocked.
- openai-whisper needs `setuptools<70` and `--no-build-isolation`.
- pyarrow is pinned to 18.1.0 with numpy 1.26.4. Encode with even frame dimensions.
- The session disk is a fixed allowance. Presenter scripts delete their temp frame folders (`81f2c4f`); delete motion frames once a segment is final.

## 4. Steps to rebuild the English film

```bash
export S=<work dir>   # holds a02-images/ studio/ brand/ en-lines/ segments/ kokoro/ lp/ muse/ cosy/venv
# 1. Claire's voice lines (if missing)
KOKORO_MODEL_DIR=$S/kokoro python3 presenter_en_lines.py $S/en-lines
# 2. Claire segments (skip any already in $S/segments)
PRESENTER_WORK=$S bash presenter_render_segments.sh open_cam p02_cam p03_cam p04_cam end_cam
# 3. opening and closing pages (01 and 20 are the same original still)
python3 make_opening_page.py $S/a02-images/01_Brand_Opening_en.jpg \
  $S/brand/ASCLEPIOS_HEALTH_Logo_Full_Original_v1_20261104.jpeg $S/a02-images/01_Brand_Opening_en_logo_v1.jpg
python3 make_opening_page.py $S/a02-images/20_Brand_Ending_en.jpg \
  $S/brand/ASCLEPIOS_HEALTH_Logo_Full_Original_v1_20261104.jpeg $S/a02-images/20_Brand_Ending_en_logo_v1.jpg
# 4. review preview, then the master
export KOKORO_MODEL_DIR=$S/kokoro ASCLEPIOS_IMAGES_DIR=$S/a02-images ASCLEPIOS_PRESENTER_DIR=$S
python3 build.py projects/a02-english-presenter --lowres --preview-res 960x540 --out $S/out-presenter
python3 build.py projects/a02-english-presenter --out $S/out-presenter-1080     # 1920x1080 master + qa.json
```
QA must report `all_pass: true`. After that, check by eye:
- the opening page
- every presenter cut
- lip-sync
- that the logo appears only on the named shots

## 5. Reusing this for Cantonese, Mandarin and new films

**Keep as-is:** `build.py`, music, caption system, the v05 still and its anchor points, the motion/lip-sync/body chain, the logo rules, the QA gates and the opening page.

**Change per language:**
1. **Approved script.** A native-reviewed, owner-approved translation of A02 and of Claire's lines. Don't machine-translate and publish.
2. **Voice.**
   - Cantonese: resume from `checkpoints/yue-v3`. The best method so far is the CosyVoice2-0.5B instruct "V3". The open items are native-listener diction approval and a closed-lips still.
   - Mandarin: Kokoro has Mandarin voices (`zf_*`/`zm_*`, Apache-2.0), but a licence check and a listening test come first; CosyVoice2 is the fallback.
   - Each new voice gets an A/B test plus an ASR check. Remember that ASR 0 % CER is not proof of pronunciation.
3. **Captions.**
   - Use `split_cues(..., cjk=True)` and a CJK font (`WenQuanYi Zen Hei` or Noto Sans CJK).
   - Use a lower characters-per-line limit (about 16–18 at 1.5×).
   - Traditional characters for zh-HK, Simplified for Mandarin, unless the owner says otherwise.
4. **Stills with text.** Use the language's own approved stills if supplied. Otherwise ask; don't overlay translated text unasked.
5. **Claire segments.** Same command, new WAVs in `en-lines/` (or a language folder). Re-render P01–P05 only for the new language.

**New film:**
- Copy `projects/a02-english-presenter/`.
- Replace `segments` with the new approved script and stills, and keep the other fields.
- Render the low-res preview, get owner sign-off, then the master.

## 6. Problems met and fixes (so they aren't rediscovered)

| Symptom | Cause | Fix |
|---|---|---|
| Model downloads blocked | HF/ModelScope/xet not in the network allowlist | owner added the domains; `HF_HUB_DISABLE_XET=1` |
| Robotic Cantonese voice (espeak) | not acceptable to the owner | switched to CosyVoice |
| Syllables clipped at pauses | pause-close ramps crossed into speech | ramps limited to the silences |
| Chopped shoulders | my own crop at x = 53 | full-width framing |
| Rectangle seam around the head | LivePortrait paste-back on a flat background | `--rebg` (not needed for the studio still) |
| Disk full during P05 | leaked temp frame folders | scripts clean up on exit (`81f2c4f`) |
| Picture stopped at 83.8 s | a presenter clip one frame short of its xfade | 3 spare frames per clip; QA checks the video length (`c25adb5`) |
| Opening logo clipped by the zoom | the 1.5× focus was set for small text | focus `[0.5, 0.42, 1.2]` |

## 7. Known limits (disclosed to the owner)

- Lip-sync is checked by eye. `presenter_sync_check.py` is only a rough activity diagnostic.
- Claire's fingers don't bend independently, because there is no hand model; motion is a small wrist roll and nudge.
- Bottom-centre captions partly cover the desk and hands in presenter shots.
- Everything runs on CPU, so presenter segments are slow (see §2).
