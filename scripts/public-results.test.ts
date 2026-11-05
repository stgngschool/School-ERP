import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { BoundedCache } from '../src/lib/cache/BoundedCache';
import * as policy from '../src/lib/publicResultPolicy';
function harness(now = '2026-11-05T00:00:00Z') {
  const state = { exams: ['Unit-1'], session: { id: 's1', name: '2026-2027' } as any, marksReads: 0, calls: [] as any[], failureCount: 0, charges: [] as any[], payments: [] as any[], discounts: [] as any[], ledgerReads: [] as any[] };
  const dependencies: Record<string, any> = {
    '@/lib/rateLimit': { getTrustedClientIp: () => 'network', checkRateLimit: async (key: string, limit: number, window: number) => { state.calls.push({ key, limit, window }); if(key.includes('failure:')) state.failureCount++; return { allowed: key.includes('failure:') ? state.failureCount <= 10 : true }; } },
    '@/lib/cache/schoolConfigCache': { getCachedSchoolConfig: async () => ({ data: { enablePublicResults: true, allowedPublicExams: state.exams } }) },
    '@/lib/cache/sessionCache': { getCachedActiveSession: async () => state.session },
    '@/lib/cache/BoundedCache': { BoundedCache }, '@/lib/publicResultPolicy': policy,
    '@/lib/dateUtils': { formatCanonicalDOBIso: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '' },
    'next/server': { NextResponse: { json: (data: any, options: any) => Response.json(data, options) } },
    '@/lib/db': {
      __esModule: true,
      default: {
        student: { findFirst: async () => ({ id: 'a', name: 'Child', admissionNumber: '1', dob: '2015-01-01', class: { name: '1', section: 'A' } }) },
        ledgerEntry: { findMany: async ({ where }: any) => { state.ledgerReads.push(where.entryType); return where.entryType === 'CHARGE' ? state.charges : (where.entryType === 'DISCOUNT' ? state.discounts : []); } },
        receiptItem: { findMany: async () => state.payments },
        mark: { findMany: async () => { state.marksReads++; return [{ id: 'm', subject: 'English', examName: 'Unit-1', marksObtained: 20, maxMarks: 25 }]; } },
      },
    },
  };
  const source = ts.transpileModule(readFileSync('src/app/api/public/results/unit-1/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} as any };
  const FixedDate = class extends Date { static now() { return new Date(now).getTime(); } };
  vm.runInNewContext(source, { exports: module.exports, module, require: (name: string) => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, process: { env: {} }, console, Date: FixedDate });
  const request = (dob = '2015-01-01') => module.exports.POST(new Request('http://localhost/api/public/results/unit-1', { method: 'POST', body: JSON.stringify({ admissionNumber: '1', dob, examName: 'Unit-1' }) }));
  return { state, request };
}
test('more than 15 valid result requests succeed and reuse marks cache', async () => {
  const { state, request } = harness();
  for (let i=0; i<20; i++) assert.equal((await request()).status, 200);
  assert.equal(state.marksReads, 1);
  assert.equal(state.failureCount, 0);
  assert.ok(state.calls.every(c => c.limit === 300 && c.window === 60));
});
test('wrong DOB never reads cached marks; repeated failures do not lock out correct DOB', async () => {
  const { state, request } = harness();
  assert.equal((await request()).status, 200);
  for(let i=0;i<10;i++) assert.equal((await request('2015-01-02')).status, 401);
  assert.equal((await request('2015-01-02')).status, 429);
  assert.equal((await request()).status, 200);
  assert.equal(state.marksReads, 1);
});
test('unpublishing exams overrides cached results and missing session never mixes years', async () => {
  const { state, request } = harness();
  await request(); state.exams = [];
  assert.equal((await request()).status, 403);
  state.exams = ['Unit-1']; state.session = null;
  assert.equal((await request()).status, 503);
  assert.equal(state.marksReads, 1);
});
test('blocks result when a monthly fee from two months ago remains unpaid', async () => {
  const { state, request } = harness();
  state.charges = [{ id: 'charge-sep', amount: 10000, description: 'Assigned: Tuition Fee - September 2026-2027', sessionId: 's1', feeHead: { frequency: 'monthly' } }];
  state.payments = [];
  const response = await request();
  assert.deepEqual(state.ledgerReads, ['CHARGE', 'DISCOUNT']);
  assert.equal(response.status, 402);
  assert.match((await response.json()).error, /fees.*result/i);
  assert.equal(state.marksReads, 0);
});
test('allows result when overdue monthly fee is fully paid', async () => {
  const { state, request } = harness();
  state.charges = [{ id: 'charge-sep', amount: 10000, description: 'Assigned: Tuition Fee - September 2026-2027', sessionId: 's1', feeHead: { frequency: 'monthly' } }];
  state.payments = [{ ledgerEntryId: 'charge-sep', amount: 10000 }];
  assert.equal((await request()).status, 200);
});

function monthlyCharge(month: string, year = '2026-2027') {
  return { id: 'fee', amount: 10000, description: `Assigned: Tuition Fee - ${month} ${year}`, sessionId: 's1', feeHead: { frequency: 'monthly' } };
}

test('current, previous and future months do not block results', async () => {
  for (const month of ['October', 'November', 'December', 'January', 'March']) {
    const { state, request } = harness();
    state.charges = [monthlyCharge(month)];
    assert.equal((await request()).status, 200, month);
  }
});

test('partial payment blocks; payment plus concession unlocks immediately', async () => {
  const { state, request } = harness();
  state.charges = [monthlyCharge('August')];
  state.payments = [{ ledgerEntryId: 'fee', amount: 7500 }];
  assert.equal((await request()).status, 402);
  state.discounts = [{ sessionId: 's1', description: 'Concession (25%): Tuition Fee - August 2026-2027', amount: -2500 }];
  assert.equal((await request()).status, 200);
  state.payments = []; // Cancelled receipts must no longer contribute allocations.
  const blocked = await request();
  assert.equal(blocked.status, 402);
  const body = await blocked.json();
  assert.equal(body.code, 'RESULT_FEES_PENDING');
  assert.equal(body.subjects, undefined);
  assert.equal(state.marksReads, 1); // Fee lock also overrides previously cached marks.
});

test('January to March use academic end year and India month boundary', async () => {
  for (const [now, month, expected] of [
    ['2026-12-05T00:00:00Z', 'October', 402],
    ['2026-12-05T00:00:00Z', 'November', 200],
    ['2027-03-10T00:00:00Z', 'January', 402],
    ['2027-03-10T00:00:00Z', 'February', 200],
    ['2026-10-31T18:29:59Z', 'September', 200],
    ['2026-10-31T18:30:00Z', 'September', 402],
  ] as const) {
    const { state, request } = harness(now);
    state.charges = [monthlyCharge(month)];
    assert.equal((await request()).status, expected, `${now} ${month}`);
  }
});

test('previous session monthly dues block but one time charges do not', async () => {
  const { state, request } = harness();
  state.charges = [monthlyCharge('March', '2025-2026')];
  assert.equal((await request()).status, 402);
  state.charges[0].feeHead.frequency = 'annual';
  assert.equal((await request()).status, 200);
});
