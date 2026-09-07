import { Router } from "express";
import { prisma } from "../db";
import { signSession } from "../middleware/auth";
import { reseedDemoUser } from "../domain/demoSeed";
import { enforcePhase1PrelaunchGuard } from "../domain/commercialLaunchGuard";
import { DEMO_ACCOUNTS } from "@asclepios/shared";

const router = Router();

router.use((req, res, next) => {
  if (process.env.DEMO_DISABLED === "true") return res.status(404).json({ error: "not_available" });
  next();
});

router.get("/accounts", (_req, res) => {
  res.json(DEMO_ACCOUNTS);
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const account = DEMO_ACCOUNTS.find((a) => a.email === email);
  if (!account) return res.status(404).json({ error: "unknown_demo_account" });

  const expected = process.env.DEMO_PASSWORD;
  if (expected && password !== expected) return res.status(401).json({ error: "invalid_demo_password" });

  let user = await prisma.user.findUnique({ where: { email: account.email } });
  if (!user) {
    user = await reseedDemoUser(account.email);
    // `reseedDemoUser()` calls the legacy base seed, which still carries
    // provisional Phase-1 commercial fields. Always re-apply the SUM guard
    // before returning control to the caller.
    await enforcePhase1PrelaunchGuard();
  }

  const session = await prisma.deviceSession.create({ data: { userId: user.id, deviceLabel: "Demo Selector" } });
  const token = signSession(user.id, user.role, session.id);
  res.json({ token, user, deviceSessionId: session.id });
});

router.post("/:email/reset", async (req, res) => {
  const user = await reseedDemoUser(req.params.email);
  await enforcePhase1PrelaunchGuard();
  res.json({ reset: true, user });
});

export default router;
