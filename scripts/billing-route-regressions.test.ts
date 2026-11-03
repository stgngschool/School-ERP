import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as paymentPolicy from '../src/lib/billingPaymentPolicy';
import * as validation from '../src/lib/validation';

// Execute the real route with an explicit allowlist of dependencies. No real
// database module, environment loader or external network client can be loaded.
function harness(role = 'ACCOUNTANT') {
  const charge = { id: 'charge', studentId: 'student', entryType: 'CHARGE', amount: 10000, description: 'Assigned: Tuition', sessionId: 'session', feeHeadId: 'fee' };
  const student = { id: 'student', name: 'Child', parentProfileId: 'family', class: { name: '1', section: 'A' } };
  const receipts: any[] = [{ id: 'old', receiptNumber: 'R1', status: 'ACTIVE', amountPaid: 8000, remarks: '{}', items: [{ ledgerEntry: charge, amount: 8000 }], createdAt: new Date() }];
  const ledger: any[] = [
    { ...charge, id: 'payment', entryType: 'PAYMENT', referenceId: 'old', amount: -8000 },
    { ...charge, id: 'discount', entryType: 'DISCOUNT', referenceId: 'old', amount: -2000, description: 'Discount for: Tuition' },
  ];
  const allocations: any[] = [{ receiptId: 'old', ledgerEntryId: 'charge', amount: 8000 }];
  const audits: any[] = [];
  let queue = Promise.resolve();
  const receipt = {
    findFirst: async ({ where }: any) => structuredClone(receipts.find(r => where.id ? r.id === where.id : r.receiptNumber === where.receiptNumber) || null),
    update: async ({ where, data }: any) => { const row = receipts.find(r => r.id === where.id); Object.assign(row, data); return structuredClone(row); },
    create: async ({ data }: any) => { const row = { ...data, id: `new-${receipts.length}`, status: 'ACTIVE', createdAt: new Date() }; receipts.push(row); return row; },
  };
  const active = (id: string) => receipts.some(r => r.id === id && r.status === 'ACTIVE');
  const tx: any = {
    receipt,
    student: { findMany: async () => [student] },
    ledgerEntry: { findMany: async ({ where }: any) => ledger.filter(row => row.referenceId === where.referenceId && where.entryType.in.includes(row.entryType)),
      createMany: async ({ data }: any) => ledger.push(...data) },
    receiptItem: { createMany: async ({ data }: any) => allocations.push(...data) },
    auditLog: { create: async ({ data }: any) => audits.push(data) },
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [charge];
      if (sql.includes('AS total')) return [{ ledgerEntryId: 'charge', total: allocations.filter(a => !sql.includes("r.status = 'ACTIVE'") || active(a.receiptId)).reduce((sum, a) => sum + a.amount, 0) }];
      if (sql.includes('AS amt')) return ledger.filter(d => d.entryType === 'DISCOUNT' && (!sql.includes("r.status = 'ACTIVE'") || active(d.referenceId))).map(d => ({ ...d, amt: Math.abs(d.amount) }));
      if (sql.includes('AS charge_amount')) return [{ charge_amount: charge.amount,
        paid: allocations.filter(a => !sql.includes("r.status = 'ACTIVE'") || active(a.receiptId)).reduce((sum, a) => sum + a.amount, 0),
        discounted: ledger.filter(d => d.entryType === 'DISCOUNT' && (!sql.includes("dr.status = 'ACTIVE'") || active(d.referenceId))).reduce((sum, d) => sum + Math.abs(d.amount), 0) }];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const db: any = { receipt, student: { findUnique: async () => student }, user: { findUnique: async () => ({ name: 'Staff', role }) },
    $transaction: async (run: any) => {
      let release!: () => void;
      const previous = queue;
      queue = new Promise<void>(resolve => { release = resolve; });
      // Serialization begins at the workflow lock, as it does in production.
      const localTx = { ...tx, acquireLock: async () => previous };
      try { return await run(localTx); } finally { release(); }
    },
  };
  const dependencies: Record<string, any> = {
    '@/lib/db': { default: db }, 'next/server': { NextResponse: { json: (body: any, options: any = {}) => Response.json(body, options) } },
    crypto: { randomUUID: () => `id-${ledger.length}-${Math.random()}` },
    '@prisma/client': { EntryType: Object.fromEntries(['CHARGE', 'FINE', 'PAYMENT', 'DISCOUNT', 'REVERSAL'].map(key => [key, key])) },
    '@/lib/auth': { getAuthUser: async () => ({ userId: 'staff', role }) },
    '@/lib/security': { validateCsrfOrigin: () => true },
    '@/lib/cache/billingCache': { clearServerBillingCache: () => {} },
    '@/lib/sessionWorkflow': { lockSessionWorkflow: async (client: any) => client.acquireLock() },
    '@/lib/billingPaymentPolicy': paymentPolicy, '@/lib/validation': validation,
    '@/lib/family': { getNextReceiptNumber: async () => 'R2' },
    '@/lib/receiptArrears': { receiptArrears: (balance: number, paid: number, discount: number) => Math.max(0, balance - paid - discount) },
    '@/lib/currency': { numberToIndianWords: () => 'Amount' },
    '@/lib/server/receiptSecurity': { generateReceiptSecurityToken: () => 'token' },
    '@/lib/google': { appendReceiptToSheet: async () => {} },
  };
  const source = readFileSync(new URL('../src/app/api/billing/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: false } }).outputText;
  const exports: any = {};
  vm.runInNewContext(compiled, { exports, require: (id: string) => {
    if (id in dependencies) return dependencies[id];
    // These imports are unused by POST; unexpected calls still fail loudly.
    if (id.startsWith('@/lib/')) return {};
    throw new Error(`Blocked dependency: ${id}`);
  }, console: { error: () => {}, warn: () => {} }, Date, Map, Set, Math, Number, Array, Object, JSON });
  const post = (body: any) => exports.POST(new Request('http://localhost/api/billing', { method: 'POST', body: JSON.stringify(body) }));
  return { post, receipts, ledger, audits };
}

test('concurrent cancellation is applied once and retains the reason', async () => {
  const h = harness();
  const responses = await Promise.all([1, 2].map(() => h.post({ action: 'REVERSE_RECEIPT', receiptId: 'old', reason: 'Duplicate collection' })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
  assert.equal(h.ledger.filter(row => row.entryType === 'REVERSAL').length, 2);
  assert.equal(h.audits.length, 1);
  assert.equal(JSON.parse(h.receipts[0].remarks).reversalReason, 'Duplicate collection');
});

test('admin cancellation restores the full balance for another checkout', async () => {
  const h = harness('ADMIN');
  assert.equal((await h.post({ action: 'CANCEL_RECEIPT', receiptId: 'old', reason: 'Wrong amount' })).status, 200);
  const response = await h.post({ studentId: 'student', paymentMethod: 'CASH', items: [{ ledgerEntryId: 'charge', payAmount: 10000 }] });
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const body = await response.json();
  assert.equal(body.receipt.amount, 10000);
  assert.equal(body.receipt.arrears, 0);
});

test('cancellation offsets the paid late-fee accrual as well as its payment', async () => {
  const h = harness();
  h.receipts[0].items.push({ amount: 500, ledgerEntry: { id: 'fine', studentId: 'student', entryType: 'FINE', amount: 500, sessionId: 'session', feeHeadId: 'fee' } });
  h.ledger.push({ id: 'fine-payment', studentId: 'student', entryType: 'PAYMENT', amount: -500, referenceId: 'old', sessionId: 'session', feeHeadId: 'fee' });
  assert.equal((await h.post({ action: 'CANCEL_RECEIPT', receiptId: 'old', reason: 'Wrong charge' })).status, 200);
  const offsets = h.ledger.filter(row => row.entryType === 'REVERSAL');
  assert.equal(offsets.filter(row => row.amount === 500).length, 1);
  assert.equal(offsets.filter(row => row.amount === -500).length, 1);
});

test('partial repayment after cancellation reports the restored family arrears', async () => {
  const h = harness();
  await h.post({ action: 'CANCEL_RECEIPT', receiptId: 'old', reason: 'Wrong amount' });
  const response = await h.post({ studentId: 'student', paymentMethod: 'CASH', items: [{ ledgerEntryId: 'charge', payAmount: 4000 }] });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).receipt.arrears, 6000);
});

test('overpayment and missing cancellation reason create no receipts or reversals', async () => {
  const h = harness();
  assert.equal((await h.post({ action: 'CANCEL_RECEIPT', receiptId: 'old', reason: ' ' })).status, 400);
  assert.equal((await h.post({ studentId: 'student', paymentMethod: 'CASH', items: [{ ledgerEntryId: 'charge', payAmount: 1 }] })).status, 400);
  assert.equal(h.receipts.length, 1);
  assert.equal(h.audits.length, 0);
});

test('teachers cannot cancel receipts', async () => {
  const h = harness('TEACHER');
  assert.equal((await h.post({ action: 'CANCEL_RECEIPT', receiptId: 'old', reason: 'Duplicate' })).status, 403);
  assert.equal(h.receipts[0].status, 'ACTIVE');
});
