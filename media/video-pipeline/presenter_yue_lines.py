#!/usr/bin/env python3
"""Claire Lee — Cantonese presenter lines (ASCLEPIOS-VIDEO-001, #142).

Wording is copied verbatim from owner-approved sources; nothing is retranslated:
  open_cam, open_vo, end_cam : #142 owner amendment 6633840244 (P01 / P05),
                               with the presenter title removed per 6640077234
  p02_cam, p03_cam, p04_cam  : Drive Claire_Lee_Director_Handoff_v1_2026-11-04.md §2
                               (first sentence of A02 shots 06 / 12 / 18, moved on camera)
The Traditional Chinese text is the script and subtitle master. Only the model
input is converted to Simplified characters (opencc t2s, 係->系), because that is
what CosyVoice's Cantonese training text uses (yue-v3 checkpoint, V3 method).

Voice = yue-v3 checkpoint V3: CosyVoice2-0.5B instruct "用粤语说这句话", prompt =
the built-in 粤语女 voice of CosyVoice-300M-SFT (V1_sft_tc.wav), so the timbre
stays the same. Each sentence is generated separately and joined with a short
natural pause (more stable than one long call).

    YUE_BRAND_WAV=<brand take> COSYVOICE_REPO=... COSYVOICE_MODELS=... python presenter_yue_lines.py <prompt.wav> <out_dir> [tag ...]
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

LINES = {
    "open_cam": "大家好，我係 Claire Lee，歡迎嚟到 ASCLEPIOS HEALTH。",
    "open_vo": "今日同大家分享，點解講抗衰老，除咗食啲乜，幾時食都咁值得留意。",
    "p02_cam": "咁樣，補充咗就夠未？",
    "p03_cam": "但細胞嘅工作，原來仲有時間表。",
    # 阿斯康: as written in the director handoff; to be confirmed against the Cantonese A02 (shot 18)
    "p04_cam": "呢個就係阿斯康嘅理念：系統性、節律性、實際應用。",
    "end_cam": "今日先同大家分享到呢度。之後我哋會繼續推出更多短片，由細胞、身體機能到日常生活，"
               "一步步同大家了解，乜嘢先係真正嘅抗衰老。我係 Claire Lee，下次再同大家分享。拜拜！",
}
SOURCE = {
    "open_cam": "#142 6633840244 (P01, title removed per 6640077234)",
    "open_vo": "#142 6633840244 (P01 second sentence, voice-over on shot 02)",
    "p02_cam": "Drive Claire_Lee_Director_Handoff_v1 §2 P02",
    "p03_cam": "Drive Claire_Lee_Director_Handoff_v1 §2 P03",
    "p04_cam": "Drive Claire_Lee_Director_Handoff_v1 §2 P04 (brand wording to confirm vs Cantonese A02)",
    "end_cam": "#142 6633840244 (P05 farewell)",
}

# A02 narration (Drive ASCLEPIOS_VIDEO_001_A02_HANDOFF/unzipped/A02_Narration_By_Shot.txt,
# 1lBfxce05mXLh_J_KD0k1Qaf9uRmWxC3s), verbatim. 06/12/18 start after the sentence Claire speaks
# on camera (P02/P03/P04); 02 is replaced by open_vo per the owner amendment, as in English.
A02 = {
    "03": "試諗吓，你開始留意營養，揀咗補充品，每日都記得食。",
    "04": "但忙起上嚟，食飯時間成日變，午餐又推遲咗。",
    "05": "夜晚再睇多一陣手機，不知不覺，又夜咗瞓。",
    "06": "要答呢個問題，我哋先睇吓細胞呢座日夜運作嘅城市。",
    "07": "線粒體，好似發電站，幫細胞提供運作需要嘅能量。",
    "08": "你每日行路、活動，背後都有細胞嘅能量供應。",
    "09": "呢座城市亦有回收站。溶酶體，會分解同回收部分受損嘅蛋白質同部件。",
    "10": "仲有維修工作。例如DNA修復，就係幫細胞維護遺傳物質嘅完整性。",
    "11": "隨住年齡增長，部分能量、清理同維護功能可能減弱。損傷日積月累，就可能影響細胞，以至組織同器官嘅表現。",
    "12": "而朝早嘅光線，就係重要嘅時間訊號。",
    "13": "光線會影響腦內嘅主時鐘，再協調唔同器官同細胞嘅時鐘。代謝同部分維護工作，都受到日夜節律調節。節律同細胞功能，亦會隨住衰老互相影響。",
    "14": "所以，睡眠同節律值得一齊照顧。但修復唔係只喺夜晚發生，唔同工作，有各自嘅節奏。",
    "15": "進餐時間，亦會影響部分外周時鐘同代謝節律。食乜，同幾時食，係兩個值得一齊理解嘅問題。",
    "16": "研究一種成分，好似研究點樣改善一個發電站。但要照顧成座城市，就要再睇埋整體。",
    "17": "營養同代謝提供原料同能量，荷爾蒙傳遞調節訊息，免疫亦參與細胞環境嘅調節。細胞功能，同全身系統一直互相影響。",
    "18": "先建立飲食、活動同睡眠嘅基礎，再按需要同證據，考慮營養支持。用乜、點用、幾時用，要逐項睇，唔係每樽都硬分早午晚。",
    "19": "跟住阿斯康，我哋會帶你由細胞嘅能量、清理同修復出發，一齊探索身體機能同生命節律，點樣變成每日做得到嘅選擇。呢段抗衰老旅程，由認識自己開始。",
    "20": "阿斯康。從細胞出發，配合生命嘅節律。"
}
for _k, _v in A02.items():
    LINES[f"n{_k}"] = _v
    SOURCE[f"n{_k}"] = ("A02_Narration_By_Shot.txt shot " + _k +
                         (" (after the on-camera sentence)" if _k in ("06", "12", "18") else ""))
# Model-input overrides (same spoken words; the subtitle/script text stays as in LINES).
# n20: a three-character sentence on its own (「阿斯康。」) was unstable (ASR "Sihong"), so the model
# reads it joined to the slogan with a comma.
MODEL_TEXT = {"n20": "阿斯康，從細胞出發，配合生命嘅節律。"}
INSTRUCT = "用粤语说这句话<|endofprompt|>"
TAKES = int(os.environ.get("YUE_TAKES", "3"))
BRAND = "ASCLEPIOS HEALTH"


def trim(w, sr, thr=0.012, pad=0.03):
    """Cut leading/trailing silence so joined pieces keep a natural rhythm."""
    a = w.abs().squeeze(0)
    idx = torch.nonzero(a > thr).squeeze(-1)
    if idx.numel() == 0:
        return w
    s0, s1 = max(0, int(idx[0]) - int(pad * sr)), min(a.numel(), int(idx[-1]) + int(pad * sr))
    return w[:, s0:s1]


def squeeze(w, sr, win=0.02, thr=0.015, keep=0.07):
    """Shorten silences inside a chunk to `keep` seconds (the English brand chunk
    comes out with a long pause between the two words)."""
    n = int(win * sr)
    a = w.abs().squeeze(0)
    frames = [a[i:i + n].max().item() > thr for i in range(0, a.numel(), n)]
    out, run = [], []
    for k, loud in enumerate(frames):
        seg = w[:, k * n:(k + 1) * n]
        if loud:
            if run:
                out.append(torch.cat(run, dim=1)[:, :int(keep * sr)])
                run = []
            out.append(seg)
        else:
            run.append(seg)
    if run:
        out.append(torch.cat(run, dim=1)[:, :int(keep * sr)])
    return torch.cat(out, dim=1)


# Whisper writes Cantonese in standard written Chinese; map both sides to the same forms
# before scoring, so only real misreadings count (simplified characters on both sides).
COLLOQ = [("乜嘢", "什么"), ("乜", "什么"), ("点解", "为何"), ("咁样", "这样"), ("嘅", "的"), ("系", "是"),
          ("嚟", "来"), ("咗", "了"), ("啲", "些"), ("哋", "们"), ("仲", "还"), ("呢", "这"), ("咁", "这么"),
          ("食", "吃"), ("喫", "吃"), ("同", "跟"), ("冇", "没有"), ("今日", "今天"), ("为什么", "为何")]


def norm_sc(t, t2s):
    t = t2s.convert(t).lower()
    for a, b in COLLOQ:
        t = t.replace(a, b)
    return re.sub(r"[\sa-z'，。,.!！?？、：:《》]", "", t)


def cer(ref, hyp, t2s):
    r, h = norm_sc(ref, t2s), norm_sc(hyp, t2s)
    d = list(range(len(h) + 1))
    for i, rc in enumerate(r, 1):
        prev, d[0] = d[0], i
        for j, hc in enumerate(h, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (rc != hc))
    return round(d[-1] / max(1, len(r)), 3)


GAP_S = {"，": 0.0, "。": 0.32, "？": 0.32, "！": 0.30, "：": 0.12}


def split_sentences(text):
    return [s for s in re.split(r"(?<=[。？！])", text) if s.strip()]


def main():
    prompt, out = sys.argv[1], Path(sys.argv[2])
    tags = sys.argv[3:] or list(LINES)
    out.mkdir(parents=True, exist_ok=True)
    from cosyvoice.cli.cosyvoice import CosyVoice2
    torch.set_num_threads(os.cpu_count() or 4)
    t2s = OpenCC("t2s")
    m = CosyVoice2(str(Path(os.environ["COSYVOICE_MODELS"]) / "CosyVoice2-0.5B"), load_jit=False, load_trt=False,
                   fp16=False)
    sr = m.sample_rate
    from transformers import pipeline
    asr = pipeline("automatic-speech-recognition", model=str(Path(os.environ["COSYVOICE_MODELS"]) / "whisper-large-v3-turbo"),
                   device="cpu")
    brand_wav, bsr = torchaudio.load(os.environ["YUE_BRAND_WAV"])
    if bsr != sr:
        brand_wav = torchaudio.functional.resample(brand_wav, bsr, sr)
    meta_p = out / "yue_lines.json"
    meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
    for tag in tags:
        t0 = time.time()
        parts, scores = [], []
        for i, s in enumerate(split_sentences(MODEL_TEXT.get(tag, LINES[tag]))):
            pieces = []
            for j, chunk in enumerate(re.split(f"({BRAND})", s)):
                if not re.sub(r"[\s，。？！：、]", "", chunk):   # punctuation-only remainder
                    continue
                torch.manual_seed(1986 + 10 * i + j)
                if chunk == BRAND:
                    # one fixed English take of the brand, reused everywhere so it always sounds the same
                    # (in-sentence spellings were misread; chosen take scored best on English ASR)
                    w = squeeze(trim(brand_wav, sr, thr=0.02, pad=0.02), sr)
                else:
                    # best of N takes by Cantonese ASR character error rate against the script
                    best = None
                    for k in range(TAKES):
                        torch.manual_seed(1986 + 10 * i + j + 1000 * k)
                        gen = m.inference_instruct2(t2s.convert(chunk).replace("係", "系"), INSTRUCT, prompt,
                                                    stream=False)
                        w = trim(torch.cat([c["tts_speech"] for c in gen], dim=1), sr, thr=0.02, pad=0.02)
                        hyp = asr({"raw": w.squeeze(0).numpy(), "sampling_rate": sr},
                                  generate_kwargs={"language": "yue", "task": "transcribe"})["text"]
                        e = cer(chunk, hyp, t2s)
                        if best is None or e < best[0]:
                            best = (e, w, hyp, k)
                        if e == 0:
                            break
                    e, w, hyp, k = best
                    scores.append({"chunk": chunk, "take": k, "cer": e, "asr": hyp})
                pieces += [w, torch.zeros(1, int(sr * 0.05))]
            parts.append(torch.cat(pieces[:-1], dim=1))
            parts.append(torch.zeros(1, int(sr * GAP_S.get(s[-1], 0.3))))
        wav = torch.cat(parts[:-1], dim=1)
        # resample to 24 kHz mono for build.py (CosyVoice2 is 24 kHz already)
        if sr != 24000:
            wav = torchaudio.functional.resample(wav, sr, 24000)
        torchaudio.save(str(out / f"{tag}.wav"), wav, 24000)
        meta[tag] = {"text_tc": LINES[tag], "brand": f"ASCLEPIOS HEALTH = fixed English take {Path(os.environ['YUE_BRAND_WAV']).name} (inference_cross_lingual, same prompt)",
                     "model_input_sc": [t2s.convert(s).replace("係", "系") for s in split_sentences(LINES[tag])],
                     "source": SOURCE[tag], "duration_s": round(wav.shape[1] / 24000, 2),
                     "model": "CosyVoice2-0.5B rev eec1ae6c (instruct2)", "instruct": INSTRUCT,
                     "prompt": Path(prompt).name, "seed_base": 1986, "takes": TAKES, "model_text_override": MODEL_TEXT.get(tag), "chunk_scores": scores, "render_s": round(time.time() - t0, 1)}
        print(tag, meta[tag]["duration_s"], "s", meta[tag]["render_s"], "s render")
        meta_p.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
