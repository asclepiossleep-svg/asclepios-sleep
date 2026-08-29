import { prisma } from "../db";
import { applyTagEffect, blankTagScore, compositeScore } from "./decision/scoringEngine";
import { upsertCurrentStateTag } from "./decision/stateEngine";
import { Intent, Tag } from "@asclepios/shared";

/**
 * Doc 02 §2 (step 1) — Intent Router. Button-driven entry = 0 AI. Free-text
 * only reaches this when FEATURE_AI_GATEWAY is on (handled by the AI
 * Gateway module, out of scope while the flag is off).
 */
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  PREFERENCE_CHANGE: ["no music tonight", "唔想聽音樂"],
  MEDIA_REQUEST: ["piano", "鋼琴"],
  ROUTINE_PREFERENCE: ["no stretching", "唔想拉筋"],
  COMMERCE: ["buy", "想買"],
  PRODUCT_HELP: ["how to use", "點用"],
  SLEEP_HELP: ["racing thoughts", "好多嘢諗"],
  NEW_SYMPTOM: ["headache", "頭痛"],
  PROGRESS: ["progress", "好咗幾多"],
  TIMEZONE_TRAVEL: ["travel", "換時區"],
};

export function routeIntent(buttonIntent: Intent | undefined, freeText?: string): Intent | "UNRESOLVED" {
  if (buttonIntent) return buttonIntent; // button path = 0 AI, always resolved
  if (!freeText) return "UNRESOLVED";
  const lower = freeText.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return intent as Intent;
  }
  return "UNRESOLVED"; // V1: falls back to a structured follow-up, not a raw AI call
}

/**
 * Doc 02 §2 (step 2) — Question Engine: pick the next active question whose
 * trigger_condition matches the user's current tag scores. Falls back to
 * the next un-answered question in a base assessment sequence when nothing
 * is conditionally triggered.
 */
export async function getNextQuestion(userId: string, assessmentId: string, locale: string) {
  const answered = await prisma.assessmentAnswer.findMany({ where: { assessmentId }, select: { questionId: true } });
  const answeredIds = new Set(answered.map((a: (typeof answered)[number]) => a.questionId));

  const currentState = await prisma.tagScore.findMany({ where: { userId, source: "CURRENT_STATE" } });
  type CurrentStateTag = (typeof currentState)[number];
  const tagIndex = new Map<string, CurrentStateTag>(currentState.map((t: CurrentStateTag): [string, CurrentStateTag] => [t.tag, t]));

  const candidates = await prisma.question.findMany({
    where: { locale, activeTo: null },
    include: { answerOptions: true },
    orderBy: { code: "asc" },
  });

  for (const q of candidates) {
    if (answeredIds.has(q.id)) continue;
    if (!q.triggerCondition) return q; // unconditional / base question
    try {
      const cond = JSON.parse(q.triggerCondition) as { tag: Tag; gte: number };
      const score = tagIndex.get(cond.tag);
      if (score && score.severity >= cond.gte) return q;
    } catch {
      // malformed trigger condition — skip rather than crash the flow
      continue;
    }
  }
  return null; // assessment complete
}

/**
 * Doc 02 §2 (steps 3-4) — Tag Mapper + Scoring Engine for a selected
 * (button) answer. Free-text tag extraction is AI Gateway territory and is
 * intentionally not implemented here while ai_gateway is OFF.
 */
export async function submitAnswer(userId: string, assessmentId: string, questionId: string, answerOptionId: string) {
  const option = await prisma.answerOption.findUniqueOrThrow({ where: { id: answerOptionId } });
  const effects = JSON.parse(option.tagEffectsJson) as { tag: Tag; delta: number }[];

  for (const effect of effects) {
    const existing = await prisma.tagScore.findFirst({ where: { userId, tag: effect.tag, source: "CURRENT_STATE" } });
    const base = existing
      ? { tag: effect.tag as Tag, severity: existing.severity, frequency: existing.frequency, duration: existing.duration, impact: existing.impact, confidence: existing.confidence, trend: existing.trend as any }
      : blankTagScore(effect.tag);
    const next = applyTagEffect(base, { severityDelta: effect.delta });
    await upsertCurrentStateTag(userId, effect.tag, next);
  }

  return prisma.assessmentAnswer.create({
    data: { assessmentId, questionId, answerOptionId },
  });
}

/**
 * Mid-Build Integration Addendum #2 — "8-15 Q → top 3 focus areas". Ranks
 * the user's Current State tags (the ones this assessment just wrote to —
 * Core Profile isn't promoted until the first 7/28-day review, so Current
 * State is the only populated source right after an initial assessment) by
 * the same composite weighting the Severity Bucket classifier uses, and
 * returns the top 3 with a non-zero score. A brand-new user who answered
 * nothing severity-raising yet gets an empty list — the client shows a
 * neutral "all clear" state rather than 3 empty tags.
 */
export async function getTopFocusAreas(userId: string, limit = 3) {
  const currentState = await prisma.tagScore.findMany({ where: { userId, source: "CURRENT_STATE" } });
  type Scored = (typeof currentState)[number];
  return currentState
    .map((t: Scored) => ({ tag: t.tag, severity: t.severity, frequency: t.frequency, impact: t.impact, composite: compositeScore(t as any) }))
    .filter((t: { composite: number }) => t.composite > 0)
    .sort((a: { composite: number }, b: { composite: number }) => b.composite - a.composite)
    .slice(0, limit);
}
