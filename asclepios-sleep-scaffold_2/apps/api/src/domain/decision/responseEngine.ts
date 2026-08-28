import { ResponseDirection } from "@asclepios/shared";

/**
 * Doc 03 §4 — Response Engine.
 *
 * Compares baseline vs recent 7 days, and the previous 7-day window vs the
 * current one. Sleep rating, night waking and morning energy are compared
 * *separately* rather than folded into one number, per the doc:
 * "分開看 Sleep Rating、夜醒、Morning Energy 及用戶主要問題 tag".
 *
 * IMPORTANT: this is a user-reported association only — never state or log
 * it as clinical causation (Doc 03 §4 explicit warning).
 */
export interface WindowMetrics {
  avgSleepRating: number; // 1-5
  avgNightWakingCount: number; // numeric mapping of "0"/"1"/"2"/"3+" -> 0/1/2/3
  avgMorningEnergyScore: number; // POOR=0, AVERAGE=1, GOOD=2
}

export interface ResponseResult {
  direction: ResponseDirection;
  sleepRatingDelta: number;
  nightWakingDelta: number;
  morningEnergyDelta: number;
}

// Minimum meaningful deltas before we call it "improved"/"worsened" rather
// than noise. Belongs in DecisionRule config for production tuning.
const NOISE_THRESHOLD = { sleepRating: 0.4, nightWaking: 0.3, morningEnergy: 0.3 };

export function compareWindows(baseline: WindowMetrics, recent: WindowMetrics): ResponseResult {
  const sleepRatingDelta = recent.avgSleepRating - baseline.avgSleepRating;
  // night waking: fewer is better, so invert sign for the "improvement" read
  const nightWakingDelta = baseline.avgNightWakingCount - recent.avgNightWakingCount;
  const morningEnergyDelta = recent.avgMorningEnergyScore - baseline.avgMorningEnergyScore;

  const signals = [
    sleepRatingDelta >= NOISE_THRESHOLD.sleepRating ? 1 : sleepRatingDelta <= -NOISE_THRESHOLD.sleepRating ? -1 : 0,
    nightWakingDelta >= NOISE_THRESHOLD.nightWaking ? 1 : nightWakingDelta <= -NOISE_THRESHOLD.nightWaking ? -1 : 0,
    morningEnergyDelta >= NOISE_THRESHOLD.morningEnergy ? 1 : morningEnergyDelta <= -NOISE_THRESHOLD.morningEnergy ? -1 : 0,
  ];
  const score = signals.reduce((a, b) => a + b, 0);

  const direction: ResponseDirection = score > 0 ? "IMPROVED" : score < 0 ? "WORSENED" : "UNCHANGED";

  return { direction, sleepRatingDelta, nightWakingDelta, morningEnergyDelta };
}
