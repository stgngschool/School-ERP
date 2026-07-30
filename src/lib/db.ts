import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { initDailyCronJob } from "./cron";

let basePrisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

// In Prisma 7, adapter is strictly required. 
// We use a small connection pool per instance to prevent exhausting Supavisor session limit.
const poolConfig = {
  connectionString,
  max: 1, // Restrict to 1 connection per worker to drastically reduce global connection count
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
};

if (process.env.NODE_ENV === "production") {
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  basePrisma = new PrismaClient({ adapter });
} else {
  if (!(global as any).prismaGlobal) {
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    (global as any).prismaGlobal = new PrismaClient({ adapter });
  }
  basePrisma = (global as any).prismaGlobal;
}

const prismaWithLogging = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        let queryError: any = null;
        try {
          return await query(args);
        } catch (err: any) {
          queryError = err;
          throw err;
        } finally {
          const duration = (performance.now() - start).toFixed(2);
          if (queryError) {
            console.error(`[DIAGNOSTIC][DB][ERROR] ${model}.${operation} | duration: ${duration}ms | error: ${queryError.message}`);
          }
        }
      },
    },
  },
});

if (typeof window === "undefined") {
  try {
    initDailyCronJob();
  } catch (e) {
    console.error("[CRON] Failed to initialize daily cron:", e);
  }
}

export const db = prismaWithLogging as unknown as PrismaClient;
export default db;
