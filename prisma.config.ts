import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 does not load .env files itself. Node can, so read .env.local when present (local dev);
// on Vercel the variables come from the project environment.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations need a *direct* (unpooled) connection; the running app uses the pooled DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/brandweave",
  },
});
