import { PrismaClient } from "@prisma/client";

// Single shared Prisma client. In dev with tsx watch this can multiply
// across hot reloads; guard via globalThis the way Next.js docs recommend.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Dev/test always run on schema.prisma's sqlite datasource (DATABASE_URL
// starts "file:"); staging/production run on schema.staging.prisma's
// postgres datasource. Lets call sites take a provider-specific path (e.g.
// an advisory lock) without a schema change or a second Prisma client.
export const isPostgresDatabase = /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "");
