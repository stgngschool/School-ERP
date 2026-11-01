import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiptSettlement } from '../src/lib/receiptSettlement';
test('settlement requires an explicit finite zero balance', () => {
  assert.equal(receiptSettlement(0), 'cleared');
  for (const value of [undefined, null, NaN, Infinity, -10, '0']) assert.equal(receiptSettlement(value), 'unknown');
  assert.equal(receiptSettlement(500), 'outstanding');
});
import { enrichReceiptWithStudentDetails } from '../src/lib/receipts';
test('receipt enrichment preserves unknown balances instead of inventing clearance', () => {
  for (const arrears of [undefined, null, NaN]) {
    const receipt = enrichReceiptWithStudentDetails({ amount: 10000, arrears, items: [] }, []);
    assert.equal(receiptSettlement(receipt.arrears), 'unknown');
  }
  assert.equal(enrichReceiptWithStudentDetails({ amount: 10000, arrears: 0, items: [] }, []).arrears, 0);
});
