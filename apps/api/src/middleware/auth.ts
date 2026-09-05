import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";

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
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") return res.status(403).json({ error: "admin_only" });
  next();
}
