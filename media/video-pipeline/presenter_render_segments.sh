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
# language-aware (defaults = English): PRESENTER_LINES voice WAV dir, PRESENTER_SEGDIR output dir,
# PRESENTER_PFX tag prefix so another language never overwrites the English work files
LINES="${PRESENTER_LINES:-$W/en-lines}"; SEG="${PRESENTER_SEGDIR:-$W/segments}"; PFX="${PRESENTER_PFX:-studio_}"
mkdir -p "$SEG" "$W/motion" "$W/lipsync"
# shellcheck disable=SC1091
. "$W/cosy/venv/bin/activate"
for TAG in "$@"; do
  # a 15 s segment writes ~1 GB of PNG frames per stage; a full disk silently corrupts the lip-sync frames
  AVAIL_MB=$(df -Pm "$W" | awk 'NR==2{print $4}')
  if [ "${AVAIL_MB:-0}" -lt "${PRESENTER_MIN_FREE_MB:-2500}" ]; then
    echo "STOP: only ${AVAIL_MB} MB free in $W (need ${PRESENTER_MIN_FREE_MB:-2500}); free space and re-run $TAG" >&2; exit 3
  fi
  TAIL=0.45; [ "$TAG" = "end_cam" ] && TAIL=1.0     # farewell holds a brief natural smile before shot 20
  echo "== $TAG: motion"
  rm -rf "$W/motion/${PFX}$TAG"
  LIVEPORTRAIT_REPO="$W/lp/LivePortrait" python "$HERE/presenter_motion_liveportrait.py" --image "$STILL" \
    --audio "$LINES/$TAG.wav" --out "$W/motion/${PFX}$TAG" --pts "$PTS" --tail "$TAIL"
  echo "== $TAG: lip-sync"
  PRESENTER_AUDIO="$LINES/$TAG.wav" PRESENTER_TAG="${PFX}$TAG" PRESENTER_FRAMES="$W/motion/${PFX}$TAG" \
    PRESENTER_BBOX="$BBOX" bash "$HERE/run_presenter_lipsync_test.sh" full
  echo "== $TAG: finish + body"
  python "$HERE/presenter_finish_motion.py" "$W/lipsync/${PFX}${TAG}_full_raw.mp4" "$W/motion/${PFX}$TAG" \
    "$LINES/$TAG.wav" "$W/lipsync/${PFX}${TAG}_finished.mp4" --bbox "$BBOX" --breath-px 0
  BODY_IN="$W/lipsync/${PFX}${TAG}_finished.mp4"
  if [ -n "${PRESENTER_RESTORE:-}" ]; then   # put the still's real fine detail back into the animated face
    echo "== $TAG: detail restore"
    python "$HERE/presenter_detail_restore.py" "$BODY_IN" "$STILL" "$W/lipsync/${PFX}${TAG}_restored.mp4"
    BODY_IN="$W/lipsync/${PFX}${TAG}_restored.mp4"
  fi
  python "$HERE/presenter_body_motion.py" "$BODY_IN" "$STILL" "$LINES/$TAG.wav" "$SEG/$TAG.mp4"
  [ -n "${PRESENTER_KEEP_MOTION:-}" ] || rm -rf "$W/motion/${PFX}$TAG"   # frames are large; segment is final
  echo "== $TAG: done $(date -u +%H:%M:%S)"
done
