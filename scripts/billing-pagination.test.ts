/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated route boundary stubs accept Prisma's heterogeneous query/result shapes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(counts = { charges: 15001, receipts: 2001, ledger: 2501 }) {
  const queries: any[] = [];
  const date = new Date('2026-04-02');
  const charges = Array.from({ length: counts.charges }, (_, i) => ({ id: `c${i}`, studentId: 's', description: `Assigned: Tuition ${i}`, amount: 10000, createdAt: date, sessionId: 'year', session: { name: '2026-2027' } }));
  const discounts = [{ id: 'discount', studentId: 's', sessionId: 'year', description: 'Concession Waiver: Tuition 15000', amount: -2000 }];
  const receipts = Array.from({ length: counts.receipts }, (_, i) => ({ id: `r${i}`, receiptNumber: `R${i}`, amountPaid: 100, createdAt: date, items: [], remarks: '{}', paymentMethod: 'CASH' }));
  const ledger = Array.from({ length: counts.ledger }, (_, i) => ({ id: `l${i}`, studentId: 's', entryType: 'CHARGE', amount: 100, description: 'Fee', createdAt: date }));
  const slice = (rows: any[], q: any) => rows.slice(q.skip || 0, q.take === undefined ? undefined : (q.skip || 0) + q.take);
  const db = {
    $queryRawUnsafe: async (sql: string, ids: string[]) => {
      queries.push({ discountSql: sql, ids });
      return ids.includes('c15000') ? discounts : [];
    },
    ledgerEntry: { findMany: async (q: any) => { queries.push(q); return slice(q.where.entryType === 'CHARGE' ? charges : q.where.entryType === 'DISCOUNT' ? discounts : ledger, q); } },
    receipt: { findMany: async (q: any) => { queries.push({ receipt: true, ...q }); return slice(receipts, q); }, count: async () => receipts.length, aggregate: async () => ({ _sum: { amountPaid: 10100 } }), groupBy: async () => [] },
    receiptItem: { groupBy: async () => [] },
  };
  const dependencies: Record<string, any> = {
    '@/lib/db': { default: db },
    'next/server': { NextResponse: { json: (body: any, options: any = {}) => Response.json(body, options) } },
    '@prisma/client': { EntryType: { CHARGE: 'CHARGE', DISCOUNT: 'DISCOUNT' }, PaymentMethod: { CASH: 'CASH', UPI: 'UPI' } },
    '@/lib/auth': { getAuthUser: async () => ({ userId: 'staff', role: 'ADMIN' }) },
    '@/lib/cache/billingCache': { serverBillingCache: { get: () => null, set: () => {} } },
    '@/lib/cache/sessionCache': { getCachedActiveSession: async () => ({ id: 'year', name: '2026-2027', startDate: date }) },
    '@/lib/cache/schoolConfigCache': { getCachedSchoolConfig: async () => null },
    '@/lib/billingSessionScope': { payableSessions: () => ({}) },
    '@/lib/readPolicy': { allocationScope: () => ({}) },
    '@/lib/dateUtils': { getISTDateString: () => '2026-04-02' },
    '@/lib/lateFees': { getChargeDueDate: () => '2026-04-02', calculateLateFee: () => 0 },
    '@/lib/currency': { numberToIndianWords: () => 'Amount' },
    '@/lib/server/receiptSecurity': { generateReceiptSecurityToken: () => 'token' },
  };
  const source = readFileSync(new URL('../src/app/api/billing/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: any = {};
  vm.runInNewContext(compiled, { exports, require: (id: string) => dependencies[id] || {}, console, URL, Date, Map, Set, Math, Number, Array, Object, JSON });
  return { get: async (page: number) => (await exports.GET(new Request(`http://localhost/api/billing?all=true&page=${page}`))).json(), queries };
}

test('full billing continuation reaches older rows without repeating the first capped snapshot', async () => {
  const h = harness();
  const first = await h.get(1);
  assert.equal(first.receipts.length, 2000);
  assert.equal(first.ledgerEntries.length, 2500);
  assert.equal(first.dueItems.length, 15000);
  assert.equal(first.pagination.nextPage, 2);
  assert.equal(first.pagination.limit, 2000);
  assert.equal(first.pagination.hasMoreLedger, true);
  assert.equal(first.pagination.hasMoreReceipts, true);
  assert.equal(first.pagination.hasMoreCharges, true);
  const second = await h.get(2);
  assert.deepEqual(second.receipts.map((r: any) => r.id), ['r2000']);
  assert.deepEqual(second.ledgerEntries.map((r: any) => r.id), ['l2500']);
  assert.deepEqual(second.dueItems.map((r: any) => r.id), ['c15000']);
  assert.equal(second.pagination.hasMore, false);
  assert.equal(second.pagination.nextPage, null);
});

test('later charge pages use all matching discounts instead of independently paging discounts', async () => {
  const h = harness();
  const second = await h.get(2);
  assert.equal(second.dueItems[0].id, 'c15000');
  assert.equal(second.dueItems[0].amount, 8000);
  const discountQuery = h.queries.find(q => q.discountSql);
  assert.deepEqual(Array.from(discountQuery.ids), ['c15000']);
  assert.ok(discountQuery.discountSql.includes('IS NOT DISTINCT FROM'));
  assert.ok(discountQuery.discountSql.includes('d."studentId" = c."studentId"'));
  assert.ok(discountQuery.discountSql.includes('LOWER(TRIM(REGEXP_REPLACE'));
  assert.ok(discountQuery.discountSql.includes("r.status = 'ACTIVE'"));
});

test('exactly full history chunks do not claim another page exists', async () => {
  const body = await harness({ charges: 2, receipts: 2000, ledger: 2500 }).get(1);
  assert.equal(body.pagination.hasMore, false);
  assert.equal(body.pagination.nextPage, null);
});

test('charge continuation remains available after receipt history is exhausted', async () => {
  const body = await harness({ charges: 15001, receipts: 1, ledger: 1 }).get(1);
  assert.equal(body.pagination.hasMoreReceipts, false);
  assert.equal(body.pagination.hasMoreLedger, false);
  assert.equal(body.pagination.hasMoreCharges, true);
  assert.equal(body.pagination.nextPage, 2);
});
