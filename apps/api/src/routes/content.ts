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

  const items = await prisma.contentItem.findMany({
    where: {
      active: true,
      locale,
      category: category ?? { not: null },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

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
