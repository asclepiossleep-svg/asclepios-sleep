#!/usr/bin/env python3
"""
ASCLEPIOS HEALTH educational video pipeline (ASCLEPIOS-VIDEO-001).

Free / local only: FFmpeg + Pillow, optional Kokoro TTS (Apache-2.0, runs on
CPU). No paid API, no cloud rendering.

    python3 media/video-pipeline/build.py <project-dir> [--preview 25] [--out DIR]

<project-dir> holds project.json (see README.md). Stages:
  1. narration  - approved WAV (aligned to segments by silence detection)
                  or Kokoro TTS per segment (voice marked SUBSTITUTE)
  2. music      - supplied licensed/owned file, or a self-generated ambient
                  pad (no third-party rights); ducked under speech
  3. master     - two-pass EBU R128 loudness normalisation
  4. captions   - EN (+ optional zh-HK) SRT/VTT/ASS from segment timings
  5. visuals    - branded 1920x1080 cards, slow push-in, crossfades
  6. render     - H.264/AAC MP4, burned EN captions + soft caption tracks
  7. QA         - ffprobe/ebur128 checks, contact sheet, qa.json, sha256
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FPS = 25
XFADE = 0.8           # seconds of crossfade between cards
CUT = 0.04            # near-hard cut into / out of presenter video shots (one frame)
SEG_GAP = 0.55        # silence between TTS segments
LEAD_IN = 1.2         # silence before first narration line
TAIL = 2.5            # music tail after last line
TARGET_LUFS = -16.0
TARGET_TP = -1.5

BRAND = {
    "navy": (22, 35, 63),
    "navy_deep": (13, 22, 42),
    "teal": (18, 143, 134),
    "teal_dark": (12, 107, 100),
    "teal_soft": (228, 244, 242),
    "teal_light": (94, 196, 186),
    "cream": (243, 241, 234),
    "muted": (124, 135, 156),
}

FONT_SERIF = ["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"]
FONT_SANS = ["/usr/share/fonts/opentype/inter/Inter-Regular.otf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
FONT_SANS_BOLD = ["/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
SUB_FONT_EN = "Inter"
SUB_FONT_ZH = "WenQuanYi Zen Hei"


# ----------------------------------------------------------------- helpers
def run(cmd: list[str], capture: bool = False) -> str:
    res = subprocess.run(cmd, stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                         stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        sys.stderr.write(res.stderr[-4000:])
        raise SystemExit(f"command failed: {' '.join(cmd[:6])} ...")
    return (res.stdout or "") + (res.stderr or "")


def ff(*args: str, capture: bool = False) -> str:
    return run(["ffmpeg", "-hide_banner", "-y", "-loglevel", "error" if not capture else "info", *args],
               capture=capture)


def duration(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", str(path)], capture=True)
    return float(out.strip().splitlines()[0])


def font(paths: list[str], size: int) -> ImageFont.FreeTypeFont:
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def ts(t: float, sep: str = ",") -> str:
    t = max(0.0, t)
    h, rem = divmod(int(round(t * 1000)), 3600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


# --------------------------------------------------------------- narration
def tts_kokoro(project: dict, segments: list[dict], work: Path) -> tuple[Path, list[tuple[float, float]]]:
    try:
        from kokoro_onnx import Kokoro  # type: ignore
        import soundfile as sf  # type: ignore
        import numpy as np
    except ImportError:
        raise SystemExit("Kokoro TTS not installed: pip install kokoro-onnx soundfile "
                         "(model files: see README.md)")
    voice = project.get("voice", {})
    import os
    model_dir = Path(os.environ.get("KOKORO_MODEL_DIR") or voice.get("model_dir") or HERE / "models").expanduser()
    # loaded only if a segment actually needs TTS (other-language editions bring their own WAVs)
    kok = None if all(s.get("audio") or not s.get("_text", "").strip() for s in segments) else \
        Kokoro(str(model_dir / "kokoro-v1.0.onnx"), str(model_dir / "voices-v1.0.bin"))
    sr = 24000
    pieces, spans, t = [np.zeros(int(LEAD_IN * sr), dtype="float32")], [], LEAD_IN
    for i, seg in enumerate(segments):
        cache = work / f"tts_{seg['id']}_{hashlib.md5((seg['_text'] + json.dumps(voice)).encode()).hexdigest()[:8]}.wav"
        if seg.get("audio"):  # presenter on-camera line: its own pre-rendered voice (same Kokoro voice)
            import os
            root = Path(os.environ.get("ASCLEPIOS_PRESENTER_DIR") or project.get("_dir", "."))
            samples, a_sr = sf.read(root / seg["audio"], dtype="float32")
            if samples.ndim > 1:
                samples = samples.mean(axis=1)
            if a_sr != sr:
                raise SystemExit(f"presenter audio {seg['audio']} is {a_sr} Hz, expected {sr}")
        elif not seg["_text"].strip():  # music-only shot: hold the card, no narration
            samples = np.zeros(int(float(seg.get("hold", 4.0)) * sr), dtype="float32")
        elif cache.exists():
            samples, sr = sf.read(cache, dtype="float32")
        else:
            samples, sr = kok.create(seg["_text"], voice=voice.get("voice", "bf_emma"),
                                     speed=float(voice.get("speed", 0.95)), lang=voice.get("lang", "en-gb"))
            sf.write(cache, samples, sr)
        d = len(samples) / sr
        spans.append((t, t + d))
        pieces.append(samples.astype("float32"))
        gap = float(seg.get("pause_after", SEG_GAP))
        pieces.append(np.zeros(int(gap * sr), dtype="float32"))
        t += d + gap
    out = work / "narration_raw.wav"
    sf.write(out, np.concatenate(pieces), sr)
    return out, spans


def align_supplied(wav: Path, segments: list[dict], work: Path) -> tuple[Path, list[tuple[float, float]]]:
    """Map script segments onto an approved narration WAV without re-voicing it.

    Expected boundaries come from character share; each is snapped to the
    nearest detected pause. QA later reports the snap distances so a human can
    see how confident the alignment is.
    """
    out = work / "narration_raw.wav"
    ff("-f", "lavfi", "-t", str(LEAD_IN), "-i", "anullsrc=r=48000:cl=mono", "-i", str(wav),
       "-filter_complex", "[1:a]aresample=48000,pan=mono|c0=c0[n];[0:a][n]concat=n=2:v=0:a=1",
       str(out))
    total = duration(out)
    log = run(["ffmpeg", "-hide_banner", "-i", str(out), "-af",
               "silencedetect=noise=-38dB:d=0.30", "-f", "null", "-"], capture=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    pauses = [((s + e) / 2, s, e) for s, e in zip(starts, ends)]
    speech_start = ends[0] if starts and starts[0] < 0.05 and ends else LEAD_IN
    speech_end = starts[-1] if starts and len(starts) > len(ends) else total
    chars = [max(1, len(s["_text"])) for s in segments]
    acc, bounds = 0, []
    for c in chars[:-1]:
        acc += c
        bounds.append(speech_start + (speech_end - speech_start) * acc / sum(chars))
    snapped, offsets = [], []
    for b in bounds:
        cand = min(pauses, key=lambda p: abs(p[0] - b)) if pauses else (b, b, b)
        snapped.append(cand)
        offsets.append(round(cand[0] - b, 2))
    spans, cur = [], speech_start
    for i in range(len(segments)):
        if i < len(snapped):
            spans.append((cur, snapped[i][1]))
            cur = snapped[i][2]
        else:
            spans.append((cur, speech_end))
    (work / "alignment.json").write_text(json.dumps({"snap_offsets_s": offsets, "pauses": len(pauses)}, indent=2))
    return out, spans


# ------------------------------------------------------------------- music
def make_music(project: dict, total: float, work: Path, base: Path) -> tuple[Path, str]:
    out = work / "music.wav"
    src = project.get("music")
    if src == "generate:melodic":
        sys.path.insert(0, str(HERE))
        import music_gen
        import soundfile as sf
        dry = work / "music_dry.wav"
        sf.write(dry, music_gen.compose(total), music_gen.SR)
        ff("-i", str(dry), "-af",
           "highpass=f=45,lowpass=f=11000,aecho=0.8:0.6:43|89|137|211:0.30|0.24|0.18|0.12,"
           "aresample=48000", "-ac", "2", str(out))
        return out, "generated: music_gen.py 'melodic' (original procedural composition, no third-party material)"
    if src:
        p = (base / src).resolve()
        if not p.exists():
            raise SystemExit(f"music file not found: {p}")
        ff("-stream_loop", "-1", "-i", str(p), "-t", f"{total:.3f}", "-af",
           f"aresample=48000,afade=t=in:d=2,afade=t=out:st={max(0, total - 3):.3f}:d=3", "-ac", "2", str(out))
        return out, f"supplied: {src}"
    # Self-generated ambient pad: slow-breathing sine chord (D major add9 voicing)
    # + filtered noise "air". Original, generated here, no third-party rights.
    freqs = [73.42, 146.83, 220.0, 277.18, 329.63, 440.0]
    amps = [0.22, 0.18, 0.12, 0.08, 0.07, 0.04]
    terms = "+".join(f"{a}*sin(2*PI*{f}*t)*(0.75+0.25*sin(2*PI*{0.05 + i * 0.013:.3f}*t))"
                     for i, (f, a) in enumerate(zip(freqs, amps)))
    ff("-f", "lavfi", "-i", f"aevalsrc='{terms}':s=48000:d={total:.3f}",
       "-f", "lavfi", "-i", f"anoisesrc=c=pink:a=0.035:d={total:.3f}:r=48000",
       "-filter_complex",
       "[0:a]lowpass=f=1800,aecho=0.8:0.7:120|260:0.25|0.18[p];"
       "[1:a]lowpass=f=900,highpass=f=120[nz];"
       f"[p][nz]amix=inputs=2:weights=1 0.6:normalize=0,"
       f"afade=t=in:d=3,afade=t=out:st={max(0, total - 4):.3f}:d=4,pan=stereo|c0=c0|c1=c0,"
       "aphaser=type=t:speed=0.1:decay=0.3[m]",
       "-map", "[m]", str(out))
    return out, "generated ambient pad (original, no third-party rights)"


def mix_master(narr: Path, music: Path, total: float, work: Path, music_db: float) -> Path:
    mixed = work / "mix.wav"
    ff("-i", str(narr), "-i", str(music), "-filter_complex",
       f"[0:a]aresample=48000,apad,atrim=0:{total:.3f},highpass=f=70,"
       "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,"
       "pan=stereo|c0=c0|c1=c0,asplit=2[v][sc];"
       f"[1:a]aresample=48000,volume={music_db}dB[mu];"
       "[mu][sc]sidechaincompress=threshold=0.015:ratio=10:attack=40:release=600:makeup=1[duck];"
       "[v][duck]amix=inputs=2:normalize=0[o]",
       "-map", "[o]", "-ar", "48000", str(mixed))
    # two-pass loudnorm
    log = run(["ffmpeg", "-hide_banner", "-i", str(mixed), "-af",
               f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:print_format=json", "-f", "null", "-"],
              capture=True)
    m = json.loads(log[log.rindex("{"):log.rindex("}") + 1])
    master = work / "master.wav"
    ff("-i", str(mixed), "-af",
       f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=11:measured_I={m['input_i']}:"
       f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
       f"offset={m['target_offset']}:linear=true", "-ar", "48000", str(master))
    return master


# ---------------------------------------------------------------- captions
def split_cues(text: str, start: float, end: float, max_chars: int, cjk: bool = False) -> list[tuple[float, float, str]]:
    if cjk:
        parts = [p for p in re.split(r"(?<=[。！？；])", text) if p.strip()]
        chunks: list[str] = []
        for p in parts:
            while len(p) > max_chars:
                cut = max((p.rfind(c, 0, max_chars) for c in "，、："), default=-1)
                cut = cut + 1 if cut > 4 else max_chars
                chunks.append(p[:cut]); p = p[cut:]
            if p: chunks.append(p)
    else:
        sentences = re.split(r"(?<=[.!?;])\s+", text.strip())
        chunks = []
        clauses = []
        for s in sentences:
            if len(s) <= max_chars:
                clauses.append(s); continue
            for c in re.split(r"(?<=,)\s+", s):
                if clauses and len(clauses[-1]) + len(c) + 1 <= max_chars and not clauses[-1].endswith((".", "!", "?")):
                    clauses[-1] = f"{clauses[-1]} {c}"
                else:
                    clauses.append(c)
        # fold very short clauses ("Today,") into the next clause of the same sentence
        folded: list[str] = []
        for c in clauses:
            if folded and len(folded[-1]) < 16 and not folded[-1].endswith((".", "!", "?")):
                folded[-1] = f"{folded[-1]} {c}"
            else:
                folded.append(c)
        clauses = folded
        for s in clauses:
            if len(s) <= max_chars:
                chunks.append(s); continue
            # balanced split: n roughly equal chunks, so no orphan last word
            words = s.split()
            n = math.ceil(len(s) / max_chars)
            limit = min(max_chars, len(s) / n * 1.08)
            parts, line = [], ""
            for w in words:
                if line and len(line) + len(w) + 1 > limit and len(parts) < n - 1:
                    parts.append(line); line = w
                else:
                    line = f"{line} {w}".strip()
            if line: parts.append(line)
            chunks.extend(parts)
    weights = [max(1, len(c)) for c in chunks]
    cues, t = [], start
    for c, w in zip(chunks, weights):
        d = (end - start) * w / sum(weights)
        cues.append((t, t + d, c)); t += d
    return cues


def voice_frames(wav: Path, db: float = -40.0):
    """10 ms RMS voiced mask of the narration (True = voice), used to time captions to real speech."""
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = len(x) // 160
    rms = np.sqrt((x[:n * 160].reshape(n, 160) ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(rms) > db


def retime_cues(cues: list[tuple[float, float, str]], a: float, b: float, voiced, lead: float = 0.08,
                hold: float = 0.25) -> list[tuple[float, float, str]]:
    """Move one segment's cues onto its real speech. The first cue starts at the first voiced syllable
    (a quiet in-breath before it is skipped). Each split between cues moves to the pause (>= 60 ms) nearest
    its character-share position, within 1.2 s. The last cue ends 0.25 s after the last voiced frame."""
    import numpy as np
    if not cues:
        return cues
    fa, fb = int(a * 100), min(len(voiced), int(b * 100))
    seg = voiced[fa:fb]
    on = np.nonzero(seg)[0]
    if not len(on):
        return cues
    v0, v1 = (fa + on[0]) / 100, (fa + on[-1] + 1) / 100
    pauses, i = [], 0                                   # (start, end) of unvoiced runs inside the speech
    while i < len(seg):
        if not seg[i]:
            j = i
            while j < len(seg) and not seg[j]:
                j += 1
            if j - i >= 6 and i > on[0] and j <= on[-1]:
                pauses.append(((fa + i) / 100, (fa + j) / 100))
            i = j
        else:
            i += 1
    bounds = []                                         # (prev cue end, next cue start) per split
    for k in range(1, len(cues)):
        want = v0 + (cues[k][0] - a) / max(0.01, b - a) * (v1 - v0)
        near = [p for p in pauses if abs((p[0] + p[1]) / 2 - want) <= 1.2 and
                (not bounds or p[0] > bounds[-1][1])]
        if near:
            p = min(near, key=lambda p: abs((p[0] + p[1]) / 2 - want))
            bounds.append((min(p[1] - lead, p[0] + hold), p[1] - lead))
        else:
            bounds.append((want, want))
    out, start = [], max(a, v0 - lead)
    for k, (_, _, text) in enumerate(cues):
        end = bounds[k][0] if k < len(bounds) else min(b, v1 + hold)
        out.append((round(start, 3), round(max(end, start + 0.6), 3), text))
        if k < len(bounds):
            start = bounds[k][1]
    return out


def wrap2(text: str, width: int) -> str:
    if len(text) <= width:
        return text
    mid = len(text) // 2
    left, right = text.rfind(" ", 0, mid + 1), text.find(" ", mid)
    cut = left if (right == -1 or (left != -1 and mid - left <= right - mid)) else right
    return text[:cut].strip() + "\n" + text[cut:].strip() if cut > 0 else text


CAPTION_STYLES = {
    # name: (primary, outline, back, borderstyle, outline_w, shadow)
    "Cap":     ("&H00FFFFFF", "&H00301A0D", "&H96000000", 1, 2.6, 1.4),   # generated-card mode
    "Diagram": ("&H003F2316", "&H00FFFFFF", "&H00FFFFFF", 1, 3.5, 0),     # navy text, white edge: white diagrams
    "Photo":   ("&H00FFFFFF", "&H003F2316", "&H4D3F2316", 4, 0, 16),      # white on translucent navy box: photos
    "Dark":    ("&H00FFFFFF", "&H003F2316", "&H80000000", 1, 3.5, 2),     # white, navy edge + shadow: dark photos
}


def caption_style_for(img: Path | None, focus=None) -> str:
    """Pick a caption style from the brightness of the still's bottom band.

    For focus shots the band is also measured on the zoomed framing, and the
    darker / busier result wins, so captions stay legible through the move.
    """
    if img is None:
        return "Cap"
    from PIL import ImageStat
    g = Image.open(img).convert("L")
    w, h = g.size
    views = [g]
    if focus:
        cx, cy, zs = focus
        cw, ch = w / zs, h / zs
        x0 = min(max(cx * w - cw / 2, 0), w - cw)
        y0 = min(max(cy * h - ch / 2, 0), h - ch)
        views.append(g.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))))
    lum = min(ImageStat.Stat(v.crop((0, int(v.size[1] * 0.78), v.size[0], v.size[1]))).mean[0] for v in views)
    return "Diagram" if lum >= 225 else ("Dark" if lum < 90 else "Photo")


def cjk_width(text: str) -> float:
    """Visual width in Chinese-character units (Latin letters/digits/spaces ~0.55)."""
    return sum(0.55 if ord(c) < 0x2E80 else 1.0 for c in text)


def wrap_cjk(text: str, width: int) -> str:
    """Two balanced lines for Chinese: break at the punctuation nearest the middle,
    else at a space or between two Chinese characters near the middle; never inside
    a Latin word. Subtitle-style trailing ，。 removed."""
    text = text.strip().rstrip("，。、；")
    if cjk_width(text) <= width:
        return text
    half = cjk_width(text) / 2
    pos = [cjk_width(text[:i]) for i in range(len(text) + 1)]

    def ok(i):  # a break before text[i] that does not split a Latin word
        a, b = text[i - 1], text[i]
        return not (a.isascii() and a.isalnum() and b.isascii() and b.isalnum())

    punct = [i + 1 for i, c in enumerate(text[:-1]) if c in "，、：；？！"]
    longest = lambda i: max(cjk_width(text[:i].rstrip("，、 ")), cjk_width(text[i:].strip()))  # longer shown line
    cut = min(punct, key=lambda i: (longest(i), abs(pos[i] - half))) if punct else None
    if cut is None or abs(pos[cut] - half) > cjk_width(text) * 0.3:
        cands = [i for i in range(1, len(text)) if ok(i)]
        cut = min(cands, key=lambda i: (longest(i) + (0 if text[i - 1] == " " or text[i] == " " else 0.4)))
    return text[:cut].rstrip("，、 ") + "\n" + text[cut:].strip()


def write_captions(cues, stem: Path, font_name: str, wrap: int | None, size: int = 48, styles=None,
                   align: int = 2, margins: tuple | None = None, cjk: bool = False):
    srt, vtt = [], ["WEBVTT", ""]
    wrapper = wrap_cjk if cjk else wrap2
    for i, (a, b, t) in enumerate(cues, 1):
        body = wrapper(t, wrap) if wrap else t
        srt += [str(i), f"{ts(a)} --> {ts(b)}", body, ""]
        vtt += [f"{ts(a, '.')} --> {ts(b, '.')}", body, ""]
    stem.with_suffix(".srt").write_text("\n".join(srt), encoding="utf-8")
    stem.with_suffix(".vtt").write_text("\n".join(vtt), encoding="utf-8")
    ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 2", "",
           "[V4+ Styles]",
           "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, "
           "Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
           "Alignment, MarginL, MarginR, MarginV, Encoding"]
    margin_lr = 220 if size <= 48 else 160
    margin_v = 64 if size <= 48 else 44
    ml, mr, mv = margins if margins else (margin_lr, margin_lr, margin_v)
    for name, (pc, oc, bc, bs, ow, sh) in CAPTION_STYLES.items():
        ass.append(f"Style: {name},{font_name},{size},{pc},{pc},{oc},{bc},0,0,0,0,100,100,0.3,0,"
                   f"{bs},{ow},{sh},{align},{ml},{mr},{mv},1")
    ass += ["", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    for i, (a, b, t) in enumerate(cues):
        body = (wrapper(t, wrap) if wrap else t).replace("\n", "\\N")
        st = styles[i] if styles else "Cap"
        ass.append(f"Dialogue: 0,{ts(a, '.')[:-1]},{ts(b, '.')[:-1]},{st},,0,0,0,,{body}")
    stem.with_suffix(".ass").write_text("\n".join(ass), encoding="utf-8")


# ----------------------------------------------------------------- visuals
def gradient(w: int, h: int, top: tuple, bottom: tuple) -> Image.Image:
    base = Image.new("RGB", (w, h), top)
    px = Image.linear_gradient("L").resize((w, h))
    return Image.composite(Image.new("RGB", (w, h), bottom), base, px)


def draw_card(kind: str, seg: dict, project: dict, path: Path, size=(2112, 1188)):
    """Card is rendered 10% oversized so the push-in never shows an edge."""
    W, H = size
    s = W / 1920
    img = gradient(W, H, BRAND["navy_deep"], BRAND["navy"])
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    cx, cy = int(W * 0.78), int(H * 0.42)
    for r, a in [(620, 26), (470, 30), (330, 34)]:
        g.ellipse([cx - r * s, cy - r * s, cx + r * s, cy + r * s], fill=(*BRAND["teal"], a))
    glow = glow.filter(ImageFilter.GaussianBlur(60 * s))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    arcs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    da = ImageDraw.Draw(arcs)
    # thin botanical-style concentric arcs (abstract, original)
    for i, r in enumerate([300, 360, 420]):
        da.arc([cx - r * s, cy - r * s, cx + r * s, cy + r * s], 200 + i * 12, 340 - i * 6,
               fill=(*BRAND["teal_soft"], 90 - i * 22), width=max(1, int(2 * s)))
    img = Image.alpha_composite(img, arcs)
    d = ImageDraw.Draw(img)
    ox, oy = int((W - 1920 * s) / 2 + 96 * s + (W - 1920) / 2), int((H - 1080) / 2 + 80 * s)
    brand = project.get("brand", {})
    d.text((ox, oy), brand.get("wordmark", "ASCLEPIOS"), font=font(FONT_SERIF, int(40 * s)), fill=BRAND["cream"])
    d.text((ox + 2, oy + 54 * s), brand.get("sub", "HEALTH PLATFORM"), font=font(FONT_SANS_BOLD, int(18 * s)),
           fill=BRAND["teal_soft"], spacing=4)
    if kind == "title":
        d.text((ox, int(H * 0.40)), seg.get("headline", ""), font=font(FONT_SERIF, int(92 * s)), fill=BRAND["cream"])
        d.text((ox + 4, int(H * 0.40 + 130 * s)), seg.get("kicker", ""), font=font(FONT_SANS, int(34 * s)),
               fill=BRAND["teal_soft"])
    elif kind == "end":
        d.text((ox, int(H * 0.38)), brand.get("end_line", "Better People · A Brighter Tomorrow"),
               font=font(FONT_SERIF, int(64 * s)), fill=BRAND["cream"])
        d.text((ox + 4, int(H * 0.38 + 100 * s)), seg.get("kicker", ""), font=font(FONT_SANS, int(30 * s)),
               fill=BRAND["teal_soft"])
    else:
        if seg.get("kicker"):
            d.text((ox + 4, int(H * 0.30)), seg["kicker"].upper(), font=font(FONT_SANS_BOLD, int(24 * s)),
                   fill=BRAND["teal_light"])
        y = int(H * 0.30 + 50 * s)
        for line in wrap_px(d, seg.get("headline", ""), font(FONT_SERIF, int(70 * s)), int(1050 * s)):
            d.text((ox, y), line, font=font(FONT_SERIF, int(70 * s)), fill=BRAND["cream"]); y += int(88 * s)
        d.rectangle([ox, y + 24 * s, ox + 90 * s, y + 28 * s], fill=BRAND["teal"])
    if project.get("watermark"):
        d.text((ox, int(H - (H - 1080) / 2 - 140 * s)), project["watermark"], font=font(FONT_SANS_BOLD, int(24 * s)),
               fill=(255, 196, 120))
    img.convert("RGB").save(path, quality=95)


def wrap_px(d: ImageDraw.ImageDraw, text: str, f, maxw: int) -> list[str]:
    words, lines, line = text.split(), [], ""
    for w in words:
        trial = f"{line} {w}".strip()
        if d.textlength(trial, font=f) > maxw and line:
            lines.append(line); line = w
        else:
            line = trial
    return lines + ([line] if line else [])


def card_clip(png: Path, dur: float, out: Path, res: tuple[int, int]):
    W, H = res
    frames = max(2, int(round(dur * FPS)))
    # slow push-in from 100% to ~104% using crop on the oversized card
    ff("-loop", "1", "-framerate", str(FPS), "-i", str(png), "-frames:v", str(frames), "-vf",
       f"scale=2112:1188,crop=w='2112-160*n/{frames}':h='1188-90*n/{frames}':"
       f"x='(2112-(2112-160*n/{frames}))/2':y='(1188-(1188-90*n/{frames}))/2',"
       f"scale={W}:{H}:flags=lanczos,format=yuv420p,setsar=1",
       "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-r", str(FPS), str(out))


def still_clip(img: Path, dur: float, out: Path, res: tuple[int, int], focus=None):
    """Supplied still, original aspect ratio, fitted without cropping.

    focus=[cx, cy, scale] (owner-approved Proposal A): the still shows in full,
    eases in toward the text area (cx, cy as fractions of the image), holds,
    and eases back to the full frame before the transition. The source image
    itself is never altered.
    """
    W, H = res
    frames = max(2, int(round(dur * FPS)))
    fit = (f"scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos,"
           f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=white")
    hold_full, ease_in, ease_out, tail = 0.8, 1.6, 1.4, XFADE + 0.3
    if focus and dur >= hold_full + ease_in + ease_out + tail + 0.8:
        cx, cy, zs = focus
        b = dur - tail - ease_out
        q_in = f"clip((on/{FPS}-{hold_full})/{ease_in},0,1)"
        q_out = f"clip((on/{FPS}-{b:.3f})/{ease_out},0,1)"
        sm = lambda q: f"({q})*({q})*(3-2*({q}))"
        z = f"1+{zs - 1:.4f}*({sm(q_in)}-{sm(q_out)})"
        U = 3  # oversample so slow moves stay smooth (zoompan snaps to whole pixels)
        vf = (f"{fit},scale={W * U}:{H * U}:flags=lanczos,"
              f"zoompan=z='{z}':x='clip({cx}*iw-iw/zoom/2,0,iw-iw/zoom)':"
              f"y='clip({cy}*ih-ih/zoom/2,0,ih-ih/zoom)':d=1:s={W}x{H}:fps={FPS},"
              f"format=yuv420p,setsar=1")
    else:
        vf = f"{fit},format=yuv420p,setsar=1"
    ff("-loop", "1", "-framerate", str(FPS), "-i", str(img), "-frames:v", str(frames), "-vf", vf,
       "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-r", str(FPS), str(out))


def video_clip(src: Path, dur: float, out: Path, res: tuple[int, int]):
    """Pre-rendered presenter shot, scaled to the film frame; the last frame is held
    if the slot is longer than the clip. Its own audio is dropped here (the voice
    is already in the master narration track at the same time)."""
    W, H = res
    ff("-i", str(src), "-t", f"{dur:.3f}", "-an", "-vf",
       f"scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,"
       f"setsar=1,fps={FPS},tpad=stop_mode=clone:stop_duration=5,format=yuv420p",
       "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-r", str(FPS), str(out))


def logo_card(logo: Path, out: Path, height: int, pad: int) -> Path:
    """Official logo on a small white rounded card (logo pixels unchanged, only
    its white border trimmed and scaled)."""
    from PIL import ImageChops
    im = Image.open(logo).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    flat = Image.alpha_composite(bg, im).convert("RGB")
    bbox = ImageChops.difference(flat, Image.new("RGB", flat.size, (255, 255, 255))).getbbox()
    if bbox:
        flat = flat.crop(bbox)
    inner = height - 2 * pad
    flat = flat.resize((max(1, round(flat.width * inner / flat.height)), inner), Image.LANCZOS)
    card = Image.new("RGBA", (flat.width + 2 * pad, height), (0, 0, 0, 0))
    m = Image.new("L", card.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, card.width - 1, height - 1], radius=pad, fill=235)
    card.paste(Image.new("RGBA", card.size, (255, 255, 255, 255)), (0, 0), m)
    card.paste(flat, (pad, pad))
    card.save(out)
    return out


# ------------------------------------------------------------------- build
def build(project_dir: Path, out_dir: Path, preview: float | None, preview_res: tuple[int, int] = (640, 360)):
    project = json.loads((project_dir / "project.json").read_text(encoding="utf-8"))
    project["_dir"] = str(project_dir)
    segments = project["segments"]
    # text_field / caption_lang: "en" (default, English editions) or e.g. "yue" + "zh-HK"
    text_key = project.get("text_field", "en")
    lang = project.get("caption_lang", "en")
    cjk = lang.startswith("zh")
    for seg in segments:
        seg["_text"] = seg.get(text_key, "")
    if not segments:
        raise SystemExit("project.json has no segments")
    work = out_dir / "work"; work.mkdir(parents=True, exist_ok=True)
    res = preview_res if preview else (1920, 1080)
    notes: list[str] = []

    # 1 narration
    if project.get("narration_wav"):
        narr, spans = align_supplied((project_dir / project["narration_wav"]).resolve(), segments, work)
        voice_status = f"APPROVED narration: {project['narration_wav']}"
    else:
        narr, spans = tts_kokoro(project, segments, work)
        v = project.get("voice", {})
        voice_status = f"SUBSTITUTE voice: Kokoro TTS {v.get('voice', 'bf_emma')} (approved narration not supplied)"
    notes.append(voice_status)
    total = duration(narr) + TAIL
    if preview:
        total = min(total, preview)

    # 2-3 music + master
    music, music_status = make_music(project, total, work, project_dir)
    notes.append(f"music: {music_status}")
    master = mix_master(narr, music, total, work, float(project.get("music_db", -17)))

    # 4 captions
    cues_en, cues_zh, styles_en = [], [], []
    scale = float(project.get("caption_scale", 1.0))
    line_chars = 42 if scale <= 1.0 else int(project.get("caption_line_chars", 38))
    zh_line = int(project.get("caption_line_chars_zh", 16))
    img_dir = None
    if project.get("images_dir"):
        import os
        img_dir = Path(os.environ.get("ASCLEPIOS_IMAGES_DIR") or (project_dir / project["images_dir"]))
    # captions follow the real speech when every narrated segment brings its own recorded WAV
    # (other-language editions): first syllable, real pauses for the splits, voice end
    voiced = voice_frames(narr) if project.get("caption_retime", cjk) else None
    for seg, (a, b) in zip(segments, spans):
        if not seg["_text"].strip():  # music-only hold: no empty cue
            continue
        new = split_cues(seg["_text"], a, b, zh_line * 2 if cjk else line_chars * 2, cjk=cjk)
        if voiced is not None:
            new = retime_cues(new, a, b, voiced)
        cues_en += new
        if seg.get("video"):
            st = "Photo"
        else:
            st = caption_style_for(img_dir / seg["image"], seg.get("focus")) if img_dir and seg.get("image") else "Cap"
        styles_en += [st] * len(new)
        if seg.get("zh_hk"):
            cues_zh += split_cues(seg["zh_hk"], a, b, 22, cjk=True)
    clip = lambda cues: [(a, min(b, total), t) for a, b, t in cues if a < total - 0.2]
    keep = [i for i, (a, _, _) in enumerate(cues_en) if a < total - 0.2]
    styles_en = [styles_en[i] for i in keep]
    cues_en, cues_zh = clip(cues_en), clip(cues_zh)
    caption_font = project.get("caption_font", SUB_FONT_EN)
    cap_stem = out_dir / f"captions_{lang}"
    write_captions(cues_en, cap_stem, caption_font, zh_line if cjk else line_chars, int(round(48 * scale)), styles_en,
                   cjk=cjk)
    if cues_zh:
        write_captions(cues_zh, out_dir / "captions_zh-HK", SUB_FONT_ZH, None)

    # 5 visuals
    images_dir = project.get("images_dir")
    if images_dir:
        # Supplied stills only: one per narrative ID, in order, no generated
        # cards/text. Shot 1 starts at 0 (covers the music-only lead-in); the
        # last still holds through the music tail.
        img_root = Path(images_dir).expanduser()
        if not img_root.is_absolute():
            img_root = (project_dir / img_root).resolve()
        import os
        if os.environ.get("ASCLEPIOS_IMAGES_DIR"):
            img_root = Path(os.environ["ASCLEPIOS_IMAGES_DIR"])
        vid_root = Path(os.environ.get("ASCLEPIOS_PRESENTER_DIR") or project_dir)
        missing = [s["video"] for s in segments if s.get("video") and not (vid_root / s["video"]).exists()]
        missing += [s["image"] for s in segments if not s.get("video") and not (img_root / s["image"]).exists()]
        if missing:
            raise SystemExit("STOP - supplied media not readable: " + ", ".join(missing))
        shots = [("vid" if seg.get("video") else "img", seg, 0.0 if i == 0 else a)
                 for i, (seg, (a, _)) in enumerate(zip(segments, spans))]
    else:
        # generated title card over lead-in, one card per segment, end card on tail
        shots = [("title", project.get("title_card", {}), 0.0)]
        for seg, (a, _) in zip(segments, spans):
            shots.append(("seg", seg, a))
        shots.append(("end", project.get("end_card", {}), spans[-1][1] + 0.3))
    shots = [s for s in shots if s[2] < total]
    # presenter shots start on the first frame of their voice, so they cut in/out
    # (a crossfade would show her mouth moving before/after her line)
    fades = [0.0] + [CUT if "vid" in (shots[i - 1][0], shots[i][0]) else XFADE for i in range(1, len(shots))]
    clips = []
    for i, (kind, seg, start) in enumerate(shots):
        if kind == "vid" and i > 0:  # align the clip's first frame with the voice start
            start = spans[segments.index(seg)][0]
            shots[i] = (kind, seg, start)
    for i, (kind, seg, start) in enumerate(shots):
        nxt = shots[i + 1][2] if i + 1 < len(shots) else total
        # +3 spare frames: xfade drops frames past each transition, but a clip one frame
        # short of offset+duration ends the whole chain early
        dur = (nxt - start) + (fades[i + 1] + 0.12 if i + 1 < len(shots) else 0)
        mp4 = work / f"clip_{i:02d}_{res[1]}.mp4"
        if kind == "vid":
            video_clip(vid_root / seg["video"], dur, mp4, res)
        elif kind == "img":
            still_clip(img_root / seg["image"], dur, mp4, res, seg.get("focus"))
        else:
            png = work / f"card_{i:02d}.jpg"
            draw_card(kind, seg, project, png)
            card_clip(png, dur, mp4, res)
        clips.append((mp4, dur, start))
    # crossfade chain
    if len(clips) == 1:
        video = clips[0][0]
    else:
        inputs, chain, last = [], [], "[0:v]"
        for c, _, _ in clips:
            inputs += ["-i", str(c)]
        for i in range(1, len(clips)):
            off = clips[i][2]
            label = f"[x{i}]"
            chain.append(f"{last}[{i}:v]xfade=transition=fade:duration={fades[i]}:offset={off:.3f}{label}")
            last = label
        video = work / f"video_{res[1]}.mp4"
        ff(*inputs, "-filter_complex", ";".join(chain), "-map", last, "-c:v", "libx264",
           "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", str(video))

    # 6 render
    name = project.get("output_name", "ASCLEPIOS_HEALTH")
    tag = "full" if preview and preview >= 1e8 else f"{int(preview or 0)}s"
    final = out_dir / (f"{name}_preview_{tag}_{res[1]}p.mp4" if preview else f"{name}_1080p.mp4")
    ass = cap_stem.with_suffix(".ass")
    sub_inputs, sub_maps, sub_meta = ["-i", str(cap_stem.with_suffix(".srt"))], ["-map", "2:0"], \
        ["-metadata:s:s:0", f"language={'chi' if cjk else 'eng'}", "-metadata:s:s:0",
         f"title={'繁體中文（香港）' if cjk else 'English'}"]
    if cues_zh:
        sub_inputs += ["-i", str(out_dir / "captions_zh-HK.srt")]
        sub_maps += ["-map", "3:0"]
        sub_meta += ["-metadata:s:s:1", "language=chi", "-metadata:s:s:1", "title=繁體中文 (zh-HK)"]
    subs_f = f"subtitles={ass}:fontsdir=/usr/share/fonts" + (f",scale={res[0]}:{res[1]}" if preview else "")
    extra_in, vmap, vargs = [], ["-map", "0:v"], ["-vf", subs_f]
    lc = project.get("logo_card")
    if lc and images_dir:
        # official logo only on the named shots (opening / company intro and closing page)
        wins = [(st, shots[i + 1][2] if i + 1 < len(shots) else total)
                for i, (_, sg, st) in enumerate(shots) if str(sg.get("id")) in [str(x) for x in lc["shots"]]]
        lp = Path(lc["path"]).expanduser()
        if not lp.is_absolute():
            lp = Path(os.environ.get("ASCLEPIOS_PRESENTER_DIR") or project_dir) / lp
        hgt = round(float(lc.get("height", 132)) * res[1] / 1080)
        card = logo_card(lp, work / f"logo_card_{res[1]}.png", hgt, max(4, round(hgt * 0.14)))
        mg = round(40 * res[1] / 1080)
        en = "+".join(f"between(t,{a_:.3f},{b_:.3f})" for a_, b_ in wins)
        idx = 2 + len(sub_inputs) // 2
        extra_in = ["-loop", "1", "-i", str(card)]
        vargs = ["-filter_complex", f"[0:v][{idx}:v]overlay=x=W-w-{mg}:y={mg}:shortest=1:enable='{en}',{subs_f}[vo]"]
        vmap = ["-map", "[vo]"]
        notes.append(f"logo card: {lp.name} on shots {lc['shots']} only, windows "
                     f"{[(round(a_, 2), round(b_, 2)) for a_, b_ in wins]}")
    ff("-i", str(video), "-i", str(master), *sub_inputs, *extra_in, *vmap, "-map", "1:a", *sub_maps,
       *vargs, "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "medium" if not preview else "veryfast",
       "-crf", "19" if not preview else "26", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-c:s", "mov_text", *sub_meta,
       "-movflags", "+faststart", str(final))

    # 7 QA
    qa = run_qa(final, master, cues_en, cues_zh, total, res, preview, out_dir, notes, project)
    print(json.dumps(qa, indent=2, ensure_ascii=False))
    return qa


def run_qa(final, master, cues_en, cues_zh, total, res, preview, out_dir, notes, project):
    probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(final)],
                           capture=True))
    v = next(s for s in probe["streams"] if s["codec_type"] == "video")
    a = next(s for s in probe["streams"] if s["codec_type"] == "audio")
    subs = [s for s in probe["streams"] if s["codec_type"] == "subtitle"]
    dur = float(probe["format"]["duration"])
    log = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(final), "-map", "0:a", "-af",
               "ebur128=peak=true", "-f", "null", "-"], capture=True)
    tail = log[log.rfind("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1))
    TP = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail).group(1))
    LRA = float(re.search(r"LRA:\s+(-?[\d.]+) LU", tail).group(1))
    ordered = all(cues_en[i][0] <= cues_en[i][1] <= cues_en[i + 1][0] + 1e-3 for i in range(len(cues_en) - 1))
    cjk = project.get("caption_lang", "en").startswith("zh")
    count = (lambda t: len(re.sub(r"[\s，。、：；？！「」]", "", t))) if cjk else len
    max_cps = max((count(t) / max(0.01, b - a_) for a_, b, t in cues_en), default=0)
    cps_limit = float(project.get("caption_max_cps", 9.0 if cjk else 20.0))
    # contact sheet: one frame per caption-mid (up to 12)
    picks = cues_en[:: max(1, len(cues_en) // 12)][:12]
    sheet_frames = []
    for i, (a_, b, _) in enumerate(picks):
        fp = out_dir / "work" / f"qa_{i:02d}.jpg"
        ff("-ss", f"{(a_ + b) / 2:.2f}", "-i", str(final), "-frames:v", "1", "-vf", "scale=480:-1", str(fp))
        sheet_frames.append(fp)
    if sheet_frames:
        ims = [Image.open(p) for p in sheet_frames]
        w, h = ims[0].size
        cols = 3; rows = math.ceil(len(ims) / cols)
        sheet = Image.new("RGB", (w * cols, h * rows), (0, 0, 0))
        for i, im in enumerate(ims):
            sheet.paste(im, ((i % cols) * w, (i // cols) * h))
        sheet.save(out_dir / ("contact_sheet_preview.jpg" if preview else "contact_sheet.jpg"), quality=88)
    checks = {
        "resolution": (int(v["width"]), int(v["height"])) == res,
        "duration_matches_audio_plan": abs(dur - total) < 0.25,
        "video_stream_full_length": abs(float(v.get("duration", 0)) - total) < 0.25,
        "loudness_within_1LU_of_target": abs(I - TARGET_LUFS) <= 1.0,
        "true_peak_below_-1dBTP": TP <= -1.0,
        "captions_ordered_non_overlapping": ordered,
        "captions_within_duration": all(b <= dur + 0.05 for _, b, _ in cues_en),
        "caption_reading_speed_ok": max_cps <= cps_limit,
        "audio_48k_stereo": a.get("sample_rate") == "48000" and a.get("channels") == 2,
        "soft_caption_tracks": len(subs) == (2 if cues_zh else 1),
    }
    qa = {
        "file": final.name, "bytes": final.stat().st_size, "sha256": sha256(final),
        "duration_s": round(dur, 3), "resolution": f"{v['width']}x{v['height']}", "fps": v.get("r_frame_rate"),
        "video_codec": v["codec_name"], "audio_codec": a["codec_name"],
        "loudness_LUFS": I, "true_peak_dBFS": TP, "LRA_LU": LRA,
        "caption_lang": project.get("caption_lang", "en"), "caption_cps_limit": cps_limit,
        "caption_cues_en": len(cues_en), "caption_cues_zh_hk": len(cues_zh),
        "max_caption_cps": round(max_cps, 1), "checks": checks, "all_pass": all(checks.values()),
        "notes": notes, "script_status": project.get("script_status", "UNSPECIFIED"),
        "cost": "GBP 0 (local FFmpeg/Pillow/Kokoro on session CPU)",
    }
    (out_dir / ("qa_preview.json" if preview else "qa.json")).write_text(json.dumps(qa, indent=2, ensure_ascii=False))
    return qa


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", type=Path)
    ap.add_argument("--preview", type=float, default=None, help="render a low-res technical preview of N seconds")
    ap.add_argument("--lowres", action="store_true", help="render the full length at 640x360 (review preview)")
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--preview-res", default="640x360", help="preview frame size WxH (e.g. 960x540)")
    args = ap.parse_args()
    out = args.out or (args.project / "out")
    out.mkdir(parents=True, exist_ok=True)
    pr = tuple(int(x) for x in args.preview_res.lower().split("x"))
    qa = build(args.project.resolve(), out.resolve(), 1e9 if args.lowres and not args.preview else args.preview, pr)
    sys.exit(0 if qa["all_pass"] else 2)


if __name__ == "__main__":
    main()
