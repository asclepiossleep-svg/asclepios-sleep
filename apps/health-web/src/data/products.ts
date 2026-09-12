/**
 * Phase 1 catalogue for apps/health-web (own copy, no cross-workspace
 * import from apps/web — apps/health-web is an independent deployment,
 * see tokens.css). Identity, category and copy mirror the owner-approved
 * apps/web/src/data/publicProducts.ts catalogue exactly; governed by
 * docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md — no price, stock, SKU or launch
 * date until the commercial release gates confirm owner-approved values.
 */
export type HealthProductCategory = "night" | "day";

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
    category: "night",
    nameKey: "health.product.sleeptape.name",
    timingKey: "health.product.sleeptape.timing",
    descriptionKey: "health.product.sleeptape.description",
  },
  {
    slug: "rest-and-sleep-mode",
    category: "night",
    nameKey: "health.product.restSleepMode.name",
    timingKey: "health.product.restSleepMode.timing",
    descriptionKey: "health.product.restSleepMode.description",
  },
  {
    slug: "day-mode",
    category: "day",
    nameKey: "health.product.dayMode.name",
    timingKey: "health.product.dayMode.timing",
    descriptionKey: "health.product.dayMode.description",
  },
];
