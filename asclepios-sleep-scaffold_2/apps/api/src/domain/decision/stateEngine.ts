import { prisma } from "../../db";

/**
 * Doc 03 §2 — Core Profile vs Current State.
 *
 *  Core Profile : long-term primary issue, baseline severity, main
 *                 programme. Only formally updated at a 7/28-day review.
 *  Current State: anything that can change today/tonight (stress, headache,
 *                 travel, a skipped product). Updated on any event.
 *
 * TagScore.source distinguishes the two; this module is the only place
 * allowed to write Core Profile rows or take a CoreProfileSnapshot.
 */

export async function upsertCurrentStateTag(
  userId: string,
  tag: string,
  patch: Partial<{ severity: number; frequency: number; duration: number; impact: number; confidence: number; trend: string }>,
  decisionVersion = "v1"
) {
  const existing = await prisma.tagScore.findFirst({ where: { userId, tag, source: "CURRENT_STATE" } });
  if (existing) {
    return prisma.tagScore.update({ where: { id: existing.id }, data: { ...patch, decisionVersion } });
  }
  return prisma.tagScore.create({
    data: {
      userId,
      tag,
      severity: patch.severity ?? 0,
      frequency: patch.frequency ?? 0,
      duration: patch.duration ?? 0,
      impact: patch.impact ?? 0,
      confidence: patch.confidence ?? 1,
      trend: patch.trend ?? "STABLE",
      source: "CURRENT_STATE",
      decisionVersion,
    },
  });
}

/**
 * Promote Current State into Core Profile and freeze a snapshot. Only ever
 * called from the 7-day (minor tune) or 28-day (full reassessment)
 * orchestrator — never from a daily check-in.
 */
export async function promoteToCoreProfile(userId: string, decisionVersion = "v1") {
  const currentState = await prisma.tagScore.findMany({ where: { userId, source: "CURRENT_STATE" } });

  for (const cs of currentState) {
    const existingCore = await prisma.tagScore.findFirst({ where: { userId, tag: cs.tag, source: "CORE_PROFILE" } });
    if (existingCore) {
      await prisma.tagScore.update({
        where: { id: existingCore.id },
        data: {
          severity: cs.severity,
          frequency: cs.frequency,
          duration: cs.duration,
          impact: cs.impact,
          confidence: cs.confidence,
          trend: cs.trend,
          decisionVersion,
        },
      });
    } else {
      await prisma.tagScore.create({
        data: {
          userId,
          tag: cs.tag,
          severity: cs.severity,
          frequency: cs.frequency,
          duration: cs.duration,
          impact: cs.impact,
          confidence: cs.confidence,
          trend: cs.trend,
          source: "CORE_PROFILE",
          decisionVersion,
        },
      });
    }
  }

  const coreProfile = await prisma.tagScore.findMany({ where: { userId, source: "CORE_PROFILE" } });
  return prisma.coreProfileSnapshot.create({
    data: { userId, dataJson: JSON.stringify(coreProfile), decisionVersion },
  });
}
