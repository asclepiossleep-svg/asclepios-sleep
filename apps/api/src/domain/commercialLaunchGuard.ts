import { prisma } from "../db";

/**
 * SUM commercial launch guard.
 *
 * The Phase-1 catalogue still contains provisional commercial fields in
 * legacy seed data. Until an owner-approved release explicitly replaces
 * this guard, deployments/demo resets must not reactivate those placeholders
 * as sellable truth.
 */
export const PHASE1_PRODUCT_CODES = ["P01", "P02", "P03"] as const;

export async function enforcePhase1PrelaunchGuard() {
  const result = await prisma.product.updateMany({
    where: { code: { in: [...PHASE1_PRODUCT_CODES] } },
    data: {
      priceCents: null,
      active: false,
      lifecycleState: "COMING_SOON",
    },
  });

  console.log("SUM commercial_launch_guard", {
    productCodes: PHASE1_PRODUCT_CODES,
    guardedRows: result.count,
    state: "COMING_SOON",
  });

  return result.count;
}
