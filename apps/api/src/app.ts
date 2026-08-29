import "dotenv/config";
import express from "express";
import cors from "cors";

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

/**
 * The Express app itself, with no `listen()` call — shared by:
 *  - src/index.ts (local dev: `npm run dev`, calls app.listen())
 *  - api/index.ts (Vercel: exported directly as the serverless handler)
 *
 * Master Kick-off V1 §17/§21: same codebase, same behaviour, whether it's
 * running as a long-lived local process or a Vercel serverless function.
 * Don't add anything here that assumes a persistent process (in-memory
 * caches, setInterval, etc.) — Vercel functions are stateless per-invocation.
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true, service: "asclepios-sleep-api" }));

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

export const app = createApp();

// redeploy trigger 29 Aug 2026
