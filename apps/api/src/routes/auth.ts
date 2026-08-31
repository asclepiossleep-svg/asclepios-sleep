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
    // 31 Aug 2026 — Edmund's
