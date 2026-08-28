import { ActionCode, AdherenceLevel, ResponseDirection } from "@asclepios/shared";

/**
 * Doc 03 §5 (Action Codes) + §6 (product recommendation order) + §10
 * (Safety Boundary — safety always outranks product recommendation and AI).
 *
 * This is the single function the 7/28-day review orchestrator calls. It is
 * pure and deterministic: (adherence, response, safety, eligibility) always
 * yields the same action code + explanation for the same decisionVersion,
 * satisfying the replay rule in Doc 06 §3.
 */
export interface StrategyInput {
  safetyFlagTriggered: boolean; // any Question.safetyFlag or red-flag rule fired
  adherenceLevel: AdherenceLevel;
  responseDirection: ResponseDirection;
  ownsRelevantProduct: boolean;
  routineCompletionRatio: number; // 0-1, share of steps completed
  reasonForPoorResultKnown: boolean; // do we already know *why* it's not working
  patternChangedSinceLastAssessment: boolean; // e.g. new tags dominant
  newEligibleProductAvailable: boolean; // Product Engine already checked
  //   market/stock/compatibility/caution/professional-only gates
}

export interface StrategyResult {
  actionCode: ActionCode;
  explanation: string;
}

export function decideStrategy(input: StrategyInput): StrategyResult {
  // 1. Safety always wins — Doc 03 §10.
  if (input.safetyFlagTriggered) {
    return {
      actionCode: "ESCALATE",
      explanation: "Safety rule triggered — routed to professional review ahead of any product or AI suggestion.",
    };
  }

  // 2. Pattern has materially changed -> re-run assessment before anything else.
  if (input.patternChangedSinceLastAssessment) {
    return { actionCode: "REASSESS", explanation: "Recent pattern no longer matches the current Core Profile." };
  }

  // 3. Routine adherence problems, independent of any product.
  if (input.routineCompletionRatio < 1 / 7) {
    return { actionCode: "SIMPLIFY", explanation: "Routine completion is very low — reduce tonight to the 1-2 highest-value steps." };
  }

  // 4. Product-owned adherence branches — Doc 03 §3 + §6 (remind before selling).
  if (input.ownsRelevantProduct) {
    if (input.adherenceLevel === "LOW") {
      return { actionCode: "REMIND", explanation: "Product already owned but rarely used — remind, do not upsell." };
    }
    if (input.adherenceLevel === "HIGH_NO_IMPROVEMENT") {
      return input.reasonForPoorResultKnown
        ? { actionCode: "OPTIMISE", explanation: "Used consistently without improvement and the cause is known — adjust method/timing." }
        : { actionCode: "ASK_MORE", explanation: "Used consistently without improvement and the cause is unclear — ask 1-3 follow-ups." };
    }
    if (input.adherenceLevel === "GOOD" && input.responseDirection === "IMPROVED") {
      return { actionCode: "CONTINUE", explanation: "Good adherence and a positive response — keep the current plan." };
    }
    if (input.responseDirection === "WORSENED") {
      return { actionCode: "CHANGE_ROUTINE", explanation: "Response has worsened despite adherence — this intervention may not suit the user." };
    }
  }

  // 5. Not improving even without a specific product — check free/existing
  //    routine adjustments before ever proposing a new purchase (Doc 03 §6).
  if (input.responseDirection !== "IMPROVED" && !input.newEligibleProductAvailable) {
    return { actionCode: "OPTIMISE", explanation: "No improvement yet — adjust the existing free routine before considering a new product." };
  }

  // 6. Only after existing routine is exhausted and eligibility checks pass.
  if (input.responseDirection !== "IMPROVED" && input.newEligibleProductAvailable) {
    return input.ownsRelevantProduct
      ? { actionCode: "REPLACE_PRODUCT", explanation: "Current product shows low response after full eligibility checks — suggest an alternative." }
      : { actionCode: "ADD_PRODUCT", explanation: "Existing routine is exhausted and a new product passed all eligibility gates." };
  }

  // 7. Understanding/demonstration gap rather than a plan problem.
  if (!input.reasonForPoorResultKnown) {
    return { actionCode: "RECOMMEND_CONTENT", explanation: "A short explainer likely closes the gap before changing the plan." };
  }

  return { actionCode: "CONTINUE", explanation: "Trending as expected — no change needed." };
}
