import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { run7DayReview, run28DayReassessment, buildProgressTrend } from "../domain/decision";

const router = Router();
router.use(requireAuth);

// Repair Plan (2 Sep 2026) A11 / fix-order #1 — opening this page previously
// created a brand-new SEVEN_DAY ReviewSnapshot on every mount (Review.tsx's
// useEffect calling this unconditionally). That polluted review history and
// fed duplicate snapshots into computeRoutineLevel(). A 7-day review is only
// meaningful to recompute roughly once a day; reuse the latest snapshot
// within a 20h window instead of always creating a new one.
const REVIEW_IDEMPOTENCY_WINDOW_MS = 20 * 60 * 60 * 1000;

router.post("/7-day", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const existing = await prisma.reviewSnapshot.findFirst({
    where: { userId, type: "SEVEN_DAY" },
    orderBy: { createdAt: "desc" },
  });
  if (existing && Date.now() - existing.createdAt.getTime() < REVIEW_IDEMPOTENCY_WINDOW_MS) {
    const findings = JSON.parse(existing.findingsJson);
    return res.json({ actionCode: existing.actionCode, explanation: findings.explanation ?? "", findings, reused: true });
  }
  const result = await run7DayReview(userId);
  res.json(result);
});

// Requirement Recovery Matrix #18 — Personal Sleep Score / Progress trends.
router.get("/trend", async (req: AuthedRequest, res) => {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const checkins = await prisma.morningCheckin.findMany({
    where: { userId: req.userId!, submittedAt: { gte: since } },
    orderBy: { submittedAt: "asc" },
  });
  const trend = buildProgressTrend(checkins, 14);
  res.json(trend);
});

router.post("/28-day", async (req: AuthedRequest, res) => {
  const result = await run28DayReassessment(req.userId!);
  res.json(result);
});

router.get("/latest", async (req: AuthedRequest, res) => {
  const snapshot = await prisma.reviewSnapshot.findFirst({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" } });
  res.json(snapshot);
});

export default router;
