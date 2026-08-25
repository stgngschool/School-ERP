-- S-01 / S-02 / LF-01 fix: Seed ReceiptCounter rows for admission numbers, family codes,
-- and roll numbers. These reuse the existing ReceiptCounter table (created by B-01 migration)
-- with different prefix values.
--
-- Safe to run on a live database:
--   - ON CONFLICT DO NOTHING: idempotent, safe to run multiple times.
--   - No data changes to existing tables.
--
-- After this migration, concurrent calls to getNextAdmissionNumber / getNextFamilyCode /
-- getNextRollNumber receive unique numbers via UPDATE ... RETURNING row locks.

-- Seed ADM-<year>- counter from existing Student admissionNumber values
INSERT INTO "ReceiptCounter" ("prefix", "value")
SELECT
    'ADM-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' AS prefix,
    COALESCE(
        MAX(
            CAST(
                SUBSTRING("admissionNumber" FROM 'ADM-[0-9]{4}-([0-9]+)') AS INT
            )
        ),
        0
    ) AS value
FROM "Student"
WHERE "admissionNumber" LIKE 'ADM-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%'
ON CONFLICT ("prefix") DO NOTHING;

-- Seed FAM-<year>- counter from existing ParentProfile familyCode values
INSERT INTO "ReceiptCounter" ("prefix", "value")
SELECT
    'FAM-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' AS prefix,
    COALESCE(
        MAX(
            CAST(
                SUBSTRING("familyCode" FROM 'FAM-[0-9]{4}-([0-9]+)') AS INT
            )
        ),
        0
    ) AS value
FROM "ParentProfile"
WHERE "familyCode" LIKE 'FAM-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%'
ON CONFLICT ("prefix") DO NOTHING;

-- Note: ROLL-<classId>- counter rows are created lazily on first admission to each
-- class (seeded from COUNT(*) in Student WHERE classId = <id>). No pre-seeding
-- needed here because each class counter is independent and the seed path is safe
-- under concurrent requests (INSERT ... ON CONFLICT DO NOTHING).
