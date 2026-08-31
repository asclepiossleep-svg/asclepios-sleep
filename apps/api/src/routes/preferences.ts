import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

/**
 * Design moodboard 28 Aug 2026 — Setup screens (Wallpaper / Theme Color /
 * Timezone) write here. Read on Home so the app knows whether setup is
 * still outstanding (wallpaperId null = never completed setup).
 */
router.get("/", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.userId! },
    include: { wallpaper: true },
  });
  res.json({
    displayName: user.displayName,
    wallpaperId: user.wallpaperId,
    wallpaper: user.wallpaper,
    themeColor: user.themeColor,
    timezone: user.timezone,
    locale: user.locale,
    // Music Library (29 Aug 2026) — persisted default for Tonight's track
    // picker, so "turn off / change background music" sticks across
    // visits rather than resetting to the first SYNTH_TRACKS entry every
    // time. null = app default (first SYNTH_TRACKS entry, not muted).
    preferredSleepAudioId: user.preferredSleepAudioId,
    audioMuted: user.audioMuted,
  });
});

router.patch("/", async (req: AuthedRequest, res) => {
  const { displayName, wallpaperId, themeColor, timezone, preferredSleepAudioId, audioMuted } = req.body as {
    // 31 Aug 2026 — lets an existing account set/change their name from
    // Settings, same fix as the Register-time name field in routes/auth.ts.
    // Empty string clears it back to the email-prefix fallback.
    displayName?: string | null;
    wallpaperId?: string | null;
    themeColor?: string | null;
    timezone?: string;
    preferredSleepAudioId?: string | null;
    audioMuted?: boolean;
  };

  if (wallpaperId) {
    const wallpaper = await prisma.wallpaper.findUnique({ where: { id: wallpaperId } });
    if (!wallpaper || !wallpaper.active) return res.status(400).json({ error: "unknown_wallpaper" });
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(displayName !== undefined ? { displayName: displayName?.trim() || null } : {}),
      ...(wallpaperId !== undefined ? { wallpaperId } : {}),
      ...(themeColor !== undefined ? { themeColor } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
      ...(preferredSleepAudioId !== undefined ? { preferredSleepAudioId } : {}),
      ...(audioMuted !== undefined ? { audioMuted } : {}),
    },
    include: { wallpaper: true },
  });

  res.json({
    displayName: user.displayName,
    wallpaperId: user.wallpaperId,
    wallpaper: user.wallpaper,
    themeColor: user.themeColor,
    timezone: user.timezone,
    locale: user.locale,
    preferredSleepAudioId: user.preferredSleepAudioId,
    audioMuted: user.audioMuted,
  });
});

export default router;
