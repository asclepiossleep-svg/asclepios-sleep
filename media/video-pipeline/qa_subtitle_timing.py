#!/usr/bin/env python3
"""Subtitle-to-voice timing QA (#142): does each SRT cue sit on the real narration?

For every cue: onset_ms = where speech resumes after the pause (>= 60 ms unvoiced) nearest the cue
start, within 0.6 s, minus the cue start (+ = voice after the cue appears; none found = the cue
starts mid-speech); voiced_share = share of the cue that has voice (pauses inside
a cue are normal); and whether any voice falls after the cue ends but before the next cue (a
"late tail"). Voice = narration RMS above -40 dBFS. Pass for a cue: |onset_ms| <= 250,
voiced_share >= 0.5, late tail <= 0.30 s.

    python3 qa_subtitle_timing.py <captions.srt> <narration.wav> <out.json>
"""
import json
import re
import subprocess
import sys

import numpy as np


def srt(path):
    t = open(path, encoding="utf-8").read().strip().split("\n\n")
    ts = lambda s: sum(float(x) * m for x, m in zip(s.replace(",", ".").split(":"), (3600, 60, 1)))
    out = []
    for blk in t:
        lines = blk.splitlines()
        m = re.match(r"(\S+) --> (\S+)", lines[1])
        out.append((ts(m.group(1)), ts(m.group(2)), "".join(lines[2:])))
    return out


def main():
    cues = srt(sys.argv[1])
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", sys.argv[2], "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = 160
    rms = np.sqrt(np.array([np.mean(x[i:i + hop] ** 2) for i in range(0, len(x) - hop, hop)]) + 1e-12)
    voiced = 20 * np.log10(rms) > -40
    fr = lambda t: max(0, min(len(voiced), int(round(t * 100))))
    rows = []
    for i, (a, b, text) in enumerate(cues):
        nxt = cues[i + 1][0] if i + 1 < len(cues) else b + 1.0
        lo, hi = fr(a - 0.6), fr(min(b, a + 0.6))
        runs, j = [], lo                                # ends of unvoiced runs >= 60 ms (= where speech resumes)
        while j < hi:
            if not voiced[j]:
                k = j
                while k < len(voiced) and not voiced[k]:
                    k += 1
                if k - j >= 6 or j == 0:
                    runs.append(k / 100)
                j = k
            else:
                j += 1
        onset = min((r - a for r in runs), key=abs) if runs else None
        share = float(voiced[fr(a):fr(b)].mean()) if fr(b) > fr(a) else 0.0
        tail_v = np.nonzero(voiced[fr(b):fr(nxt - 0.05)])[0]   # the next cue's own first syllable is not a late tail
        tail = (tail_v[-1] + 1) / 100 if len(tail_v) else 0.0
        ok = onset is not None and abs(onset) <= 0.25 and share >= 0.5 and tail <= 0.30
        rows.append({"cue": i + 1, "start": round(a, 2), "end": round(b, 2), "text": text,
                     "onset_ms": None if onset is None else int(round(onset * 1000)),
                     "voiced_share": round(share, 2), "late_tail_s": round(tail, 2), "pass": bool(ok)})
    res = {"cues": len(rows), "pass": sum(r["pass"] for r in rows),
           "max_abs_onset_ms": max(9999 if r["onset_ms"] is None else abs(r["onset_ms"]) for r in rows),
           "min_voiced_share": min(r["voiced_share"] for r in rows), "max_late_tail_s": max(r["late_tail_s"] for r in rows),
           "all_pass": all(r["pass"] for r in rows), "rows": rows}
    open(sys.argv[3], "w", encoding="utf-8").write(json.dumps(res, indent=1, ensure_ascii=False))
    print(json.dumps({k: v for k, v in res.items() if k != "rows"}))


if __name__ == "__main__":
    main()
