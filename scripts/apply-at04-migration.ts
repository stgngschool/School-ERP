import db from "../src/lib/db";

async function applyMigration() {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    console.log("Migration applied: Attendance.updatedAt column added (or already existed).");
  } catch (e: any) {
    console.error("Migration error:", e?.message || e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

applyMigration();
