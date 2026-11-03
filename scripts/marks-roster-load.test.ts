import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasMarksDraftValues, readMarksRoster, createMarksLoadGuard } from '../src/lib/marksRosterLoad';

test('drafts retain a genuine zero total and zero components', () => {
  assert.equal(hasMarksDraftValues({ marksObtained: '0', breakdown: {} }), true);
  assert.equal(hasMarksDraftValues({ marksObtained: '', breakdown: { Written: '0' } }), true);
});
test('absent-only drafts persist while untouched blank rows do not', () => {
  assert.equal(hasMarksDraftValues({ marksObtained: '', breakdown: {}, isAbsent: true }), true);
  assert.equal(hasMarksDraftValues({ marksObtained: '', breakdown: {} }), false);
});
test('failed roster reads reject rather than turning into an empty roster', async () => {
  await assert.rejects(readMarksRoster(new Response('{"error":"Database unavailable"}', { status: 503 })), /Database unavailable/);
});
test('successful empty roster remains valid and malformed responses reject', async () => {
  assert.deepEqual(await readMarksRoster(new Response('{"marks":{},"isLocked":false}')), { marks: {}, isLocked: false });
  await assert.rejects(readMarksRoster(new Response('{"error":"unexpected"}')), /Invalid marks response/);
});
test('superseded and aborted requests cannot commit even for the same scope', () => {
  const guard = createMarksLoadGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  second.abort();
  assert.equal(second.isCurrent(), false);
});
