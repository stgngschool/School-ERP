import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(role: string | null, active = true) {
  const calls: unknown[][] = [];
  const module = { exports: {} as { GET: (r: Request) => Promise<Response> } };
  const dependencies: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (data: unknown, options?: ResponseInit) => Response.json(data, options) } },
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@/lib/db': { __esModule: true, default: {} },
    '@/lib/auth': { getAuthUser: async () => role ? { role, userId: 'verified-user' } : null },
    '@/lib/cache/sessionCache': { getCachedActiveSession: async () => active ? { id: 'session', name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31' } : null },
    '@/lib/cache/billingCache': { BILLING_SUMMARY_TAG: 'billing-summary' },
    '@/lib/dashboardBilling': { dashboardBilling: async (...args: unknown[]) => { calls.push(args); return { totalEarnings: 12345 }; } },
  };
  const compiled = ts.transpileModule(readFileSync('src/app/api/billing/dashboard/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports: module.exports, module, require: (name: string) => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, Date, console });
  return { calls, request: () => module.exports.GET(new Request('http://localhost/api/billing/dashboard')) };
}

test('dashboard rejects unauthenticated and non-financial roles before reading aggregates', async () => {
  for (const [role, status] of [[null, 401], ['TEACHER', 403], ['PARENT', 403], ['UNKNOWN', 403]] as const) {
    const h = harness(role);
    assert.equal((await h.request()).status, status);
    assert.equal(h.calls.length, 0);
  }
});

test('admin uses school scope, accountant binds only their own creator identity', async () => {
  for (const role of ['ADMIN', 'ACCOUNTANT']) {
    const h = harness(role);
    const response = await h.request();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(h.calls[0][2], role === 'ADMIN' ? null : 'verified-user');
    assert.deepEqual((await response.json()).dashboard, { totalEarnings: 12345 });
  }
});

test('missing session produces unavailable state instead of cross-year totals', async () => {
  const h = harness('ADMIN', false);
  assert.equal((await h.request()).status, 409);
  assert.equal(h.calls.length, 0);
});
