/**
 * Repair Plan A1 (2 Sep 2026) — Multi-product selection.
 *
 * The old Tonight route always used `ownerships[0]` — a user with 2+
 * products always saw only the first one ever acquired, forever. This
 * replaces that with a real, data-driven ranking so multiple products can
 * genuinely rotate through Tonight's small step budget, instead of either
 * "always the same one" (the old bug) or "show every owned product every
 * night" (Edmund's explicit instruction NOT to do — that's a product list,
 * not a decision).
 *
 * Ranking signal: recency of the last DONE usage log in the last 7 days.
 * A product never logged as done, or least-recently done, is the one most
 * likely to need a nudge — the same "what's been neglected" logic a human
 * coach would use, using data that already exists (ProductUsageLog), not
 * a new field. Tie-break on acquiredAt so the ordering is stable when two
 * products are equally "not yet used".
 *
 * This is intentionally a first, real pass — not the final architecture.
 * Doc 03/Repair Plan's fuller model (daypart, severity/current-state tag
 * relevance, eligibility, programme context) needs Product schema fields
 * that don't exist yet (see Repair Plan D1). When those land, this
 * function is the place to extend the ranking, not to replace the whole
 * approach — callers only depend on selectProductSteps' signature.
 */

export interface OwnedProductForSelection {
  productId: string;
  productName: string;
  acquiredAt: Date;
}

export interface ProductUsageLogForSelection {
  productId: string;
  status: string; // "DONE" | "SKIPPED"
  loggedAt: Date;
}

export function selectProductSteps(
  owned: OwnedProductForSelection[],
  recentLogs: ProductUsageLogForSelection[],
  budget: number,
): OwnedProductForSelection[] {
  if (budget <= 0 || owned.length === 0) return [];

  const lastDoneAt = new Map<string, Date>();
  for (const log of recentLogs) {
    if (log.status !== "DONE") continue;
    const prev = lastDoneAt.get(log.productId);
    if (!prev || log.loggedAt > prev) lastDoneAt.set(log.productId, log.loggedAt);
  }

  const ranked = [...owned].sort((a, b) => {
    const aLast = lastDoneAt.get(a.productId);
    const bLast = lastDoneAt.get(b.productId);
    if (!aLast && bLast) return -1; // never done in the window — highest priority
    if (aLast && !bLast) return 1;
    if (aLast && bLast) return aLast.getTime() - bLast.getTime(); // least-recently-done first
    return a.acquiredAt.getTime() - b.acquiredAt.getTime(); // stable tie-break
  });

  return ranked.slice(0, budget);
}

// Level 1 (fewer steps overall) gets a single product slot; Level 2/3 can
// afford two — still never "every owned product", and always leaving room
// for the fixed music/breathing steps within maxSteps.
export function productBudgetForMaxSteps(maxSteps: number): number {
  return maxSteps >= 3 ? 2 : 1;
}
