-- AT-04: Add updatedAt column to Attendance table for optimistic concurrency control.
-- Existing rows are backfilled with NOW() (non-destructive, backward-compatible).
-- Prisma's @updatedAt mechanism sets this automatically on every upsert/update.
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
