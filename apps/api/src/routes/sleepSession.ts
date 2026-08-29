import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { resolveDurationSeconds, computeTimeline, WAKE_STYLE_CURVES } from "../domain/sleepSession";
import { SLEEP_AUDIO_DURATION_PRESETS, SNOOZE_MINUTES, EXTEND_AUDIO_MINUTES, WAKE_STYLES } from "@asclepios/shared";

const router = Router();
router.use(requireAuth);

router.get("/presets", (_req, res) => {
  res.json({ durations: SLEEP_AUDIO_DURATION_PRESETS, snoozeMinutes: SNOOZE_MINUTES, extendAudioMinutes: EXTEND_AUDIO_MINUTES, wakeStyles: WAKE_STYLES });
});

// Supplement 07 §10-16 — START TONIGHT. Four independent time settings.
router.post("/start", async (req: AuthedRequest, res) => {
  const body = req.body as {
    targetSleepTime?: string;
    wakeTime?: string;
    sleepAudioId?: string;
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
  const windDownStart = new Date();

  const session = await prisma.sleepSession.create({
    data: {
      userId: req.userId!,
      windDownStart,
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

  const timeline = computeTimeline({
    windDownStart,
    targetSleepTime: session.targetSleepTime,
    wakeTime: session.wakeTime,
    durationMode: session.sleepAudioDurationMode as any,
    durationSeconds,
  });

  res.json({ session, timeline, wakeCurve: WAKE_STYLE_CURVES[session.wakeStyle as keyof typeof WAKE_STYLE_CURVES] });
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
