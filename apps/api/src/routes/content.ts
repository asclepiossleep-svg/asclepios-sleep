import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { hasEntitlement } from "../domain/entitlement";

const router = Router();
router.use(requireAuth);

/**
 * Requirement Recovery Matrix #22 — Sleep Answer Library. Doc 01 §5's core
 * rule ("content changes need no deploy") is already satisfied — this route
 * just reads ContentItem rows, so an Admin-added article shows up
 * immediately with no code change.
 *
 * Layer resolution stays intentionally simple for V1 (see demoSeed.ts's
 * seedContentLibrary comment): PUBLIC is always visible; PRODUCT_LOCKED
 * needs at least one owned product; PAID_PROGRAMME needs the 28-day
 * programme entitlement. Nothing seeded uses those two gated layers yet —
 * this is forward-compatible plumbing, not a guess at a real access rule.
 */
router.get("/", async (req: AuthedRequest, res) => {
  const locale = (req.query.locale as string) || "zh-HK";
  const category = req.query.category as string | undefined;

  // Language persistence audit (5 Sep 2026) — library rows are seeded per
  // locale as separate `<baseCode>_<locale>` rows (demoSeed.ts's
  // seedContentLibrary), same convention contentResolver.ts already falls
  // back on for single-item lookups (Tonight guidance, Programme day
  // content). Not every locale has every article seeded yet (zh-CN has
  // none) — without this, a locale with gaps got a silently empty library
  // instead of the English article, unlike every other content surface.
  const candidates = await prisma.contentItem.findMany({
    where: {
      active: true,
      locale: { in: locale === "en" ? ["en"] : [locale, "en"] },
      category: category ?? { not: null },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const byBaseCode = new Map<string, (typeof candidates)[number]>();
  for (const item of candidates) {
    const suffix = `_${item.locale}`;
    const baseCode = item.code.endsWith(suffix) ? item.code.slice(0, -suffix.length) : item.code;
    const existing = byBaseCode.get(baseCode);
    if (!existing || item.locale === locale) byBaseCode.set(baseCode, item);
  }
  const items = [...byBaseCode.values()].sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "") || a.title.localeCompare(b.title));

  const [ownsAnyProduct, hasProgramme] = await Promise.all([
    prisma.productOwnership.count({ where: { userId: req.userId! } }).then((n: number) => n > 0),
    hasEntitlement(req.userId!, "PROGRAMME_28_DAY"),
  ]);

  const visible = items.filter((item: (typeof items)[number]) => {
    if (item.layer === "PRODUCT_LOCKED") return ownsAnyProduct;
    if (item.layer === "PAID_PROGRAMME") return hasProgramme;
    return true; // PUBLIC
  });

  res.json({ items: visible });
});

export default router;
