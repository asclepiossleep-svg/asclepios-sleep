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
ARGS=(--image "$W/claire/claire_v06_teal_test.png"
      --audio "$W/voice-test-yue-c/claire_yue_cosyvoice_C_name_zh_dry.wav")
if [ "$SECS" = "full" ]; then
  OUT="$W/lipsync/claire_yue_full_raw.mp4"
else
  OUT="$W/lipsync/claire_yue_${SECS}s_raw.mp4"; ARGS+=(--seconds "$SECS")
fi
MUSETALK_REPO="$W/muse/MuseTalk" python "$HERE/presenter_lipsync_musetalk.py" "${ARGS[@]}" --out "$OUT"
echo "wrote $OUT"
