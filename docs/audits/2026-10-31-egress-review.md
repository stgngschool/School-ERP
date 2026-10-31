# Egress source review — 31 October 2026

Scope: static review of the current working tree, including uncommitted work. No school API requests, database queries, exports, syncs, builds, migrations or production changes were run. This is a source-based risk ranking, not a measured bandwidth attribution or a claim that every runtime flow has been exercised. Session implementation remains deferred by the user.

## Findings and recommended order

### 1. High: full billing is automatically loaded after staff hydration

`src/context/AuthContext.tsx:959–973` schedules `loadFullBilling(false)` after staff hydration even if the user never opens a financial detail screen. That helper requests `/api/billing?all=true`. The API can return up to 15,000 charges, 6,000 discounts, 2,000 receipts with nested items, and 2,500 ledger rows, plus payment-allocation groups. The ten-minute client freshness guard and five-minute in-process server cache reduce repeats but do not eliminate the initial load or guarantee reuse across serverless instances.

Recommendation: replace the dashboard's detailed-data dependencies with small purpose-specific aggregates, then fetch detail only when a detail screen needs it. Do not simply remove this load: Overview, Defaulters and Ledger currently consume its data. Do not reduce row ceilings to make totals appear cheaper; that can silently truncate financial history.

### 2. High: daily full Google Sheets synchronization

`vercel.json` schedules `/api/cron/sync` daily. When authorized and a spreadsheet is configured, the route invokes `syncAllDataToSheet`. `src/lib/google.ts:241` loads all students with ledger entries and allocations; the same run loads receipts and all marks. Reusing the student fetch between two sheet tabs is already a useful optimization, but unchanged data is still read again on each run.

The full-sync manual cooldown is two minutes and checks the last completed timestamp. It is not a durable in-flight lock, so simultaneous requests can both pass. Separate directory/ledger/receipt/marks sync actions lack that full-sync cooldown. `src/lib/cron.ts` defines another scheduler, but no invocation was found; it is NOT confirmed to be running and must not be reported as a second active job.

Recommendation: preserve the school's backup/sync expectations; introduce a single scheduler, durable overlap protection and change detection. A genuine incremental sheet sync must handle deletions, reversals and corrections, not just append new rows. Verify production schedule/configuration before changing frequency.

### 3. High: receipt pagination does not bound payment-allocation groups

In `src/app/api/billing/route.ts:289–296,422–426`, `receiptItem.groupBy` is scoped to student IDs only when student IDs were supplied/resolved. An unscoped staff request such as `?page=1&limit=50`, a receipt search or a single-receipt lookup can therefore return allocation groups for the school, irrespective of receipt page size. This is Supabase-to-server transfer even when those rows are not sent to the browser. The cross-device probe uses this paginated endpoint after a change.

Recommendation: separate receipt-only retrieval from dues calculation; scope allocations to the charges actually needed by each operation. Preserve family receipt allocations, reversals and old dues in contract tests.

### 4. High on use: export fetches rich records before filtering

`src/app/api/export/route.ts:156` fetches students with full scalar fields, parent relations, charges and receipt allocations. Search filtering happens afterward in application memory. This shared fetch runs before export-type branching, rather than selecting database fields specifically for the directory, register or statement output.

Recommendation: branch by export type first, push search/class constraints into the database, select only output fields, and process complete results in bounded pages. A full financial export is intentionally large; pagination alone reduces peak memory, not total egress when every row is still required.

### 5. Medium: default student roster is unpaginated

`src/app/api/students/route.ts:77–80,127–132` applies `take` only when explicit pagination parameters exist. Login requests `/api/students` without them. The default projection is slimmer than a full student but still includes identity/contact/address fields. Five-minute process-local caching helps warm instances; new instances can repeat the full query.

Recommendation: define separate minimal search/roster and detail contracts; use bounded directory pages and server-side search while retaining complete counts and filters. Do not break components that currently search the full in-memory list. Shared cache changes need reliable cross-instance mutation invalidation and authorization isolation.

### 6. Medium: unrelated secondary data prefetch and retries

Staff hydration prefetches admissions, events, and for admins users/audits regardless of the selected screen. Admissions explicitly bypasses the client cache. `apiFetch` retries once on every non-OK status, including permanent 400/401/403 responses, and does not retain successful empty-array results. A browser timeout can prompt another request while the server's first database query is still running.

Recommendation: load secondary modules on demand; deduplicate concurrent identical reads; retry only transient failures with bounded backoff. Cache valid empty results for a short interval with proper mutation invalidation. Keep explicit errors distinct from successful empty data.

### 7. Medium: public result settings bypass existing config cache

`src/app/api/public/results/unit-1/route.ts` reads the entire SchoolConfig singleton directly in `getPortalConfig` for GET and POST, including when the portal is disabled. Other public settings/media paths already use the shared config cache.

Recommendation: reuse that settings cache and preserve immediate invalidation when public exam access changes. Existing POST failed-attempt blocking happens after the config read, so it does not prevent that read; review throttling placement as well. Do not publicly cache individual results or private student data.

### 8. Medium on use: attendance and related records are broader than the selected task

`refreshAttendance()` calls `/api/attendance` without selected date/class parameters. The route defaults to the academic-year date range and a 1,000-row first page; the console refresh repeats it. Teacher/parent scope exists, but staff scope remains school-wide. Leave uses `student.include.class`, and parent homework/leave lookup includes full student records just to obtain IDs/class IDs. Enquiries GET returns all enquiries without pagination. Marks export also loads full active student records with class relations.

Recommendation: date/class-scoped attendance with explicit historical navigation, narrow relation projections, and paginated enquiry lists. Verify attendance completeness: do not equate the first page with the entire year.

### 9. Conditional: Storage downloads and full backup

Photo upload accepts up to 2 MB and passes original bytes to storage. This route itself does not resize/compress; whether every upload caller compresses first was not established. Storage has a useful 30-day cache setting. Actual photo sizes, downloaded bytes and cache-hit rates are not measured.

`backupDatabaseToDrive` explicitly reads whole tables. This is an on-demand large transfer, not a confirmed recurring job. Its JSON table collection is not evidence of a complete, restorable PostgreSQL backup. Never disable necessary backups or remove backup data just to reduce egress.

Recommendation: inspect representative existing media metadata without bulk downloads; optimize future images with suitable dimensions/quality and versioned URLs. Coordinate backup frequency deliberately and verify restore coverage separately.

## Existing protections to keep

- Durable tagged caches for SchoolConfig, active academic session and staff billing summary.
- Small database aggregates for summary totals instead of transferring all financial rows for those totals.
- Student-targeted billing refresh after fee collection, including sibling IDs.
- Three-minute summary probe skips hidden tabs; tab focus revalidates authentication without rehydrating all school data.
- Student/billing in-process caches, lightweight projections and lazy attendance loading.
- Storage cache headers and local static assets; local assets do not themselves imply Supabase Storage traffic.
- Auth revocation checks select only status/token version and have a short cache. Do not weaken authentication to save small responses.

## Measurement and release requirements

No monthly used/remaining quota, production traffic frequency, database result byte size, cache-hit rate or deployed-code equivalence was established. Source comments estimating KB/MB are not measurements. Ranking can change after usage attribution.

Official source: https://supabase.com/docs/guides/platform/manage-your-usage/egress (checked 31 October 2026). Database results sent to the application server count toward egress; Supavisor traffic is reported as Shared Pooler Egress. Reducing browser JSON after fetching full database rows does not undo that transfer. Organization usage can include multiple projects. Cached and uncached allowances are separate; check both and the actual billing cycle.

Next measurement should read the organization's Usage service breakdown and daily trend, then if needed return only compact aggregated query-call/row statistics. Do not download tables or run heavy endpoints to measure them. Never log student/parent information, credentials or raw payment payloads. Response JSON bytes are only an application-side proxy, not Supabase's exact metered bytes.

Suggested implementation sequence: receipt-only queries and public config-cache reuse; remove unnecessary export fetches/projections; dashboard aggregate contracts and demand-based hydration; coordinated sync improvements; scoped rosters/attendance and media optimization. Stage separately from deferred session work. Verify offline fixtures first, then minimal authorized production smoke checks. Preserve monetary totals, family receipts, reversals, history and permissions.
