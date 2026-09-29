import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

// In Prisma 7, adapter is strictly required. 
// Connection pool optimized for Supabase Supavisor (Port 6543 Transaction Pooler):
// - max: 3 connections per serverless container to prevent burst connection spikes
// - idleTimeoutMillis: 30000 (30s) keeps warm sockets alive across user clicks to reuse TLS handshake
// - connectionTimeoutMillis: 10000
const poolConfig = {
  connectionString,
  max: 3,
  idleTimeoutMillis: 30000,
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
  // Catch idle client connection errors (e.g. ECONNRESET on serverless unfreeze)
  // to prevent unhandled EventEmitter crash of the Node.js process.
  globalForDb.pgPoolGlobal.on("error", (err) => {
    console.warn("[DB] Idle pool client error (non-fatal):", err.message);
  });
}
if (!globalForDb.prismaGlobal) {
  const adapter = new PrismaPg(globalForDb.pgPoolGlobal);
  globalForDb.prismaGlobal = new PrismaClient({ adapter });
}
const basePrisma = globalForDb.prismaGlobal;

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

