import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

/**
 * Doc 01 §2 / §4 — "一晚只顯示 1-3 個最重要步驟". Even a user with 3 owned
 * products only sees a short, prioritised list, never every intervention
 * they own. Priority: highest-severity current-state tag's linked product
 * step, then one owned product step, then breathing if racing thoughts is
 * elevated, then music — capped at 3 total.
 */
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const ownerships = await prisma.productOwnership.findMany({ where: { userId }, include: { product: true } });
  const currentState = await prisma.tagScore.findMany({ where: { userId, source: "CURRENT_STATE" } });
  const racingThoughts = currentState.find((t: (typeof currentState)[number]) => t.tag === "RACING_THOUGHTS");

  const steps: { stepCode: string; label: string; productId?: string }[] = [];

  if (ownerships.length > 0) {
    const primary = ownerships[0];
    steps.push({ stepCode: "PRODUCT", label: `Use ${primary.product.name}`, productId: primary.productId });
  }
  if (racingThoughts && racingThoughts.severity >= 3 && steps.length < 3) {
    steps.push({ stepCode: "BREATHING", label: "1-minute breathing exercise" });
  }
  if (steps.length < 3) {
    steps.push({ stepCode: "MUSIC", label: "Start tonight's sleep music" });
  }

  res.json({ steps: steps.slice(0, 3) });
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
