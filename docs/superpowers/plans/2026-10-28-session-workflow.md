# Session Workflow Implementation Plan

> Execute inline using superpowers:executing-plans. User has authorized implementation; no further permission checkpoint for local work.

**Goal:** Safe future-session preparation, explicit fee setup and activation without changing production data during development.

**Architecture:** Testable session service with injected Prisma client; pure planning/fee-scope helpers; admin routes and an existing-design management panel. Development preview uses synthetic data only.

**Tech Stack:** Next.js 16.3.4, React 19, Prisma 7/PostgreSQL; Node tests through tsx.

**Spec:** ../specs/2026-10-28-session-workflow-design.md

## Global constraints

No live writes or migrations. Preserve student/financial history. Default late fees OFF. No automatic charge generation on promotion, activation or fee-template save. Bound class roster and batch sizes; no polling. Reuse current checkout; preserve pre-existing public/sw.js and audit artifacts.

## Review focus

- Missing current enrollment blocks promotion, never silently initializes legacy data.
- Concurrent/stale activation and changed previews cannot overwrite current classes.
- Returning students do not receive another one-time admission charge.
- Prior-session fees cannot be read or written through current-session defaults.
- Demo UI cannot touch live database or authenticated APIs.

## Tasks

- [x] 1. Write failing fixture tests for session dates, promotion/repeat/left planning, idempotency/conflicts, activation readiness and per-session fee isolation. Implement pure helpers and transactional service; verify rollback through an injected in-memory client.
- [x] 2. Wire sessions/promotion routes with role/CSRF validation, explicit preview/save actions, bounded rosters and cache invalidation. Disable the legacy class-only promotion endpoint.
- [x] 3. Add session-scoped fee setup, explicit generation, correct generator session resolution and one-time charge deduplication. Remove automatic background generation from fee-template changes. Add failing regressions before fixes.
- [x] 4. Add management panel and synthetic development preview; link admin navigation and old promotion actions. Default late fee OFF and correct date calculation. Preserve incumbent UI.
- [x] 5. Run dummy-data tests, TypeScript and targeted ESLint. Inspect demo desktop/mobile renders, review changes and document limitations. No tests that insert live fixtures.

## Execution ledger

- Read Next.js bundled route-handler guide before code edits.
- Baseline: existing public/sw.js modified; docs/audits untracked. Existing lint has many unrelated failures; use targeted lint plus TypeScript.
- Ruling: use existing checkout to keep the user's running localhost workspace coherent; no branch or worktree mutation needed.

- Verification: 26/26 offline session tests pass via npm run test:sessions; TypeScript and targeted ESLint pass. Local demo returns HTTP 200; credential-free session/promotion/fee/summary/roster endpoints return 401.
- Browser: sample prepare/save, template copy and activation confirmed; narrow and wider layouts inspected; Impeccable detector returned no findings. Development preview left open with sample Class 4-A.
- Review: independent read-only review found and resolved shared fee-head edits, enrollment synchronization, import/approval races, stale edit intent and concurrent payment/generation risks.
- Ruling: READ COMMITTED plus the common transaction advisory lock is used for workflow writers. This ensures reads after acquiring a contended lock see the previous holder's commits; Serializable can establish a snapshot before the wait and miss them.
- Ruling: historical fee generation is blocked rather than recalculating historical concessions from present student settings.
- No live database mutations, schema migrations, deployment, branch changes or commits performed. Existing baseline correction and backup/restore verification remain separate work.
- Limits: real PostgreSQL concurrency/load tests and production build/deploy remain unverified; per-session marksheet-claim status and undo of saved preparation are outside this implementation.
