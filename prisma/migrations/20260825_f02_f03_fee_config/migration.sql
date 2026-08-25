-- F-02: Prevent duplicate FeeStructures for the same class
-- F-03: Ensure FeeAssignment has ON DELETE CASCADE on feeStructureId

BEGIN;

-- 1. Create unique index on FeeStructure(name, className)
CREATE UNIQUE INDEX IF NOT EXISTS "FeeStructure_name_className_key" ON "FeeStructure"("name", "className");

-- 2. Update FeeAssignment FK to cascade delete on feeStructure
ALTER TABLE "FeeAssignment"
    DROP CONSTRAINT IF EXISTS "FeeAssignment_feeStructureId_fkey";

ALTER TABLE "FeeAssignment"
    ADD CONSTRAINT "FeeAssignment_feeStructureId_fkey"
    FOREIGN KEY ("feeStructureId")
    REFERENCES "FeeStructure"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

COMMIT;
