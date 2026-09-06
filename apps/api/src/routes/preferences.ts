import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { isValidTimeZone } from "../domain/decision/dateKey";

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
    timezoneMode: user.timezoneMode,
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
  const { displayName, wallpaperId, themeColor, timezone, timezoneMode, preferredSleepAudioId, audioMuted, locale } = req.body as {
    // 31 Aug 2026 — lets an existing account set/change their name from
    // Settings, same fix as the Register-time name field in routes/auth.ts.
    // Empty string clears it back to the email-prefix fallback.
    displayName?: string | null;
    wallpaperId?: string | null;
    themeColor?: string | null;
    timezone?: string;
    // Timezone Auto/Manual (6 Sep 2026) — Settings sends this explicitly
    // when the user flips the mode toggle. Omitting it while sending
    // `timezone` (the pre-existing call shape) is treated as "the user just
    // picked a zone by hand", i.e. an implicit switch to MANUAL — matching
    // what the old single-dropdown Settings control actually meant.
    timezoneMode?: "AUTO" | "MANUAL";
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

  if (timezoneMode !== undefined && timezoneMode !== "AUTO" && timezoneMode !== "MANUAL") {
    return res.status(400).json({ error: "unknown_timezone_mode" });
  }
  if (timezone !== undefined && !isValidTimeZone(timezone)) {
    return res.status(400).json({ error: "unknown_timezone" });
  }

  // Resolve what actually gets written for mode + zone together, rather than
  // as two independent optional fields, so "pick a zone" (with no explicit
  // mode) always means Manual.
  const nextTimezoneMode = timezoneMode ?? (timezone !== undefined ? "MANUAL" : undefined);

  // Audit correction (6 Sep 2026) — switching to Automatic used to leave the
  // old Manual zone in the response/DB untouched until *some later* request
  // happened to carry a bounded timezone-sync signal, so the UI could show a
  // stale zone right after the user just chose Automatic. This request's own
  // `X-Client-Timezone` header (apps/web sends it on every call) is the
  // device's current zone right now, so an explicit switch to AUTO resolves
  // and persists it immediately and atomically in this same write, instead
  // of waiting for a separate sync point.
  const requestDeviceTimeZone = (() => {
    const header = req.headers["x-client-timezone"];
    const value = Array.isArray(header) ? header[0] : header;
    return value && isValidTimeZone(value) ? value : undefined;
  })();
  const nextTimezone = nextTimezoneMode === "AUTO" ? requestDeviceTimeZone : timezone;

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(displayName !== undefined ? { displayName: displayName?.trim() || null } : {}),
      ...(wallpaperId !== undefined ? { wallpaperId } : {}),
      ...(themeColor !== undefined ? { themeColor } : {}),
      ...(nextTimezone !== undefined ? { timezone: nextTimezone } : {}),
      ...(nextTimezoneMode !== undefined ? { timezoneMode: nextTimezoneMode } : {}),
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
    timezoneMode: user.timezoneMode,
    locale: user.locale,
    preferredSleepAudioId: user.preferredSleepAudioId,
    audioMuted: user.audioMuted,
  });
});

export default router;
