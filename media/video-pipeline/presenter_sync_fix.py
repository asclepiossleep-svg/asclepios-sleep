#!/usr/bin/env python3
"""Measure each presenter clip's mouth-to-voice offset and shift the picture so it is 0 (#142, 2026-11-09).

MuseTalk V1.5 here runs 1-2 frames early (P01 HiuMaan -80 ms; most takes -40 to -80 ms). The clip
is re-timed in whole frames. Mouth early: the first frame is held (tpad clone) and the clip is
trimmed back to its length. Mouth late: the first frames are dropped and the last frame is held.
Head motion moves with it, which is harmless at 40-80 ms. The original is kept as <tag>_raw.mp4.
The new clip is measured again; the shift is kept only if correlation does not fall.

    python3 presenter_sync_fix.py <out.json> <still.png> <bbox> <clip.mp4>=<voice.wav> ...
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import presenter_sync_qa as q  # noqa: E402
from presenter_pause_close import FPS  # noqa: E402


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True).stdout)


def shifted(src, k, out):
    d = dur(src)
    vf = (f"tpad=start={k}:start_mode=clone,trim=duration={d:.3f},setpts=PTS-STARTPTS" if k > 0 else
          f"trim=start_frame={-k},setpts=PTS-STARTPTS,tpad=stop={-k}:stop_mode=clone")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-vf", vf, "-map", "0:v", "-map", "0:a?",
                    "-c:v", "libx264", "-crf", "14", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "copy",
                    str(out)], check=True)


def main():
    out, still, bbox = sys.argv[1], sys.argv[2], sys.argv[3]
    rows = []
    for pair in sys.argv[4:]:
        clip, wav = (Path(x) for x in pair.split("=", 1))
        raw = clip.with_name(clip.stem + "_raw.mp4")
        if not raw.exists():
            shutil.copy2(clip, raw)
        before = q.check(raw, wav, still, bbox)
        k = -before["lag_ms"] * FPS // 1000            # mouth early (lag < 0) -> delay by k frames
        row = {"clip": clip.name, "before": before, "shift_frames": 0}
        if k:
            tmp = clip.with_name(clip.stem + "_try.mp4")
            shifted(raw, k, tmp)
            after = q.check(tmp, wav, still, bbox)
            if after["corr"] >= before["corr"]:
                tmp.replace(clip); row.update(shift_frames=k, after=after)
            else:
                tmp.unlink(); shutil.copy2(raw, clip); row["after"] = before; row["note"] = "shift did not help; kept raw"
        else:
            shutil.copy2(raw, clip); row["after"] = before
        rows.append(row)
        print(json.dumps({"clip": clip.name, "shift": row["shift_frames"], "lag_before": before["lag_ms"],
                          "lag_after": row["after"]["lag_ms"], "corr_after": row["after"]["corr"],
                          "pass": row["after"]["pass"]}))
    Path(out).write_text(json.dumps({"method": __doc__.strip().splitlines()[0], "results": rows}, indent=1))


if __name__ == "__main__":
    main()
