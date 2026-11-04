#!/usr/bin/env bash
# Single-purpose runner for the Claire Lee lip-sync test (ASCLEPIOS-VIDEO-001, #142).
# Runs only media/video-pipeline/presenter_lipsync_musetalk.py, with MuseTalk V1.5
# (official TMElyralab/MuseTalk repo + MIT weights) on CPU. No network calls at run time.
#
#   bash media/video-pipeline/run_presenter_lipsync_test.sh <seconds|full>
#
# Expects (set by the session that prepared them):
#   PRESENTER_WORK  scratch dir holding cosy/venv, muse/MuseTalk, claire/, voice-test-yue-c/, lipsync/
set -euo pipefail
W="${PRESENTER_WORK:?set PRESENTER_WORK}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SECS="${1:-5}"
mkdir -p "$W/lipsync"
# shellcheck disable=SC1091
. "$W/cosy/venv/bin/activate"
AUDIO="${PRESENTER_AUDIO:-$W/voice-test-yue-c/claire_yue_cosyvoice_C_name_zh_dry.wav}"
TAG="${PRESENTER_TAG:-claire_yue}"
if [ -n "${PRESENTER_FRAMES:-}" ]; then
  SRC=(--frames-dir "$PRESENTER_FRAMES")         # LivePortrait motion frames
else
  SRC=(--image "$W/claire/claire_v06_teal_test.png")
fi
ARGS=("${SRC[@]}" --audio "$AUDIO" --shift-frames "${PRESENTER_SHIFT:-0}" --bbox "${PRESENTER_BBOX:-150,92,338,318}")
if [ "$SECS" = "full" ]; then
  OUT="$W/lipsync/${TAG}_full_raw.mp4"
else
  OUT="$W/lipsync/${TAG}_${SECS}s_raw.mp4"; ARGS+=(--seconds "$SECS")
fi
MUSETALK_REPO="$W/muse/MuseTalk" python "$HERE/presenter_lipsync_musetalk.py" "${ARGS[@]}" --out "$OUT"
echo "wrote $OUT"
