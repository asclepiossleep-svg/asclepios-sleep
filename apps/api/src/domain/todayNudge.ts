/**
 * Requirement Recovery Matrix #9 — the "Day" moment. The spec calls for at
 * most one lightweight reminder during the day, never naggy. No push
 * notification infrastructure exists yet, so this is the honest V1 version:
 * a single on-screen nudge on Home, computed fresh each visit but only ever
 * showing ONE thing (priority order below) — the client is responsible for
 * not re-showing it once dismissed for the day (see Home.tsx).
 */
export type TodayNudgeCode = "MISSING_CHECKIN" | "FOCUS_TAG" | "ON_TRACK";

export interface TodayNudge {
  code: TodayNudgeCode;
  tag?: string;
}

export function pickTodayNudge(input: { hasCheckinToday: boolean; topFocusTag: string | null }): TodayNudge {
  if (!input.hasCheckinToday) return { code: "MISSING_CHECKIN" };
  if (input.topFocusTag) return { code: "FOCUS_TAG", tag: input.topFocusTag };
  return { code: "ON_TRACK" };
}
