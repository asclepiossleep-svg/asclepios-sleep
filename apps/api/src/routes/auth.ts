import { Router } from "express";
import { prisma } from "../db";
import { signSession, requireAuth, AuthedRequest } from "../middleware/auth";
import { resolveEntitlements } from "../domain/entitlement";

const router = Router();

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Supplement 07 §3-4 — Email OTP / Magic Link is the V1 primary login.
 * No password required. In dev/staging (NODE_ENV !== "production") the
 * response includes the code directly so the flow is testable without a
 * real mail provider wired up yet — swap sendOtpEmail() for a real
 * provider before production and drop the devCode field.
 */
router.post("/otp/request", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email_required" });

  const code = randomOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otpChallenge.create({ data: { email, code, expiresAt } });

  // TODO(Manus): replace with a real transactional email provider adapter.
  console.log(`[dev] OTP for ${email}: ${code}`);

  res.json({ sent: true, devCode: process.env.NODE_ENV === "production" ? undefined : code });
});

router.post("/otp/verify", async (req, res) => {
  const { email, code, locale, timezone } = req.body as { email?: string; code?: string; locale?: string; timezone?: string };
  if (!email || !code) return res.status(400).json({ error: "email_and_code_required" });

  const challenge = await prisma.otpChallenge.findFirst({
    where: { email, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return res.status(400).json({ error: "invalid_or_expired_code" });

  await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, locale: locale ?? "en", timezone: timezone ?? "Europe/London" } });
    await prisma.authIdentity.create({ data: { userId: user.id, provider: "EMAIL_OTP" } });
    await prisma.membership.create({ data: { userId: user.id, tier: "FREE" } });
  }

  const session = await prisma.deviceSession.create({
    data: { userId: user.id, deviceLabel: req.headers["user-agent"]?.toString().slice(0, 80) ?? "unknown device" },
  });

  const token = signSession(user.id, user.role);
  res.json({ token, user, deviceSessionId: session.id });
});

/**
 * Provider-independent social login stub (Supplement 07 §4). A real
 * integration verifies an Apple/Google identity token server-side; this
 * demo endpoint trusts a client-supplied `providerUserId` so the vertical
 * slice is testable end-to-end before OAuth credentials exist. Replace the
 * trust boundary before shipping — do not deploy this stub to production.
 */
router.post("/social/:provider", async (req, res) => {
  const provider = req.params.provider.toUpperCase();
  if (!["APPLE", "GOOGLE"].includes(provider)) return res.status(400).json({ error: "unsupported_provider" });

  const { providerUserId, email, locale, timezone } = req.body as {
    providerUserId?: string;
    email?: string;
    locale?: string;
    timezone?: string;
  };
  if (!providerUserId || !email) return res.status(400).json({ error: "providerUserId_and_email_required" });

  let identity = await prisma.authIdentity.findUnique({ where: { provider_providerUserId: { provider, providerUserId } } });
  let user;
  if (identity) {
    user = await prisma.user.findUniqueOrThrow({ where: { id: identity.userId } });
  } else {
    user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, locale: locale ?? "en", timezone: timezone ?? "Europe/London" } });
      await prisma.membership.create({ data: { userId: user.id, tier: "FREE" } });
    }
    identity = await prisma.authIdentity.create({ data: { userId: user.id, provider, providerUserId } });
  }

  const session = await prisma.deviceSession.create({ data: { userId: user.id, deviceLabel: `${provider} sign-in` } });
  const token = signSession(user.id, user.role);
  res.json({ token, user, deviceSessionId: session.id });
});

router.get("/session", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
  const entitlements = await resolveEntitlements(user.id);
  const memberships = await prisma.membership.findMany({ where: { userId: user.id } });
  const products = await prisma.productOwnership.findMany({ where: { userId: user.id }, include: { product: true } });
  res.json({ user, entitlements, memberships, products });
});

// Supplement 07 §8 — Account -> Devices: view + sign out other devices.
router.get("/devices", requireAuth, async (req: AuthedRequest, res) => {
  const devices = await prisma.deviceSession.findMany({ where: { userId: req.userId! }, orderBy: { lastSeenAt: "desc" } });
  res.json(devices);
});

router.post("/devices/:id/revoke", requireAuth, async (req: AuthedRequest, res) => {
  const device = await prisma.deviceSession.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!device) return res.status(404).json({ error: "not_found" });
  await prisma.deviceSession.update({ where: { id: device.id }, data: { revokedAt: new Date() } });
  res.json({ revoked: true });
});

// Supplement 07 §9 — Consent capture, versioned + timestamped, history kept.
router.post("/consent", requireAuth, async (req: AuthedRequest, res) => {
  const { type, version, accepted } = req.body as { type: string; version: string; accepted: boolean };
  const record = await prisma.consentRecord.create({ data: { userId: req.userId!, type, version, accepted } });
  res.json(record);
});

export default router;
