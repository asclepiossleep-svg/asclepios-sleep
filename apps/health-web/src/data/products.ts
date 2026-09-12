/**
 * Phase 1 catalogue for apps/health-web (own copy, no cross-workspace
 * import from apps/web — apps/health-web is an independent deployment,
 * see tokens.css). Category pills follow the owner-approved Asclepios
 * Health catalogue taxonomy (Issue #97: All Products / Sleep / Calm /
 * Gut & Mood / Bundles) — a platform-level vertical grouping, distinct
 * from apps/web's own night/day *timing* filter. Every current Phase 1
 * SKU is an Asclepios Sleep product, so all three sit under "sleep";
 * "calm", "gutMood" and "bundles" have no qualifying product yet and are
 * intentionally left empty rather than assigning an unconfirmed product
 * to them, per docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md. No price, stock,
 * SKU or launch date until the commercial release gates confirm
 * owner-approved values.
 */
export type HealthProductCategory = "sleep" | "calm" | "gutMood" | "bundles";

export interface HealthProduct {
  slug: string;
  category: HealthProductCategory;
  nameKey: string;
  timingKey: string;
  descriptionKey: string;
}

export const HEALTH_PRODUCTS: HealthProduct[] = [
  {
    slug: "sleeptape",
    category: "sleep",
    nameKey: "health.product.sleeptape.name",
    timingKey: "health.product.sleeptape.timing",
    descriptionKey: "health.product.sleeptape.description",
  },
  {
    slug: "rest-and-sleep-mode",
    category: "sleep",
    nameKey: "health.product.restSleepMode.name",
    timingKey: "health.product.restSleepMode.timing",
    descriptionKey: "health.product.restSleepMode.description",
  },
  {
    slug: "day-mode",
    category: "sleep",
    nameKey: "health.product.dayMode.name",
    timingKey: "health.product.dayMode.timing",
    descriptionKey: "health.product.dayMode.description",
  },
];
