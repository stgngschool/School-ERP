// Prisma configuration file for schema, datasource, and seed settings.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL") || env("DATABASE_URL"),
  },
  migrations: {
    seed: "npx tsx ./prisma/seed.ts",
  },
});
