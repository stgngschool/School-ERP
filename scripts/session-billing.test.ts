import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { billingTotals } from '../src/lib/billingTotals';

type Data = Record<string, unknown>;
function matches(row: Data, where: Data = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return (value as Data[]).some(w => matches(row, w));
    if (key === 'AND') return (value as Data[]).every(w => matches(row, w));
    if (value && typeof value === 'object') {
      const f = value as Data;
      if ('in' in f) return (f.in as unknown[]).includes(row[key]);
      if ('lte' in f) return new Date(row[key] as string) <= new Date(f.lte as string);
      if ('gte' in f) return new Date(row[key] as string) >= new Date(f.gte as string);
      if ('some' in f) return (row[key] as Data[]).some(r => matches(r, f.some as Data));
      return matches((row[key] || {}) as Data, f);
    }
    return row[key] === value;
  });
}
test('dues include prior charges and only matching payments, excluding future sessions and reversed discounts', async () => {
  const old = { startDate: new Date('2025-04-01') }; const current = { startDate: new Date('2026-04-01') }; const future = { startDate: new Date('2027-04-01') };
  const charges = [old, current, future, current].map((session, i) => ({ session, sessionId: `s${i}`, studentId: i === 3 ? 'b' : 'a', entryType: 'CHARGE', amount: [10000, 20000, 30000, 10000][i] }));
  const discounts = [old, current, future].map((session, i) => ({ session, sessionId: `s${i}`, studentId: 'a', entryType: 'DISCOUNT', amount: -(i + 1) * 1000, referenceId: null }));
  discounts.push({ session: current, sessionId: 's1', studentId: 'a', entryType: 'DISCOUNT', amount: -400, referenceId: 'reversed', receipt: { status: 'REVERSED' } } as never);
  const receipt = { status: 'ACTIVE', createdAt: new Date() };
  const allocations = charges.map((ledgerEntry, i) => ({ ledgerEntry, receipt, amount: [4000, 5000, 9000, 9000][i] }));
  const aggregate = (rows: Data[]) => async ({ where }: { where: Data }) => ({ _sum: { amount: rows.filter(r => matches(r, where)).reduce((n, r) => n + Number(r.amount), 0) } });
  const db = { ledgerEntry: { aggregate: aggregate([...charges, ...discounts]) }, receiptItem: { aggregate: aggregate(allocations) }, receipt: { count: async ({ where }: { where: Data }) => allocations.filter(i => matches({ ...receipt, items: [i] }, where)).length } } as unknown as PrismaClient;
  const totals = await billingTotals(db, current.startDate, ['a']);
  assert.equal(totals.totalChargesPaisa, 30000);
  assert.equal(totals.totalCollectedPaisa, 9000);
  assert.equal(totals.totalDiscountsPaisa, 3000);
  assert.equal(totals.netDuesPaisa, 18000);
});
