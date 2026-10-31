import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionClassFilter } from '../src/lib/sessionClassFilter';
import { makeSessionDemo } from '../src/lib/sessionDemo';
test('historical class filters never fall back to a promoted student current class', () => {
  assert.deepEqual(sessionClassFilter('old', { id: 'class4' }, false), { studentSessions: { some: { sessionId: 'old', class: { id: 'class4' } } } });
  assert.equal((sessionClassFilter('current', { id: 'class5' }, true).OR as unknown[]).length, 2);
});
test('demo preparation, fee copy and activation work without a live fetch', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Live network is forbidden in this test'); };
  try {
    const request = makeSessionDemo();
    const send = (path: string, body: object, method = 'POST') => request(path, { method, body: JSON.stringify(body) }) as Promise<Record<string, unknown>>;
    const decisions = Array.from({ length: 6 }, (_, i) => ({ studentId: `demo-${i}`, decision: i === 5 ? 'LEFT' : 'PROMOTE', classId: 'demo-5' }));
    const body = { sourceSessionId: 'demo-current', nextSessionId: 'demo-next', sourceClassId: 'demo-4', decisions };
    const p = await send('/api/promotion', { ...body, action: 'preview' });
    await send('/api/promotion', { ...body, action: 'save', previewToken: p.previewToken });
    const unchanged = await request('/api/promotion') as { currentSessionId: string };
    assert.equal(unchanged.currentSessionId, 'demo-current');
    await send('/api/fee-config', { action: 'COPY_SESSION', sessionId: 'demo-next' });
    const a = await send('/api/sessions', { id: 'demo-next', action: 'preview' }, 'PATCH');
    await send('/api/sessions', { id: 'demo-next', action: 'activate', previewToken: a.previewToken }, 'PATCH');
    const changed = await request('/api/promotion') as { currentSessionId: string; activeCount: number };
    assert.equal(changed.currentSessionId, 'demo-next'); assert.equal(changed.activeCount, 5);
  } finally { globalThis.fetch = previous; }
});
