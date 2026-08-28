import { Router } from "express";
import { prisma } from "../db";
import { signSession } from "../middleware/auth";
import { reseedDemoUser } from "../domain/demoSeed";
import { DEMO_ACCOUNTS } from "@asclepios/shared";

const router = Router();

/**
 * Supplement 07 §5-6 — staging-only Demo Selector. Gated on
 * NODE_ENV !== "production" so this never ships live; production demo
 * access (if ever needed) should go through the normal OTP flow instead.
 */
router.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") return res.status(404).json({ error: "not_available" });
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

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await reseedDemoUser(email);

  const session = await prisma.deviceSession.create({ data: { userId: user.id, deviceLabel: "Demo Selector" } });
  const token = signSession(user.id, user.role);
  res.json({ token, user, deviceSessionId: session.id });
});

// Supplement 07 §5: "每個 Demo Account 有 Reset Demo State 按鈕... 回復 seed 狀態"
router.post("/:email/reset", async (req, res) => {
  const user = await reseedDemoUser(req.params.email);
  res.json({ reset: true, user });
});

export default router;
