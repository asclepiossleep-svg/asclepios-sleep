import { SLEEP_AUDIO_DURATION_PRESETS, SleepAudioDurationMode, WakeStyle } from "@asclepios/shared";

/**
 * Supplement 07 §10-16 — Sleep Session & Wake Engine.
 *
 * Four independent time concepts, never collapsed into one timer:
 * wind-down start, target sleep time, sleep-audio duration, wake time.
 * This module only computes *when things happen*; actual audio/visual
 * playback is a client concern (the PWA keeps the tab/audio session alive).
 */

export function resolveDurationSeconds(mode: SleepAudioDurationMode, presetLabel?: string, customSeconds?: number): number | null {
  if (mode === "UNTIL_WAKE" || mode === "ALL_NIGHT") return null; // open-ended by definition
  if (mode === "CUSTOM") return customSeconds ?? null;
  const preset = SLEEP_AUDIO_DURATION_PRESETS.find((p) => p.label === presetLabel);
  return preset?.seconds ?? null;
}

export interface SessionTimeline {
  windDownStart: Date;
  targetSleepTime: Date | null;
  audioFadeOutAt: Date | null; // null when UNTIL_WAKE / ALL_NIGHT
  wakeTime: Date | null;
}

export function computeTimeline(input: {
  windDownStart: Date;
  targetSleepTime: Date | null;
  wakeTime: Date | null;
  durationMode: SleepAudioDurationMode;
  durationSeconds: number | null;
}): SessionTimeline {
  const audioFadeOutAt =
    input.durationMode === "FIXED" || input.durationMode === "CUSTOM"
      ? input.durationSeconds
        ? new Date(input.windDownStart.getTime() + input.durationSeconds * 1000)
        : null
      : null; // UNTIL_WAKE / ALL_NIGHT never fades out on a timer

  return {
    windDownStart: input.windDownStart,
    targetSleepTime: input.targetSleepTime,
    audioFadeOutAt,
    wakeTime: input.wakeTime,
  };
}

// Supplement 07 §14 — the user only picks a feeling; the real volume curve
// is a system preset (never ask for a raw percentage).
export const WAKE_STYLE_CURVES: Record<WakeStyle, { rampSeconds: number; startVolume: number; endVolume: number }> = {
  GENTLE: { rampSeconds: 600, startVolume: 0.05, endVolume: 0.35 },
  NORMAL: { rampSeconds: 300, startVolume: 0.1, endVolume: 0.6 },
  STRONG: { rampSeconds: 90, startVolume: 0.2, endVolume: 0.9 },
};
