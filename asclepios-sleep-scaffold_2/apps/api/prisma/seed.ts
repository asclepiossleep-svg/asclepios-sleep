import { seedAllDemoAccounts } from "../src/domain/demoSeed";
import { prisma } from "../src/db";

async function main() {
  console.log("Seeding base config + demo accounts (Supplement 07 §5)...");
  await seedAllDemoAccounts();
  console.log("Done. Demo accounts are ready to log in via POST /demo/login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
