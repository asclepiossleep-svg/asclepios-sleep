import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Language persistence (5 Sep 2026) — must match apps/web/src/i18n's
// SUPPORTED_LOCALES exactly; kept as its own small list rather than a
// shared package import since it's a 3-entry V1 allowlist, not a general
// i18n concern the API needs to reason about beyond validating this field.
const ALLOWED_LOCALES = ["en", "zh-HK", "zh-CN"];

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
  const { displayName, wallpaperId, themeColor, timezone, preferredSleepAudioId, audioMuted, locale } = req.body as {
    // 31 Aug 2026 — lets an existing account set/change their name from
    // Settings, same fix as the Register-time name field in routes/auth.ts.
    // Empty string clears it back to the email-prefix fallback.
    displayName?: string | null;
    wallpaperId?: string | null;
    themeColor?: string | null;
    timezone?: string;
    preferredSleepAudioId?: string | null;
    audioMuted?: boolean;
    // Language persistence (5 Sep 2026) — previously locale could only be
    // set once, at register/login time (routes/auth.ts); there was no way
    // to change it afterwards short of logging out. Settings now sends this.
    locale?: string;
  };

  if (wallpaperId) {
    const wallpaper = await prisma.wallpaper.findUnique({ where: { id: wallpaperId } });
    if (!wallpaper || !wallpaper.active) return res.status(400).json({ error: "unknown_wallpaper" });
  }

  if (locale !== undefined && !ALLOWED_LOCALES.includes(locale)) {
    return res.status(400).json({ error: "unknown_locale" });
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
      ...(locale !== undefined ? { locale } : {}),
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
