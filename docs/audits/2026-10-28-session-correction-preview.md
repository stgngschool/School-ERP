# Session correction preview — 28 October 2026

Status: READ-ONLY PREVIEW. No application changes, database writes, promotion, fee regeneration, or migration performed.

## Source and snapshot

- Connected Supabase project: school-erp; matched to the local environment's project reference.
- Organization plan: Free, confirmed through the connected Supabase account.
- Baseline captured: 2026-10-28T14:11:55.073255 Asia/Kolkata.
- Integrity checks captured separately at 2026-10-28T08:42:29.387065+00:00 UTC.
- Each query used a repeatable-read, read-only transaction with a 20-second statement timeout.
- Live school activity can change values between snapshots. Re-capture immediately before any approved correction.
- Only aggregates, class counts and content fingerprints were returned. No student names, phone numbers, passwords, individual receipts or full ledger exports were downloaded.

## Backup availability: NOT VERIFIED

The available connector can inspect the project and run SQL, but cannot list downloadable backups or restore points.

Official Supabase documentation recommends off-site database exports for Free projects. A healthy project is not evidence of a usable backup.
Source: https://supabase.com/docs/guides/platform/backups

Local checks found no pg_dump, pg_restore or Supabase CLI on PATH, and no backup matching *.dump, *.backup, *backup*.sql or *.sql.gz in the scanned workspace. This does not rule out backups elsewhere.
Docker is installed, but its Linux engine was not running/reachable. No software was installed and no service was started.

No backup was created, and no restore test was performed.
The JSON baseline and SQL queries below ARE NOT a recoverable database backup.

Before live corrections:
1. Obtain a PostgreSQL-compatible logical backup of schema, data and required permissions.
2. Store it outside Git in a protected location, record its size and checksum, and verify a restore in an isolated local database.
3. Include relevant storage objects separately if a full project recovery is required; database dumps do not contain uploaded file contents.
4. Re-capture the baseline and correction candidates just before execution. A backup made earlier does not include subsequent school transactions.

## Current session and enrollments

- Current: 2026-2027 (1 April 2026 through 31 March 2027).
- Historical: 2025-2026, inactive.
- Exactly one current session exists.
- All 625 students are ACTIVE; StudentSession has zero rows.
- All current student classes exist and are ACTIVE.
- One class/roll-number combination is duplicated. Preserve existing roll numbers and flag the conflict; do not silently renumber students.

### Proposed enrollment preview

Create current-session enrollment rows using each student's existing class and roll number, after confirming those classes represent the current year. This is enrollment initialization, not promotion.

| Class | Section | Students missing current enrollment |
|---|---|---:|
| 1 | A | 53 |
| 2 | A | 69 |
| 3 | A | 58 |
| 4 | A | 63 |
| 5 | A | 74 |
| 6 | A | 60 |
| 7 | A | 54 |
| 8 | A | 40 |
| KG | A | 22 |
| LKG | A | 62 |
| UKG | A | 70 |

Expected additions: 625 enrollment rows if the source data is unchanged.
Student IDs, admission numbers, class assignments, roll numbers, family links and existing financial records must remain unchanged.
Do not reconstruct historical classes from current classes; the historical enrollment evidence has not been established.

## Financial baseline

Amounts below are rupees, converted from integer paisa solely for display.

| Record | Rows | Signed amount |
|---|---:|---:|
| Ledger CHARGE | 10786 | 74,53,311.00 |
| Ledger DISCOUNT | 2066 | -13,08,898.00 |
| Ledger PAYMENT | 2481 | -18,57,245.00 |
| Active receipts | 1,667 | 18,57,245.00 |
| Receipt allocations | 2,481 | 18,57,245.00 |

These are whole-ledger totals, not a calculation of presently due fees. Future instalments and concessions require separate due-date accounting.

Checked invariants:
- Every active receipt's total equals its receipt allocations: 0 mismatches.
- Payment ledger totals match receipt allocations per receipt and student: 0 mismatches.
- No PAYMENT entry has a missing receipt reference.
- No receipt allocation points to a non-CHARGE ledger entry.
- These checks establish arithmetic consistency for these relationships, not a complete accounting audit or proof every school collection was entered.

## Proposed missing-session corrections

No correction has been applied.

| Category | Missing session | Preview result | Proposed treatment |
|---|---:|---|---|
| PAYMENT | 1,193 | All have receipt items and one linked charge session; same-student matches found | Candidate to link to 2026-2027 after per-row validation |
| DISCOUNT | 516 | Each matches exactly one same-student charge by normalized description; all charge sessions are 2026-2027 | Candidate to link to 2026-2027 after reviewed mapping |
| Attendance | 623 | All dates fall in the current session period | Candidate to link to 2026-2027 after checking enrollment |
| Marks | 4,033 total | Already linked to 2026-2027 in preceding read-only inspection | Preserve |

Important: 462 missing-session payment rows belong to receipts containing another student's charge items as well. These can be family receipts. Never infer a payment's student from the receipt's primary student or move all items indiscriminately; use the ledger student and matching receipt allocations.

Discount description matching is a preview heuristic, not a durable foreign key. Store an exact ID-to-session reviewed mapping before applying changes.

## The 161 year-mismatch charges

All 161 charges with 2025-2026 in their description and 2026-2027 as their linked session are labelled "previous session".
Combined face amount: INR 9,50,611.00 (not necessarily outstanding after payments/discounts).

This changes the interpretation of the earlier code review: these are plausible brought-forward dues, not confirmed misassigned ordinary annual/monthly charges.

Proposed treatment:
- Preserve these charges, amounts, receipt allocations and current links pending a specific legacy-dues decision.
- Display them as previous-session dues when needed.
- Do not create another opening charge for the same balance.
- Do not shift them to 2025-2026 using the year in the description alone.
- Any later origin-session metadata must preserve the original charge identity and all payment/discount references.

## Late fees

Database setting enableLateFee is already false.
Preserve that value. A later software change should make frontend defaults and error fallbacks consistently OFF.
Do not remove old posted transactions as a side effect of disabling automatic late fees.

## Correction execution contract (future, separately reviewed)

1. Verify a recoverable backup first.
2. Produce exact record mappings and compare source fingerprints immediately before updating.
3. Abort on unexpected session count, class changes, duplicate target enrollments or changed financial sources.
4. Insert enrollment links and update only approved missing session fields. Do not regenerate fees or create payments.
5. Run small bounded transactions with expected-row-count checks; fail safely if sources have changed.
6. Compare receipt, allocation, marks and student fingerprints; they must remain unchanged.
7. For ledger rows, expect only approved sessionId changes; compare all other fields and signed amounts to the pre-update mapping.
8. Preserve a before-image for each modified row for a reviewed rollback; do not run a whole-database restore over new live school transactions.
9. Invalidate affected application caches only after a successful correction.

## Egress

Database-side aggregates and fingerprints avoided returning complete tables. Re-running this preview is on demand, not a polling job.
This audit does not measure the project's monthly egress or remaining quota.
A real backup transfers database contents once and has a different cost from this small aggregate preview.

## Saved evidence

These local files are in the Git-ignored scratch folder:
- scratch/session-audit-2026-10-28/baseline.json
- scratch/session-audit-2026-10-28/integrity.json
- scratch/session-audit-2026-10-28/preview.sql
- scratch/session-audit-2026-10-28/integrity.sql

Content fingerprints detect changed snapshot contents; they are not restore data or an independent backup.
