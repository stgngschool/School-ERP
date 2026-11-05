import test from 'node:test';
import assert from 'node:assert/strict';
import { savedPaymentResult } from '../src/lib/paymentResult';

test('saved receipt is available while the existing balance refresh is still pending', async () => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const result = savedPaymentResult({ id: 'saved' }, () => { calls++; return pending; }, () => assert.fail());
  assert.equal(result.receipt.id, 'saved');
  assert.equal(result.success, true);
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  await result.refresh;
});

test('refresh failure preserves the committed receipt and warns once without retrying payment', async () => {
  let warnings = 0;
  const result = savedPaymentResult({ id: 'saved' }, async () => { throw new Error('offline'); }, () => { warnings++; });
  await result.refresh;
  assert.equal(warnings, 1);
  assert.equal(result.receipt.id, 'saved');
  assert.equal(result.success, true);
});
