import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { isValidTimeZone } from "../domain/decision/dateKey";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * 31 Aug 2026 — Edmund's rule: users stay logged in indefinitely; only
 * membership/payment status (handled separately via entitlements, not this
 * token) should ever end access, never a fixed session timer. A JWT can't
 * truly be "forever" without a refresh-token system (out of scope for this
 * V1 scaffold), so this uses a very long expiry (1 year) as the practical
 * stand-in — combined with the web app's own localStorage persistence
 * (api/client.ts), a session now survives closing the tab/browser and
 * reopening it, not just a refresh.
 *
 * Auth persistence audit (5 Sep 2026) — deviceSessionId is now embedded in
 * the token so requireAuth can check DeviceSession.revokedAt below. Login
 * already created a DeviceSession row and returned its id to the client
 * (see auth.ts/demo.ts), but nothing ever bound the token itself to it, so
 * POST /auth/devices/:id/revoke had no actual effect on that device.
 */
export function signSession(userId: string, role: string, deviceSessionId: string) {
  return jwt.sign({ sub: userId, role, deviceSessionId }, JWT_SECRET, { expiresIn: "365d" });
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "missing_session" });
  let payload: { sub: string; role: string; deviceSessionId?: string };
  try {
    payload = jwt.verify(header.slice(7), JWT_SECRET) as typeof payload;
  } catch {
    return res.status(401).json({ error: "invalid_session" });
  }
  // Tokens signed before this field existed have no deviceSessionId — treat
  // them as not device-bound rather than rejecting them outright, so this
  // fix doesn't force-log-out everyone already signed in.
  if (payload.deviceSessionId) {
    const device = await prisma.deviceSession.findUnique({ where: { id: payload.deviceSessionId } });
    if (!device || device.revokedAt) return res.status(401).json({ error: "revoked_session" });
  }
  req.userId = payload.sub;
  req.userRole = payload.role;
  // Timezone Auto/Manual (6 Sep 2026, per audit correction) — only sync at a
  // bounded point the client explicitly marks as "app open/resume" (see
  // syncAutoTimezone's comment below), never on every authenticated request.
  if (req.headers["x-client-timezone-sync"]) {
    await syncAutoTimezone(req.userId, req.headers["x-client-timezone"]);
  }
  next();
}

/**
 * Timezone Auto/Manual (6 Sep 2026) — the single place "Auto follows the
 * device, including travel" actually happens. Every day-boundary call site
 * (dateKey.ts, programmeContinuity.ts, tonight.ts, programmes.ts) reads
 * `User.timezone` fresh from the DB, so keeping that column in sync here is
 * enough to make Auto mode take effect everywhere, with no other route
 * needing to know this exists. A single conditional `updateMany` (not a
 * read-then-write) keeps this a no-op query when the mode is MANUAL or the
 * zone hasn't changed, and it's wrapped so a DB hiccup here can never fail
 * an otherwise-valid request — but the failure is logged, not silently lost.
 *
 * Audit correction (6 Sep 2026) — this used to run on *every* authenticated
 * request, which was both an unconditional DB round trip on the hot path of
 * the whole app for a Settings feature, and undefined for two devices in
 * different zones: whichever device happened to make the most recent API
 * call (including background/idle polling) would silently move the account's
 * one shared `timezone`/night-boundary for every device. requireAuth now
 * only calls this when the request explicitly carries `X-Client-Timezone-Sync`
 * — apps/web's api/client.ts sends that only at genuine app-open/resume
 * moments (initial load, tab regaining visibility), not on routine API
 * traffic. That bounds the write to real "I just started using this device"
 * events instead of every request, and confines the multi-device race to the
 * much narrower window of two devices being actively (re)opened at the same
 * moment, rather than any two requests racing. True per-device-session night
 * identity (so a second device can never move the first device's active
 * night at all) would need request-scoped timezone resolution threaded
 * through every day-boundary call site — a larger architecture change than
 * this pass, left as a known follow-up rather than a silent gap.
 */
async function syncAutoTimezone(userId: string, headerValue: string | string[] | undefined) {
  const clientTimeZone = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!clientTimeZone || !isValidTimeZone(clientTimeZone)) return;
  try {
    await prisma.user.updateMany({
      where: { id: userId, timezoneMode: "AUTO", NOT: { timezone: clientTimeZone } },
      data: { timezone: clientTimeZone },
    });
  } catch (err) {
    // Never let this side-effect turn a valid request into a 500 — but do
    // surface it, unlike the fully-silent swallow this replaced.
    console.error("syncAutoTimezone failed", err);
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") return res.status(403).json({ error: "admin_only" });
  next();
}
