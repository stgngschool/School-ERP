import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getChargeDueDate, calculateLateFee } from '../src/lib/lateFees';
test('annual exam falls in March of the session end year', () => {
  assert.equal(getChargeDueDate('Annual Exam 2026-2027', Date.parse('2026-04-01')), '2027-03-15');
});
test('late fees default to OFF and future instalments have no fine', () => {
  const input = { dueDate: '2026-12-10', outstanding: 100000, now: Date.parse('2026-06-01'), amountRupees: 50, graceDays: 0 };
  assert.equal(calculateLateFee(input), 0);
  assert.equal(calculateLateFee({ ...input, enabled: true }), 0);
});
test('daily fine supports the saved PER_DAY setting and respects the due-day boundary in IST', () => {
  const input = { enabled: true, type: 'PER_DAY', amountRupees: 5, graceDays: 0, dueDate: '2026-12-10', outstanding: 10000 };
  assert.equal(calculateLateFee({ ...input, now: Date.parse('2026-12-10T23:59:59+05:30') }), 0);
  assert.equal(calculateLateFee({ ...input, now: Date.parse('2026-12-11T00:00:00+05:30') }), 500);
  assert.equal(calculateLateFee({ ...input, now: Date.parse('2026-12-12T00:00:00+05:30') }), 1000);
});
