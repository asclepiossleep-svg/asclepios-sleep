import { seedAllDemoAccounts } from "../src/domain/demoSeed";
import { enforcePhase1PrelaunchGuard } from "../src/domain/commercialLaunchGuard";
import { prisma } from "../src/db";

async function main() {
  console.log("Seeding base config + demo accounts (Supplement 07 §5)...");
  await seedAllDemoAccounts();
  await enforcePhase1PrelaunchGuard();
  console.log("Done. Demo accounts are ready; Phase-1 commercial placeholders remain guarded as COMING_SOON.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
