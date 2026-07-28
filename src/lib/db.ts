import { PrismaClient } from "@prisma/client";
import { initDailyCronJob } from "./cron";

let basePrisma: PrismaClient;

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

// Automatically append required Supavisor (pgBouncer) flags for transaction pooler
if (connectionString.includes("pooler.supabase.com") && connectionString.includes(":6543")) {
  if (!connectionString.includes("pgbouncer=true")) {
    connectionString += (connectionString.includes("?") ? "&" : "?") + "pgbouncer=true&connection_limit=5";
  }
}

// Ensure Prisma picks up the patched URL
process.env.DATABASE_URL = connectionString;

if (process.env.NODE_ENV === "production") {
  basePrisma = new PrismaClient();
} else {
  if (!(global as any).prismaGlobal) {
    (global as any).prismaGlobal = new PrismaClient();
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
