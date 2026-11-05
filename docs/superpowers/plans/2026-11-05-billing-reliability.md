# Billing reliability and bounded reads

Approved scope: fix reviewed ledger, dashboard, fee loading and sync defects while preserving the free-tier bandwidth budget.

1. Test and fix family receipt identity and reversal signs without extra requests.
2. Remove school-wide reads from the fee counter. Wait for authentication hydration before full report reads. Keep mutation/read serialization to prevent stale balances replacing saved payments.
3. Make the optional summary refresh nonblocking after verified student balances load.
4. Reconcile changed-device payments with affected-student reads. Advance sync baseline only after a successful reconciliation; keep full reconciliation for cancellations and missed batches.
5. Make full history continuation explicit, bounded and user triggered. Include matching discounts for each charge page. Clearly identify incomplete history.
6. Run isolated route, payment, session, loading and ledger regressions, type checking and production build. No production database writes or deployment.

Monthly quota cannot be guaranteed without actual production usage. No increased polling, unlimited retry loops or automatic history drains.
