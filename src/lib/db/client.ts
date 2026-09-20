import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * One Prisma client per server instance. In dev, hot reloads would otherwise open a new
 * connection pool each time, so the client is cached on globalThis.
 *
 * DATABASE_URL must be Neon's *pooled* connection string (host contains "-pooler"):
 * serverless functions open many short-lived connections, which the pooler multiplexes.
 */
const g = globalThis as unknown as { __bwPrisma?: PrismaClient };

function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. See .env.example.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) });
}

/** Lazy, so importing this module (e.g. during a build) never requires a database. */
export function db(): PrismaClient {
  return (g.__bwPrisma ??= create());
}
