-- A-01: Create LoginAttempt table for DB-backed, cross-instance rate limiting.
-- A-02: Add tokenVersion column to User for server-side session revocation.
--
-- Safe to run on a live production database — purely additive:
--   • New table with no FK constraints on existing tables.
--   • New column with DEFAULT 1 (all existing users get version 1 immediately,
--     matching tokens already in circulation which will also carry version 1
--     after the application code is deployed).
--
-- Run this migration BEFORE deploying the updated application code.

-- ── A-02: tokenVersion on User ────────────────────────────────────────────────
-- DEFAULT 1 matches the starting tokenVersion baked into all existing tokens
-- (they are re-issued with tokenVersion=1 after the first login post-deploy).
-- Existing tokens have no tokenVersion claim → getAuthUser treats them as
-- version 0 and rejects them, forcing a re-login. This is safe because:
--   • It only affects users who already have a live session at deploy time.
--   • They simply have to log in again once — a one-time minor inconvenience.
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1;

-- ── A-01: LoginAttempt table ─────────────────────────────────────────────────
-- One row per IP. Keyed by IP (TEXT PRIMARY KEY). The count is incremented
-- atomically via INSERT ... ON CONFLICT DO UPDATE inside checkLoginRateLimit().
-- windowStart records when the current rate-limit window started.
CREATE TABLE IF NOT EXISTS "LoginAttempt" (
    "ip"          TEXT        NOT NULL,
    "count"       INTEGER     NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("ip")
);

-- Optional cleanup index to support future TTL-based purge queries
CREATE INDEX IF NOT EXISTS "LoginAttempt_windowStart_idx" ON "LoginAttempt" ("windowStart");
