import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { pickTodayNudge } from "../domain/todayNudge";
import { compositeScore } from "../domain/decision/scoringEngine";

const router = Router();
router.use(requireAuth);

router.get("/nudge", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const checkinToday = await prisma.morningCheckin.findFirst({ where: { userId, submittedAt: { gte: startOfDay } } });
  const currentState = await prisma.tagScore.findMany({ where: { userId, source: "CURRENT_STATE" } });

  type Scored = (typeof currentState)[number];
  const top = currentState
    .map((t: Scored) => ({ tag: t.tag, composite: compositeScore(t as any) }))
    .filter((t: { composite: number }) => t.composite > 0)
    .sort((a: { composite: number }, b: { composite: number }) => b.composite - a.composite)[0];

  const nudge = pickTodayNudge({ hasCheckinToday: Boolean(checkinToday), topFocusTag: top?.tag ?? null });
  res.json(nudge);
});

export default router;
