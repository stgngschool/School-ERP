import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardBilling, dashboardDueDateSQL } from '../src/lib/dashboardBilling';
import { PGlite } from '@electric-sql/pglite';
import { getChargeDueDate } from '../src/lib/lateFees';

process.env.RECEIPT_VERIFY_SECRET ||= 'isolated-dashboard-test-key';

test('dashboard report uses bounded actual receipt records and user-specific totals', async () => {
  const queries: { sql: string; values: unknown[] }[] = [];
  const findQueries: unknown[] = [];
  const receipt = { id: 'receipt-real', receiptNumber: 'REC-001', studentId: 'student', amountPaid: 25000, status: 'ACTIVE', paymentMethod: 'CASH', createdById: 'cashier', createdAt: new Date('2026-11-04T19:00:00Z'), remarks: JSON.stringify({ subtotal: 30000, discount: 5000, arrears: 0, items: [{ name: 'Tuition', amount: 25000 }] }), student: { id: 'student', name: 'Child', admissionNumber: 'A1', rollNumber: '3', fatherName: 'Parent', class: { name: '1', section: 'A' } }, createdBy: { name: 'Cashier', role: 'ACCOUNTANT' } };
  const db = {
    $queryRawUnsafe: async (sql: string, ...values: unknown[]) => {
      queries.push({ sql, values });
      return [{ report: { totalEarnings: 25000, monthlyRevenue: { Nov: 25000 }, topDefaulters: [], ownToday: { total: 25000, cash: 25000, upi: 0, bank: 0, count: 1 } } }];
    },
    receipt: { findMany: async (query: unknown) => { findQueries.push(query); return [receipt]; } },
  };
  const report = await dashboardBilling(db as never, new Date('2026-04-01'), 'cashier', new Date('2026-11-05T01:00:00Z'));
  assert.equal(queries.length, 1);
  assert.equal(queries[0].values[2], 'cashier');
  assert.equal(queries[0].values[1], '2026-11-05');
  assert.equal(report.recentReceipts[0].id, 'receipt-real');
  assert.equal(report.recentReceipts[0].createdAt, '2026-11-05');
  assert.equal(report.recentReceipts[0].receiptNo, 'REC-001');
  assert.equal(report.recentReceipts[0].discount, 5000);
  assert.equal(report.recentReceipts[0].studentName, 'Child');
  assert.equal(report.ownRecentReceipts[0].createdById, 'cashier');
  assert.equal(report.ownToday.total, 25000);
  for (const query of findQueries) assert.equal((query as { take: number }).take, 6);
});

test('PostgreSQL dashboard due dates match monthly, examination, annual and fallback billing rules', async () => {
  const pg = new PGlite();
  try {
    const descriptions = ['Tuition April', 'Tuition July', 'Unit 1 July', 'Half Yearly October', 'Unit 2 December', 'Yearly Exam March', 'Tuition January', 'Tuition February', 'Annual Fee', 'Annual Exam', 'Admission', 'Previous session', 'M/S', 'Unit-1', 'Unit1', 'Half-yearly', 'Unit-2', 'Other charge'];
    const createdAt = '2026-04-01T00:00:00Z';
    for (const name of descriptions) {
      const label = `${name} 2026-2027`;
      const { rows } = await pg.query<{ due: string }>(`SELECT to_char(${dashboardDueDateSQL},'YYYY-MM-DD') AS due FROM (SELECT $1::text AS label,2026 AS sy,2027 AS ey,$2::timestamp AS "createdAt") input`, [label.toLowerCase(), createdAt]);
      assert.equal(rows[0].due, getChargeDueDate(label, Date.parse(createdAt) + 15 * 86400000), name);
    }
  } finally { await pg.close(); }
});

test('actual PostgreSQL report excludes reversals and future sessions, deducts discounts, and allocates family payments by class', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE TABLE "AcademicSession" (id text PRIMARY KEY,name text,"startDate" timestamp);
      CREATE TABLE "Class" (id text PRIMARY KEY,name text,section text);
      CREATE TABLE "Student" (id text PRIMARY KEY,"classId" text);
      CREATE TABLE "User" (id text PRIMARY KEY,name text,role text);
      CREATE TABLE "LedgerEntry" (id text PRIMARY KEY,"studentId" text,"sessionId" text,"entryType" text,amount integer,description text,"referenceId" text,"createdAt" timestamp);
      CREATE TABLE "Receipt" (id text PRIMARY KEY,status text,"createdById" text,"paymentMethod" text,"createdAt" timestamp);
      CREATE TABLE "ReceiptItem" ("receiptId" text,"ledgerEntryId" text,amount integer);
      INSERT INTO "AcademicSession" VALUES ('old','2025-2026','2025-04-01'),('current','2026-2027','2026-04-01'),('future','2027-2028','2027-04-01');
      INSERT INTO "Class" VALUES ('a','1','A'),('b','2','A');
      INSERT INTO "Student" VALUES ('one','a'),('two','b');
      INSERT INTO "User" VALUES ('cashier','Cashier','ACCOUNTANT');
      INSERT INTO "LedgerEntry" VALUES
        ('old-fee','one','old','CHARGE',10000,'Assigned: Tuition April',NULL,'2025-04-01'),
        ('current-fee','one','current','CHARGE',20000,'Assigned: Tuition November',NULL,'2026-04-01'),
        ('second-fee','two','current','CHARGE',10000,'Assigned: Tuition April',NULL,'2026-04-01'),
        ('future-month','two','current','CHARGE',15000,'Assigned: Tuition January',NULL,'2026-04-01'),
        ('future-year','one','future','CHARGE',99999,'Assigned: Tuition April',NULL,'2027-04-01'),
        ('discount','one','old','DISCOUNT',-2000,'Concession Waiver: Tuition April',NULL,'2025-04-01'),
        ('reversed-discount','one','current','DISCOUNT',-7000,'Discount for: Tuition November','reversed','2026-11-01');
      INSERT INTO "Receipt" VALUES ('family','ACTIVE','cashier','CASH','2026-11-04 19:00:00'),('reversed','REVERSED','cashier','UPI','2026-11-05'),('future-payment','ACTIVE','cashier','UPI','2026-11-05');
      INSERT INTO "ReceiptItem" VALUES ('family','old-fee',3000),('family','second-fee',4000),('reversed','current-fee',9000),('future-payment','future-year',9999);
    `);
    const db = {
      $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await pg.query(sql, values)).rows,
      receipt: { findMany: async () => [] },
    };
    const report = await dashboardBilling(db as never, new Date('2026-04-01'), 'cashier', new Date('2026-11-05T01:00:00Z'));
    assert.equal(report.totalEarnings, 7000);
    assert.equal(report.todayTotal, 7000, 'UTC evening receipt belongs to next IST day');
    assert.equal(report.currentOverdueAmount, 11000, 'November 10 fee is not overdue on November 5');
    assert.equal(report.futureUnbilledAmount, 35000);
    assert.equal(report.totalDues, 46000);
    assert.equal(report.overdueCount, 2);
    assert.equal(report.overdueStudentCount, 2);
    assert.equal(report.monthlyRevenue.Nov, 7000);
    assert.equal(report.ownToday.count, 1, 'family receipt counted once');
    assert.equal(report.collectorsList[0].total, 7000);
    assert.equal(report.classCollectionsList.find(row => row.className === '1')?.collected, 3000);
    assert.equal(report.classCollectionsList.find(row => row.className === '2')?.collected, 4000);
    assert.equal(report.topDefaulters[0].id, 'two');
    assert.equal(report.topDefaulters[0].dues[0].name, 'Tuition April');
  } finally { await pg.close(); }
});

test('dashboard SQL aggregates authoritative active allocations and matching discounts with payable session scope', async () => {
  let sql = '';
  const db = {
    $queryRawUnsafe: async (query: string) => { sql = query; return [{ report: {} }]; },
    receipt: { findMany: async () => [] },
  };
  const report = await dashboardBilling(db as never, new Date('2026-04-01'), 'cashier');
  assert.ok(sql.includes('IS NOT DISTINCT FROM'));
  assert.ok(sql.includes('d."studentId" = c."studentId"'));
  assert.ok(sql.includes("r.status = 'ACTIVE'"));
  assert.ok(sql.includes('s."startDate" <= $1'));
  assert.ok(sql.includes('LIMIT 5'));
  assert.equal(Object.keys(report.monthlyRevenue).length, 12);
  assert.equal(report.recentReceipts.length, 0);
  assert.equal(report.totalDues, 0);
});
