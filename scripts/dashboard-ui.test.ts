import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import type { DashboardBilling } from '../src/lib/dashboardBilling';

const requireModule = createRequire(path.resolve('package.json'));
const aggregate: DashboardBilling = {
  totalEarnings: 1234500, currentOverdueAmount: 78900, futureUnbilledAmount: 0, totalDues: 78900,
  overdueCount: 7, defaultersCount: 3, cashTally: 20000, upiTally: 10000, bankTally: 0,
  todayCash: 20000, todayUpi: 10000, todayBank: 0, todayTotal: 30000, todayReceiptCount: 12,
  monthlyTotal: 45600, monthlyRevenue: { Apr: 1234500 }, collectorsList: [], classCollectionsList: [],
  topDefaulters: [], recentReceipts: [], generatedAt: '2026-11-05T00:00:00Z',
};
const props = {
  user: { name: 'Cashier' }, schoolInfo: { name: 'Test School' }, students: [],
  // These intentionally disagree with the endpoint and must never drive overview finances.
  dueItems: [{ status: 'UNPAID', amount: 999999999 }], receipts: [{ amount: 999999999 }],
  ledgerEntries: [], classes: [], usersList: [], billingSummary: {}, billingLoaded: true,
  studentsLoaded: true, attendanceLoaded: true, attendances: [], eventsList: [],
  updateSchoolInfo() {}, setActiveTab() {}, addEvent() {}, setSelectedStudentId() {},
  onSelectStudentForPayment() {}, onOpenReceipt() {},
};

function harness(file: string, fakeHooks = false, globals: Record<string, unknown> = {}, propOverrides: Record<string, unknown> = {}) {
  let dashboardBilling: DashboardBilling | null = aggregate;
  let dashboardBillingLoaded = true;
  let cursor = 0;
  const state: unknown[] = [];
  const storage = new Map<string, string>();
  const fakeReact = {
    ...React,
    useState(initial: unknown) {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
      return [state[slot], (next: unknown) => {
        state[slot] = typeof next === 'function' ? next(state[slot]) : next;
      }];
    },
    useEffect() {},
    useRef(initial: unknown) {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = { current: initial };
      return state[slot];
    },
  };
  const module = { exports: {} as { default: React.ComponentType<any> } };
  const javascript = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const customRequire = (id: string) => {
    if (id === 'react' && fakeHooks) return { __esModule: true, default: fakeReact, ...fakeReact };
    if (id === '@/context/AuthContext') return { useAuth: () => ({ dashboardBilling, dashboardBillingLoaded, refreshDashboardBilling() {} }) };
    if (id === '@/lib/whatsapp') return requireModule(path.resolve('src/lib/whatsapp.ts'));
    if (id === '@/lib/currency') return { formatP: (value: number) => `INR${value / 100}` };
    if (id === '@/lib/dateUtils') return {
      getTodayIST: () => '2026-11-05', getISTDateString: (value: string) => value,
      formatCanonicalDOBIso: (value: string) => value,
      MONTHS_CANONICAL: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    };
    if (id.startsWith('@/components/')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : () => null });
    return requireModule(id);
  };
  vm.runInNewContext(javascript, {
    module, exports: module.exports, require: customRequire, console, Date, window: {}, ...globals,
    localStorage: { getItem: (key: string) => storage.get(key) ?? 'false', setItem: (key: string, value: string) => storage.set(key, value) },
  });
  return {
    setBilling(value: DashboardBilling | null, loaded: boolean) { dashboardBilling = value; dashboardBillingLoaded = loaded; },
    html: () => renderToStaticMarkup(React.createElement(module.exports.default, { ...props, ...propOverrides })),
    tree: () => { cursor = 0; return (module.exports.default as (props: any) => React.ReactNode)({ ...props, ...propOverrides }); },
  };
}

// Expand only the local privacy controls; other components are irrelevant to these interactions.
function buttons(node: React.ReactNode): React.ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!React.isValidElement<any>(node)) return [];
  if (typeof node.type === 'function' && node.type.name === 'PrivacyEyeButton') {
    return buttons((node.type as (props: any) => React.ReactNode)(node.props));
  }
  return [...(node.type === 'button' ? [node] : []), ...buttons((node.props as { children?: React.ReactNode }).children)];
}

for (const [role, file, title] of [
  ['admin', 'src/components/admin/DashboardOverviewTab.tsx', 'Collected Revenue'],
  ['accountant', 'src/components/accountant/AccountantOverviewTab.tsx', 'Counter Collections'],
] as const) {
  test(`${role} renders complete aggregate amounts despite conflicting raw billing props`, () => {
    const ui = harness(file);
    const html = ui.html();
    assert.doesNotMatch(html, /9999999/);
    if (role === 'admin') {
      assert.match(html, /INR12345/);
      assert.match(html, /7 overdue/);
      assert.match(html, /INR789/);
    } else {
      assert.match(html, /INR300/);
      assert.match(html, /12 <span[^>]*>Vouchers/);
      assert.match(html, /INR200/);
    }
  });

  test(`${role} loading and failed aggregates do not fabricate financial zeros or empty lists`, () => {
    const ui = harness(file);
    ui.setBilling(null, false);
    let html = ui.html();
    assert.match(html, /Loading dashboard figures/);
    assert.match(html, /aria-busy="true"/);
    assert.doesNotMatch(html, /No receipts found|No fee defaulters|No overdue defaulters|INR0/);
    ui.setBilling(null, true);
    html = ui.html();
    assert.match(html, /Retry dashboard/);
    assert.doesNotMatch(html, /INR0/);
  });

  test(`${role} individual privacy overrides work after global reveal and reset on global toggles`, () => {
    const ui = harness(file, true);
    const card = () => {
      const button = buttons(ui.tree()).find(button => button.props['aria-label'] === `Hide ${title}` || button.props['aria-label'] === `Reveal ${title}`);
      assert.ok(button);
      return button;
    };
    const global = () => {
      const button = buttons(ui.tree()).find(button => button.props.onClick?.name === 'toggleGlobalPrivacy');
      assert.ok(button);
      return button;
    };
    const click = (button: React.ReactElement<any>) => button.props.onClick({ stopPropagation() {} });
    assert.equal(card().props['aria-label'], `Hide ${title}`);
    click(card());
    assert.equal(card().props['aria-label'], `Reveal ${title}`);
    click(card());
    assert.equal(card().props['aria-label'], `Hide ${title}`);
    click(global());
    assert.equal(card().props['aria-label'], `Reveal ${title}`);
    click(card());
    assert.equal(card().props['aria-label'], `Hide ${title}`);
    click(global());
    assert.equal(card().props['aria-label'], `Hide ${title}`);
    click(card());
    assert.equal(card().props['aria-label'], `Reveal ${title}`);
  });
}



test('admin prepares both WhatsApp controls lazily with current overdue items only', async () => {
  let resolveBilling!: (value: unknown) => void;
  const pending = new Promise(resolve => { resolveBilling = resolve; });
  const requests: string[] = [];
  const popup = { opener: {}, location: { href: 'about:blank' }, close() {} };
  let opened = 0;
  const ui = harness('src/components/admin/DashboardOverviewTab.tsx', true, {
    window: { open() { opened++; return popup; } },
    fetch(url: string) { requests.push(url); return pending; },
  });
  ui.setBilling({ ...aggregate, topDefaulters: [{ id: 'student-1', name: 'Fresh Student', classSection: '3-A', amount: 78900, count: 2, phone: '9876543210', admNo: 'A1', dues: [] }] }, true);
  const reminders = () => buttons(ui.tree()).filter(button => button.props.title === 'Send WhatsApp Reminder');
  assert.equal(reminders().length, 2, 'mobile and desktop reminder controls remain available');
  assert.equal(requests.length, 0, 'overview rendering does not load student billing');
  reminders()[0].props.onClick();
  reminders()[1].props.onClick();
  assert.equal(opened, 1, 'duplicate clicks share one in-flight reminder');
  assert.deepEqual(requests, ['/api/billing?studentId=student-1']);
  assert.ok(reminders().every(button => button.props.disabled));
  resolveBilling({ ok: true, json: async () => ({ dueItems: [
    { id: 'real', studentId: 'student-1', status: 'UNPAID', name: 'Actual September fee', amount: 23400, dueDate: '2020-09-10' },
    { id: 'paid', studentId: 'student-1', status: 'PAID', name: 'Already paid', amount: 10000, dueDate: '2020-09-10' },
    { id: 'future', studentId: 'student-1', status: 'UNPAID', name: 'Future fee', amount: 40000, dueDate: '2100-09-10' },
    { id: 'other', studentId: 'student-2', status: 'UNPAID', name: 'Other student', amount: 90000, dueDate: '2020-09-10' },
  ] }) });
  await new Promise(resolve => setImmediate(resolve));
  const message = decodeURIComponent(popup.location.href);
  assert.match(message, /https:\/\/wa.me\/919876543210/);
  assert.match(message, /Actual September fee/);
  assert.doesNotMatch(message, /Already paid|Future fee|Other student|Outstanding School Fee/);
  assert.ok(reminders().every(button => !button.props.disabled));
});
