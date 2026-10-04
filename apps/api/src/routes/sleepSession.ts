import { Router } from "express";
import { prisma, isPostgresDatabase } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { resolveDurationSeconds, computeTimeline, WAKE_STYLE_CURVES } from "../domain/sleepSession";
import { withUserLock } from "../domain/userLock";
import { SLEEP_AUDIO_DURATION_PRESETS, SNOOZE_MINUTES, EXTEND_AUDIO_MINUTES, WAKE_STYLES } from "@asclepios/shared";

const router = Router();
router.use(requireAuth);

router.get("/presets", (_req, res) => {
  res.json({ durations: SLEEP_AUDIO_DURATION_PRESETS, snoozeMinutes: SNOOZE_MINUTES, extendAudioMinutes: EXTEND_AUDIO_MINUTES, wakeStyles: WAKE_STYLES });
});

// Supplement 07 §10-16 — START TONIGHT. Four independent time settings.
//
// Lane C concurrency fix (PRODUCT-SLEEP-SESSION-CONTINUITY-130) — a
// concurrent double-tap or a second open tab must never create two ACTIVE
// sessions for the same user. Made atomic/idempotent without a schema
// change: find-or-create runs inside one Prisma transaction, serialized by
// (a) an in-process per-user lock (withUserLock — covers the single-process
// sqlite dev/test path, where two "concurrent" requests still share one
// writer) and (b) a Postgres transaction-scoped advisory lock keyed on the
// user id (covers multiple server instances in staging/production; sqlite
// has no such lock and doesn't need one for the same reason). If an
// ACTIVE/WOKEN session already exists, start() returns that session instead
// of creating a second one.
router.post("/start", async (req: AuthedRequest, res) => {
  const body = req.body as {
    targetSleepTime?: string;
    wakeTime?: string;
    // Music Library (29 Aug 2026) — Tonight.tsx now sends an explicit
    // `null` for the user's "🔇 Off" pick (see SleepPlayer.tsx's
    // trackEngineFor), not just a real SYNTH_TRACKS code.
    sleepAudioId?: string | null;
    sleepAudioDurationMode: "FIXED" | "CUSTOM" | "UNTIL_WAKE" | "ALL_NIGHT";
    presetLabel?: string;
    customSeconds?: number;
    wallpaperId?: string;
    visualDurationMode?: string;
    wakeAudioId?: string;
    wakeStyle?: "GENTLE" | "NORMAL" | "STRONG";
    snoozeMinutes?: number;
    timezone?: string;
  };

  const durationSeconds = resolveDurationSeconds(body.sleepAudioDurationMode, body.presetLabel, body.customSeconds);
  const userId = req.userId!;

  const { session, resumed } = await withUserLock(userId, () =>
    prisma.$transaction(async (tx) => {
      if (isPostgresDatabase) {
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", userId);
      }

      const existing = await tx.sleepSession.findFirst({
        where: { userId, status: { in: ["ACTIVE", "WOKEN"] } },
        orderBy: { windDownStart: "desc" },
      });
      if (existing) return { session: existing, resumed: true };

      const created = await tx.sleepSession.create({
        data: {
          userId,
          windDownStart: new Date(),
          targetSleepTime: body.targetSleepTime ? new Date(body.targetSleepTime) : null,
          wakeTime: body.wakeTime ? new Date(body.wakeTime) : null,
          sleepAudioId: body.sleepAudioId,
          sleepAudioDurationMode: body.sleepAudioDurationMode,
          sleepAudioDurationSeconds: durationSeconds,
          wallpaperId: body.wallpaperId,
          visualDurationMode: body.visualDurationMode ?? "30_MIN",
          wakeAudioId: body.wakeAudioId,
          wakeStyle: body.wakeStyle ?? "NORMAL",
          snoozeMinutes: body.snoozeMinutes ?? 10,
          timezone: body.timezone ?? "Europe/London",
          status: "ACTIVE",
        },
      });
      return { session: created, resumed: false };
    })
  );

  const timeline = computeTimeline({
    windDownStart: session.windDownStart,
    targetSleepTime: session.targetSleepTime,
    wakeTime: session.wakeTime,
    durationMode: session.sleepAudioDurationMode as any,
    durationSeconds: session.sleepAudioDurationSeconds,
  });

  res.json({ session, resumed, timeline, wakeCurve: WAKE_STYLE_CURVES[session.wakeStyle as keyof typeof WAKE_STYLE_CURVES] });
});

// P0 continuity requirement (6 Sep 2026 owner directive) — lets the app
// resume an in-progress sleep session on cold entry (refresh, browser
// restart, PWA relaunch) instead of dropping the user on Home/first step.
// Mirrors checkin.ts's /pending-session lookup pattern. ACTIVE = still
// sleeping; WOKEN = awake but hasn't continued to Morning Check-in yet —
// both still have an unfinished player experience to return to. Must be
// declared before GET /:id, or Express would treat "active" as an :id.
router.get("/active", async (req: AuthedRequest, res) => {
  const session = await prisma.sleepSession.findFirst({
    where: { userId: req.userId!, status: { in: ["ACTIVE", "WOKEN"] } },
    orderBy: { windDownStart: "desc" },
  });
  res.json({ session });
});

// Requirement Recovery Matrix #29 — lets the Sleep Player recover session
// details (track/duration/fade-out) after a page refresh, not just via the
// navigate() state passed at Start Sleep time.
router.get("/:id", async (req: AuthedRequest, res) => {
  const session = await prisma.sleepSession.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!session) return res.status(404).json({ error: "not_found" });
  res.json({ session });
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const session = await prisma.sleepSession.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!session) return res.status(404).json({ error: "not_found" });
  const updated = await prisma.sleepSession.update({ where: { id: session.id }, data: req.body });
  res.json(updated);
});

// Supplement 07 §12 — I'M AWAKE.
router.post("/:id/wake", async (req: AuthedRequest, res) => {
  const session = await prisma.sleepSession.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!session) return res.status(404).json({ error: "not_found" });
  const updated = await prisma.sleepSession.update({ where: { id: session.id }, data: { status: "WOKEN" } });
  res.json(updated);
});

// Supplement 07 §15 — Snooze / Not asleep yet / change sound / stop.
router.post("/:id/snooze", async (req: AuthedRequest, res) => {
  const { minutes } = req.body as { minutes: number };
  res.json({ snoozedUntil: new Date(Date.now() + minutes * 60 * 1000) });
});

router.post("/:id/stop", async (req: AuthedRequest, res) => {
  const session = await prisma.sleepSession.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!session) return res.status(404).json({ error: "not_found" });
  const updated = await prisma.sleepSession.update({ where: { id: session.id }, data: { status: "ENDED" } });
  res.json(updated);
});

export default router;
