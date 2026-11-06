# Dashboard summaries implementation plan

Goal: replace full-school dashboard downloads with authoritative cached database aggregates while preserving role boundaries and the existing UI.

Architecture: a dedicated staff dashboard endpoint returns aggregate metrics, bounded recent receipts and top-five defaulters. Database-side grouping keeps raw financial rows out of network transfers. Admin gets school aggregates; accountant gets their own counter aggregates. Parent/teacher continue their existing authorized scoped reads.

- [x] Implement endpoint and query contract with unit and database parity validation. Include previous payable sessions, active receipt allocations, valid discounts, India dates and current session chart dates.
- [x] Connect context and both dashboards; remove dashboard full-load trigger. Keep ledger/defaulter reports lazy. Never present partial family state as full totals.
- [x] Preserve receipt details loading on demand and privacy actions for both roles.
- [x] Run targeted tests, type check, build, read-only database parity and rendered UI verification. Review the complete diff. No push/deployment.

Validation: 129 automated tests pass; TypeScript passes. Read-only parity checked 10,786 charges and school/cashier receipt totals, with IST due-date and chart-boundary fixtures. Final reviewer confirmed all 3 findings closed. Real multi-role login smoke was not performed: automatic review rejected creating test tokens; automated authorization tests and read-only aggregate parity used instead. No deployment or push.
