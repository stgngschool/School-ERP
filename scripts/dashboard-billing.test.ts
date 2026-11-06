import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardBilling, dashboardBillingSql } from '../src/lib/dashboardBilling';

test('dashboard binds accountant scope and session as values, never SQL text', async () => {
  const calls: unknown[][] = [];
  const result = { totalEarnings: 123 };
  const db = { $queryRawUnsafe: async <T>(...args: unknown[]): Promise<T> => { calls.push(args); return [{ dashboard: result }] as T; } };
  assert.equal(await dashboardBilling(db, { startDate: '2026-04-01', endDate: '2027-03-31', name: '2026-2027' }, 'cashier\' OR TRUE --'), result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][4], "cashier' OR TRUE --");
  assert.ok(!String(calls[0][0]).includes("cashier'"));
  assert.match(dashboardBillingSql, /r\."createdById" = \$4/);
});

test('only compact bounded details leave database; totals and allocations are uncapped', () => {
  assert.match(dashboardBillingSql, /GREATEST\(0, c\.amount/);
  assert.match(dashboardBillingSql, /IS NOT DISTINCT FROM/);
  assert.match(dashboardBillingSql, /dr\.status = 'ACTIVE'/);
  assert.match(dashboardBillingSql, /LIMIT 10/);
  assert.match(dashboardBillingSql, /LIMIT 5/);
  assert.equal((dashboardBillingSql.match(/LIMIT /g) || []).length, 2);
});

test('chart bounds compare school-local calendar days and compact receipts retain book numbers', () => {
  assert.match(dashboardBillingSql, /r\.day >= \$1::timestamp::date AND r\.day <= \$2::timestamp::date/);
  assert.match(dashboardBillingSql, /r\."manualReceiptNo"/);
});
