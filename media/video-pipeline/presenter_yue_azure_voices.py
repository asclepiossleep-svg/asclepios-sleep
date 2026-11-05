#!/usr/bin/env python3
"""Cantonese voice test with Microsoft Azure's official Hong Kong neural voices (owner order #142, 2026-11-05).

Same passage for every voice (approved wording; every listed term; Hong Kong Cantonese only, no
English): 阿斯康 抗衰老 細胞 線粒體 節律 系統性 實際應用 繼續, opening 「大家好，歡迎嚟到阿斯康。」

Voices: zh-HK-HiuMaanNeural (F), zh-HK-HiuGaaiNeural (F), zh-HK-WanLungNeural (M) — Microsoft's
own prebuilt voices, no cloning. Normal rate and pitch (SSML prosody rate="0%" pitch="0%").
Output 48 kHz 16-bit mono PCM, then each file is loudness-matched to -18 LUFS for listening.

Credentials are never written anywhere: the key is read from AZURE_SPEECH_KEY if set; if it is
not set, the request is sent without it so a network-level secret (proxy-injected
Ocp-Apim-Subscription-Key for <region>.tts.speech.microsoft.com) can supply it.
Region from AZURE_SPEECH_REGION (default eastasia).

    python3 presenter_yue_azure_voices.py <out_dir>
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

PASSAGE = ("大家好，歡迎嚟到阿斯康。講抗衰老，我哋會由細胞出發：線粒體好似發電站，幫細胞提供能量。"
           "阿斯康嘅理念係系統性、節律性、實際應用，配合生命嘅節律。之後我哋會繼續同大家分享。")
VOICES = ["zh-HK-HiuMaanNeural", "zh-HK-HiuGaaiNeural", "zh-HK-WanLungNeural"]
FORMAT = "riff-48khz-16bit-mono-pcm"
RATE, PITCH = "0%", "0%"


def ssml(voice):
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK">'
            f'<voice name="{voice}"><prosody rate="{RATE}" pitch="{PITCH}">{PASSAGE}</prosody></voice></speak>')


def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    region = os.environ.get("AZURE_SPEECH_REGION", "eastasia")
    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    headers = {"Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": FORMAT,
               "User-Agent": "asclepios-video-pipeline"}
    if os.environ.get("AZURE_SPEECH_KEY"):
        headers["Ocp-Apim-Subscription-Key"] = os.environ["AZURE_SPEECH_KEY"]
    meta = {"endpoint": url, "region": region, "output_format": FORMAT, "rate": RATE, "pitch": PITCH,
            "passage": PASSAGE, "characters_per_voice": len(PASSAGE), "voices": {}}
    for v in VOICES:
        body = ssml(v).encode("utf-8")
        t0 = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, body, headers), timeout=60) as r:
                data = r.read()
        except urllib.error.HTTPError as e:
            raise SystemExit(f"{v}: HTTP {e.code} {e.reason} (check key, region and the allowed domain)")
        raw = out / f"{v}_raw.wav"; raw.write_bytes(data)
        fin = out / f"Cantonese_voice_Azure_{v}.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af", "loudnorm=I=-18:TP=-1.5:LRA=11",
                        "-ar", "48000", "-ac", "1", str(fin)], check=True)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                    "default=nw=1:nk=1", str(fin)], capture_output=True, text=True).stdout)
        meta["voices"][v] = {"file": fin.name, "duration_s": round(dur, 2), "request_s": round(time.time() - t0, 2),
                             "ssml": ssml(v)}
        print(v, round(dur, 2), "s")
    (out / "azure_voices.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
