import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

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
 */
export function signSession(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: "365d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "missing_session" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string; role: string };
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_session" });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") return res.status(403).json({ error: "admin_only" });
  next();
}
