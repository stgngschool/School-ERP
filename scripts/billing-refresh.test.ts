import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingReadQueue, mergeBillingReceipts } from '../src/lib/billingRefresh';

test('a post-payment read waits for the old full read and then fetches fresh data', async () => {
  const queue = createBillingReadQueue();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const displayed: string[] = [];
  const old = queue.run(async () => { await gate; displayed.push('old'); });
  const fresh = queue.run(async () => { displayed.push('paid'); });
  await Promise.resolve();
  assert.deepEqual(displayed, []);
  release();
  await Promise.all([old, fresh]);
  assert.deepEqual(displayed, ['old', 'paid']);
});

test('failed refresh rejects its caller without preventing the next fresh read', async () => {
  const queue = createBillingReadQueue();
  const failed = queue.run(async () => { throw new Error('offline'); });
  const next = queue.run(async () => 'fresh');
  await assert.rejects(failed, /offline/);
  assert.equal(await next, 'fresh');
});

test('session invalidation prevents an old response from committing', async () => {
  const queue = createBillingReadQueue();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let displayed = '';
  const old = queue.run(async (isCurrent) => { await gate; if (isCurrent()) displayed = 'old user'; });
  await Promise.resolve();
  queue.invalidate();
  release();
  await old;
  assert.equal(displayed, '');
});

test('shared sibling receipts and previously duplicated receipts appear once with fresh status', () => {
  assert.deepEqual(mergeBillingReceipts(
    [{ id: 'old', status: 'ACTIVE' }, { id: 'old', status: 'ACTIVE' }],
    [{ id: 'new', status: 'ACTIVE' }, { id: 'new', status: 'ACTIVE' }, { id: 'old', status: 'CANCELLED' }],
  ), [{ id: 'new', status: 'ACTIVE' }, { id: 'old', status: 'CANCELLED' }]);
});
