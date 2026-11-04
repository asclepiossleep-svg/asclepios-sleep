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


def speech_aligned_cues(text, wav, d, zh):
    """Sentences -> detected speech segments (in order) when counts match; else proportional split."""
    import re as _re
    from presenter_pause_close import silences
    sents = [x for x in _re.split(r"(?<=[。！？!?.])\s*", text) if x.strip()]
    segs, prev = [], 0.0
    for s0, e0 in silences(Path(wav)):
        if s0 - prev > 0.3:
            segs.append((prev, s0))
        prev = min(e0, d)
    if d - prev > 0.3:
        segs.append((prev, d))
    lim = 22 if zh else 76
    if len(segs) == len(sents):
        out = []
        for (a, b), sent in zip(segs, sents):
            out += build.split_cues(sent, a, b, lim, cjk=zh)
        return out
    return build.split_cues(text, 0.05, d - 0.05, lim, cjk=zh)


def _logo_card(logo: Path, card: Path, height: int = 132, pad: int = 10):
    from PIL import Image, ImageChops, ImageDraw
    im = Image.open(logo).convert("RGB")
    bg = Image.new("RGB", im.size, im.getpixel((2, 2)))
    bbox = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 18 else 0).getbbox()
    art = im.crop(bbox)                      # trim surrounding white only; artwork untouched
    s = (height - 2 * pad) / art.height
    art = art.resize((max(1, round(art.width * s)), height - 2 * pad), Image.LANCZOS)
    c = Image.new("RGBA", (art.width + 2 * pad, height), (0, 0, 0, 0))
    ImageDraw.Draw(c).rounded_rectangle([0, 0, c.width - 1, c.height - 1], radius=10, fill=(255, 255, 255, 235))
    c.paste(art, (pad, pad))
    c.save(card)


def main(raw: Path, wav: Path, out: Path, text: str, audio_src: Path | None = None,
         logo: Path | None = None, lang: str = "zh", delogo: bool = True):
    d = build.duration(wav)  # captions follow the dry voice timing
    zh = lang == "zh"
    cues = speech_aligned_cues(text, wav, d, zh)
    stem = out.with_suffix("")
    build.write_captions(cues, stem, "WenQuanYi Zen Hei" if zh else "Inter SemiBold", None if zh else 38, 64,
                         ["Photo"] * len(cues))
    ass = stem.with_suffix(".ass")
    label = "AI 生成主持人 · AI-generated presenter"
    vf = (
        # residual pocket-wordmark trace on the teal test jacket (source-still coords incl. sway margin)
        ("delogo=x=372:y=526:w=76:h=32," if delogo else "")
        + "crop=iw:ih-4:0:4,scale=-2:720:flags=lanczos,pad=1280:720:(ow-iw)/2:0:color=0xE9EEF3,"
        f"drawtext=fontfile={FONT_ZH}:text='{label}':x=40:y=34:fontsize=26:fontcolor=white:"
        "box=1:boxcolor=0x16233F@0.82:boxborderw=12,"
        f"subtitles={ass}:fontsdir=/usr/share/fonts"
    )
    inputs = ["-i", str(raw), "-i", str(audio_src or wav)]
    if logo:
        # owner-supplied full logo (white-background JPEG): trimmed to its artwork, placed unaltered on a
        # white card top-right, clear of the presenter, captions and the AI disclosure
        card = out.with_name(out.stem + "_logo_card.png")
        _logo_card(logo, card)
        inputs += ["-i", str(card)]
        fc = f"[0:v]{vf}[base];[base][2:v]overlay=x=W-w-28:y=22[v]"
        vargs = ["-filter_complex", fc, "-map", "[v]"]
    else:
        vargs = ["-vf", vf, "-map", "0:v"]
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs,
                    *vargs, "-map", "1:a", "-c:v", "libx264", "-crf", "20", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest",
                    "-movflags", "+faststart", str(out)], check=True)
    print("wrote", out, "duration", round(build.duration(out), 2))


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("raw"); ap.add_argument("wav"); ap.add_argument("out"); ap.add_argument("text")
    ap.add_argument("audio_src", nargs="?")
    ap.add_argument("--logo"); ap.add_argument("--lang", default="zh"); ap.add_argument("--no-delogo", action="store_true")
    x = ap.parse_args()
    main(Path(x.raw), Path(x.wav), Path(x.out), x.text, Path(x.audio_src) if x.audio_src else None,
         Path(x.logo) if x.logo else None, x.lang, not x.no_delogo)
