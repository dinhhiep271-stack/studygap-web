import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    globalNotFound: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Prisma 7 talks to SQLite through the `better-sqlite3` native addon, which
  // ships N-API binaries in `prebuilds/`. Keeping both packages external makes
  // the server build `require()` them from `node_modules` instead of bundling
  // (and breaking) the native binding — required for the Vercel build.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
