import { defineConfig } from "prisma/config";

// The database URL is read from the environment (see .env.example); it is never committed.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/brandweave",
  },
});
