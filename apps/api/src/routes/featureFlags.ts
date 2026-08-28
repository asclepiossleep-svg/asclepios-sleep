import { Router } from "express";
import { getFeatureFlags, setFeatureFlag } from "../config/featureFlags";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";

const router = Router();

// Public read — the client needs this to decide whether to show QR/AI entry
// points at all (Supplement 07 §19).
router.get("/", async (_req, res) => {
  res.json(await getFeatureFlags());
});

router.patch("/:key", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const { enabled } = req.body as { enabled: boolean };
  const flag = await setFeatureFlag(req.params.key as any, enabled, req.userId);
  res.json(flag);
});

export default router;
