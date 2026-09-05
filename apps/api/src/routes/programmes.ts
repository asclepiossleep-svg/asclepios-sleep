import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { grantEntitlement } from "../domain/entitlement";
import { resolveContentItem } from "../domain/contentResolver";
import { STEP_REVIEW_DECISIONS, PROGRAMME_COMPLETION_CHOICES, type ProgrammeCompletionChoice } from "@asclepios/shared";
import { computeProgrammeDayState, applyCompletionChoice } from "../domain/decision/programmeContinuity";

const router = Router();
router.use(requireAuth);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function getUserTimeZone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return user?.timezone ?? "Europe/London";
}

/**
 * Requirement Recovery Matrix #20/#21 — the two named programmes (7-Night
 * Quick Start, 30-Day Sleep Reset). The generic Programme/ProgrammeEnrollment
 * mechanism already existed (Matrix status E called out "not seeded, no
 * dedicated flow") — this route is that dedicated flow: list what's
 * available, let a user enrol in one at a time, and report Day X of Y.
 *
 * Free self-enrolment for V1 (Milestone 4 — payment/entitlement — hasn't
 * been decided yet), so enrolling just grants the matching entitlement key
 * directly (grantedVia: SELF_ENROLL) rather than gating on an order.
 *
 * currentDay is computed from `startedAt` on every read rather than trusted
 * from a stored counter, so it's always correct even if a user skips a day
 * or the process restarts mid-programme.
 *
 * Fix #5.6 (5 Sep 2026) — rebuilds this from an enrol+day-counter mechanism
 * into a guided journey: GET /:code returns today's ProgrammeDay (theme +
 * content slot, resolved via the same ContentItem `<code>_<locale>` +
 * en-fallback convention GET /tonight's step guidance uses), overall
 * progress, and whether a KEEP/REMOVE/ADJUST routine-step review is due
 * (every `reviewFrequencyDays`). Two new endpoints support the day-to-day
 * loop: POST /:code/day/:day/log (Done/Skip a day) and POST /:code/review
 * (submit the retro).
 *
 * Audit follow-up (5 Sep 2026) — the review now has a real, user-visible
 * consequence: POST /:code/review also upserts UserStepPreference (one row
 * per userId+stepCode, "latest decision wins"), which GET /tonight reads to
 * skip generating a step type last marked REMOVE. GET /:code now also
 * returns `currentStepPreferences` so the review form can prefill from the
 * user's actual current decision instead of resetting to KEEP every time.
 */
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [programmes, enrollments, timeZone] = await Promise.all([
    prisma.programme.findMany({ where: { active: true, code: { in: ["PRG_7NIGHT_QUICKSTART", "PRG_30DAY_RESET"] } } }),
    prisma.programmeEnrollment.findMany({ where: { userId } }),
    getUserTimeZone(userId),
  ]);

  const now = new Date();
  const result = programmes.map((p: (typeof programmes)[number]) => {
    const enrollment = enrollments.find((e: (typeof enrollments)[number]) => e.programmeId === p.id);
    let currentDay: number | null = null;
    let completionState: string | null = null;
    if (enrollment) {
      const state = computeProgrammeDayState({
        startedAt: enrollment.startedAt,
        now,
        timeZone,
        lengthDays: p.lengthDays,
        extendedDays: enrollment.extendedDays,
        continuous: enrollment.continuous,
        finishedAt: enrollment.finishedAt,
      });
      currentDay = state.currentDay;
      completionState = state.completionState;
    }
    return {
      code: p.code,
      lengthDays: p.lengthDays,
      enrolled: !!enrollment,
      currentDay,
      completionState,
      // Kept for any older client still reading it — true once the current
      // cycle has ended and hasn't been continued via CONTINUOUS.
      isComplete: completionState === "AWAITING_CHOICE" || completionState === "FINISHED",
      goals: p.goalsJson ? JSON.parse(p.goalsJson) : [],
      improvementAreas: p.improvementTagsJson ? JSON.parse(p.improvementTagsJson) : [],
    };
  });

  res.json({ programmes: result });
});

router.get("/:code", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { code } = req.params;
  const locale = (req.query.locale as string) || "en";
  const programme = await prisma.programme.findUnique({ where: { code } });
  if (!programme) return res.status(404).json({ error: "not_found" });

  const base = {
    code: programme.code,
    lengthDays: programme.lengthDays,
    reviewFrequencyDays: programme.reviewFrequencyDays,
    goals: programme.goalsJson ? JSON.parse(programme.goalsJson) : [],
    improvementAreas: programme.improvementTagsJson ? JSON.parse(programme.improvementTagsJson) : [],
  };

  const enrollment = await prisma.programmeEnrollment.findFirst({ where: { userId, programmeId: programme.id } });
  if (!enrollment) {
    return res.json({ ...base, enrolled: false, currentDay: null, isComplete: false, completionState: null });
  }

  const timeZone = await getUserTimeZone(userId);
  const state = computeProgrammeDayState({
    startedAt: enrollment.startedAt,
    now: new Date(),
    timeZone,
    lengthDays: programme.lengthDays,
    extendedDays: enrollment.extendedDays,
    continuous: enrollment.continuous,
    finishedAt: enrollment.finishedAt,
  });
  const { currentDay, contentDayNumber, effectiveLengthDays, completionState } = state;
  const isComplete = completionState === "AWAITING_CHOICE" || completionState === "FINISHED";
  const canLogToday = completionState === "ACTIVE" || completionState === "CONTINUOUS";

  const [today, dayLogs, ownsAnyProduct, stepPreferences] = await Promise.all([
    prisma.programmeDay.findUnique({ where: { programmeId_dayNumber: { programmeId: programme.id, dayNumber: contentDayNumber } } }),
    prisma.programmeDayLog.findMany({ where: { enrollmentId: enrollment.id } }),
    prisma.productOwnership.count({ where: { userId } }).then((n: number) => n > 0),
    prisma.userStepPreference.findMany({ where: { userId } }),
  ]);
  const todayContent = today?.contentItemCode ? await resolveContentItem(today.contentItemCode, locale) : null;

  // Due on day `reviewFrequencyDays`, `2x`, `3x`... and again reviewFrequencyDays
  // after the last one actually submitted (so a late review doesn't
  // immediately re-trigger the day after). Suspended once the current cycle
  // has ended (AWAITING_CHOICE/FINISHED) — nothing new to review until the
  // user picks how to continue.
  const reviewDue =
    canLogToday &&
    (enrollment.lastReviewedAt
      ? Date.now() - enrollment.lastReviewedAt.getTime() >= programme.reviewFrequencyDays * MS_PER_DAY
      : currentDay >= programme.reviewFrequencyDays);

  res.json({
    ...base,
    enrolled: true,
    currentDay,
    effectiveLengthDays,
    isComplete,
    completionState,
    // `dayNumber` here is the *absolute* day since enrollment (the day-log
    // key), not the 1..lengthDays content cycle position — an extension or
    // Continuous re-run reuses the same theme/content on a later absolute
    // day, and logging against the absolute day keeps each real calendar
    // day's Done/Skip history distinct instead of overwriting the original
    // week's log when the cycle repeats.
    today:
      today && canLogToday
        ? {
            dayNumber: currentDay,
            themeCode: today.themeCode,
            status: dayLogs.find((l: (typeof dayLogs)[number]) => l.dayNumber === currentDay)?.status ?? null,
            content: todayContent?.bodyMarkdown ? { title: todayContent.title, bodyMarkdown: todayContent.bodyMarkdown } : null,
          }
        : null,
    progress: { done: dayLogs.filter((l: (typeof dayLogs)[number]) => l.status === "DONE").length, total: completionState === "CONTINUOUS" ? currentDay : effectiveLengthDays },
    reviewDue,
    // Fixed candidate list for V1 rather than re-running Tonight's full
    // selection engine here — BREATHING/MUSIC are always potentially in a
    // user's routine, PRODUCT only if they own one.
    reviewableSteps: ownsAnyProduct ? ["PRODUCT", "BREATHING", "MUSIC"] : ["BREATHING", "MUSIC"],
    // The real current decision per step (UserStepPreference — "latest
    // decision wins"), so the review form can prefill from what's actually
    // in effect right now instead of resetting everyone to KEEP.
    currentStepPreferences: Object.fromEntries(stepPreferences.map((p: (typeof stepPreferences)[number]) => [p.stepCode, { decision: p.decision, note: p.note }])),
  });
});

router.post("/:code/enroll", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { code } = req.params;
  const programme = await prisma.programme.findUnique({ where: { code } });
  if (!programme) return res.status(404).json({ error: "not_found" });

  const existing = await prisma.programmeEnrollment.findFirst({ where: { userId, programmeId: programme.id } });
  if (existing) return res.json({ enrolled: true, startedAt: existing.startedAt });

  const enrollment = await prisma.programmeEnrollment.create({ data: { userId, programmeId: programme.id } });
  await grantEntitlement(userId, `PROGRAMME_${code.replace("PRG_", "")}`, "SELF_ENROLL");
  res.json({ enrolled: true, startedAt: enrollment.startedAt });
});

router.post("/:code/day/:day/log", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { code, day } = req.params;
  const { status } = req.body as { status: "DONE" | "SKIPPED" };
  const dayNumber = Number(day);
  if (!Number.isInteger(dayNumber) || (status !== "DONE" && status !== "SKIPPED")) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const programme = await prisma.programme.findUnique({ where: { code } });
  if (!programme) return res.status(404).json({ error: "not_found" });
  const enrollment = await prisma.programmeEnrollment.findFirst({ where: { userId, programmeId: programme.id } });
  if (!enrollment) return res.status(404).json({ error: "not_enrolled" });
  if (enrollment.finishedAt) return res.status(409).json({ error: "programme_finished" });

  const log = await prisma.programmeDayLog.upsert({
    where: { enrollmentId_dayNumber: { enrollmentId: enrollment.id, dayNumber } },
    create: { userId, enrollmentId: enrollment.id, dayNumber, status },
    update: { status, loggedAt: new Date() },
  });
  res.json(log);
});

router.post("/:code/review", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { code } = req.params;
  const { decisions } = req.body as { decisions: { stepCode: string; decision: string; note?: string }[] };

  const programme = await prisma.programme.findUnique({ where: { code } });
  if (!programme) return res.status(404).json({ error: "not_found" });
  const enrollment = await prisma.programmeEnrollment.findFirst({ where: { userId, programmeId: programme.id } });
  if (!enrollment) return res.status(404).json({ error: "not_enrolled" });
  if (enrollment.finishedAt) return res.status(409).json({ error: "programme_finished" });

  const valid = (decisions ?? []).filter((d) => (STEP_REVIEW_DECISIONS as readonly string[]).includes(d.decision));
  await prisma.$transaction([
    // Audit trail — every submitted decision, kept forever.
    ...valid.map((d) =>
      prisma.programmeStepReview.create({
        data: { userId, enrollmentId: enrollment.id, stepCode: d.stepCode, decision: d.decision, note: d.note ?? null },
      }),
    ),
    // The actual consequence — "latest decision wins" per (userId, stepCode),
    // which GET /tonight reads to skip a REMOVEd step type. KEEP is a plain
    // reversal of a prior REMOVE/ADJUST via the same upsert.
    ...valid.map((d) =>
      prisma.userStepPreference.upsert({
        where: { userId_stepCode: { userId, stepCode: d.stepCode } },
        create: { userId, stepCode: d.stepCode, decision: d.decision, note: d.note ?? null },
        update: { decision: d.decision, note: d.note ?? null },
      }),
    ),
    prisma.programmeEnrollment.update({ where: { id: enrollment.id }, data: { lastReviewedAt: new Date() } }),
  ]);
  res.json({ ok: true, reviewed: valid.length });
});

/**
 * Fix #5 programme-continuity correction (5 Sep 2026) — the owner-approved
 * replacement for the old "7-night complete -> one button straight into the
 * 30-day programme" dead end. Only valid once the current cycle has
 * actually ended (completionState AWAITING_CHOICE); none of FINISH, an
 * EXTEND_ choice, or CONTINUOUS ever touch dayLogs/stepReviews/
 * UserStepPreference, so all existing progress and history survive every
 * choice.
 */
router.post("/:code/complete", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { code } = req.params;
  const { choice } = req.body as { choice: string };
  if (!(PROGRAMME_COMPLETION_CHOICES as readonly string[]).includes(choice)) {
    return res.status(400).json({ error: "invalid_choice" });
  }

  const programme = await prisma.programme.findUnique({ where: { code } });
  if (!programme) return res.status(404).json({ error: "not_found" });
  const enrollment = await prisma.programmeEnrollment.findFirst({ where: { userId, programmeId: programme.id } });
  if (!enrollment) return res.status(404).json({ error: "not_enrolled" });

  const timeZone = await getUserTimeZone(userId);
  const state = computeProgrammeDayState({
    startedAt: enrollment.startedAt,
    now: new Date(),
    timeZone,
    lengthDays: programme.lengthDays,
    extendedDays: enrollment.extendedDays,
    continuous: enrollment.continuous,
    finishedAt: enrollment.finishedAt,
  });
  if (state.completionState !== "AWAITING_CHOICE") {
    return res.status(409).json({ error: "not_awaiting_choice", completionState: state.completionState });
  }

  const update = applyCompletionChoice(choice as ProgrammeCompletionChoice, { extendedDays: enrollment.extendedDays });
  await prisma.programmeEnrollment.update({ where: { id: enrollment.id }, data: update });
  res.json({ ok: true, choice, ...update });
});

export default router;
