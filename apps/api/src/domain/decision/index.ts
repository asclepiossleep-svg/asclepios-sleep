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
 */
export async function run7DayReview(userId: string, decisionVersion = "v1") {
  const now = new Date();
  const recentStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const baselineStart = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

  const recent = await windowMetrics(userId, recentStart, now);
  const baseline = await windowMetrics(userId, baselineStart, recentStart);
  const response = compareWindows(baseline, recent);

  const productOwnerships = await prisma.productOwnership.findMany({ where: { userId } });
  const routineLogsRecent = await prisma.routineStepLog.findMany({ where: { userId, loggedAt: { gte: recentStart } } });
  const productLogsRecent = await prisma.productUsageLog.findMany({ where: { userId, loggedAt: { gte: recentStart } } });

  const routineDone = routineLogsRecent.filter((l: (typeof routineLogsRecent)[number]) => l.status === "DONE").length;
  const routineTotal = routineLogsRecent.length || 7;
  const routineCompletionRatio = routineTotal === 0 ? 0 : routineDone / routineTotal;

  const productDoneCount = productLogsRecent.filter((l: (typeof productLogsRecent)[number]) => l.status === "DONE").length;
  const adherence = computeAdherence({
    doneCount: productDoneCount,
    totalNights: 7,
    kind: "PRODUCT",
    hadImprovement: response.direction === "IMPROVED",
  });

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

  const findings = { adherence, response, routineCompletionRatio, productOwnershipCount: productOwnerships.length, explanation: strategy.explanation };

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
