-- DB-01: LedgerEntry.referenceId FK to Receipt with ON DELETE SET NULL and index
-- DB-06: AcademicSession.isCurrent index
-- DB-07: FeeAssignment.studentId index
-- DB-08: LedgerEntry[studentId, entryType, createdAt] composite index
-- DB-09: Concession.percentage Int -> Double Precision (Float)
-- DB-10: Attendance.markedBy FK to User with ON DELETE RESTRICT and index
-- DB-11: Mark session scoping (sessionId NOT NULL with FK to AcademicSession and unique(studentId, sessionId, subject, examName))
--
-- ALL CHANGES ARE SAFE FOR PRODUCTION DATA:
--   • Concession.percentage cast preserves all existing integer values exactly.
--   • Mark.sessionId is backfilled using the current active AcademicSession before NOT NULL is set.
--   • FK additions check referential integrity (verified 0 orphans in pre-audit).

BEGIN;

-- ── DB-01: LedgerEntry.referenceId FK and index ──────────────────────────────
ALTER TABLE "LedgerEntry"
    DROP CONSTRAINT IF EXISTS "LedgerEntry_referenceId_fkey";

ALTER TABLE "LedgerEntry"
    ADD CONSTRAINT "LedgerEntry_referenceId_fkey"
    FOREIGN KEY ("referenceId")
    REFERENCES "Receipt"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "LedgerEntry_referenceId_idx" ON "LedgerEntry"("referenceId");

-- ── DB-06: AcademicSession.isCurrent index ───────────────────────────────────
CREATE INDEX IF NOT EXISTS "AcademicSession_isCurrent_idx" ON "AcademicSession"("isCurrent");

-- ── DB-07: FeeAssignment.studentId index ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS "FeeAssignment_studentId_idx" ON "FeeAssignment"("studentId");

-- ── DB-08: LedgerEntry composite index ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS "LedgerEntry_studentId_entryType_createdAt_idx" ON "LedgerEntry"("studentId", "entryType", "createdAt");

-- ── DB-09: Concession.percentage Float precision ─────────────────────────────
ALTER TABLE "Concession"
    ALTER COLUMN "percentage" TYPE DOUBLE PRECISION
    USING "percentage"::DOUBLE PRECISION;

-- ── DB-10: Attendance.markedBy FK and index ──────────────────────────────────
ALTER TABLE "Attendance"
    DROP CONSTRAINT IF EXISTS "Attendance_markedBy_fkey";

ALTER TABLE "Attendance"
    ADD CONSTRAINT "Attendance_markedBy_fkey"
    FOREIGN KEY ("markedBy")
    REFERENCES "User"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Attendance_markedBy_idx" ON "Attendance"("markedBy");

-- ── DB-11: Mark session-scoping and unique constraint ────────────────────────
-- 1. Backfill existing Mark rows where sessionId is NULL to the current active session
UPDATE "Mark"
SET "sessionId" = (SELECT "id" FROM "AcademicSession" WHERE "isCurrent" = true LIMIT 1)
WHERE "sessionId" IS NULL;

-- 2. Make sessionId NOT NULL
ALTER TABLE "Mark"
    ALTER COLUMN "sessionId" SET NOT NULL;

-- 3. Update FK constraint on Mark.sessionId
ALTER TABLE "Mark"
    DROP CONSTRAINT IF EXISTS "Mark_sessionId_fkey";

ALTER TABLE "Mark"
    ADD CONSTRAINT "Mark_sessionId_fkey"
    FOREIGN KEY ("sessionId")
    REFERENCES "AcademicSession"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- 4. Replace old unique constraint with session-scoped unique constraint
DROP INDEX IF EXISTS "Mark_studentId_subject_examName_key";

CREATE UNIQUE INDEX "Mark_studentId_sessionId_subject_examName_key"
    ON "Mark"("studentId", "sessionId", "subject", "examName");

CREATE INDEX IF NOT EXISTS "Mark_studentId_idx" ON "Mark"("studentId");

COMMIT;
