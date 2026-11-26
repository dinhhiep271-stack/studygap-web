// Prisma ORM 7 config file.
// Docs: https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference
//
// Requires: npm install --save-dev prisma@7 dotenv
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 no longer reads the connection URL from schema.prisma,
    // and does not load .env by itself (see the dotenv import above).
    //
    // `prisma generate` is part of `npm run build` and never connects to the
    // database, but the CLI loads this file first — and `env("DATABASE_URL")`
    // throws `PrismaConfigEnvError` when the variable is missing. CI/Vercel
    // builds have no `.env`, so fall back to the local SQLite file instead of
    // failing the deployment.
    url: process.env.DATABASE_URL?.trim() || "file:./dev.db",
  },
});
