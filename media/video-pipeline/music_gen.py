#!/usr/bin/env python3
"""Original procedural background music for ASCLEPIOS HEALTH videos.

Composed and synthesised here from code (numpy sine/FM synthesis): no samples,
loops, presets or third-party recordings, so there are no external rights and
no cost. Same seed + length -> identical audio.

Style: clear, light, melodic. 80 bpm, D major, 8-bar form.
Layers: soft pad, sine bass, FM "kalimba" arpeggio, sparse FM-bell melody
(only in bars 3-4 and 7-8, above the voice range), very light shaker
from bar 5, resolving to Dmaj9 at the end.

    python3 music_gen.py out.wav 28.4
"""
from __future__ import annotations

import sys

import numpy as np

SR = 48000
BPM = 80
BEAT = 60 / BPM
BAR = 4 * BEAT


def mtof(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


# chord voicings (MIDI); bass = first note
CHORDS = {
    "Dmaj9": [50, 57, 61, 64, 66],
    "Bm11":  [47, 54, 57, 62, 64],
    "Gmaj7": [43, 50, 54, 59, 62],
    "A6sus": [45, 52, 59, 62, 66],
    "F#m7":  [42, 49, 52, 57, 61],
    "Asus":  [45, 52, 57, 62, 64],
}
FORM = ["Dmaj9", "Bm11", "Gmaj7", "A6sus", "Dmaj9", "F#m7", "Gmaj7", "Asus"]
# melody: (bar-in-form, beat offset, MIDI, beats)
MELODY = [
    (2, 0.0, 78, 1.5), (2, 1.5, 81, 0.5), (2, 2.0, 83, 1.0), (2, 3.0, 81, 1.0),
    (3, 0.0, 76, 2.0), (3, 2.0, 74, 2.0),
    (6, 0.0, 78, 1.0), (6, 1.0, 76, 1.0), (6, 2.0, 74, 1.0), (6, 3.0, 71, 1.0),
    (7, 0.0, 73, 2.0), (7, 2.0, 76, 2.0),
]
ARP = [0, 2, 3, 2, 4, 3, 2, 1]  # indexes into the chord's upper voices, 8ths


def env(n: int, a: float, r: float) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-3))
    tail = np.clip((n / SR - t) / max(r, 1e-3), 0, 1)
    return e * tail


def pad_note(f: float, dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = sum(np.sin(2 * np.pi * f * (1 + c / 1200) * t) for c in (-5, 0, 5)) / 3
    sig += 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return sig * env(n, 1.0, 1.4)


def fm(f: float, dur: float, ratio: float, index: float, idecay: float, adecay: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    mod = index * np.exp(-t * idecay) * np.sin(2 * np.pi * f * ratio * t)
    sig = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * adecay)
    return sig * env(n, 0.004, 0.05)


def place(buf: np.ndarray, sig: np.ndarray, start: float, gain: float, pan: float = 0.0):
    i = int(start * SR)
    if i >= buf.shape[0]:
        return
    sig = sig[: buf.shape[0] - i] * gain
    buf[i:i + len(sig), 0] += sig * np.sqrt((1 - pan) / 2) * 1.414
    buf[i:i + len(sig), 1] += sig * np.sqrt((1 + pan) / 2) * 1.414


def compose(length: float, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(length * SR)
    buf = np.zeros((n + SR * 4, 2))
    bars = int(np.ceil(length / BAR))
    for b in range(bars):
        name = FORM[b % len(FORM)]
        if b == bars - 1:
            name = "Dmaj9"  # resolve on the tonic
        ch = CHORDS[name]
        t0 = b * BAR
        last = b == bars - 1
        # pad (upper four voices)
        for m in ch[1:]:
            place(buf, pad_note(mtof(m), BAR + (2.5 if last else 0.6)), t0, 0.030)
        # bass: beats 1 and 3
        for k in (0, 2):
            f = mtof(ch[0])
            nb = int(2 * BEAT * SR)
            tt = np.arange(nb) / SR
            s = (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(4 * np.pi * f * tt)) * env(nb, 0.03, 0.6)
            place(buf, s, t0 + k * BEAT, 0.11)
        # arpeggio, 8ths, one octave up, alternating pan
        upper = [m + 12 for m in ch[1:]]
        for k, idx in enumerate(ARP if not last else ARP[:4]):
            m = upper[idx % len(upper)]
            place(buf, fm(mtof(m), 0.9, 2.0, 2.2, 7.0, 4.5), t0 + k * BEAT / 2,
                  0.050 * (0.85 + 0.3 * rng.random()), pan=0.45 if k % 2 else -0.45)
        # sparse bell melody
        for mb, off, m, beats in MELODY:
            if b % len(FORM) == mb and b >= 2 and not last:
                place(buf, fm(mtof(m), beats * BEAT + 1.2, 3.5, 1.4, 2.5, 1.6), t0 + off * BEAT, 0.060, pan=0.1)
        # light shaker on offbeat 16ths from bar 5
        if b >= 4 and not last:
            for k in range(8):
                ns = int(0.05 * SR)
                noise = np.diff(rng.standard_normal(ns + 1))
                noise *= np.exp(-np.arange(ns) / SR * 70)
                place(buf, noise, t0 + k * BEAT / 2 + BEAT / 4, 0.006 * (1.0 if k % 2 else 0.6), pan=0.3)
    out = buf[:n]
    # gentle fade in/out
    fade_in, fade_out = int(1.5 * SR), int(min(4.0, length / 4) * SR)
    out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    peak = np.max(np.abs(out)) or 1.0
    return (out / peak * 0.7).astype("float32")


def main():
    import soundfile as sf
    path, length = sys.argv[1], float(sys.argv[2])
    sf.write(path, compose(length), SR)


if __name__ == "__main__":
    main()
