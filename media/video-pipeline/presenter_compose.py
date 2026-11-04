#!/usr/bin/env python3
"""Compose the Claire Lee lip-sync test into a 1280x720 review MP4.

Pale grey-blue background, presenter centred (chest-up), "AI 生成主持人"
label, Cantonese captions burned in below the face (never over the mouth),
no music. Also writes the SRT next to the MP4.

    python3 presenter_compose.py <talk_raw.mp4> <dry.wav> <out.mp4> "<caption text>" [audio_src.mp4]
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

FONT_ZH = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"


def main(raw: Path, wav: Path, out: Path, text: str, audio_src: Path | None = None):
    d = build.duration(wav)  # captions follow the dry voice timing
    cues = build.split_cues(text, 0.05, d - 0.05, 22, cjk=True)
    stem = out.with_suffix("")
    build.write_captions(cues, stem, "WenQuanYi Zen Hei", None, 64, ["Photo"] * len(cues))
    ass = stem.with_suffix(".ass")
    label = "AI 生成主持人 · AI-generated presenter"
    vf = (
        # residual pocket-wordmark trace on the test jacket (flat fabric; source-still coords incl. sway margin)
        "delogo=x=372:y=526:w=76:h=32,"
        "scale=-2:720:flags=lanczos,pad=1280:720:(ow-iw)/2:0:color=0xE9EEF3,"
        f"drawtext=fontfile={FONT_ZH}:text='{label}':x=40:y=34:fontsize=26:fontcolor=white:"
        "box=1:boxcolor=0x16233F@0.82:boxborderw=12,"
        f"subtitles={ass}:fontsdir=/usr/share/fonts"
    )
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw), "-i", str(audio_src or wav),
                    "-map", "0:v", "-map", "1:a", "-vf", vf, "-c:v", "libx264", "-crf", "20", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest",
                    "-movflags", "+faststart", str(out)], check=True)
    print("wrote", out, "duration", round(build.duration(out), 2))


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4],
         Path(sys.argv[5]) if len(sys.argv) > 5 else None)
