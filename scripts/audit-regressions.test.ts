import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReceiptSecurityToken, isValidReceiptSecurityToken } from '../src/lib/server/receiptSecurity';
import { receiptArrears } from '../src/lib/receiptArrears';
import { BoundedCache } from '../src/lib/cache/BoundedCache';

test('receipt arrears excludes fine payments and applies only fee allocations and discounts', () => {
  assert.equal(receiptArrears(100000, 0, 0), 100000);
  assert.equal(receiptArrears(100000, 40000, 10000), 50000);
  assert.equal(receiptArrears(100000, 120000, 0), 0);
});
test('receipt signatures bind the canonical receipt number and reject tampering, old tokens and wrong keys', () => {
  process.env.JWT_SECRET = 'test-only-key-do-not-deploy';
  const token = generateReceiptSecurityToken('REC-2026-00001');
  assert.ok(isValidReceiptSecurityToken('REC-2026-00001', token));
  assert.ok(isValidReceiptSecurityToken(' rec-2026-00001 ', token));
  assert.equal(isValidReceiptSecurityToken('REC-2026-00002', token), false);
  assert.equal(isValidReceiptSecurityToken('REC-2026-00001', token.slice(1)), false);
  assert.equal(isValidReceiptSecurityToken('REC-2026-00001', 'ABC1234567'), false);
  process.env.JWT_SECRET = 'different-test-key';
  assert.equal(isValidReceiptSecurityToken('REC-2026-00001', token), false);
  delete process.env.JWT_SECRET;
  assert.throws(() => generateReceiptSecurityToken('REC-2026-00001'));
});
test('bounded cache preserves a recently read entry during eviction', () => {
  const cache = new BoundedCache<number>(2);
  cache.set('a', 1); cache.set('b', 2);
  assert.equal(cache.get('a'), 1);
  cache.set('c', 3);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('b'), undefined);
});

test('untrusted forwarded headers cannot choose a rate limit bucket', async () => {
  const { getTrustedClientIp } = await import('../src/lib/clientIp');
  const previous = process.env.VERCEL;
  try {
    delete process.env.VERCEL;
    const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '2.3.4.5', 'x-vercel-forwarded-for': '3.4.5.6' } });
    assert.equal(getTrustedClientIp(req), 'unknown');
    process.env.VERCEL = '1';
    assert.equal(getTrustedClientIp(req), '3.4.5.6');
    assert.equal(getTrustedClientIp(new Request('http://localhost', { headers: { 'x-forwarded-for': '9.9.9.9' } })), 'unknown');
  } finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
});
