import { Router } from "express";
import { prisma } from "../db";
import { signSession } from "../middleware/auth";
import { reseedDemoUser } from "../domain/demoSeed";
import { DEMO_ACCOUNTS } from "@asclepios/shared";

const router = Router();

/**
 * Supplement 07 §5-6 — staging-only Demo Selector.
 *
 * This deployment has no separate Vercel "staging" project — Vercel sets
 * NODE_ENV=production for every deployment on this project regardless of
 * target, so gating on NODE_ENV permanently 404'd this route with no way
 * to open it. Gate on an explicit opt-OUT flag instead, defaulting to
 * enabled: once a real production custom domain goes live, set
 * DEMO_DISABLED=true in that Vercel environment's variables to turn this
 * off. Until then it stays open by default, exactly as it is today.
 */
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

  // Use account.email (guaranteed a real string, matched above), not the
  // raw destructured `email` — that stays `string | undefined` to TS even
  // after the account lookup narrows it at runtime.
  let user = await prisma.user.findUnique({ where: { email: account.email } });
  if (!user) user = await reseedDemoUser(account.email);

  const session = await prisma.deviceSession.create({ data: { userId: user.id, deviceLabel: "Demo Selector" } });
  const token = signSession(user.id, user.role, session.id);
  res.json({ token, user, deviceSessionId: session.id });
});

// Supplement 07 §5: "每個 Demo Account 有 Reset Demo State 按鈕... 回復 seed 狀態"
router.post("/:email/reset", async (req, res) => {
  const user = await reseedDemoUser(req.params.email);
  res.json({ reset: true, user });
});

export default router;
