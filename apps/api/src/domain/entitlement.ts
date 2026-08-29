import { prisma } from "../db";

/**
 * Doc 06 §3 — "Entitlement resolution 集中一個 service." Every place in the
 * codebase that needs to know "can this user use X" calls resolveEntitlements
 * (or hasEntitlement) — nobody re-derives access from Membership/Product
 * tables directly. This is also where QR/Order/Admin-grant/Demo-seed all
 * converge, so the front end never needs to know how access was obtained.
 */
export async function resolveEntitlements(userId: string): Promise<string[]> {
  const rows = await prisma.entitlement.findMany({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return rows.map((r: (typeof rows)[number]) => r.key);
}

export async function hasEntitlement(userId: string, key: string): Promise<boolean> {
  const keys = await resolveEntitlements(userId);
  return keys.includes(key);
}

/**
 * Grants an entitlement with a full audit trail (Doc 06 §3 "audit-critical
 * events append-only" + Doc 06 §8 "QR/Payment 正確 grant entitlement 有
 * audit"). Used by Admin grant, order fulfilment, and demo seeding —
 * QR activation (currently flag-OFF) will call this same function once
 * turned on, rather than duplicating the grant logic.
 */
export async function grantEntitlement(
  userId: string,
  key: string,
  grantedVia: "ORDER" | "ADMIN_GRANT" | "DEMO_SEED" | "QR_ACTIVATION" | "SELF_ENROLL",
  actorUserId?: string,
  expiresAt?: Date
) {
  const entitlement = await prisma.entitlement.create({
    data: { userId, key, grantedVia, expiresAt: expiresAt ?? null },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actorUserId ?? null,
      action: "GRANT_ENTITLEMENT",
      entityType: "Entitlement",
      entityId: entitlement.id,
      afterJson: JSON.stringify(entitlement),
    },
  });
  return entitlement;
}
