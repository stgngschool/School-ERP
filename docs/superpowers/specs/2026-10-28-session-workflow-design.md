# Session and promotion workflow

Approved direction: the user's session/promotion discussion and instruction to implement carefully. Live data repairs remain deferred until a recoverable backup is verified.

- Keep existing student, ledger, receipt and marks identities and amounts. No production SQL, migration, backfill or automatic enrollment repair during development.
- Create future sessions inactive. Preparing promotion writes next-session enrollments, never current student classes. Repeat retains the source class; left/passed-out decisions take effect only on activation.
- Require existing source enrollments. Missing baseline enrollments block promotion with an actionable explanation, rather than inventing historical data.
- Preview and validate before save; reject conflicting target enrollments, duplicate IDs, invalid classes, stale session state and incomplete activation. Identical repeat saves are idempotent.
- Session activation is transactional and serialized, synchronizes current student classes only when ready, and never generates fees. Old dues never block promotion.
- Reuse existing schema. Session-specific fee structures use a reserved session prefix in their existing unique name. On first successful activation, bind legacy unscoped structures to the outgoing session, preserving IDs/items/assignments. Explicit session selectors isolate fee amounts; no fee mutation creates ledger entries in the background.
- Leave/pass-out preparation uses transactional audit records tied to target session and student, since the existing enrollment model has no status column. Preserve source enrollments. Decisions cannot silently overwrite existing prepared decisions.
- Generate charges explicitly for a resolved database session, using that session's enrollment class. Existing paid entries stay immutable; do not recreate admission fees for returning students.
- Late fee default OFF everywhere; preserve existing saved setting. Correct due-date-based calculation if enabled later.
- Use small metadata and class-scoped roster queries, bounded batches, correctly scoped caches and explicit refresh, with no polling or full-school ledger download for promotion.
- Add a development-only `/session-preview` with synthetic students and in-memory state. It must never call Supabase, auth, school settings or live APIs. Production returns 404.
- Extend the existing admin design and use plain Indian English. Historical report session selection remains explicit per report; replace the misleading header selector with a current-session label.

Alternatives: schema migrations offer dedicated session columns but cannot be safely deployed before backup verification; a separate duplicated student table would break student identity and financial history. Reusing existing enrollment and fee-structure records permits local implementation without a live schema change. Reserved fee names and audit-backed exit decisions are internal storage conventions and must be centralized and tested.
