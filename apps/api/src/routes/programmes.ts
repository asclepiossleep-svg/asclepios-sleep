import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { grantEntitlement } from "../domain/entitlement";

const router = Router();
router.use(requireAuth);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Requirement Recovery Matrix #20/#21 — the two named programmes (7-Night
 * Quick Start, 30-Day Sleep Reset). The generic Programme/ProgrammeEnrollment
 * mechanism already existed (Matrix status E called out "not seeded, no
 * dedicated flow") — this route is that dedicated flow: list what's
 * available, let a user enrol in one at a time, and report Day X of Y.
 *
 * Free self-enrolment for V1 (Milestone 4 — payment/entitlement — hasn't
 * been decided yet), so enrolling just grants the matching entitlement key
 * directly (grantedVia: SELF_ENROLL) rather than gating on an order. This
 * keeps content that's already wired to check entitlements (Matrix #22's
 * PAID_PROGRAMME layer) working the moment a real paid gate is added later
 * — nothing here has to change, only how the entitlement gets granted.
 *
 * currentDay is computed from `startedAt` on every read rather than trusted
 * from a stored counter, so it's always correct even if a user skips a day
 * or the process restarts mid-programme.
 */
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [programmes, enrollments] = await Promise.all([
    prisma.programme.findMany({ where: { active: true, code: { in: ["PRG_7NIGHT_QUICKSTART", "PRG_30DAY_RESET"] } } }),
    prisma.programmeEnrollment.findMany({ where: { userId } }),
  ]);

  const result = programmes.map((p: (typeof programmes)[number]) => {
    const enrollment = enrollments.find((e: (typeof enrollments)[number]) => e.programmeId === p.id);
    let currentDay: number | null = null;
    let isComplete = false;
    if (enrollment) {
      const daysElapsed = Math.floor((Date.now() - enrollment.startedAt.getTime()) / MS_PER_DAY) + 1;
      currentDay = Math.min(daysElapsed, p.lengthDays);
      isComplete = daysElapsed > p.lengthDays;
    }
    return { code: p.code, lengthDays: p.lengthDays, enrolled: !!enrollment, currentDay, isComplete };
  });

  res.json({ programmes: result });
});

router.post("/:code/enroll", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { code } = req.params;
  const programme = await prisma.programme.findUnique({ where: { code } });
  if (!programme) return res.status(404).json({ error: "not_found" });

  const existing = await prisma.programmeEnrollment.findFirst({ where: { userId, programmeId: programme.id } });
