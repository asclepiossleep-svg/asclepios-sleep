import { prisma } from "../db";
import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from "@asclepios/shared";

/**
 * Feature flags live in the DB (Doc 06 §3: "feature flag 唔可以破壞資料一致性" —
 * flags are config, not code branches baked into a deploy). This module is
 * the only place that resolves them; nothing else should read
 * process.env.FEATURE_* directly at request time.
 *
 * env vars are only used to seed initial DB state (see prisma/seed.ts) — the
 * DB row is the runtime source of truth so Admin can flip a flag with no
 * deploy (Doc 06 §8 Definition of Done).
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const rows = await prisma.featureFlag.findMany();
  const flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
  for (const row of rows) {
    if (row.key === "product_activation_qr") flags.product_activation_qr = row.enabled;
    if (row.key === "ai_gateway") flags.ai_gateway = row.enabled;
  }
  return flags;
}

export async function setFeatureFlag(key: keyof FeatureFlags, enabled: boolean, updatedBy?: string) {
  return prisma.featureFlag.upsert({
    where: { key },
    update: { enabled, updatedBy },
    create: { key, enabled, updatedBy },
  });
}
