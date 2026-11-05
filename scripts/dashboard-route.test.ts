import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness() {
  let user: { userId: string; role: string } | null = null;
  const calls: string[] = [];
  const cached = new Map<string, unknown>();
  const deps: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: unknown, options?: ResponseInit) => Response.json(body, options) } },
    'next/cache': { unstable_cache: (fn: (...args: string[]) => Promise<unknown>) => async (...args: string[]) => {
      const key = JSON.stringify(args);
      if (!cached.has(key)) cached.set(key, await fn(...args));
      return cached.get(key);
    } },
    '@/lib/db': { default: {} },
    '@/lib/auth': { getAuthUser: async () => user },
    '@/lib/cache/sessionCache': { getCachedActiveSession: async () => ({ startDate: '2026-04-01' }) },
    '@/lib/cache/billingCache': { BILLING_SUMMARY_TAG: 'billing-summary' },
    '@/lib/dateUtils': { getTodayIST: () => '2026-11-05' },
    '@/lib/dashboardBilling': { dashboardBilling: async (_db: unknown, _start: Date, id: string) => { calls.push(id); return { totalEarnings: 123, ownToday: { total: id === 'a' ? 100 : 200 } }; } },
  };
  const compiled = ts.transpileModule(readFileSync('src/app/api/billing/dashboard/route.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(compiled, { exports, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unexpected dependency: ${id}`);
    return deps[id];
  }, Date, console });
  return { setUser: (u: typeof user) => { user = u; }, calls, get: () => exports.GET!(new Request('http://localhost/api/billing/dashboard')) };
}

test('compact dashboard rejects unauthenticated and non-staff reads before querying', async () => {
  const h = harness();
  assert.equal((await h.get()).status, 401);
  h.setUser({ userId: 'a', role: 'PARENT' });
  assert.equal((await h.get()).status, 403);
  assert.deepEqual(h.calls, []);
});

test('dashboard cache reuses reports but isolates cashier totals by identity', async () => {
  const h = harness();
  h.setUser({ userId: 'a', role: 'ADMIN' });
  assert.equal((await h.get()).status, 200);
  await h.get();
  h.setUser({ userId: 'b', role: 'ACCOUNTANT' });
  const b = await (await h.get()).json();
  assert.equal(b.report.ownToday.total, 200);
  assert.deepEqual(h.calls, ['a', 'b']);
});
