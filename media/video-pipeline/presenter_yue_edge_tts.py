#!/usr/bin/env python3
"""Cantonese voice test with edge-tts, zh-HK-HiuGaaiNeural (owner order #142, 2026-11-05).

The owner confirmed the old Manus Cantonese film used Microsoft Edge's online speech service
through edge-tts, voice zh-HK-HiuGaaiNeural; the exact rate/pitch were not kept. Three
versions of one passage are made so the closest match can be chosen by ear:
  A  rate +0%  pitch +0Hz   (defaults)
  B  rate -5%  pitch +0Hz
  C  rate +5%  pitch +0Hz
Volume is left at the default (+0%); each file is then loudness-matched to -18 LUFS.
Hong Kong Cantonese only: no English, Claire's name not spoken, opening 「大家好，歡迎嚟到阿斯康。」
No account or key is needed. Network: speech.platform.bing.com (WebSocket over 443) through the
session proxy.

    python3 presenter_yue_edge_tts.py <out_dir>        (run with the edge-tts venv's python)
"""
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

import edge_tts

PASSAGE = ("大家好，歡迎嚟到阿斯康。講抗衰老，我哋會由細胞出發：線粒體好似發電站，幫細胞提供能量。"
           "阿斯康嘅理念係系統性、節律性、實際應用，配合生命嘅節律。之後我哋會繼續同大家分享。")
VOICE = "zh-HK-HiuGaaiNeural"
VERSIONS = {"A": ("+0%", "+0Hz"), "B": ("-5%", "+0Hz"), "C": ("+5%", "+0Hz")}
VOLUME = "+0%"


def duration(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                 "default=nw=1:nk=1", str(p)], capture_output=True, text=True).stdout)


async def make(tag, rate, pitch, out):
    mp3 = out / f"edge_{VOICE}_{tag}.mp3"
    kw = {"rate": rate, "pitch": pitch, "volume": VOLUME}
    if os.environ.get("HTTPS_PROXY"):
        kw["proxy"] = os.environ["HTTPS_PROXY"]
    await edge_tts.Communicate(PASSAGE, VOICE, **kw).save(str(mp3))
    wav = out / f"Cantonese_voice_edge_HiuGaai_{tag}_rate{rate}_pitch{pitch}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(mp3), "-af", "loudnorm=I=-18:TP=-1.5:LRA=11",
                    "-ar", "48000", "-ac", "1", str(wav)], check=True)
    return {"version": tag, "rate": rate, "pitch": pitch, "volume": VOLUME, "file": wav.name,
            "raw_mp3": mp3.name, "raw_duration_s": round(duration(mp3), 2), "duration_s": round(duration(wav), 2)}


async def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    rows = [await make(t, r, p, out) for t, (r, p) in VERSIONS.items()]
    meta = {"engine": "edge-tts " + __import__("importlib.metadata").metadata.version("edge-tts"),
            "service": "Microsoft Edge online speech (speech.platform.bing.com), no account/key",
            "voice": VOICE, "passage": PASSAGE, "loudness": "each file loudnorm I=-18 LUFS, TP=-1.5 dBTP, 48 kHz mono",
            "versions": rows}
    (out / "edge_tts_versions.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    for r in rows:
        print(r["version"], r["rate"], r["pitch"], r["duration_s"], "s")


if __name__ == "__main__":
    asyncio.run(main())
