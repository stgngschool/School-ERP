import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let basePrisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

// In Prisma 7, adapter is strictly required. 
// Safe connection pool optimized for Supabase Supavisor (Free/Nano tier):
// - max: 5 connections per Node instance to stay well below the 200 client limit
// - idleTimeoutMillis: 3000 (3s) so idle connections are quickly released back to Supavisor
// - connectionTimeoutMillis: 10000
const poolConfig = {
  connectionString,
  max: 5,
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 10000,
};

// Re-use global singleton across development hot-reloads and warm serverless invocations
const globalForDb = globalThis as unknown as {
  prismaGlobal?: PrismaClient;
  pgPoolGlobal?: pg.Pool;
  prismaWithLoggingGlobal?: PrismaClient;
};

if (!globalForDb.pgPoolGlobal) {
  globalForDb.pgPoolGlobal = new pg.Pool(poolConfig);
}
if (!globalForDb.prismaGlobal) {
  const adapter = new PrismaPg(globalForDb.pgPoolGlobal);
  globalForDb.prismaGlobal = new PrismaClient({ adapter });
}
basePrisma = globalForDb.prismaGlobal;

if (!globalForDb.prismaWithLoggingGlobal) {
  globalForDb.prismaWithLoggingGlobal = basePrisma.$extends({
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
  }) as unknown as PrismaClient;
}

export const db = globalForDb.prismaWithLoggingGlobal;
export default db;

