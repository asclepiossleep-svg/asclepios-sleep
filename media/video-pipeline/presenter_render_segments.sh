#!/usr/bin/env bash
# Render Claire Lee's English on-camera segments from the owner's v05 studio still
# (ASCLEPIOS-VIDEO-001, #142). Free/local: LivePortrait (MIT, no InsightFace) ->
# MuseTalk V1.5 (MIT) -> pause-close -> hand/shoulder micro-motion (own code).
#
#   PRESENTER_WORK=<scratch> bash media/video-pipeline/presenter_render_segments.sh open_cam p02_cam ...
#
# Inputs in $PRESENTER_WORK: studio/Claire_Lee_Studio_v05_Coffee_Closer_20261104.png, en-lines/<tag>.wav,
# cosy/venv, lp/LivePortrait, muse/MuseTalk. Output: segments/<tag>.mp4 (1672x940, voice audio, no captions).
set -euo pipefail
W="${PRESENTER_WORK:?set PRESENTER_WORK}"
HERE="$(cd "$(dirname "$0")" && pwd)"
# PRESENTER_STILL overrides the still (e.g. the v05r1 retouched master, owner request 6644776676)
STILL="${PRESENTER_STILL:-$W/studio/Claire_Lee_Studio_v05_Coffee_Closer_20261104.png}"
PTS="795,202 882,194 840,260 807,290 880,286"
BBOX="757,120,930,350"
mkdir -p "$W/segments" "$W/motion" "$W/lipsync"
# shellcheck disable=SC1091
. "$W/cosy/venv/bin/activate"
for TAG in "$@"; do
  TAIL=0.45; [ "$TAG" = "end_cam" ] && TAIL=1.0     # farewell holds a brief natural smile before shot 20
  echo "== $TAG: motion"
  rm -rf "$W/motion/studio_$TAG"
  LIVEPORTRAIT_REPO="$W/lp/LivePortrait" python "$HERE/presenter_motion_liveportrait.py" --image "$STILL" \
    --audio "$W/en-lines/$TAG.wav" --out "$W/motion/studio_$TAG" --pts "$PTS" --tail "$TAIL"
  echo "== $TAG: lip-sync"
  PRESENTER_AUDIO="$W/en-lines/$TAG.wav" PRESENTER_TAG="studio_$TAG" PRESENTER_FRAMES="$W/motion/studio_$TAG" \
    PRESENTER_BBOX="$BBOX" bash "$HERE/run_presenter_lipsync_test.sh" full
  echo "== $TAG: finish + body"
  python "$HERE/presenter_finish_motion.py" "$W/lipsync/studio_${TAG}_full_raw.mp4" "$W/motion/studio_$TAG" \
    "$W/en-lines/$TAG.wav" "$W/lipsync/studio_${TAG}_finished.mp4" --bbox "$BBOX" --breath-px 0
  python "$HERE/presenter_body_motion.py" "$W/lipsync/studio_${TAG}_finished.mp4" "$STILL" "$W/en-lines/$TAG.wav" \
    "$W/segments/$TAG.mp4"
  [ -n "${PRESENTER_KEEP_MOTION:-}" ] || rm -rf "$W/motion/studio_$TAG"   # frames are large; segment is final
  echo "== $TAG: done $(date -u +%H:%M:%S)"
done
