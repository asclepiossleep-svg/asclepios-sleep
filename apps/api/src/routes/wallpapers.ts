import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Doc 01 §5 — wallpaper catalog is fully admin/DB-driven, never hard-coded
// into the client. Category ordering left to the client (groups by
// packages/shared WALLPAPER_CATEGORIES if it wants to).
router.get("/", async (_req, res) => {
  const wallpapers = await prisma.wallpaper.findMany({ where: { active: true }, orderBy: { title: "asc" } });
  res.json({ wallpapers });
});

export default router;
