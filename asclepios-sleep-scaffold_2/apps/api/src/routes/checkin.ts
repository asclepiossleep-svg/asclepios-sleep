import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

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
