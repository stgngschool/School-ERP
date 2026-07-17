import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let prisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

if (process.env.NODE_ENV === "production") {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances of Prisma Client from being instantiated during hot-reloads in development
  if (!(global as any).prismaGlobal) {
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    (global as any).prismaGlobal = new PrismaClient({ adapter });
  }
  prisma = (global as any).prismaGlobal;
}

export const db = prisma;
export default db;
