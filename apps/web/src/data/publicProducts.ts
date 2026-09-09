/**
 * Phase 1 catalogue for the public marketing site (issue #45). Identity,
 * category and copy are governed by docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md
 * — no price, stock, SKU or launch date here; all three stay COMING_SOON
 * until the commercial release gates confirm owner-approved values.
 */
export type PublicProductCategory = "night" | "day";

export interface PublicProduct {
  slug: string;
  category: PublicProductCategory;
  categoryLabelKey: string;
  nameKey: string;
  timingKey: string;
  descriptionKey: string;
  usageKeys: string[];
}

export const PUBLIC_PRODUCTS: PublicProduct[] = [
  {
    slug: "sleeptape",
    category: "night",
    categoryLabelKey: "public.product.sleeptape.category",
    nameKey: "public.product.sleeptape.name",
    timingKey: "public.product.sleeptape.timing",
    descriptionKey: "public.product.sleeptape.description",
    usageKeys: ["public.product.sleeptape.usage1", "public.product.sleeptape.usage2", "public.product.sleeptape.usage3"],
  },
  {
    slug: "rest-and-sleep-mode",
    category: "night",
    categoryLabelKey: "public.product.restSleepMode.category",
    nameKey: "public.product.restSleepMode.name",
    timingKey: "public.product.restSleepMode.timing",
    descriptionKey: "public.product.restSleepMode.description",
    usageKeys: [
      "public.product.restSleepMode.usage1",
      "public.product.restSleepMode.usage2",
      "public.product.restSleepMode.usage3",
    ],
  },
  {
    slug: "day-mode",
    category: "day",
    categoryLabelKey: "public.product.dayMode.category",
    nameKey: "public.product.dayMode.name",
    timingKey: "public.product.dayMode.timing",
    descriptionKey: "public.product.dayMode.description",
    usageKeys: ["public.product.dayMode.usage1", "public.product.dayMode.usage2", "public.product.dayMode.usage3"],
  },
];
