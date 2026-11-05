import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const boundary = readFileSync('src/components/BillingDataBoundary.tsx', 'utf8');
const auth = readFileSync('src/context/AuthContext.tsx', 'utf8');
test('fee counter does not request the school-wide snapshot', () => {
  const tabs = boundary.match(/const detailTabs = new Set\((.*)\)/)?.[1] || '';
  assert.ok(!tabs.includes("'collect'"));
  const counter = readFileSync('src/components/accountant/FeeCollectTab.tsx', 'utf8');
  assert.ok(!counter.includes('if (!studentsLoaded || !billingLoaded)'));
});
test('verified student dues are not rejected when optional dashboard summary fails', () => {
  const scoped = auth.slice(auth.indexOf('const refreshStudentBilling ='), auth.indexOf('// ── Multi-Device'));
  assert.ok(!scoped.includes('Payment totals could not be refreshed'));
});
test('older billing snapshots are loaded only on explicit request', () => {
  assert.match(auth, /loadOlderBilling/);
  assert.match(boundary, /Load older records/);
});

test('dashboard does not automatically download full-school billing', () => {
  const tabs = boundary.match(/const detailTabs = new Set\((.*)\)/)?.[1] || '';
  assert.ok(!tabs.includes("'dashboard'"));
  assert.ok(!boundary.includes('Load detailed dashboard'));
  assert.ok(!boundary.includes('Financial overview'));
  assert.ok(!boundary.includes('Recent records are loaded'));
});

test('background sync cannot download school history when no detailed report is loaded', () => {
  const sync = auth.slice(auth.indexOf('const checkAndSyncBilling ='), auth.indexOf('const intervalId =', auth.indexOf('const checkAndSyncBilling =')));
  assert.match(sync, /billingViewRef.current/);
  assert.match(sync, /!view.detailsLoaded/);
  assert.ok(sync.indexOf('dashboardRefreshRef.current()') < sync.indexOf('if (!view.detailsLoaded)'));
});
