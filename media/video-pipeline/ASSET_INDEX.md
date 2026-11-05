# ASCLEPIOS HEALTH video assets: index

ASCLEPIOS-VIDEO-001 · issue #142 · branch `media/asclepios-video-001` · updated 2026-11-04

This is the place to find any asset for the next video. Each row gives the
file's location, purpose, version, approval status and any reuse limits.
Large media is **not** in git. Git holds code, manifests, captions and small
evidence files; Google Drive holds the media (see `STORAGE_PLAN.md`).
`PRODUCTION_RECORD.md` records how each asset was made and how to remake it.

## Status labels

| Label | Meaning |
|---|---|
| **APPROVED** | The owner accepted it in writing on #142 or in the session. Reuse as-is. |
| **LATEST** | The current working version, but no owner sign-off yet. Use it as the starting point. |
| **SUPERSEDED** | Replaced by a newer version. Keep it only as history; don't use it in new work. |
| **TEST** | A trial or diagnostic, never a production asset. |
| **PAUSED** | Work stopped by the owner. Resume from it; don't start over. |

## Location key

| Key | Where |
|---|---|
| `git:` | this repo, under `media/video-pipeline/` |
| `drive:` | Google Drive file ID (open `https://drive.google.com/file/d/<id>/view`) |
| `drive-folder:` | Google Drive folder ID (`https://drive.google.com/drive/folders/<id>`) |
| `session:` | the Rex cloud session scratch folder. **This storage is temporary.** It disappears when the session ends, so anything still marked `session:` must be uploaded to Drive (see "Still to archive" at the end). |

## 1. Brand

| Asset | Location | Version | Status | Use | Reuse limits |
|---|---|---|---|---|---|
| Official full logo (symbol + ASCLEPIOS™ HEALTH) | `drive:1bc4kv3saZXaAs9tQwxk-5o9WuLnHDzWL` · `ASCLEPIOS_HEALTH_Logo_Full_Original_v1_20261104.jpeg` · sha256 `f405d7b3e76cfed6…` | v1 2026-11-04 | **APPROVED** (owner supplied as original) | opening and closing pages, P01 corner card | Never redraw, recolour or crop into the mark. Only trimming its white border and scaling are allowed. Keep the ™. |
| Official symbol-only logo | `drive:1QBOHddhgUV_90lBgfc-4MHEEN35niKn2` · `…Logo_Symbol_Original_v1_20261104.jpeg` · sha256 `32f5f0d8010343f4…` | v1 | **APPROVED** | small marks, favicons | same as above |
| Brand colours | `apps/health-web/src/styles/tokens.css` | repo HEAD | **APPROVED** (in product) | generated cards, captions | none |

## 2. English A02 film: stills

21 supplied stills (1672×941), owner-approved order and text, in `drive-folder:19b8NXYhcTtenY25OBZb8EHwWjLSP_5g2`. The sha256 of each file is in `projects/a02-english/project.json` → `images`.

| Asset | Location | Status | Notes |
|---|---|---|---|
| `00_Cover_en.jpg` | Drive folder above | **APPROVED** | thumbnail/cover only, not shown in the film |
| `01_Brand_Opening_en.jpg` … `20_Brand_Ending_en.jpg` | Drive folder above | **APPROVED** | never altered. Proposal A zoom-to-text (`focus`) is a camera move, not an edit to the image |
| `01_Brand_Opening_en_logo_v1.jpg` | `session:a02-images/` · sha256 `fd6e788acca267ab…` · built by `git:make_opening_page.py` | **LATEST** (owner-requested 2026-11-04, in the 1080p master) | the 01 background art, with its text wordmark replaced by the official logo. English only. To rebuild it: `python3 make_opening_page.py 01_Brand_Opening_en.jpg <full logo> out.jpg` |
| `20_Brand_Ending_en_logo_v1.jpg` | `session:a02-images/` · built by `git:make_opening_page.py` from `20_Brand_Ending_en.jpg` (byte-identical to 01) | **LATEST** (owner-requested 2026-11-04: closing page must also carry the official logo; in the 1080p master) | same treatment as the opening page; English only |
| Layout proposal A/B | `git:evidence/a02-en_layout_proposal_before_after.jpg` | **APPROVED (A)** | reference only |

## 3. Presenter: Claire Lee

| Asset | Location | Version | Status | Reuse limits |
|---|---|---|---|---|
| Studio still, v05, coffee closer | `drive:1Ku_uDuzyH2Ze2RuQjXOzvoG6Q_Wjfhhx` · `Claire_Lee_Studio_v05_Coffee_Closer_20261104.png` · sha256 `df02698eb4538a72…` | v05 | **APPROVED** original, kept unchanged. Render from v05r1 below | White **business** blazer, blue top, chest logo, coffee and notebook. No clinical props, no credentials, no "doctor/expert" title, and no product endorsement (AGENTS.md §4). |
| Studio still, v05r1, face retouch | `session:studio/Claire_Lee_Studio_v05r1_Retouch_20261104.png` · sha256 `ab38b2f1f528baee…` · built by `git:presenter_retouch.py` from v05 | v05r1 | **LATEST**: source for every presenter render (owner request 6644776676) | Two red marks below the inner eye corners removed; under-eye redness reduced; tone evened; lines softened; pores kept. Face only, no pixel moved. Use this still for every language. Evidence: `git:evidence/claire_v05r1_*` |
| Lip-sync anchor points for v05 | `git:presenter_render_segments.sh` (`PTS`, `BBOX`) | — | **APPROVED** | valid only for the v05 still at 1672×940 |
| v0.6 board portrait and teal/navy/white wardrobe tests | `session:claire/`, `git:checkpoints/yue-v3/image/` | v0.6 | **SUPERSEDED** for English (v05 replaces them). Teal is the Cantonese test still | test only |
| English on-camera segments P01–P05 (from v05r1) | `session:segments/{open_cam,p02_cam,p03_cam,p04_cam,end_cam}.mp4` · 1672×940 · voice audio, no captions | 2026-11-05 | **LATEST**: in the 1080p master; same motion, lip-sync and timing as the accepted segments | Lines are fixed to the A02 presenter text below. Re-render only through `presenter_render_segments.sh` with `PRESENTER_STILL=<v05r1>`. Face QA: `git:evidence/claire_v05r1_face_qa.json` |
| P01–P05 sha256 (v05r1) | open `46b630ed…` · p02 `1aa3e94f…` · p03 `45ec7872…` · p04 `fb24bd5c…` · end `939628bf…` | | | |
| P01–P05 from the original v05 | `session:segments_v05_original/` · open `39edecb9…` · p02 `ca080fd6…` · p03 `7e159213…` · p04 `fa9ef7dc…` · end `d5e17722…` | 2026-11-04 | **SUPERSEDED** (carry the two red marks) | history only |
| Earlier 5 s tests (navy v3, motion, studio) | `session:lipsync/claire_en_*` · `git:evidence/claire_en_*` | | **SUPERSEDED / TEST** | history only |

## 4. Voice and narration

| Asset | Location | Status | Notes |
|---|---|---|---|
| A02 English narration text (by shot) | Drive handoff `A02_Narration_By_Shot_EN.txt` (sha256 `29a7296b…` in `projects/a02-english/project.json` → `source`), verbatim in that project.json | **APPROVED** | never reword. Presenter edition: `projects/a02-english-presenter/project.json` |
| Claire's English lines | `git:presenter_en_lines.py` (`LINES`) | **APPROVED** (owner amendment 6633840244, correction 6640077234) | no presenter title, no AI label |
| Narration voice | Kokoro-82M v1.0 `bf_emma`, speed 0.95, en-gb, default G2P | **APPROVED** | generated on demand by `build.py`; the per-segment cache is in `session:` and can be regenerated |
| Claire voice WAVs | `session:en-lines/*.wav` + `en_lines.json` (text, duration, phonemes) | **APPROVED** | regenerate with `presenter_en_lines.py` |
| Cantonese voice (CosyVoice2 V3) | `git:checkpoints/yue-v3/voice/` | **PAUSED** (diction and lip-sync not passed) | see `checkpoints/yue-v3/CHECKPOINT.md` |

## 5. Music

| Asset | Location | Status | Notes |
|---|---|---|---|
| "melodic" score | generated by `git:music_gen.py` (`project.json` `"music": "generate:melodic"`) | **APPROVED** (owner accepted the music level and tail) | original procedural composition with no third-party rights. It is rebuilt to each film's length; mixed at −17 dB, ducked under speech |
| Ambient pad | `build.py` fallback | **SUPERSEDED** | |
| `apps/web/public/audio/*.mp3` | repo | **NOT CLEARED** | no rights record, so don't use these |

## 6. Captions

| Asset | Location | Status |
|---|---|---|
| English SRT, presenter edition (68 cues, bottom centre) | `git:evidence/a02_en_presenter_captions_en_1080p.srt` (the master's copy) | **LATEST**, in the 1080p master |
| English SRT, A02 without presenter | `git:evidence/a02-en_full-preview_captions_en.srt` | **SUPERSEDED** by the presenter edition |
| Caption styling | `build.py` `CAPTION_STYLES`, `caption_scale 1.5`, `line_chars 38`, Inter SemiBold | **APPROVED** |

## 7. Films

| Asset | Location | Status |
|---|---|---|
| `ASCLEPIOS_HEALTH_A02_EN_presenter_1080p.mp4` · 1920×1080 · 212.0 s · 48,207,039 bytes · sha256 `f78229279e164d91b183eaa7e94af8c360a919b0c5c7714ba394bf466744534e` (logo on opening and closing pages) | `session:out-presenter-1080/`; sent to the owner in the session; plays at `https://claude.ai/artifact/PRxC7Jz3iDmEPYNChWjrzo` (lossless stream copy) | **LATEST**: the master release, owner-authorised export 2026-11-04. QA: `git:evidence/a02_en_presenter_qa_1080p.json` |
| `…_presenter_preview_full_540p.mp4` (sha256 `305594da…`) | `session:out-presenter/` | **SUPERSEDED** by the master (it was the approved review preview with the old opening page) |
| `ASCLEPIOS_HEALTH_A02_EN_preview_full_360p.mp4` (no presenter) | `session:out-a02-full/` | **SUPERSEDED** |

## 8. Production code (all `git:`)

| File | Role | Status |
|---|---|---|
| `build.py` | one-command film build: narration, music, master, captions, visuals, render, QA | **LATEST** |
| `projects/a02-english/project.json` | original A02, no presenter | **APPROVED** (kept unchanged) |
| `projects/a02-english-presenter/project.json` | A02 + Claire P01–P05 | **LATEST** (master) |
| `presenter_render_segments.sh` | renders Claire segments from the v05 still | **APPROVED** method |
| `presenter_motion_liveportrait.py`, `presenter_lipsync_musetalk.py`, `run_presenter_lipsync_test.sh`, `presenter_finish_motion.py`, `presenter_body_motion.py`, `presenter_pause_close.py` | presenter motion, lip-sync and finishing stages | **APPROVED** method |
| `presenter_en_lines.py` | Claire's English voice lines | **APPROVED** |
| `make_opening_page.py` | opening page with the official logo | **LATEST** |
| `music_gen.py` | original music | **APPROVED** |
| `presenter_sync_check.py` | rough lip-sync activity diagnostic (not proof) | **TEST** tool |
| `presenter_compose.py`, `presenter_wardrobe_test.py`, `presenter_voice_test.py`, `presenter_yue_*.py`, `ingest_shots.py` | earlier tests, Cantonese, ingest | **TEST / PAUSED** |
| `PRESENTER_LICENCE_REVIEW.md` | licence verdict per tool and model | **reference, must read** before adding a tool |

## Reuse limits (all assets)

- Free and local only. No paid API, cloud GPU or credits without the owner's approval.
- No InsightFace models (non-commercial licence). Add a tool only after a licence check is recorded in `PRESENTER_LICENCE_REVIEW.md`.
- No medical claims and no treatment or cure language (above all, nothing about sleep apnoea). No AI medical professional endorsing a product. No invented credentials.
- Keep approved scripts verbatim. A new language needs its own approved script; don't machine-translate and publish it.

## Still to archive

These `session:` items are lost when this session ends. Upload them to Drive
(the project's video workspace) and record the Drive ID here:

1. `ASCLEPIOS_HEALTH_A02_EN_presenter_1080p.mp4` (master)
2. `segments/*.mp4` (P01–P05)
3. `en-lines/*.wav` + `en_lines.json`
4. `01_Brand_Opening_en_logo_v1.jpg` and `20_Brand_Ending_en_logo_v1.jpg`
