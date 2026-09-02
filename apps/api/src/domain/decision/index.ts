import { prisma } from "../../db";
import { computeAdherence } from "./adherenceEngine";
import { compareWindows, WindowMetrics } from "./responseEngine";
import { decideStrategy } from "./strategyEngine";
import { promoteToCoreProfile } from "./stateEngine";
import { ActionCode } from "@asclepios/shared";

export * from "./scoringEngine";
export * from "./adherenceEngine";
export * from "./responseEngine";
export * from "./strategyEngine";
export * from "./stateEngine";
export * from "./sleepScoreEngine";
export * from "./routineLevelEngine";
export * from "./productSelectionEngine";

const nightWakingScore = (v: string) => (v === "3+" ? 3 : Number(v));
const energyScore = (v: string) => (v === "GOOD" ? 2 : v === "AVERAGE" ? 1 : 0);

async function windowMetrics(userId: string, from: Date, to: Date): Promise<WindowMetrics> {
  const checkins = await prisma.morningCheckin.findMany({
    where: { userId, submittedAt: { gte: from, lt: to } },
  });
  if (checkins.length === 0) {
    return { avgSleepRating: 0, avgNightWakingCount: 0, avgMorningEnergyScore: 0 };
  }
  type Checkin = (typeof checkins)[number];
  const avgSleepRating = checkins.reduce((a: number, c: Checkin) => a + c.sleepRating, 0) / checkins.length;
  const avgNightWakingCount = checkins.reduce((a: number, c: Checkin) => a + nightWakingScore(c.nightWakingCount), 0) / checkins.length;
  const avgMorningEnergyScore = checkins.reduce((a: number, c: Checkin) => a + energyScore(c.morningEnergy), 0) / checkins.length;
  return { avgSleepRating, avgNightWakingCount, avgMorningEnergyScore };
}

/**
 * Doc 03 §8 — 7-Day Review orchestrator.
 *
 * Computes adherence (per owned product) + response (baseline vs recent
 * window) + the resulting Strategy Engine action code, then writes a
 * ReviewSnapshot. Per the doc, a 7-day review only *tunes* the current
 * plan — it must NOT rewrite Core Profile (that only happens at 28 days,
 * see run28DayReassessment below).
 *
 * Repair Plan A4/A5 (Fix #4, 2 Sep 2026, per audit corrections) —
 * previously this combined every owned product's usage logs into one
 * count against a hard-coded `totalNights: 7`, so a user with 2 products
 * used 7/7 nights each showed as "14/7 = 200% adherence", and routine
 * completion used `routineLogsRecent.length` as its own denominator —
 * meaning "nothing logged" (never offered) was indistinguishable from
 * "logged and skipped every time".
 *
 * Both are now driven by `PlannedAction` — the row created when a step
 * was actually offered on Tonight (see tonight.ts), not just when the
 * user acted on it. Adherence is computed *per product* (findings.
 * productAdherence), and the single `adherenceLevel` fed to the Strategy
 * Engine is the worst of those (the product most needing attention).
 * Routine completion's denominator is now "how many non-product steps
 * were actually planned in the window", defaulting to a neutral 1.0
 * (nothing missed) when nothing was planned at all, rather than the old
 * `|| 7` fallback which silently manufactured a fake week.
 */
function adherenceSeverityRank(level: string): number {
  // Lower = more concerning = takes priority when picking the "worst" of
  // several products' adherence for the single scalar decideStrategy needs.
  if (level === "LOW" || level === "ROUTINE_NON_ADHERENCE") return 0;
  if (level === "HIGH_NO_IMPROVEMENT") return 1;
  return 2; // GOOD
}

export async function run7DayReview(userId: string, decisionVersion = "v1") {
  const now = new Date();
  const recentStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const baselineStart = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
  const recentStartDateKey = recentStart.toISOString().slice(0, 10);

  const recent = await windowMetrics(userId, recentStart, now);
  const baseline = await windowMetrics(userId, baselineStart, recentStart);
  const response = compareWindows(baseline, recent);

  const productOwnerships = await prisma.productOwnership.findMany({ where: { userId } });
  const plannedRecent = await prisma.plannedAction.findMany({ where: { userId, plannedDate: { gte: recentStartDateKey } } });

  const plannedByProduct = new Map<string, (typeof plannedRecent)[number][]>();
  const routinePlanned: (typeof plannedRecent)[number][] = [];
  for (const p of plannedRecent) {
    if (p.productId) {
      const list = plannedByProduct.get(p.productId) ?? [];
      list.push(p);
      plannedByProduct.set(p.productId, list);
    } else {
      routinePlanned.push(p);
    }
  }

  const productAdherence = [...plannedByProduct.entries()].map(([productId, rows]) => {
    const doneCount = rows.filter((r) => r.status === "DONE").length;
    return { productId, ...computeAdherence({ doneCount, totalNights: rows.length, kind: "PRODUCT", hadImprovement: response.direction === "IMPROVED" }) };
  });

  const routineDone = routinePlanned.filter((r) => r.status === "DONE").length;
  const routineTotal = routinePlanned.length;
  const routineCompletionRatio = routineTotal === 0 ? 1 : routineDone / routineTotal;

  // The single scalar the Strategy Engine takes: the worst-performing
  // product (most needing attention), or a neutral GOOD/0 result if the
  // user owns no products yet — matches the old "no product" branch in
  // decideStrategy, which only reads adherenceLevel when ownsRelevantProduct.
  const adherence =
    productAdherence.length > 0
      ? productAdherence.reduce((worst, a) => (adherenceSeverityRank(a.level) < adherenceSeverityRank(worst.level) ? a : worst))
      : computeAdherence({ doneCount: 0, totalNights: 0, kind: "PRODUCT", hadImprovement: false });

  const safetyFlagTriggered = await hasOpenSafetyFlag(userId);

  const strategy = decideStrategy({
    safetyFlagTriggered,
    adherenceLevel: adherence.level,
    responseDirection: response.direction,
    ownsRelevantProduct: productOwnerships.length > 0,
    routineCompletionRatio,
    reasonForPoorResultKnown: false,
    patternChangedSinceLastAssessment: false,
    newEligibleProductAvailable: false,
  });

  const findings = {
    adherence,
    productAdherence,
    response,
    routineCompletionRatio,
    productOwnershipCount: productOwnerships.length,
    explanation: strategy.explanation,
  };

  const snapshot = await prisma.reviewSnapshot.create({
    data: {
      userId,
      type: "SEVEN_DAY",
      periodStart: recentStart,
      periodEnd: now,
      findingsJson: JSON.stringify(findings),
      actionCode: strategy.actionCode as ActionCode,
      decisionVersion,
    },
  });

  return { snapshot, findings, actionCode: strategy.actionCode, explanation: strategy.explanation };
}

/**
 * Doc 03 §9 — 28-Day Reassessment. Unlike the 7-day review, this DOES
 * rewrite Core Profile (via promoteToCoreProfile) and keeps the prior
 * snapshot + decision version for history, never overwriting it in place.
 */
export async function run28DayReassessment(userId: string, decisionVersion = "v1") {
  const sevenDay = await run7DayReview(userId, decisionVersion);
  const coreSnapshot = await promoteToCoreProfile(userId, decisionVersion);

  const snapshot = await prisma.reviewSnapshot.create({
    data: {
      userId,
      type: "TWENTY_EIGHT_DAY",
      periodStart: new Date(Date.now() - 28 * 24 * 3600 * 1000),
      periodEnd: new Date(),
      findingsJson: sevenDay.snapshot.findingsJson,
      actionCode: sevenDay.actionCode as ActionCode,
      decisionVersion,
    },
  });

  return { snapshot, coreSnapshot, actionCode: sevenDay.actionCode };
}

async function hasOpenSafetyFlag(userId: string): Promise<boolean> {
  const flaggedAnswer = await prisma.assessmentAnswer.findFirst({
    where: { assessment: { userId }, question: { safetyFlag: true } },
    orderBy: { answeredAt: "desc" },
  });
  return Boolean(flaggedAnswer);
}
