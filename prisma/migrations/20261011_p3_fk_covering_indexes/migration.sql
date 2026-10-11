-- ── P3: Covering indexes for previously-unindexed foreign keys (Supabase advisor 0001).
--
-- Student.concessionId, Student.transportStopId and Class.classTeacherId had no covering
-- index, so FK joins / cascades / SetNull deletes fall back to sequential scans. These
-- tables are small today (Student ~624 rows, Class ~17), so a plain CREATE INDEX takes a
-- lock for only a few milliseconds and is safe to apply during normal hours.
--
-- If you prefer a strictly ZERO-lock application on a busy production database, DO NOT run
-- this migration through `prisma migrate` (its wrapping transaction forbids CONCURRENTLY).
-- Instead run the following three statements manually (e.g. Supabase SQL editor), one by one:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Student_concessionId_idx"    ON "Student"("concessionId");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Student_transportStopId_idx" ON "Student"("transportStopId");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Class_classTeacherId_idx"    ON "Class"("classTeacherId");
-- ...then mark this migration applied with: npx prisma migrate resolve --applied 20261011_p3_fk_covering_indexes

CREATE INDEX IF NOT EXISTS "Student_concessionId_idx" ON "Student"("concessionId");
CREATE INDEX IF NOT EXISTS "Student_transportStopId_idx" ON "Student"("transportStopId");
CREATE INDEX IF NOT EXISTS "Class_classTeacherId_idx" ON "Class"("classTeacherId");
