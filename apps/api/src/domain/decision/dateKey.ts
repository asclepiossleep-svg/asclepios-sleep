/**
 * Repair Plan A2/A5 timezone correction (2 Sep 2026, per audit) —
 * `new Date().toISOString().slice(0, 10)` gives the UTC calendar date,
 * not the user's. A user at 00:30 in Asia/Hong_Kong (UTC+8) is still on
 * the *previous* UTC day, so PlannedAction.plannedDate and the 7-day
 * review's window boundary could both land on the wrong night — exactly
 * the kind of off-by-one-day bug the whole point of PlannedAction was
 * meant to eliminate.
 *
 * localDateKey resolves "what calendar date is it right now, in this
 * user's own timezone" — the User.timezone field already exists (used
 * elsewhere for SleepSession.timezone) and is passed in here rather than
 * re-read, so callers control exactly whose timezone applies.
 */
export function localDateKey(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    // Unknown/invalid timezone string (e.g. bad data) — fall back to UTC
    // rather than throwing and breaking Tonight/Review entirely.
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Timezone Auto/Manual (6 Sep 2026) — both the Settings "Manual" picker and
 * requireAuth's per-request Auto-mode sync (middleware/auth.ts) need to
 * reject a string that isn't a real IANA zone before it ever reaches
 * `User.timezone`; previously nothing validated it at all, so a typo or a
 * bad client value would only surface later as a silent UTC fallback deep
 * inside `localDateKey`.
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}
