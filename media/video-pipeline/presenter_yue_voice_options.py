#!/usr/bin/env python3
"""Cantonese voice options test, same passage for every engine (owner review #142, 2026-11-05).

The passage is built only from approved script wording (A02, P01 revision, slogan) and
puts every term the owner listed into natural sentences:
  阿斯康 抗衰老 細胞 線粒體 節律 系統性 實際應用 繼續
No English is spoken (owner: Claire's name and ASCLEPIOS HEALTH are no longer read).

Engines (all free, local, CPU):
  A  cosyvoice2   CosyVoice2-0.5B, revised: Traditional text in, short clause chunks,
                  instruct "用粵語自然地講", same 粵語女 prompt (the accepted tone)
  B  cosyvoice3   Fun-CosyVoice3-0.5B-2512, instruct2 "請用廣東話表達。", same prompt
  C  qwen3-hk     Qwen3-TTS-12Hz-1.7B-Base + jmtl/hk-cantonese-cc0-qwen3-tts adapter
                  (native Hong Kong voice of one CC-0 Common Voice donor; see notes)

    python3 presenter_yue_voice_options.py <engine> <out.wav> [model paths via env]
"""
import json
import os
import re
import sys
import time
from pathlib import Path

PASSAGE = ("大家好，歡迎嚟到阿斯康。講抗衰老，我哋會由細胞出發：線粒體好似發電站，幫細胞提供能量。"
           "阿斯康嘅理念係系統性、節律性、實際應用，配合生命嘅節律。之後我哋會繼續同大家分享。")


def clauses(text, limit):
    """Split at sentence ends, then at commas/colons when a sentence is longer than `limit`."""
    out = []
    for s in [x for x in re.split(r"(?<=[。？！])", text) if x.strip()]:
        if len(s) <= limit:
            out.append(s); continue
        cur = ""
        for part in re.split(r"(?<=[，：、])", s):
            if cur and len(cur) + len(part) > limit:
                out.append(cur); cur = part
            else:
                cur += part
        if cur:
            out.append(cur)
    return out


def gap_after(chunk):
    return 0.30 if chunk[-1] in "。？！" else (0.14 if chunk[-1] in "：" else 0.08)


def cosy(engine, out):
    import torch
    import torchaudio
    from opencc import OpenCC
    repo = Path(os.environ["COSYVOICE_REPO"])
    sys.path[:0] = [str(repo), str(repo / "third_party" / "Matcha-TTS")]
    from cosyvoice.cli.cosyvoice import CosyVoice2, CosyVoice3
    torch.set_num_threads(os.cpu_count() or 4)
    prompt = os.environ["YUE_PROMPT_WAV"]
    if engine == "cosyvoice2":
        m = CosyVoice2(os.environ["COSYVOICE2_MODEL"], load_jit=False, load_trt=False, fp16=False)
        instruct = "用粤语说这句话<|endofprompt|>"
        t2s = OpenCC("t2s")
        conv = lambda s: t2s.convert(s).replace("係", "系")   # Traditional input ran away (34 s); V3 form
        limit = 18
    else:
        m = CosyVoice3(os.environ["COSYVOICE3_MODEL"], load_trt=False, fp16=False)
        instruct = "You are a helpful assistant. 请用广东话表达。<|endofprompt|>"
        t2s = OpenCC("t2s")
        conv = lambda s: t2s.convert(s).replace("係", "系")
        limit = 30
    sr = m.sample_rate
    parts, chunks = [], clauses(PASSAGE, limit)
    retries = []
    for i, c in enumerate(chunks):
        n = len(re.sub(r"[，。、：；？！\s]", "", c))
        for k in range(5):   # runaway / truncation guard: 0.13-0.42 s per Cantonese syllable
            torch.manual_seed(2026 + i + 100 * k)
            w = torch.cat([j["tts_speech"] for j in m.inference_instruct2(conv(c), instruct, prompt, stream=False)],
                          dim=1)
            if 0.13 * n <= w.shape[1] / sr <= 0.42 * n:
                break
        retries.append({"chunk": c, "take": k, "seconds": round(w.shape[1] / sr, 2), "syllables": n})
        parts += [w, torch.zeros(1, int(sr * gap_after(c)))]
    wav = torch.cat(parts[:-1], dim=1)
    torchaudio.save(out, wav, sr)
    return {"sample_rate": sr, "instruct": instruct, "chunks": chunks, "chunk_limit": limit,
            "text_form": "Simplified (opencc t2s, 係->系)", "takes": retries,
            "seed_base": 2026, "prompt": Path(prompt).name}


def qwen(out):
    import soundfile as sf
    import numpy as np
    import torch
    from qwen_tts import Qwen3TTSModel
    torch.set_num_threads(os.cpu_count() or 4)
    m = Qwen3TTSModel.from_pretrained(os.environ["QWEN_HK_MODEL"], dtype=torch.float32, device_map="cpu",
                                      attn_implementation="sdpa")
    chunks = clauses(PASSAGE, 45)
    pieces, sr = [], None
    for c in chunks:
        wavs, sr = m.generate_custom_voice(text=[c], speaker=["hk_voice_343"], language=["chinese"])
        pieces += [np.asarray(wavs[0], dtype=np.float32), np.zeros(int(sr * gap_after(c)), np.float32)]
    sf.write(out, np.concatenate(pieces[:-1]), sr)
    return {"sample_rate": sr, "speaker": "hk_voice_343", "language": "chinese", "chunks": chunks, "chunk_limit": 45,
            "sampling": "model defaults (card: greedy / low temperature loops)"}


def main():
    engine, out = sys.argv[1], sys.argv[2]
    t0 = time.time()
    meta = cosy(engine, out) if engine in ("cosyvoice2", "cosyvoice3") else qwen(out)
    meta.update({"engine": engine, "passage": PASSAGE, "render_s": round(time.time() - t0, 1)})
    Path(out).with_suffix(".json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == "__main__":
    main()
