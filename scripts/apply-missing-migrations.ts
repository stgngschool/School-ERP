import db from "../src/lib/db";

async function applyMissingMigrations() {
  console.log("Applying missing migrations to production DB...");

  // A-02: tokenVersion on User (safe, ADD COLUMN IF NOT EXISTS)
  await db.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1`
  );
  console.log("✅ Applied: User.tokenVersion");

  // A-01: LoginAttempt table
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LoginAttempt" (
      "ip"          TEXT        NOT NULL,
      "count"       INTEGER     NOT NULL DEFAULT 0,
      "windowStart" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("ip")
    )
  `);
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LoginAttempt_windowStart_idx" ON "LoginAttempt" ("windowStart")`
  );
  console.log("✅ Applied: LoginAttempt table");

  // Check if any other commonly-needed columns are missing from the DB-01 thru DB-11 migration
  // (these were found to be applied in previous sessions, but validate tokenVersion was the only gap)
  const result = await db.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY column_name`
  );
  console.log("User columns after migration:", JSON.stringify(result));

  await db.$disconnect();
}

applyMissingMigrations().catch((e) => { console.error(e); process.exit(1); });
