import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let basePrisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

// In Prisma 7, adapter is strictly required. 
// We use a safe connection pool per instance to prevent exhausting Supavisor session limit while supporting concurrent dashboard requests.
const poolConfig = {
  connectionString,
  max: 10, // Optimized per serverless instance to prevent exhausting Supabase pooler limit during multi-teacher peaks
  idleTimeoutMillis: 20000, // Closes idle connections after 20s to conserve DB resources
  connectionTimeoutMillis: 15000, // Generous wait threshold to smoothly queue during brief concurrency bursts
};

// Re-use global singleton across both development and warm production serverless invocations
if (!(global as any).prismaGlobal) {
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  (global as any).prismaGlobal = new PrismaClient({ adapter });
}
basePrisma = (global as any).prismaGlobal;

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

export const db = prismaWithLogging as unknown as PrismaClient;
export default db;
