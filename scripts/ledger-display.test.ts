import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiptBelongsToStudent, ledgerIncreasesBalance } from '../src/lib/ledgerDisplay';

test('family receipts appear under each child even without a primary student', () => {
  const receipt = { studentId: null, studentIds: ['a', 'b'], studentName: 'Alpha, Beta' };
  assert.equal(receiptBelongsToStudent(receipt, { id: 'b', name: 'Beta' }), true);
  assert.equal(receiptBelongsToStudent(receipt, { id: 'c', name: 'Other' }), false);
});

test('same-name children do not receive each other\'s payment history', () => {
  assert.equal(receiptBelongsToStudent({ studentId: 'other', studentName: 'Same Name' }, { id: 'child', name: 'Same Name' }), false);
  assert.equal(receiptBelongsToStudent({ studentName: 'Same Name' }, { id: 'child', name: 'Same Name' }), false);
});

test('snapshot student IDs preserve lookup of discount-only family vouchers', () => {
  assert.equal(receiptBelongsToStudent({ studentsList: [{ id: 'child' }] }, { id: 'child', name: 'Renamed' }), true);
  assert.equal(receiptBelongsToStudent({ studentId: 'child' }, { id: 'child', name: 'Renamed' }), true);
});

test('payment cancellation reversals increase dues while cancelled fine reversals decrease them', () => {
  assert.equal(ledgerIncreasesBalance({ type: 'REVERSAL', amount: 10000 }), true);
  assert.equal(ledgerIncreasesBalance({ type: 'REVERSAL', amount: -500 }), false);
  assert.equal(ledgerIncreasesBalance({ type: 'CHARGE', amount: 10000 }), true);
  assert.equal(ledgerIncreasesBalance({ type: 'FINE', amount: 500 }), true);
  assert.equal(ledgerIncreasesBalance({ type: 'PAYMENT', amount: -10000 }), false);
  assert.equal(ledgerIncreasesBalance({ type: 'DISCOUNT', amount: -1000 }), false);
});
