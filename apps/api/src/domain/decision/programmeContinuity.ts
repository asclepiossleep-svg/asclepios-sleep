import { localDateKey } from "./dateKey";
import { extensionDaysFor, type ProgrammeCompletionChoice, type ProgrammeCompletionState } from "@asclepios/shared";

/**
 * Fix #5 programme-continuity correction (5 Sep 2026) — the old day-boundary
 * math (`(Date.now() - startedAt) / MS_PER_DAY`) is a raw duration divide,
 * not a calendar-day count in the user's own timezone: it drifts across DST
 * transitions (a "24h" local day is sometimes 23 or 25 real hours) and gives
 * the wrong answer whenever startedAt and now sit at different local times
 * of day relative to a UTC day boundary. localDateKey (already used by
 * Tonight/Review for the same reason) collapses each timestamp to the
 * user's local calendar date first; diffing those as UTC midnights then
 * yields a true whole-calendar-day count, matching when "Day N" should
 * visibly flip — at the user's local midnight, not 24 wall-clock hours
 * after enrollment.
 */
export function daysElapsedLocal(startedAt: Date, now: Date, timeZone: string): number {
  const startKey = localDateKey(startedAt, timeZone);
  const nowKey = localDateKey(now, timeZone);
  const start = Date.parse(`${startKey}T00:00:00Z`);
  const cur = Date.parse(`${nowKey}T00:00:00Z`);
  return Math.floor((cur - start) / 86400000) + 1;
}

export interface ProgrammeDayState {
  daysElapsed: number;
  effectiveLengthDays: number;
  completionState: ProgrammeCompletionState;
  /** Absolute day number since enrollment; frozen once FINISHED. */
  currentDay: number;
  /** 1..lengthDays — which ProgrammeDay content to show, cycling for extensions/continuous re-runs of the same journey. */
  contentDayNumber: number;
}

export function computeProgrammeDayState(params: {
  startedAt: Date;
  now: Date;
  timeZone: string;
  lengthDays: number;
  extendedDays: number;
  continuous: boolean;
  finishedAt: Date | null;
}): ProgrammeDayState {
  const { startedAt, now, timeZone, lengthDays, extendedDays, continuous, finishedAt } = params;
  const daysElapsed = daysElapsedLocal(startedAt, now, timeZone);
  const effectiveLengthDays = lengthDays + extendedDays;

  let completionState: ProgrammeCompletionState;
  if (finishedAt) completionState = "FINISHED";
  else if (continuous) completionState = "CONTINUOUS";
  else if (daysElapsed > effectiveLengthDays) completionState = "AWAITING_CHOICE";
  else completionState = "ACTIVE";

  const currentDay = completionState === "ACTIVE" || completionState === "CONTINUOUS" ? daysElapsed : Math.min(daysElapsed, effectiveLengthDays);
  const contentDayNumber = ((currentDay - 1) % lengthDays) + 1;

  return { daysElapsed, effectiveLengthDays, completionState, currentDay, contentDayNumber };
}

/** Applies a completion choice to an enrollment's continuity fields. Callers persist the result. */
export function applyCompletionChoice(
  choice: ProgrammeCompletionChoice,
  current: { extendedDays: number },
): { extendedDays: number; continuous: boolean; finishedAt: Date | null } {
  if (choice === "FINISH") return { extendedDays: current.extendedDays, continuous: false, finishedAt: new Date() };
  if (choice === "CONTINUOUS") return { extendedDays: current.extendedDays, continuous: true, finishedAt: null };
  return { extendedDays: current.extendedDays + extensionDaysFor(choice), continuous: false, finishedAt: null };
}
