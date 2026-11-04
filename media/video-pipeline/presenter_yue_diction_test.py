#!/usr/bin/env python3
"""Claire Lee — Cantonese diction A/B on one ~5 s sentence (ASCLEPIOS-VIDEO-001).

Candidates (same timbre: the built-in 粤语女 voice of CosyVoice-300M-SFT):
  V1  300M-SFT, traditional text (current baseline)
  V2  300M-SFT, simplified-character Cantonese (the models' training script)
  V3  CosyVoice2-0.5B instruct "用粤语说这句话", prompt = V1 audio, whole sentence
  V4  as V3 but the English name is generated separately in English
      (cross-lingual, same prompt) and joined with short natural gaps
Each candidate is transcribed with whisper-large-v3-turbo (language=yue) and
scored by character error rate against the intended sentence.

Run in the CosyVoice venv:
  COSYVOICE_REPO=... COSYVOICE_MODELS=... python presenter_yue_diction_test.py <out_dir>
"""
import json
import os
import re
import sys
import time
from pathlib import Path

repo = Path(os.environ["COSYVOICE_REPO"])
sys.path[:0] = [str(repo), str(repo / "third_party" / "Matcha-TTS")]
import torch  # noqa: E402
import torchaudio  # noqa: E402
from opencc import OpenCC  # noqa: E402
from cosyvoice.cli.cosyvoice import CosyVoice, CosyVoice2  # noqa: E402

M = Path(os.environ["COSYVOICE_MODELS"])
SENT_TC = "大家好，我係 Claire Lee，大家嘅健康科普主持人。"
t2s, s2t = OpenCC("t2s"), OpenCC("s2t")
SENT_SC = t2s.convert(SENT_TC).replace("係", "系")
INSTRUCT = "用粤语说这句话<|endofprompt|>"


def cat(chunks):
    return torch.cat([c["tts_speech"] for c in chunks], dim=1)


def gap(sr, s):
    return torch.zeros(1, int(sr * s))


def norm(s):
    s = t2s.convert(s.lower())
    s = s.replace("系", "是").replace("嘅", "的")  # tolerate written-form spellings in ASR output
    return re.sub(r"[\s，。,.!！?？、]", "", s)


def cer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    d = list(range(len(h) + 1))
    for i, rc in enumerate(r, 1):
        prev, d[0] = d[0], i
        for j, hc in enumerate(h, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (rc != hc))
    return round(d[-1] / max(1, len(r)), 3)


def main(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 4)
    res = []
    v1 = CosyVoice(str(M / "CosyVoice-300M-SFT"), load_jit=False, fp16=False)
    for tag, text in [("V1_sft_tc", SENT_TC), ("V2_sft_sc", SENT_SC)]:
        t0 = time.time()
        wav = cat(v1.inference_sft(text, "粤语女", stream=False))
        p = out / f"{tag}.wav"; torchaudio.save(str(p), wav, v1.sample_rate)
        res.append({"tag": tag, "text": text, "file": p.name, "render_s": round(time.time() - t0, 1)})
    prompt = str(out / "V1_sft_tc.wav")
    del v1
    v2 = CosyVoice2(str(M / "CosyVoice2-0.5B"), load_jit=False, load_trt=False, fp16=False)
    sr = v2.sample_rate
    t0 = time.time()
    wav = cat(v2.inference_instruct2(SENT_SC, INSTRUCT, prompt, stream=False))
    p = out / "V3_cv2_instruct.wav"; torchaudio.save(str(p), wav, sr)
    res.append({"tag": "V3_cv2_instruct", "text": SENT_SC, "instruct": INSTRUCT, "file": p.name,
                "render_s": round(time.time() - t0, 1)})
    t0 = time.time()
    a = cat(v2.inference_instruct2("大家好，我系", INSTRUCT, prompt, stream=False))
    b = cat(v2.inference_cross_lingual("<|en|>Claire Lee.", prompt, stream=False))
    c = cat(v2.inference_instruct2("大家嘅健康科普主持人。", INSTRUCT, prompt, stream=False))
    wav = torch.cat([a, gap(sr, 0.06), b, gap(sr, 0.12), c], dim=1)
    p = out / "V4_cv2_split_name.wav"; torchaudio.save(str(p), wav, sr)
    res.append({"tag": "V4_cv2_split_name", "text": "大家好，我系 | <|en|>Claire Lee. | 大家嘅健康科普主持人。",
                "instruct": INSTRUCT, "file": p.name, "render_s": round(time.time() - t0, 1)})
    del v2

    from transformers import pipeline
    asr = pipeline("automatic-speech-recognition", model=str(M / "whisper-large-v3-turbo"), device="cpu")
    for r in res:
        w, s = torchaudio.load(str(out / r["file"]))
        r["duration_s"] = round(w.shape[1] / s, 2)
        hyp = asr(str(out / r["file"]), generate_kwargs={"language": "yue", "task": "transcribe"})["text"]
        r["asr_yue"] = s2t.convert(hyp)
        r["cer_vs_intended"] = cer(SENT_TC, hyp)
    (out / "diction_results.json").write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
    for r in res:
        print(r["tag"], r["duration_s"], "s | CER", r["cer_vs_intended"], "|", r["asr_yue"])


if __name__ == "__main__":
    main(Path(sys.argv[1]))
