# ASCLEPIOS HEALTH video pipeline (ASCLEPIOS-VIDEO-001)

This pipeline turns a script and audio into a 1080p MP4 with captions. It runs entirely on local, free tools: FFmpeg, Pillow and optional Kokoro TTS. It makes no paid API calls and uses no cloud rendering. Tracking issue: #142.

## Run

```bash
# one-off setup (only needed for the TTS fallback; ~350 MB, not committed)
pip install kokoro-onnx soundfile
mkdir -p media/video-pipeline/models && cd media/video-pipeline/models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd -

# 25 s low-res technical preview (always do this first)
python3 media/video-pipeline/build.py media/video-pipeline/projects/<project> --preview 25

# full 1920x1080 render
python3 media/video-pipeline/build.py media/video-pipeline/projects/<project>
```

Set `KOKORO_MODEL_DIR` to use model files from somewhere else. The script exits with code 0 when every QA check passes and code 2 when any check fails. Outputs go to `<project>/out/`, which is gitignored.

## Project format (`project.json`)

| key | meaning |
|---|---|
| `script_status` | provenance label, copied into `qa.json` (e.g. `APPROVED A02 v1, received <date>`) |
| `segments[]` | `{id, en, zh_hk?, kicker?, headline?, pause_after?}`: `en` is the **verbatim approved script**, one segment per paragraph/scene |
| `narration_wav` | path to the approved narration. If set, it's used as-is and aligned to the segments at detected pauses (see `work/alignment.json`). If `null`, Kokoro TTS voices each segment and the voice is reported as **SUBSTITUTE**. |
| `voice` | TTS settings: `voice` (British: `bf_emma`, `bf_isabella`, `bm_george`, `bm_lewis`), `speed`, `lang: en-gb` |
| `music` | path to an owned/licensed music file (looped and faded). If `null`, the pipeline generates an original ambient pad, which has no rights issue. |
| `music_db` | music bed level before ducking (default `-17`) |
| `title_card`, `end_card`, `brand`, `watermark` | on-screen text; brand colours come from `apps/health-web/src/styles/tokens.css` |

## Stages and QA

1. **Narration**: uses the approved WAV, or Kokoro TTS per segment with fixed pauses.
2. **Music**: sidechain ducking under the voice, then voice compression.
3. **Master**: two-pass EBU R128 normalisation to **-16 LUFS integrated, -1.5 dBTP**.
4. **Captions**: EN (wrapped at 42 chars, ≤2 lines, broken on clauses) and optional zh-HK. Outputs are SRT, VTT and ASS. EN captions are burned in, and both languages are also embedded as soft tracks.
5. **Visuals**: original branded 1920×1080 cards (navy/teal tokens, abstract arcs, no third-party imagery), a slow push-in and 0.8 s crossfades.
6. **Render**: H.264 High / AAC 192k / 48 kHz stereo / 25 fps, with faststart.
7. **QA** (`qa.json`): checks resolution, duration against the audio plan, loudness ±1 LU, true peak ≤ -1 dBTP, caption order/overlap/bounds, reading speed ≤ 20 cps, and caption track count. It also writes `contact_sheet.jpg`, sha256 and size.

Throughput on a 4-vCPU session is about 1.3× real time at 1080p, so a 3.5 min video takes about 5 min.

## Rules this pipeline must keep

- Never edit the approved script text in `segments[].en`. Splitting it into captions is the only change allowed.
- zh-HK captions are a **draft translation**. They need human terminology review before publishing.
- No unlicensed music or imagery. Anything supplied needs a rights note in `script_status` or the PR.
- No content claiming to treat or cure sleep apnoea, and no AI-depicted medical professionals (`AGENTS.md`).
