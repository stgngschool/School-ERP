import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireCancellationReason, validatePaymentBalance } from '../src/lib/billingPaymentPolicy';

test('overpayment is rejected instead of reduced, including stale fully paid charges', () => {
  assert.throws(() => validatePaymentBalance(100, 101, 0), /exceed/);
  assert.throws(() => validatePaymentBalance(0, 1, 0), /exceed/);
  assert.throws(() => validatePaymentBalance(100, 90, 20), /exceed/);
  assert.doesNotThrow(() => validatePaymentBalance(100, 80, 20));
});
test('zero-value items are rejected but full discounts are valid', () => {
  assert.throws(() => validatePaymentBalance(100, 0, 0), /positive/);
  assert.doesNotThrow(() => validatePaymentBalance(100, 0, 100));
});
test('cancellation requires a non-empty reason and trims it', () => {
  for (const value of [null, undefined, '', '   ', 42]) assert.throws(() => requireCancellationReason(value), /reason/);
  assert.equal(requireCancellationReason('  duplicate  '), 'duplicate');
});

