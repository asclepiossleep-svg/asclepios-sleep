import { SeverityBucket, Tag, TagScore } from "@asclepios/shared";

/**
 * Doc 02 §5 — Scoring Model.
 *
 * Pure function: given the current dimensional score for a tag and an
 * answer's tag effect (a delta), returns the next score. Pure + versioned
 * inputs means the same (state, version) always produces the same output —
 * the replayability requirement in Doc 06 §3.
 */
export interface TagEffect {
  tag: Tag;
  severityDelta?: number;
  frequencyDelta?: number;
  durationDelta?: number;
  impactDelta?: number;
  confidenceDelta?: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function applyTagEffect(current: TagScore, effect: TagEffect): TagScore {
  return {
    ...current,
    severity: clamp(current.severity + (effect.severityDelta ?? 0), 0, 10),
    frequency: clamp(current.frequency + (effect.frequencyDelta ?? 0), 0, 5),
    duration: clamp(current.duration + (effect.durationDelta ?? 0), 0, 5),
    impact: clamp(current.impact + (effect.impactDelta ?? 0), 0, 5),
    confidence: clamp(current.confidence + (effect.confidenceDelta ?? 0), 0, 1),
  };
}

export function blankTagScore(tag: Tag): TagScore {
  return { tag, severity: 0, frequency: 0, duration: 0, impact: 0, confidence: 1, trend: "STABLE" };
}

/**
 * Doc 02 §6 — Severity Buckets. The exact weighting formula is intentionally
 * simple and lives in one place so an admin/config change (not a redeploy)
 * can retune it later — see DecisionRule for the versioned override path.
 * This function is the fallback default when no DecisionRule override exists.
 */
export function classifySeverityBucket(score: TagScore, safetyTriggered = false): SeverityBucket {
  if (safetyTriggered) return "VERY_HIGH_SAFETY";
  const composite = score.severity * 0.5 + score.frequency * 1.2 + score.impact * 1.0;
  if (composite < 3) return "MINIMAL";
  if (composite < 7) return "MILD";
  if (composite < 12) return "MODERATE";
  if (composite < 16) return "HIGH";
  return "VERY_HIGH_SAFETY";
}
