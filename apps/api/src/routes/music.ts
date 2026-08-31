import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/tracks", async (_req, res) => {
  const tracks = await prisma.musicTrack.findMany({
    where: { published: true },
    orderBy: [{ primaryCategory: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });
  res.json({ tracks });
});

router.get("/favourites", async (req: AuthedRequest, res) => {
  const favourites = await prisma.musicFavourite.findMany({
    where: { userId: req.userId! },
    include: { track: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ favourites: favourites.map((f: { track: unknown }) => f.track) });
});

router.post("/:id/favourite", async (req: AuthedRequest, res) => {
  const track = await prisma.musicTrack.findUnique({ where: { id: req.params.id } });
  if (!track) return res.status(404).json({ error: "not_found" });
  await prisma.musicFavourite.upsert({
    where: { userId_trackId: { userId: req.userId!, trackId: track.id } },
    update: {},
    create: { userId: req.userId!, trackId: track.id },
  });
  res.json({ favourited: true });
});

router.delete("/:id/favourite", async (req: AuthedRequest, res) => {
  await prisma.musicFavourite.deleteMany({ where: { userId: req.userId!, trackId: req.params.id } });
  res.json({ favourited: false });
});

router.post("/:id/play", async (req: AuthedRequest, res) => {
  const track = await prisma.musicTrack.findUnique({ where: { id: req.params.id } });
  if (!track) return res.status(404).json({ error: "not_found" });
  const entry = await prisma.musicPlayHistory.create({ data: { userId: req.userId!, trackId: track.id } });
  res.json({ id: entry.id });
});

export default router;
