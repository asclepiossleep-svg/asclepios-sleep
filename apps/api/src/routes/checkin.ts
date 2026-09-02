import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Repair Plan A9 (2 Sep 2026) — MorningCheckin.tsx previously read sessionId
// only from react-router's navigate() state, which is empty on any reload,
// bookmark, home-screen-icon open, or notification tap. This endpoint lets
// the client recover "the session that's actually waiting on a check-in"
// instead of silently submitting a checkin with no session link.
router.get("/pending-session", async (req: AuthedRequest, res) => {
  const session = await prisma.sleepSession.findFirst({
    where: { userId: req.userId!, status: { in: ["ACTIVE", "WOKEN"] }, morningCheckin: null },
    orderBy: { createdAt: "desc" },
  });
  res.json({ sessionId: session?.id ?? null });
});

/**
 * Doc 05 §5 / Doc 06 §8 — Morning Check-in must stay <=3 primary actions:
 * sleep rating, night-waking count, morning energy. "Add Details" is opt-in
 * or rule-triggered only, never a default step.
 */
router.post("/", async (req: AuthedRequest, res) => {
  const { sessionId, sleepRating, nightWakingCount, morningEnergy, addDetails } = req.body as {
    sessionId?: string;
    sleepRating: number;
    nightWakingCount: "0" | "1" | "2" | "3+";
    morningEnergy: "POOR" | "AVERAGE" | "GOOD";
    addDetails?: Record<string, unknown>;
  };

  const checkin = await prisma.morningCheckin.create({
    data: {
      userId: req.userId!,
      sessionId,
      sleepRating,
      nightWakingCount,
      morningEnergy,
      addDetailsJson: addDetails ? JSON.stringify(addDetails) : null,
    },
  });

  res.json(checkin);
});

export default router;
