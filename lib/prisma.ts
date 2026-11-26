import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Prisma 7 no longer bundles a Rust query engine, so every client needs a
 * driver adapter. SQLite writes go through better-sqlite3 (see
 * `prisma.config.ts` for the CLI counterpart).
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // Next.js loads `.env` on the server; the fallback keeps the app usable when
  // a fresh clone has not created `.env` yet.
  const url = process.env.DATABASE_URL?.trim() || "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Reuse one client across hot reloads instead of opening a new SQLite handle
// on every edit.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
