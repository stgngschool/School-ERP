import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetryRead, cacheableRead, allocationScope, successfulStudentIds, createReadDeduplicator } from '../src/lib/readPolicy';
import { mergeAttendanceScope } from '../src/lib/attendanceMerge';

test('permanent errors never retry; only transient reads retry', () => {
  for (const status of [400, 401, 403, 404, 409, 422]) assert.equal(shouldRetryRead(status), false);
  for (const status of [408, 429, 500, 502, 503, 504]) assert.equal(shouldRetryRead(status), true);
});
test('successful empty data is cached but failures are not', () => {
  for (const data of [[], { applications: [] }, { dueItems: [], receipts: [] }]) assert.equal(cacheableRead(data), true);
  for (const data of [null, undefined, { error: 'Failed' }, { success: false }]) assert.equal(cacheableRead(data), false);
});
test('allocations include only returned charges and active receipts, including family payments', () => {
  assert.deepEqual(allocationScope(['old-charge', 'family-charge']), { ledgerEntryId: { in: ['old-charge', 'family-charge'] }, receipt: { status: 'ACTIVE' } });
  assert.deepEqual(allocationScope([]).ledgerEntryId.in, []);
});
test('failed targeted refresh must not clear existing student balances', () => {
  assert.deepEqual(successfulStudentIds(['a', 'b', 'c'], [null, { dueItems: [], receipts: [], ledgerEntries: [] }, { error: 'unavailable' }]), ['b']);
});

test('identical concurrent reads share work but completed reads are not cached', async () => {
  const read = createReadDeduplicator();
  let calls = 0;
  let finish!: (value: number) => void;
  const job = () => { calls++; return new Promise<number>(resolve => { finish = resolve; }); };
  const a = read('user-a:billing', job);
  const b = read('user-a:billing', job);
  assert.equal(calls, 1);
  finish(12);
  assert.deepEqual(await Promise.all([a, b]), [12, 12]);
  assert.equal(await read('user-a:billing', async () => ++calls), 2);
  await assert.rejects(read('failed', async () => { throw new Error('offline'); }));
  assert.equal(await read('failed', async () => 99), 99);
});

test('scoped attendance replaces only selected dates/class and retains other history', () => {
  const row = (id: string, studentId: string, date: string) => ({ id, studentId, date });
  const old = [row('a-old', 'a', '2026-10-30'), row('a', 'a', '2026-10-31'), row('b', 'b', '2026-10-31')];
  const fresh = [row('a', 'a', '2026-10-31')];
  assert.deepEqual(mergeAttendanceScope(old, fresh, { startDate: '2026-10-31', endDate: '2026-10-31' }, new Set(['a'])), [old[0], old[2], fresh[0]]);
  assert.deepEqual(mergeAttendanceScope(old, [], { startDate: '2026-10-31', endDate: '2026-10-31' }, new Set(['a'])), [old[0], old[2]]);
  assert.deepEqual(mergeAttendanceScope(old, fresh), fresh);
});
