import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as chargeSession from '../src/lib/chargeSession';
import * as sessionFees from '../src/lib/sessionFees';

type Entry = { id?: string; studentId?: string; feeHeadId?: string; entryType: string; amount: number; description: string; sessionId: string | null; receiptItems?: unknown[]; feeHead?: { name: string } };
function generatorFixture(year = '2026-2027', frequency = 'annual', entries: Entry[] = [], missingEnrollment = false) {
  const created: Entry[] = []; const updates: unknown[] = [];
  const current = { id: 'current', name: '2026-2027', startDate: new Date('2026-04-01') }; const target = { id: year === current.name ? current.id : 'target', name: year, startDate: new Date(`${year.split('-')[0]}-04-01`) };
  const mock = {
    academicSession: { findFirst: async () => current, findUnique: async () => target },
    studentSession: { findUnique: async () => missingEnrollment ? null : ({ class: { name: '4' } }), findMany: async () => missingEnrollment ? [] : [{ studentId: 'student', class: { name: '4' } }] },
    feeStructure: { findMany: async () => [{ name: sessionFees.feeStructureName(year, 'Class 4 Fee Structure'), className: '4', items: [{ feeHeadId: 'head', amount: 100000, feeHead: { name: 'Tuition Fee', frequency } }] }] },
    student: { findUnique: async () => ({ isRte: false, concession: { name: 'Staff', feeHeadName: 'Tuition Fee', percentage: 50 } }), findMany: async () => [{ id: 'student', isRte: false, concession: null }] },
    ledgerEntry: { findMany: async () => entries, createMany: async ({ data }: { data: Entry[] }) => { created.push(...data); }, updateMany: async (value: unknown) => { updates.push(value); } },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(mock),
  };
  const exports: { generateYearlyCharges?: (...args: string[]) => Promise<unknown>; generateYearlyChargesBulk?: (students: { id: string; class: { name: string } }[], user: string, year: string) => Promise<unknown> } = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/generateYearlyCharges.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, console, require: (name: string) => {
    if (name === '@/lib/db') return { default: mock };
    if (name === '@prisma/client') return { EntryType: { CHARGE: 'CHARGE', DISCOUNT: 'DISCOUNT' } };
    if (name === './chargeSession') return chargeSession;
    if (name === './sessionFees') return sessionFees;
    if (name === './sessionWorkflow') return { lockSessionWorkflow: async () => {} };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { created, updates, run: () => exports.generateYearlyCharges!('student', '4', 'admin', year), bulk: () => exports.generateYearlyChargesBulk!([{ id: 'student', class: { name: 'WRONG-CURRENT-CLASS' } }], 'admin', year) };
}
test('explicit future academic year uses its own database session ID', async () => {
  const f = generatorFixture('2027-2028'); await f.run();
  assert.equal(f.created.length, 2); assert(f.created.every(e => e.sessionId === 'target'));
});
test('one-time admission charges are not regenerated in a later year', async () => {
  const f = generatorFixture('2026-2027', 'one_time', [{ id: 'old', entryType: 'CHARGE', amount: 100000, description: 'Assigned: Tuition Fee - One-Time', sessionId: 'historical', receiptItems: [{}], feeHead: { name: 'Tuition Fee' } }]);
  await f.run(); assert.equal(f.created.filter(e => e.entryType === 'CHARGE').length, 0);
});
test('concession changes update unpaid discount even when fee amount stays the same', async () => {
  const f = generatorFixture('2026-2027', 'annual', [
    { id: 'charge', entryType: 'CHARGE', amount: 100000, description: 'Assigned: Tuition Fee - Annual 2026-2027', sessionId: 'current', receiptItems: [], feeHead: { name: 'Tuition Fee' } },
    { id: 'discount', entryType: 'DISCOUNT', amount: -20000, description: 'Concession Waiver (Staff): Tuition Fee - Annual 2026-2027', sessionId: 'current', receiptItems: [], feeHead: { name: 'Tuition Fee' } },
  ]);
  await f.run(); assert(f.updates.some(u => (u as { where: { id: { in: string[] } }; data: { amount: number } }).where.id.in.includes('discount') && (u as { data: { amount: number } }).data.amount === -50000));
});

test('historical fee generation cannot rewrite old concessions', async () => {
  const f = generatorFixture('2025-2026');
  await assert.rejects(f.run(), /Historical fees are read-only/);
  assert.equal(f.created.length, 0); assert.equal(f.updates.length, 0);
});

test('bulk generation uses the target enrollment class, not the input current class', async () => {
  const f = generatorFixture('2027-2028'); await f.bulk();
  assert.equal(f.created.filter(e => e.entryType === 'CHARGE').length, 1);
  assert(f.created.every(e => e.sessionId === 'target'));
});
test('missing current enrollment blocks generation without repairing or changing data', async () => {
  const f = generatorFixture('2026-2027', 'annual', [], true);
  await assert.rejects(f.run(), /enrollment is required/);
  await assert.rejects(f.bulk(), /enrollments are missing/);
  assert.equal(f.created.length, 0); assert.equal(f.updates.length, 0);
});
test('a paid current charge and its existing discount remain immutable on resync', async () => {
  const f = generatorFixture('2026-2027', 'annual', [
    { id: 'charge', entryType: 'CHARGE', amount: 100000, description: 'Assigned: Tuition Fee - Annual 2026-2027', sessionId: 'current', receiptItems: [{}], feeHead: { name: 'Tuition Fee' } },
    { id: 'discount', entryType: 'DISCOUNT', amount: -20000, description: 'Concession Waiver (Staff): Tuition Fee - Annual 2026-2027', sessionId: 'current', receiptItems: [], feeHead: { name: 'Tuition Fee' } },
  ]);
  await f.run(); assert.equal(f.created.length, 0); assert.equal(f.updates.length, 0);
});
