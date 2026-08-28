/**
 * Standalone smoke test for the pure decision-engine functions — no DB, no
 * Prisma. Run with: npx tsx src/domain/decision/__smoketest.ts
 * (Not a permanent test file — swap for a real Jest/Vitest suite per
 * Doc 06 §5 "Automated Tests: Unit — scoring/rules/entitlement".)
 */
import { applyTagEffect, blankTagScore, classifySeverityBucket } from "./scoringEngine";
import { computeAdherence } from "./adherenceEngine";
import { compareWindows } from "./responseEngine";
import { decideStrategy } from "./strategyEngine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK:", msg);
}

// 1. Scoring: racing thoughts answered "5 nights+" should push severity up and bucket to at least MODERATE.
let score = blankTagScore("RACING_THOUGHTS");
score = applyTagEffect(score, { severityDelta: 5, frequencyDelta: 4 });
assert(score.severity === 5 && score.frequency === 4, "scoring engine applies deltas and clamps");
assert(classifySeverityBucket(score) !== "MINIMAL", "elevated tag score is never classified MINIMAL");

// 2. Replayability: same input -> same output, twice.
const a = classifySeverityBucket(score);
const b = classifySeverityBucket(score);
assert(a === b, "decision engine is replayable for identical state");

// 3. Adherence — Doc 03 §3 worked examples.
assert(computeAdherence({ doneCount: 2, totalNights: 7, kind: "PRODUCT", hadImprovement: false }).level === "LOW", "2/7 nights -> LOW adherence");
assert(
  computeAdherence({ doneCount: 7, totalNights: 7, kind: "PRODUCT", hadImprovement: false }).level === "HIGH_NO_IMPROVEMENT",
  "7/7 nights with no improvement -> HIGH_NO_IMPROVEMENT (Optimise/Reassess)"
);
assert(computeAdherence({ doneCount: 1, totalNights: 7, kind: "ROUTINE_STEP", hadImprovement: false }).level === "ROUTINE_NON_ADHERENCE", "1/7 routine nights -> ROUTINE_NON_ADHERENCE");

// 4. Response engine — improvement across a window.
const worsened = compareWindows({ avgSleepRating: 4, avgNightWakingCount: 0.5, avgMorningEnergyScore: 1.8 }, { avgSleepRating: 2, avgNightWakingCount: 2.5, avgMorningEnergyScore: 0.2 });
assert(worsened.direction === "WORSENED", "response engine detects a worsening trend");

const improved = compareWindows({ avgSleepRating: 2, avgNightWakingCount: 2.5, avgMorningEnergyScore: 0.2 }, { avgSleepRating: 4, avgNightWakingCount: 0.5, avgMorningEnergyScore: 1.8 });
assert(improved.direction === "IMPROVED", "response engine detects an improving trend");

// 5. Strategy engine — safety always wins, even with a great response.
const escalate = decideStrategy({
  safetyFlagTriggered: true,
  adherenceLevel: "GOOD",
  responseDirection: "IMPROVED",
  ownsRelevantProduct: true,
  routineCompletionRatio: 1,
  reasonForPoorResultKnown: true,
  patternChangedSinceLastAssessment: false,
  newEligibleProductAvailable: true,
});
assert(escalate.actionCode === "ESCALATE", "safety flag always outranks product/AI recommendation (Doc 03 §10)");

// 6. Strategy: owned + low adherence -> REMIND, never a new sell.
const remind = decideStrategy({
  safetyFlagTriggered: false,
  adherenceLevel: "LOW",
  responseDirection: "UNCHANGED",
  ownsRelevantProduct: true,
  routineCompletionRatio: 1,
  reasonForPoorResultKnown: false,
  patternChangedSinceLastAssessment: false,
  newEligibleProductAvailable: true,
});
assert(remind.actionCode === "REMIND", "owned + low adherence -> REMIND, not ADD_PRODUCT (Doc 03 §6)");

console.log("\nAll decision-engine smoke tests passed.");
