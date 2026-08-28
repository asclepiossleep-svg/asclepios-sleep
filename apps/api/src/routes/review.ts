import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { run7DayReview, run28DayReassessment } from "../domain/decision";

const router = Router();
router.use(requireAuth);

router.post("/7-day", async (req: AuthedRequest, res) => {
  const result = await run7DayReview(req.userId!);
  res.json(result);
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
