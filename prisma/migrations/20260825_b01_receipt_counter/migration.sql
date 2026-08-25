-- B-01 Fix: Add ReceiptCounter table for atomic receipt number generation.
-- Safe to run on a live production database (purely additive — no data changes).
-- Run this BEFORE deploying the updated application code.

CREATE TABLE IF NOT EXISTS "ReceiptCounter" (
    "prefix" TEXT NOT NULL,
    "value"  INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("prefix")
);

-- Seed the counter from existing receipts so numbering continues correctly.
-- Uses INSERT ... ON CONFLICT DO NOTHING so this is idempotent (safe to run multiple times).
INSERT INTO "ReceiptCounter" ("prefix", "value")
SELECT
    'REC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' AS prefix,
    COALESCE(
        MAX(
            CAST(
                SUBSTRING("receiptNumber" FROM 'REC-[0-9]{4}-([0-9]+)') AS INT
            )
        ),
        0
    ) AS value
FROM "Receipt"
WHERE "receiptNumber" LIKE 'REC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%'
ON CONFLICT ("prefix") DO NOTHING;
