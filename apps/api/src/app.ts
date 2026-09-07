import "dotenv/config";
import express from "express";
import cors from "cors";

import { prisma } from "./db";
import authRoutes from "./routes/auth";
import demoRoutes from "./routes/demo";
import assessmentRoutes from "./routes/assessment";
import tonightRoutes from "./routes/tonight";
import sleepSessionRoutes from "./routes/sleepSession";
import checkinRoutes from "./routes/checkin";
import reviewRoutes from "./routes/review";
import adminRoutes from "./routes/admin";
import featureFlagRoutes from "./routes/featureFlags";
import preferencesRoutes from "./routes/preferences";
import wallpapersRoutes from "./routes/wallpapers";
import todayRoutes from "./routes/today";
import contentRoutes from "./routes/content";
import programmesRoutes from "./routes/programmes";
import musicRoutes from "./routes/music";

/**
 * The Express app itself, with no `listen()` call — shared by local dev and
 * the Vercel serverless handler. Keep request handling stateless.
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // SUM observability contract:
  // - live = process/function can answer HTTP
  // - ready = critical dependency (database) is reachable
  // Keep /health as a backwards-compatible liveness alias.
  const livePayload = { ok: true, service: "asclepios-sleep-api", probe: "live" };
  app.get("/health", (_req, res) => res.json(livePayload));
  app.get("/health/live", (_req, res) => res.json(livePayload));
  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, service: "asclepios-sleep-api", probe: "ready", database: "ok" });
    } catch (error) {
      console.error("readiness_probe_failed", error);
      res.status(503).json({
        ok: false,
        service: "asclepios-sleep-api",
        probe: "ready",
        database: "unavailable",
      });
    }
  });

  app.use("/auth", authRoutes);
  app.use("/demo", demoRoutes);
  app.use("/assessment", assessmentRoutes);
  app.use("/tonight", tonightRoutes);
  app.use("/sleep-session", sleepSessionRoutes);
  app.use("/checkin", checkinRoutes);
  app.use("/review", reviewRoutes);
  app.use("/admin", adminRoutes);
  app.use("/feature-flags", featureFlagRoutes);
  app.use("/preferences", preferencesRoutes);
  app.use("/wallpapers", wallpapersRoutes);
  app.use("/today", todayRoutes);
  app.use("/content", contentRoutes);
  app.use("/programmes", programmesRoutes);
  app.use("/music", musicRoutes);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

export const app = createApp();
