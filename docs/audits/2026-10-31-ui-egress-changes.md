# Local UI and egress changes — 31 October 2026

User correction: the summary gateway described below was removed. Admin and accountant now render their original dashboards directly, automatically loading details within the screen and retaining freshness/in-flight guards. Their detail loading flags no longer treat the summary response as complete detail. Navigation screens remain visible while loading; refresh failures show an inline retry message. The unused gateway stylesheet was deleted. This correction supersedes the earlier explicit-open dashboard behavior and its synthetic gateway screenshots.

Implemented against the existing working tree. No commit, push, deployment, live database query, migration, backup, school API request or Google sync was executed for this work. Earlier uncommitted session work remains preserved; its navigation and stale saved tab are hidden/held rather than activated.

## Changes

- Header search includes family codes and numeric roll numbers, keyboard selection and exact student profile opening. Admin/accountant directory labels are more readable and connected to inputs.
- Suspend/Left actions use a shared native dialog with cancellation, focus management, pending protection and visible errors. Status updates show explicit success/failure and invalidate local student reads after success.
- A staff dashboard initially shows masked lightweight summary amounts. Detailed dashboard data is requested explicitly. Collection, directory, ledger and defaulters screens load required details before mounting, so unloaded data is not presented as zero dues. Other modules avoid that full-school request.
- Admissions, admin users/audits and calendar prefetches now follow the selected screen. Admissions refresh clears the new cached snapshot after mutations.
- Concurrent identical GETs share in-flight work within the provider; cache invalidation advances a generation so post-mutation reads do not share a pre-mutation promise. Permanent HTTP failures are not retried. Successful empty data can be cached. Failed student-specific refreshes retain prior balances.
- Payment-allocation grouping is restricted to the charges returned for that request. All active receipts paying those charges remain included, including family payments and previous dues.
- Failed display refreshes do not turn committed imports/admissions/student creation into failed saves. The detailed-data loading boundary still gets explicit refresh failures to offer Retry.
- Public result configuration reuses the existing tagged settings cache.
- Export search is narrowed within authorization before fetching financial details; literal wildcard input is escaped. Unicode input conservatively retains the authorized scope and exact JavaScript matching. Type-specific field selection and cursor batches preserve complete outputs and monetary allocations.
- Homework/leave/marks relations select only consumed fields.
- Google directory-only sync uses narrow profiles and grouped totals. Combined full sync still reuses one detailed student fetch. Seven sync actions coalesce duplicate calls and retain successful completions for two minutes within a warm process; failures do not falsely report success. Backups and the Vercel schedule remain unchanged.
- Default slim roster queries use a tagged durable cache keyed by resolved authorization scope and pagination. Post-completion invalidation covers student, bulk, family, user and concession mutations. Full-detail reads retain their existing local cache; parent keys distinguish projection and pages.
- Attendance reads follow selected class/day or month, with authorization intersection and complete paginated loading. Changing selection requires loading that selection; stale requests do not mark another selection ready. Merging preserves other cached dates/classes.
- Removed `src/lib/cron.ts`: repository reference search found no caller. The configured Vercel daily sync remains. Audit evidence, tests, active re-export components and pending session files were retained.

## Verification

Final integrated verification: 57/57 offline fixture tests passed; full TypeScript checking passed; new helpers/components/tests passed targeted ESLint; `git diff --check` passed (existing line-ending conversion notices only). Local Node entrypoints were used because the host npm/npx launchers point at missing installation files. No dependency installation or machine configuration change was made.

Synthetic browser QA bundles the real new dashboard boundary/dialog with a fake auth context and synthetic totals; it never imports the school auth/database providers. Chromium checked the summary → detail transition (no eager request), duplicate confirm protection and failed confirmation retaining the dialog/error. Dashboard desktop and narrow content screenshots were inspected. This is not a logged-in end-to-end production test, physical-device test or full-app visual audit.

New modules pass targeted lint. Legacy edited components/routes have pre-existing lint debt (particularly explicit-any); no repository-wide clean-lint claim is made. The Impeccable scan found an incumbent indigo heading warning; existing visual identity was retained.

## Limits and follow-up

No measured monthly egress or savings guarantee. Full exports and required backups inherently transfer their complete selected data. Daily Google sync still reads a complete snapshot when it runs: the guard is process-local, not a durable distributed lock or incremental replication. Do not skip a sync based only on counts/latest timestamps because historical corrections/deletions could be missed.

Student lists retain the complete consumer contract rather than silently truncating to a first page. A complete application-wide paginated roster/search redesign, purpose-specific detailed dashboard aggregates, enquiry pagination, existing-media size audit/compression and durable cross-instance sync coordination remain larger follow-ups. No old student photo or financial record was rewritten/deleted to save bandwidth. Production build and deployment were not performed; review the combined working tree before releasing because it includes earlier session-related changes.
