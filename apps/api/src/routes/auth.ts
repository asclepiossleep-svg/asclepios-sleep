import { Router } from "express";
import bcrypt from "bcryptjs";
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

/**
 * 31 Aug 2026 — Edmund's rule: "Login" and "Register" must be distinct, not
 * the old single flow that silently created an account on any email typed
 * into the login form. `mode` is optional and defaults to "login" for
 * backward compatibility (older clients / the demo flow don't send it):
 *   - mode "login" + no existing account -> 404 account_not_found, nothing
 *     is created. The web app sends the user to the Register tab.
 *   - mode "register" + an account already exists -> no error, just logs
 *     them in as normal (friendlier than blocking on "already exists", and
 *     avoids ever creating a duplicate).
 */
router.post("/otp/verify", async (req, res) => {
  const { email, code, locale, timezone, mode, name } = req.body as {
    email?: string;
    code?: string;
    locale?: string;
    timezone?: string;
    mode?: "login" | "register";
    // 31 Aug 2026 — Edmund's feedback: the app never asked a new user's
    // name, then greeted them with their email prefix as if it were one.
    // Collected once, on Register, and stored as displayName (the schema
    // field already existed from an earlier pass but nothing ever wrote to
    // it). Optional/trimmed — a user who skips it still gets an account,
    // just with the old email-prefix fallback until they set one later
    // from Settings.
    name?: string;
  };
  if (!email || !code) return res.status(400).json({ error: "email_and_code_required" });

  const challenge = await prisma.otpChallenge.findFirst({
    where: { email, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return res.status(400).json({ error: "invalid_or_expired_code" });

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user && mode === "login") return res.status(404).json({ error: "account_not_found" });

  await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

  if (!user) {
    const trimmedName = name?.trim();
    user = await prisma.user.create({
      data: {
        email,
        locale: locale ?? "en",
        timezone: timezone ?? "Europe/London",
        ...(trimmedName ? { displayName: trimmedName } : {}),
      },
    });
    await prisma.authIdentity.create({ data: { userId: user.id, provider: "EMAIL_OTP" } });
    await prisma.membership.create({ data: { userId: user.id, tier: "FREE" } });
  }

  const session = await prisma.deviceSession.create({
    data: { userId: user.id, deviceLabel: req.headers["user-agent"]?.toString().slice(0, 80) ?? "unknown device" },
  });

  const token = signSession(user.id, user.role, session.id);
  res.json({ token, user, deviceSessionId: session.id });
});

/**
 * 31 Aug 2026 — password login, added at Edmund's explicit request: real
 * transactional email (Resend or similar) still isn't wired up, so anyone
 * who isn't Edmund has no way to ever receive an email-OTP code — the app
 * was genuinely unusable for a real second user. The schema already had
 * `AuthIdentity.passwordHash` / provider "PASSWORD" reserved for this from
 * the start, just never implemented. This is deliberately a *second*
 * credential path alongside email-OTP, not a replacement — once real email
 * is wired up, both keep working side by side; a user can have either or
 * both AuthIdentity rows. Passwords are hashed with bcrypt (cost 10),
 * never stored or logged in plain text, and the login error is
 * intentionally the same "invalid_credentials" whether the email doesn't
 * exist or the password is wrong, so this endpoint can't be used to probe
 * which emails have accounts.
 */
router.post("/password/register", async (req, res) => {
  const { email, password, name, locale, timezone } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    locale?: string;
    timezone?: string;
  };
  if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });
  if (password.length < 6) return res.status(400).json({ error: "password_too_short" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "account_already_exists" });

  const trimmedName = name?.trim();
  const user = await prisma.user.create({
    data: {
      email,
      locale: locale ?? "en",
      timezone: timezone ?? "Europe/London",
      ...(trimmedName ? { displayName: trimmedName } : {}),
    },
  });
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.authIdentity.create({ data: { userId: user.id, provider: "PASSWORD", passwordHash } });
  await prisma.membership.create({ data: { userId: user.id, tier: "FREE" } });

  const session = await prisma.deviceSession.create({
    data: { userId: user.id, deviceLabel: req.headers["user-agent"]?.toString().slice(0, 80) ?? "unknown device" },
  });
  const token = signSession(user.id, user.role, session.id);
  res.json({ token, user, deviceSessionId: session.id });
});

router.post("/password/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });

  const user = await prisma.user.findUnique({ where: { email } });
  const identity = user ? await prisma.authIdentity.findFirst({ where: { userId: user.id, provider: "PASSWORD" } }) : null;
  const ok = identity?.passwordHash ? await bcrypt.compare(password, identity.passwordHash) : false;
  if (!user || !identity || !ok) return res.status(401).json({ error: "invalid_credentials" });

  const session = await prisma.deviceSession.create({
    data: { userId: user.id, deviceLabel: req.headers["user-agent"]?.toString().slice(0, 80) ?? "unknown device" },
  });
  const token = signSession(user.id, user.role, session.id);
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
  const token = signSession(user.id, user.role, session.id);
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
