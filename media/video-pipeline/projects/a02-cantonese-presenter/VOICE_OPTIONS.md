# 阿斯康｜ASCLEPIOS HEALTH — Cantonese voice options (owner review 2026-11-05)

The owner judged the preview's Cantonese tone acceptable but the pronunciation not accurate or
natural enough. Up to three better options were tested on **one identical passage**, built only from
approved script wording and containing every listed term in natural sentences (no spoken English):

> 大家好，歡迎嚟到阿斯康。講抗衰老，我哋會由細胞出發：線粒體好似發電站，幫細胞提供能量。阿斯康嘅理念係系統性、節律性、實際應用，配合生命嘅節律。之後我哋會繼續同大家分享。

Acceptance is by the owner's ear. ASR/CER is not used to approve pronunciation. The samples are
level-matched to −18 LUFS for fair listening.

| | A — CosyVoice2, revised | B — Fun-CosyVoice3 | C — Qwen3-TTS + HK Cantonese adapter |
|---|---|---|---|
| Model | `FunAudioLLM/CosyVoice2-0.5B` rev `eec1ae6c` | `FunAudioLLM/Fun-CosyVoice3-0.5B-2512` rev `29e01c4e` (newer generation, 18+ Chinese dialects incl. Cantonese) | `Qwen/Qwen3-TTS-12Hz-1.7B-Base` + `jmtl/hk-cantonese-cc0-qwen3-tts` v0.0.5 |
| Voice | built-in 粵語女 (CosyVoice-300M-SFT) as prompt: the accepted tone | same 粵語女 prompt, so the same timbre family | `hk_voice_343`: a native Hong Kong female voice from one Common Voice donor |
| Settings | `inference_instruct2`, instruct `用粤语说这句话`, text opencc t2s (係→系), clauses ≤ 18 chars, 0.30 s after 。 / 0.14 s after ：, seed 2026+i, runaway guard 0.13–0.42 s per syllable (all first takes) | `inference_instruct2`, instruct `You are a helpful assistant. 请用广东话表达。`, text t2s, clauses ≤ 30 chars, same gaps, seed 2026+i | `generate_custom_voice`, `language="chinese"`, default sampling, chunks ≤ 45 chars (card guidance) |
| Length | 24.4 s | 22.0 s | not generated (see status) |
| Local / online | local CPU | local CPU | local CPU |
| Cost | £0 | £0 | £0 |
| Licence | code + weights Apache-2.0 | code + weights Apache-2.0 | base Apache-2.0; adapter Apache-2.0; training data CC-0 |
| Limits | none known for commercial use | none known for commercial use | **the voice is a real person's** (CC-0 donor). The card asks deployers not to present it as fictional, not to impersonate, and to mark audio as synthetic where it could be taken for a recording. This conflicts with A05 「不要模仿特定真人聲紋」; owner decision needed |
| Status | delivered | delivered | **blocked**: installing `qwen-tts` and running the adapter's merge script was refused by the session's safety check ("Code from External"). Needs the owner's explicit approval, as for CosyVoice/MuseTalk/LivePortrait |

Notes:
- A first run of A with Traditional-character input ran away on the last sentence (34 s). It was
  rejected, not delivered (`A_cosyvoice2_traditional_REJECTED`); A is generated with the V3 text form plus a duration guard.
- Pronunciation controls: none of these engines offers a Jyutping lexicon in its free local
  interface. Control is by clause segmentation, instruct prompt and (CosyVoice3) the dialect instruction.
- After a voice is chosen, the whole film uses that one voice and settings; no mixing between sentences.
