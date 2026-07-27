import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let basePrisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

const poolConfig = {
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
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
        let rowsReturned = 0;
        let queryError: any = null;
        try {
          const result = await query(args);
          if (Array.isArray(result)) {
            rowsReturned = result.length;
          } else if (result && typeof result === "object") {
            rowsReturned = 1;
          }
          return result;
        } catch (err: any) {
          queryError = err;
          throw err;
        } finally {
          const duration = (performance.now() - start).toFixed(2);
          if (queryError) {
            console.error(`[DIAGNOSTIC][DB][ERROR] ${model}.${operation} | duration: ${duration}ms | error: ${queryError.message}`);
          } else {
            console.log(`[DIAGNOSTIC][DB][QUERY] ${model}.${operation} | duration: ${duration}ms | rowsReturned: ${rowsReturned}`);
          }
        }
      },
    },
  },
});

import { initDailyCronJob } from "./cron";

if (typeof window === "undefined") {
  try {
    initDailyCronJob();
  } catch (e) {
    console.error("[CRON] Failed to initialize daily cron:", e);
  }
}

export const db = prismaWithLogging as unknown as PrismaClient;
export default db;

