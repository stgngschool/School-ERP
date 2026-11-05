# Direct dashboard with compact financial reports

User requirement: restore the existing admin/accountant dashboards on entry, remove the intermediate financial overview/button and the dashboard history notice, while keeping the egress reductions.

Implementation:

1. Keep dashboard out of the full-billing boundary; render the incumbent overview components directly.
2. Add an authorized staff-only dashboard report endpoint. Calculate balances, monthly collections, cashier totals, class summaries and top five defaulters inside PostgreSQL; return no raw school-wide ledger arrays. Fetch at most six real recent receipts per scope for printing.
3. Cache reports for 60 seconds by active session, date and cashier identity. Invalidate with the existing billing mutation tag.
4. Consume the report in existing components while preserving layout, privacy defaults, navigation, loading and retry states. Do not derive school totals from a six-receipt sample.
5. Test SQL locally with PostgreSQL-compatible fixtures, role/cashier cache isolation, actual component rendering and existing billing regressions. Build and restart localhost only after validation. No production writes, backups or manual full syncs.
