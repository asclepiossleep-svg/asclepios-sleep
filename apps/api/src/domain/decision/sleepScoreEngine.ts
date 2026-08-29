/**
 * Requirement Recovery Matrix #18 — Personal Sleep Score / Progress trends.
 *
 * Deliberately simple and clearly self-reported: derived only from the
 * existing 3-field Morning Check-in (sleep rating, night waking, morning
 * energy), the same data `responseEngine.ts` already compares window vs
 * window. This is NOT a clinical or diagnostic score — it must always be
 * labelled as self-reported in the UI (Doc 03 §4's same warning that
 * applies to Response direction applies here too).
 */

export type SleepScoreFocusArea = "SLEEP_RATING" | "NIGHT_WAKING" | "MORNING_ENERGY";

export interface CheckinLike {
  submittedAt: Date;
  sleepRating: number; // 1-5
  nightWakingCount: string; // "0" | "1" | "2" | "3+"
  morningEnergy: string; // POOR | AVERAGE | GOOD
}

const nightWakingRaw = (v: string) => (v === "3+" ? 3 : Number(v) || 0);
const energyRaw = (v: string) => (v === "GOOD" ? 2 : v === "AVERAGE" ? 1 : 0);

interface Normalized {
  sleepRatingNorm: number; // 0-1, higher is better
  nightWakingNorm: number; // 0-1, higher is better (fewer wakings)
  morningEnergyNorm: number; // 0-1, higher is better
}

function normalize(c: CheckinLike): Normalized {
  return {
    sleepRatingNorm: Math.max(0, Math.min(1, (c.sleepRating - 1) / 4)),
    nightWakingNorm: Math.max(0, Math.min(1, (3 - nightWakingRaw(c.nightWakingCount)) / 3)),
    morningEnergyNorm: Math.max(0, Math.min(1, energyRaw(c.morningEnergy) / 2)),
  };
}

/** 0-100, equal-weighted across the three check-in fields. */
export function computeSleepScore(c: CheckinLike): number {
  const n = normalize(c);
  return Math.round(((n.sleepRatingNorm + n.nightWakingNorm + n.morningEnergyNorm) / 3) * 100);
}

const SCORE_TREND_THRESHOLD = 5; // points — below this, call it "steady" rather than noise

export interface DailyScore {
  date: string; // YYYY-MM-DD
  score: number;
}

export interface ProgressTrend {
  hasEnoughData: boolean;
  days: DailyScore[];
  currentScore: number | null;
  recentAvgScore: number | null;
  previousAvgScore: number | null;
  trendDirection: "IMPROVED" | "WORSENED" | "STEADY" | null;
  focusArea: SleepScoreFocusArea | null;
  checkinCount: number;
}

/**
 * Builds a lightweight trend from up to `days` days of check-ins, splitting
 * the recent half against the prior half the same way the 7-day Review
 * already compares baseline vs recent (just expressed as one 0-100 number
 * instead of three separate deltas, for a glanceable Progress view).
 */
export function buildProgressTrend(checkins: CheckinLike[], days = 14): ProgressTrend {
  const sorted = [...checkins].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());

  if (sorted.length === 0) {
    return {
      hasEnoughData: false,
      days: [],
      currentScore: null,
      recentAvgScore: null,
      previousAvgScore: null,
      trendDirection: null,
      focusArea: null,
      checkinCount: 0,
    };
  }

  const dailyScores: DailyScore[] = sorted.map((c) => ({
    date: c.submittedAt.toISOString().slice(0, 10),
    score: computeSleepScore(c),
  }));

  const now = sorted[sorted.length - 1].submittedAt;
  const halfway = new Date(now.getTime() - (days / 2) * 24 * 3600 * 1000);
  const windowStart = new Date(now.getTime() - days * 24 * 3600 * 1000);

  const recentWindow = sorted.filter((c) => c.submittedAt >= halfway);
  const previousWindow = sorted.filter((c) => c.submittedAt >= windowStart && c.submittedAt < halfway);

  const avg = (arr: number[]) => (arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length);

  const recentAvgScore = avg(recentWindow.map(computeSleepScore));
  const previousAvgScore = avg(previousWindow.map(computeSleepScore));

  let trendDirection: ProgressTrend["trendDirection"] = null;
  if (recentAvgScore !== null && previousAvgScore !== null) {
    const delta = recentAvgScore - previousAvgScore;
    trendDirection = delta >= SCORE_TREND_THRESHOLD ? "IMPROVED" : delta <= -SCORE_TREND_THRESHOLD ? "WORSENED" : "STEADY";
  }

  // Focus area: whichever normalized component averages lowest over the
  // recent window — the thing most worth improving next.
  let focusArea: SleepScoreFocusArea | null = null;
  if (recentWindow.length > 0) {
    const norms = recentWindow.map(normalize);
    const avgSleep = avg(norms.map((n) => n.sleepRatingNorm))!;
    const avgWaking = avg(norms.map((n) => n.nightWakingNorm))!;
    const avgEnergy = avg(norms.map((n) => n.morningEnergyNorm))!;
    const lowest = Math.min(avgSleep, avgWaking, avgEnergy);
    focusArea = lowest === avgSleep ? "SLEEP_RATING" : lowest === avgWaking ? "NIGHT_WAKING" : "MORNING_ENERGY";
  }

  return {
    hasEnoughData: sorted.length >= 2,
    days: dailyScores,
    currentScore: dailyScores[dailyScores.length - 1].score,
    recentAvgScore: recentAvgScore === null ? null : Math.round(recentAvgScore),
    previousAvgScore: previousAvgScore === null ? null : Math.round(previousAvgScore),
    trendDirection,
    focusArea,
    checkinCount: sorted.length,
  };
}
