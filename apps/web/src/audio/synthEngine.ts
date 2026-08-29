import type { SynthEngineType } from "@asclepios/shared";

/**
 * Requirement Recovery Matrix #29 — real, audible playback for the Sleep
 * Player. No licensed audio assets exist yet (every AudioTrack row's
 * `imageUrl`/`url` is null, same situation as Wallpaper), so this engine
 * *synthesizes* the noise/frequency categories the Requirement doc itself
 * lists (§24: Brown Noise, Pink Noise, frequency-labelled tracks) directly
 * with the Web Audio API — genuine sound, not a placeholder, and it needs no
 * external file, network request, or CDN.
 *
 * Must be started from a user gesture (the "開始瞓覺" button click) — every
 * mobile browser blocks audio autoplay otherwise; `ensureContext()` both
 * creates the AudioContext lazily and resumes it if a browser suspended it.
 */

const NOISE_BUFFER_SECONDS = 4; // short seamless-enough loop; random noise hides the loop point

export class SleepAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioScheduledSourceNode[] = [];
  private currentEngine: SynthEngineType | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {
        /* best-effort — a silent failure here just means no sound until the next user gesture */
      });
    }
    return this.ctx;
  }

  private makeNoiseBuffer(ctx: AudioContext, color: "white" | "pink" | "brown"): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * NOISE_BUFFER_SECONDS);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (color === "white") {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } else if (color === "brown") {
      // Leaky integrator of white noise — classic brown/red noise derivation.
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5; // compensate for the integrator's low output level
      }
    } else {
      // Pink noise — Paul Kellet's refined (economy) approximation.
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        data[i] = pink * 0.11;
      }
    }
    return buffer;
  }

  private startNoise(ctx: AudioContext, dest: AudioNode, color: "white" | "pink" | "brown", gain: number) {
    const source = ctx.createBufferSource();
    source.buffer = this.makeNoiseBuffer(ctx, color);
    source.loop = true;
    const g = ctx.createGain();
    g.gain.value = gain;
    source.connect(g).connect(dest);
    source.start();
    this.activeNodes.push(source);
  }

  private startTone(ctx: AudioContext, dest: AudioNode, frequency: number, gain: number) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(dest);
    osc.start();
    this.activeNodes.push(osc);
  }

  play(engine: SynthEngineType, volume = 0.5) {
    this.stop(); // clear anything already playing before layering a new track
    const ctx = this.ensureContext();
    const dest = this.masterGain!;
    dest.gain.cancelScheduledValues(ctx.currentTime);
    dest.gain.setValueAtTime(volume, ctx.currentTime);
    this.currentEngine = engine;

    switch (engine) {
      case "PINK_NOISE":
        this.startNoise(ctx, dest, "pink", 1);
        break;
      case "BROWN_NOISE":
        this.startNoise(ctx, dest, "brown", 1);
        break;
      case "WHITE_NOISE":
        this.startNoise(ctx, dest, "white", 0.5);
        break;
      case "BLEND_432":
        this.startTone(ctx, dest, 432, 0.15);
        this.startNoise(ctx, dest, "pink", 0.4);
        break;
      case "BLEND_528":
        this.startTone(ctx, dest, 528, 0.15);
        this.startNoise(ctx, dest, "brown", 0.5);
        break;
    }
  }

  /** A short, gentle rising tone for Gentle Wake — distinct from any sleep track. */
  playWakeChime(style: "GENTLE" | "NORMAL" | "STRONG" = "NORMAL") {
    const ctx = this.ensureContext();
    const dest = this.masterGain!;
    const peak = style === "GENTLE" ? 0.25 : style === "STRONG" ? 0.6 : 0.4;
    const rampSeconds = style === "GENTLE" ? 6 : style === "STRONG" ? 1.5 : 3;
    dest.gain.cancelScheduledValues(ctx.currentTime);
    dest.gain.setValueAtTime(0.001, ctx.currentTime);
    dest.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + rampSeconds);
    this.startTone(ctx, dest, 528, 1);
  }

  setVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  /** Fades the master gain to silence over `seconds`, then fully stops all nodes. */
  fadeOutAndStop(seconds: number) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + Math.max(seconds, 0.05));
    const nodes = this.activeNodes;
    this.activeNodes = [];
    this.currentEngine = null;
    setTimeout(
      () => {
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        });
      },
      Math.max(seconds, 0.05) * 1000 + 50
    );
  }

  stop() {
    const nodes = this.activeNodes;
    this.activeNodes = [];
    this.currentEngine = null;
    nodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    });
  }

  isPlaying() {
    return this.activeNodes.length > 0;
  }
}
