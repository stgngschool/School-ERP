// Prisma configuration file for schema, datasource, and seed settings.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || env("DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
  migrations: {
    seed: "npx tsx ./prisma/seed.ts",
  },
});
