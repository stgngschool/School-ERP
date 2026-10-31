# Session and promotion workflow

Local implementation, 28 October 2026. No Supabase migration, backfill, promotion, payment or other production write was executed during this work.

## Try the isolated preview

Run `npm run dev`, then open `http://127.0.0.1:3000/session-preview`.

This development-only page bypasses the app's auth provider and PWA initialization. Its sample students, fee templates, decisions and activation are held in memory. Its operations never call the school's API or Supabase. Refresh resets the sample data. Production responds with 404.

## Admin workflow

Open **Session & Promotion** in the admin navigation. Old Student Directory promotion buttons now open this workflow instead of changing classes immediately.

1. Create a future April–March academic session. Creation never activates it.
2. Select the next session and a current class. Rosters load only that class, with at most 100 students per page.
3. Choose Promote, Repeat or Left / Passed out. Review the summary, then save. Existing current classes and financial entries stay unchanged.
4. Copy current fee templates into the future session and edit rates. Saving or copying never generates charges.
5. Review activation. Every active student needs an existing source enrollment and a prepared next-session decision. Every target class needs a fee template. Confirming activation atomically changes the current session, current student class/roll and exit statuses. Old enrollments remain.
6. Generate current-session charges separately in batches of 100. Returning students are not charged another one-time admission fee. Historical generation is read-only. Paid charges and associated existing waivers are preserved.

Pending dues do not block promotion. Previous-session dues remain on their original charge identities, with existing receipt allocations preserved. No opening balance is copied into another charge during promotion.

New target roll numbers start blank and can be assigned through Student Edit after activation. A student edit form captures the academic session when opened; stale forms cannot undo a later promotion.

Prepared decisions cannot silently overwrite a different saved target enrollment or exit decision. Review mistakes before saving; reversal/editing of saved preparation is not provided in this change.

## Existing data remains pending review

The read-only audit found 625 active students without current-session enrollment links. The admin panel reports this and blocks activation and whole-current-session fee generation rather than inventing enrollments. Promotion also rejects a student without a source enrollment.

No existing enrollment/ledger/attendance repair runs on page load, session creation, template save, activation preview or startup. A recoverable backup and the exact reviewed mapping are still required before the separate baseline correction.

The 161 entries labelled previous-session dues are preserved. Description years alone do not cause reassignment.

## Financial and historical behavior

- Session-specific fee templates reuse the existing unique FeeStructure name with a reserved `[Session YYYY-YYYY] ` prefix. API labels hide that prefix. No database schema change is required.
- Existing unscoped templates belong to the current session until activation binds their names to the outgoing session. IDs, item amounts and assignments are retained.
- Referenced fee heads cannot have their global frequency changed or be globally archived. Use a separate head for a different recurrence; removing a head from one session template must not alter other years.
- Fee generation resolves the requested database session and its enrolled class, never today's calendar year or a future student's cached current class.
- Financial generation, collection, reversal, student financial edits and activation use the same transaction-scoped workflow lock, acquired before receipt counters or charge locks.
- New payment, discount and fine entries inherit the charge's session; reversal entries retain the original session. Existing missing links are not repaired.
- New attendance entries get a validated current session. Existing unassigned attendance stays unchanged unless separately reviewed. Historical dates cannot be written through the current attendance console.
- Billing totals include charges from current/prior sessions and matching active receipt allocations, including each family's student-level allocation. Future-session charges and reversed receipt discounts are excluded. Fine collection is included consistently with fine demand.
- Historical marks/marksheet class filtering uses session enrollment classes and roll numbers. The legacy current-session roster has a read-only fallback while baseline enrollments are missing. Historical classes are never inferred from current classes.

## Late fees

Defaults and fallback settings are OFF. The existing **Fee Structure → Late Fine** toggle is retained. Saving sends only the changed school settings and invalidates billing caches. Existing posted financial records are not deleted by disabling automation.

If enabled later, fine calculation uses the actual due date, grace period and IST end-of-day boundary. Both legacy DAILY and UI PER_DAY settings are supported.

## Verification

- `npm run test:sessions`: offline synthetic/in-memory tests; no database connection.
- `npx tsc --noEmit`: TypeScript validation.
- Targeted ESLint covers new modules, rewritten routes and offline tests. Existing files retain unrelated pre-existing lint debt; no claim of repository-wide lint cleanliness.
- Local HTTP checks verify the demo page and unauthenticated 401 guards without school credentials.
- Browser walkthrough: prepare/review/save sample decisions, copy sample fees, preview/confirm sample activation. The demo updated its current year while the school database was never called.

The in-memory transaction tests check orchestration and rollback behavior at the Prisma boundary. Real PostgreSQL concurrency/load testing and a production build/deployment have not been performed. Verify against an isolated restored database before production rollout.
