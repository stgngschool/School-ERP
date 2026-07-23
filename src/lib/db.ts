import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let prisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

const poolConfig = {
  connectionString,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

if (process.env.NODE_ENV === "production") {
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances of Prisma Client from being instantiated during hot-reloads in development
  if (!(global as any).prismaGlobal) {
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    (global as any).prismaGlobal = new PrismaClient({ adapter });
  }
  prisma = (global as any).prismaGlobal;
}

import { initDailyCronJob } from "./cron";

if (typeof window === "undefined") {
  try {
    initDailyCronJob();
  } catch (e) {
    console.error("[CRON] Failed to initialize daily cron:", e);
  }
}

export const db = prisma;
export default db;
