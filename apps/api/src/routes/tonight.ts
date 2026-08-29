import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { stepModeFor } from "@asclepios/shared";
import { computeRoutineLevel, maxStepsForLevel } from "../domain/decision/routineLevelEngine";

const router = Router();
router.use(requireAuth);

/**
 * Doc 01 §2 / §4 — "一晚只顯示 1-3 個最重要步驟". Even a user with 3 owned
 * products only sees a short, prioritised list, never every intervention
 * they own. Priority: highest-severity current-state tag's linked product
 * step, then one owned product step, then breathing if racing thoughts is
 * elevated, then music — capped by the user's system-chosen Routine Level
 * (Matrix #12: Level 1 = 2 steps, Level 2/3 = 3 steps).
 *
 * Each step also carries its `mode` (Matrix #11's Rhythm/Calm/Body/Support
 * taxonomy) so the client can show why a step is there, not just what it is.
 */
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const ownerships = await prisma.productOwnership.findMany({ where: { userId }, include: { product: true } });
  const currentState = await prisma.tagScore.findMany({ where: { userId, source: "CURRENT_STATE" } });
  const racingThoughts = currentState.find((t: (typeof currentState)[number]) => t.tag === "RACING_THOUGHTS");

  const reviewSnapshots = await prisma.reviewSnapshot.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const routineLevel = computeRoutineLevel(reviewSnapshots);
  const maxSteps = maxStepsForLevel(routineLevel);

  // Labels are not baked in server-side — the client owns all user-facing
  // copy via its locale resources (apps/web/src/i18n), so this route only
  // ever returns stepCode + the raw data (e.g. product name) a label needs.
  const steps: { stepCode: string; productId?: string; productName?: string }[] = [];

  if (ownerships.length > 0) {
    const primary = ownerships[0];
    steps.push({ stepCode: "PRODUCT", productId: primary.productId, productName: primary.product.name });
  }
  if (racingThoughts && racingThoughts.severity >= 3 && steps.length < maxSteps) {
    steps.push({ stepCode: "BREATHING" });
  }
  if (steps.length < maxSteps) {
    steps.push({ stepCode: "MUSIC" });
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
