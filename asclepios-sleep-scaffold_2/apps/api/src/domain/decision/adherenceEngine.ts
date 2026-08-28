import { AdherenceLevel } from "@asclepios/shared";

/**
 * Doc 03 §3 — Adherence Engine.
 *
 * Every intervention (a product, a routine step) is scored for adherence
 * *separately*, so "didn't do it" is never mistaken for "did it and it
 * didn't work". Thresholds below are the documented V1 defaults; in
 * production these should be sourced from DecisionRule (admin-editable,
 * versioned) rather than this constant — swap `DEFAULT_THRESHOLDS` for a
 * DecisionRule lookup once the admin UI for rule editing exists.
 */
export interface AdherenceInput {
  doneCount: number;
  totalNights: number; // usually 7
  kind: "PRODUCT" | "ROUTINE_STEP";
  hadImprovement: boolean; // from Response Engine, only relevant for HIGH_NO_IMPROVEMENT
}

export interface AdherenceResult {
  ratio: number;
  level: AdherenceLevel;
  reasonCode: string;
}

const DEFAULT_THRESHOLDS = {
  lowMaxNights: 2, // Doc 03 §3: product used 2/7 nights -> low adherence
  goodMinNights: 6, // 6/7 nights + improvement -> good adherence, continue
  routineNonAdherenceMaxNights: 1, // routine 1/7 -> routine non-adherence
};

export function computeAdherence(input: AdherenceInput): AdherenceResult {
  const ratio = input.totalNights === 0 ? 0 : input.doneCount / input.totalNights;

  if (input.kind === "ROUTINE_STEP" && input.doneCount <= DEFAULT_THRESHOLDS.routineNonAdherenceMaxNights) {
    return { ratio, level: "ROUTINE_NON_ADHERENCE", reasonCode: "ROUTINE_RARELY_DONE" };
  }

  if (input.doneCount <= DEFAULT_THRESHOLDS.lowMaxNights) {
    return { ratio, level: "LOW", reasonCode: "LOW_USAGE" };
  }

  if (input.doneCount >= DEFAULT_THRESHOLDS.goodMinNights && !input.hadImprovement) {
    // Doc 03 §3: "產品 7/7 晚 + 冇改善 -> High adherence + poor response -> Optimise / Reassess"
    return { ratio, level: "HIGH_NO_IMPROVEMENT", reasonCode: "DONE_BUT_NO_IMPROVEMENT" };
  }

  if (input.doneCount >= DEFAULT_THRESHOLDS.goodMinNights && input.hadImprovement) {
    return { ratio, level: "GOOD", reasonCode: "GOOD_AND_IMPROVING" };
  }

  return { ratio, level: "GOOD", reasonCode: "MODERATE_USAGE" };
}
