import { seedBaseConfig } from "../src/domain/demoSeed";
import { enforcePhase1PrelaunchGuard } from "../src/domain/commercialLaunchGuard";
import { prisma } from "../src/db";

/**
 * Catalog-only reseed, safe to run on every deploy.
 *
 * `seedBaseConfig()` keeps dynamic catalogue/config rows present. The SUM
 * commercial launch guard then deliberately overrides any legacy provisional
 * Phase-1 price/active state so a deploy can never turn placeholder commerce
 * data into sellable truth before owner approval.
 */
const LEGACY_SYNTH_SLUGS = [
  "synth-pink-noise",
  "synth-brown-noise",
  "synth-white-noise",
  "synth-calm-mind-432",
  "synth-deep-relax-528",
  "synth-ocean-waves",
  "synth-gentle-rain",
  "synth-singing-bowl",
  "synth-forest-wind",
];

seedBaseConfig()
  .then(() => enforcePhase1PrelaunchGuard())
  .then(() => prisma.musicTrack.updateMany({ where: { slug: { in: LEGACY_SYNTH_SLUGS } }, data: { published: false } }))
  .then(() => {
    console.log("Catalog synced; SUM pre-launch commercial guard enforced");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
