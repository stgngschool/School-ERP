import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as currency from '../src/lib/currency';
import * as dates from '../src/lib/dateUtils';
import * as whatsapp from '../src/lib/whatsapp';

// Render the actual overview components without loading AuthProvider, a database,
// or network modules. Report values deliberately differ from the empty detail arrays.
function renderOverview(kind: 'admin' | 'accountant', report: any) {
  const path = kind === 'admin' ? '../src/components/admin/DashboardOverviewTab.tsx' : '../src/components/accountant/AccountantOverviewTab.tsx';
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const icon = () => React.createElement('span');
  const dependencies: Record<string, any> = {
    react: React, 'react/jsx-runtime': jsx,
    'lucide-react': new Proxy({}, { get: () => icon }),
    '@/context/AuthContext': { useAuth: () => ({ dashboardBilling: report }) },
    '@/lib/currency': currency, '@/lib/dateUtils': dates, '@/lib/whatsapp': whatsapp,
    '@/components/icons/WhatsAppIcon': { WhatsAppIcon: icon },
    '@/components/admin/MonthlyCollectionChart': { __esModule: true, default: (props: any) => React.createElement('span', { 'data-april': props.values.Apr }) },
  };
  const module = { exports: {} as any };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name: string) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dashboard dependency: ${name}`);
    return dependencies[name];
  }, console });
  const props = {
    user: { id: 'cashier', name: 'Cashier' }, schoolInfo: { name: 'School' },
    students: [{ id: 'child', name: 'Overdue Child', class: '5', section: 'A' }],
    dueItems: [], receipts: [], ledgerEntries: [], classes: [], usersList: [], eventsList: [],
    billingSummary: null, studentsLoaded: true, billingLoaded: false,
    attendanceLoaded: false, attendances: [], setActiveTab() {}, updateSchoolInfo() {}, addEvent() {}, setSelectedStudentId() {},
    onSelectStudentForPayment() {}, onOpenReceipt() {},
  };
  return renderToStaticMarkup(React.createElement(module.exports.default, props));
}

const receipt = { id: 'real', receiptNo: 'REAL-RECEIPT-42', studentName: 'Paid Child', createdAt: '2026-11-05', amount: 12345, method: 'CASH', status: 'ACTIVE' };
const report = {
  totalEarnings: 50000, currentOverdueAmount: 25000, futureUnbilledAmount: 5000, totalDues: 30000,
  overdueCount: 45, overdueStudentCount: 18, cashTally: 40000, upiTally: 10000, bankTally: 0,
  todayCash: 6000, todayUpi: 1000, todayBank: 0, todayTotal: 7000, monthlyTotal: 20000,
  monthlyRevenue: { Apr: 918273 }, collectorsList: [{ name: 'Report Cashier', role: 'ACCOUNTANT', count: 37, total: 50000 }],
  topDefaulters: [{ id: 'child', amount: 25000, count: 3, dues: [] }],
  classCollectionsList: [{ className: 'Report Class', collected: 50000, dues: 30000, count: 10, efficiency: 63 }],
  recentReceipts: [receipt], ownRecentReceipts: [receipt], ownToday: { cash: 6000, upi: 1000, bank: 0, total: 7000, count: 29 },
};

test('admin original dashboard uses compact report for chart, collectors, classes and actual receipts', () => {
  const html = renderOverview('admin', report);
  for (const value of ['Welcome back', 'Report Cashier', 'Report Class', 'REAL-RECEIPT-42', 'Overdue Child', 'data-april="918273"']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('No fee defaulters recorded'));
});

test('accountant counter count comes from own aggregate rather than the six recent receipt rows', () => {
  const html = renderOverview('accountant', report);
  assert.match(html, /29 <span[^>]*>Vouchers/);
  assert.match(html, /18 <span[^>]*>Students/);
  assert.ok(html.includes('REAL-RECEIPT-42'));
  assert.ok(html.includes('Overdue Child'));
});

test('unloaded dashboards do not claim no defaulters or no receipts', () => {
  for (const kind of ['admin', 'accountant'] as const) {
    const html = renderOverview(kind, null);
    assert.ok(html.includes('Loading overdue accounts'));
    assert.ok(!html.includes('No fee defaulters recorded'));
    assert.ok(!html.includes('No overdue defaulters pending'));
    assert.ok(!html.includes('No receipts found yet'));
  }
});
