import { PrismaClient } from "@prisma/client";

// Single shared Prisma client. In dev with tsx watch this can multiply
// across hot reloads; guard via globalThis the way Next.js docs recommend.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
