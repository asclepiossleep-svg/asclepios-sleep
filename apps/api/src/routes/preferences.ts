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
    wallpaperId: user.wallpaperId,
    wallpaper: user.wallpaper,
    themeColor: user.themeColor,
    timezone: user.timezone,
    locale: user.locale,
  });
});

router.patch("/", async (req: AuthedRequest, res) => {
  const { wallpaperId, themeColor, timezone } = req.body as {
    wallpaperId?: string | null;
    themeColor?: string | null;
    timezone?: string;
  };

  if (wallpaperId) {
    const wallpaper = await prisma.wallpaper.findUnique({ where: { id: wallpaperId } });
    if (!wallpaper || !wallpaper.active) return res.status(400).json({ error: "unknown_wallpaper" });
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(wallpaperId !== undefined ? { wallpaperId } : {}),
      ...(themeColor !== undefined ? { themeColor } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
    },
    include: { wallpaper: true },
  });

  res.json({
    wallpaperId: user.wallpaperId,
    wallpaper: user.wallpaper,
    themeColor: user.themeColor,
    timezone: user.timezone,
    locale: user.locale,
  });
});

export default router;
