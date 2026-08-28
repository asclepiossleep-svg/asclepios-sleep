import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

/**
 * Doc 06 §8 Definition of Done — "Admin 能自行新增產品、問題、音樂、
 * wallpaper、course、promotion" without a deploy. This router is the basic
 * CRUD floor for that; Doc 00 §2 priority #2 calls it out as a build-order
 * priority ahead of the customer-facing front end.
 *
 * Every mutation writes an AuditLog row (Doc 06 §3: "audit-critical events
 * append-only").
 */
async function audit(actorUserId: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await prisma.auditLog.create({
    data: { actorUserId, action, entityType, entityId, beforeJson: before ? JSON.stringify(before) : null, afterJson: after ? JSON.stringify(after) : null },
  });
}

function crud<T extends string>(entity: T, model: any) {
  router.get(`/${entity}`, async (_req, res) => res.json(await model.findMany()));

  router.post(`/${entity}`, async (req: AuthedRequest, res) => {
    const created = await model.create({ data: req.body });
    await audit(req.userId!, "CREATE", entity, created.id, null, created);
    res.json(created);
  });

  router.put(`/${entity}/:id`, async (req: AuthedRequest, res) => {
    const before = await model.findUnique({ where: { id: req.params.id } });
    const updated = await model.update({ where: { id: req.params.id }, data: req.body });
    await audit(req.userId!, "UPDATE", entity, updated.id, before, updated);
    res.json(updated);
  });

  router.delete(`/${entity}/:id`, async (req: AuthedRequest, res) => {
    const before = await model.findUnique({ where: { id: req.params.id } });
    await model.delete({ where: { id: req.params.id } });
    await audit(req.userId!, "DELETE", entity, req.params.id, before, null);
    res.json({ deleted: true });
  });
}

crud("products", prisma.product);
crud("questions", prisma.question);
crud("answer-options", prisma.answerOption);
crud("decision-rules", prisma.decisionRule);
crud("audio-tracks", prisma.audioTrack);
crud("wallpapers", prisma.wallpaper);
crud("content-items", prisma.contentItem);
crud("programmes", prisma.programme);
crud("routine-step-defs", prisma.routineStepDef);

router.get("/audit-log", async (_req, res) => {
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  res.json(rows);
});

router.post("/entitlements/grant", async (req: AuthedRequest, res) => {
  const { userId, key, expiresAt } = req.body as { userId: string; key: string; expiresAt?: string };
  const { grantEntitlement } = await import("../domain/entitlement");
  const entitlement = await grantEntitlement(userId, key, "ADMIN_GRANT", req.userId, expiresAt ? new Date(expiresAt) : undefined);
  res.json(entitlement);
});

export default router;
