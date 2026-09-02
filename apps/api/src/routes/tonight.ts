import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { stepModeFor } from "@asclepios/shared";
import { computeRoutineLevel, maxStepsForLevel } from "../domain/decision/routineLevelEngine";
import { selectProductSteps, productBudgetForMaxSteps } from "../domain/decision/productSelectionEngine";

const router = Router();
router.use(requireAuth);

/**
 * Doc 01 §2 / §4 — "一晚只顯示 1-3 個最重要步驟". Even a user with several
 * owned products only sees a short, prioritised list, never every
 * intervention they own. Priority: 1-2 owned product steps (see Repair
 * Plan A1 / productSelectionEngine.ts — genuinely selected, not just
 * ownerships[0], and never "render every owned product"), then breathing
 * if racing thoughts is elevated, then music — capped by the user's
 * system-chosen Routine Level (Matrix #12: Level 1 = 2 steps, Level 2/3 =
 * 3 steps).
 *
 * Each step also carries its `mode` (Matrix #11's Rhythm/Calm/Body/Support
 * taxonomy) so the client can show why a step is there, not just what it is.
 *
 * Repair Plan A2 (2 Sep 2026) — every step now carries a `stepInstanceId`
 * that's unique even when there are 2+ PRODUCT steps in the same list
 * (`PRODUCT:<productId>`, vs. the old shared "PRODUCT" stepCode that broke
 * React keys and per-step UI state as soon as a second product existed).
 * `stepCode` remains the step *type* (still "PRODUCT" for all of them) —
 * client code that only cares about the type keeps working unchanged.
 *
 * Matrix #14 — each PRODUCT step also carries `protocolSteps`: the real
 * Apply→Breathe→Sleep (or Apply→Drink) micro-protocol for that specific
 * product, read from `ProductProtocolStep` (admin-configurable, no deploy
 * needed to edit). Falls back to `en` if the requested locale has no rows.
 */
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const locale = (req.query.locale as string) || "en";
  const ownerships = await prisma.productOwnership.findMany({ where: { userId }, include: { product: true } });
  const currentState = await prisma.tagScore.findMany({ where: { userId, source: "CURRENT_STATE" } });
  const racingThoughts = currentState.find((t: (typeof currentState)[number]) => t.tag === "RACING_THOUGHTS");

  const reviewSnapshots = await prisma.reviewSnapshot.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const routineLevel = computeRoutineLevel(reviewSnapshots);
  const maxSteps = maxStepsForLevel(routineLevel);

  // Labels are not baked in server-side — the client owns all user-facing
  // copy via its locale resources (apps/web/src/i18n), so this route only
  // ever returns stepCode + the raw data (e.g. product name) a label needs.
  const steps: {
    stepCode: string;
    stepInstanceId: string;
    productId?: string;
    productName?: string;
    protocolSteps?: { title: string; instruction: string }[];
  }[] = [];

  if (ownerships.length > 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const recentUsage = await prisma.productUsageLog.findMany({
      where: { userId, productId: { in: ownerships.map((o: (typeof ownerships)[number]) => o.productId) }, loggedAt: { gte: sevenDaysAgo } },
    });
    const productBudget = productBudgetForMaxSteps(maxSteps);
    const selected = selectProductSteps(
      ownerships.map((o: (typeof ownerships)[number]) => ({ productId: o.productId, productName: o.product.name, acquiredAt: o.acquiredAt })),
      recentUsage.map((l: (typeof recentUsage)[number]) => ({ productId: l.productId!, status: l.status, loggedAt: l.loggedAt })),
      productBudget,
    );

    for (const p of selected) {
      let protocolRows = await prisma.productProtocolStep.findMany({
        where: { productId: p.productId, locale },
        orderBy: { stepOrder: "asc" },
      });
      if (protocolRows.length === 0 && locale !== "en") {
        protocolRows = await prisma.productProtocolStep.findMany({ where: { productId: p.productId, locale: "en" }, orderBy: { stepOrder: "asc" } });
      }
      steps.push({
        stepCode: "PRODUCT",
        stepInstanceId: `PRODUCT:${p.productId}`,
        productId: p.productId,
        productName: p.productName,
        protocolSteps: protocolRows.map((r: (typeof protocolRows)[number]) => ({ title: r.title, instruction: r.instruction })),
      });
    }
  }
  if (racingThoughts && racingThoughts.severity >= 3 && steps.length < maxSteps) {
    steps.push({ stepCode: "BREATHING", stepInstanceId: "BREATHING" });
  }
  if (steps.length < maxSteps) {
    steps.push({ stepCode: "MUSIC", stepInstanceId: "MUSIC" });
  }

  const withMode = steps.slice(0, maxSteps).map((s) => ({ ...s, mode: stepModeFor(s.stepCode) }));
  res.json({ steps: withMode, routineLevel });
});

router.post("/log-step", async (req: AuthedRequest, res) => {
  const { stepCode, status, sessionId, productId } = req.body as {
    stepCode: string;
    status: "DONE" | "SKIPPED";
    sessionId?: string;
    productId?: string;
  };
  if (stepCode === "PRODUCT" && productId) {
    const log = await prisma.productUsageLog.create({ data: { userId: req.userId!, productId, sessionId, status } });
    return res.json(log);
  }
  const log = await prisma.routineStepLog.create({ data: { userId: req.userId!, sessionId, stepCode, status } });
  res.json(log);
});

export default router;
