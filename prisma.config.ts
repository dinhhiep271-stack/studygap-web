// Prisma ORM 7 config file.
// Docs: https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference
//
// Requires: npm install --save-dev prisma@7 dotenv
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 no longer reads the connection URL from schema.prisma,
    // and does not load .env by itself (see the dotenv import above).
    url: env("DATABASE_URL"),
  },
});
