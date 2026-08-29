import { RoutineLevel } from "@asclepios/shared";

/**
 * Requirement Recovery Matrix #12 — Routine levels 1/2/3, system-chosen
 * never user-picked. Derived from review history the app already has: a
 * user starts at Level 1, moves to Level 2 once they've been through at
 * least one 7-Day Review, and reaches Level 3 once they've been through a
 * 28-Day Reassessment *and* their latest review shows they're responding
 * well (high adherence or an improving trend) — dropping back to Level 2
 * if a later review shows they're struggling, so the level always reflects
 * current state, not just tenure.
 */
export interface ReviewSnapshotLike {
  type: string; // "SEVEN_DAY" | "TWENTY_EIGHT_DAY"
  findingsJson: string;
  createdAt: Date;
}

export function computeRoutineLevel(snapshotsAscending: ReviewSnapshotLike[]): RoutineLevel {
  if (snapshotsAscending.length === 0) return 1;

  const hasTwentyEightDay = snapshotsAscending.some((s) => s.type === "TWENTY_EIGHT_DAY");
  const hasSevenDay = snapshotsAscending.some((s) => s.type === "SEVEN_DAY");
  const latest = snapshotsAscending[snapshotsAscending.length - 1];

  let thriving = false;
  try {
    const findings = JSON.parse(latest.findingsJson);
    thriving = findings?.adherence?.level === "HIGH" || findings?.response?.direction === "IMPROVED";
  } catch {
    thriving = false;
  }

  if (hasTwentyEightDay) return thriving ? 3 : 2;
  return hasSevenDay ? 2 : 1;
}

/** Max Tonight steps for a level — Level 1 stays deliberately lighter. */
export function maxStepsForLevel(level: RoutineLevel): number {
  return level === 1 ? 2 : 3;
}
