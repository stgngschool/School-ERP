import assert from "node:assert/strict";
import { test } from "node:test";
import { createSyncCoordinator } from "../src/lib/googleSyncCoordinator";
import type { PrismaClient } from "@prisma/client";
import { fetchDirectoryStudents } from "../src/lib/googleSyncData";
import { liveReceiptSelect } from "../src/lib/googleSyncData";

test('live receipt append selects only export fields without full student or ledger records', () => {
  assert.equal(liveReceiptSelect.student.select.name, true);
  assert.equal(liveReceiptSelect.items.select.ledgerEntry.select.description, true);
  assert.equal('include' in liveReceiptSelect.student, false);
  assert.equal('photoUrl' in liveReceiptSelect.student.select, false);
});

test("concurrent calls for the same spreadsheet/action share one operation", async () => {
  const run = createSyncCoordinator();
  let calls = 0;
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const operation = async () => { calls++; await pending; return { success: true, count: 7 }; };
  const first = run("sheet-a", "SYNC_ALL", operation);
  const second = run("sheet-a", "SYNC_ALL", operation);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish();
  assert.deepEqual(await first, { success: true, count: 7 });
  assert.deepEqual(await second, { success: true, count: 7 });
});

test("cooldown begins on successful completion and expires after two minutes", async () => {
  let now = 1_000;
  const run = createSyncCoordinator(() => now);
  let calls = 0;
  const operation = async () => { calls++; now = 100_000; return { success: true, count: 3 }; };
  await run("sheet-a", "SYNC_DIRECTORY", operation);
  now = 219_999;
  const cached = await run("sheet-a", "SYNC_DIRECTORY", operation);
  assert.equal(calls, 1);
  assert.equal(cached.skipped, true);
  assert.equal(cached.count, 3);
  assert.equal(cached.lastSynced, new Date(100_000).toISOString());
  now = 220_000;
  await run("sheet-a", "SYNC_DIRECTORY", operation);
  assert.equal(calls, 2);
});

test("different spreadsheets and actions do not share completed cooldowns", async () => {
  const run = createSyncCoordinator();
  let calls = 0;
  const operation = async () => ({ success: true, count: ++calls });
  assert.equal((await run("sheet-a", "SYNC_MARKS", operation)).count, 1);
  assert.equal((await run("sheet-b", "SYNC_MARKS", operation)).count, 2);
  assert.equal((await run("sheet-a", "SYNC_RECEIPTS", operation)).count, 3);
});

test("rejected and unsuccessful operations can be retried immediately", async () => {
  const run = createSyncCoordinator();
  await assert.rejects(run("sheet-a", "SYNC_LEDGER", async () => { throw new Error("write failed"); }), /write failed/);
  assert.deepEqual(await run("sheet-a", "SYNC_LEDGER", async () => ({ success: false })), { success: false });
  assert.deepEqual(await run("sheet-a", "SYNC_LEDGER", async () => ({ success: true, count: 2 })), { success: true, count: 2 });
});

test("all sync actions use independent cooldowns", async () => {
  const run = createSyncCoordinator();
  for (const action of ["SYNC_DIRECTORY", "SYNC_FEE_REGISTER", "SYNC_STUDENTS", "SYNC_RECEIPTS", "SYNC_LEDGER", "SYNC_MARKS", "SYNC_ALL"] as const) {
    let calls = 0;
    const operation = async () => ({ success: true, count: ++calls });
    await run("sheet", action, operation);
    assert.equal((await run("sheet", action, operation)).skipped, true);
    assert.equal(calls, 1);
  }
});

test("directory-only sync preserves all-time totals without transferring ledger details", async () => {
  const entries = [
    { studentId: "a", entryType: "CHARGE", amount: 10_000 },
    { studentId: "a", entryType: "CHARGE", amount: -500 },
    { studentId: "a", entryType: "FINE", amount: 200 },
    { studentId: "a", entryType: "PAYMENT", amount: -3_000 },
    { studentId: "a", entryType: "PAYMENT", amount: 200 },
    { studentId: "a", entryType: "DISCOUNT", amount: -1_000 },
    { studentId: "a", entryType: "DISCOUNT", amount: 100 },
    { studentId: "a", entryType: "REVERSAL", amount: 4_000 },
  ];
  const fakeDb = {
    student: { findMany: async (args: { select: Record<string, unknown>; where?: unknown; take?: unknown }) => {
      assert.equal(args.select.ledgerEntries, undefined, "directory must not load ledger entries/receipt allocations");
      assert.equal(args.where, undefined, "preserve inactive students and all history");
      assert.equal(args.take, undefined, "do not truncate directory");
      assert.deepEqual(args.select.parentProfile, { select: { familyCode: true, address: true, user: { select: { phone: true, email: true } } } });
      return [{ id: "a", name: "Student A" }, { id: "b", name: "Student B" }];
    } },
    ledgerEntry: { groupBy: async ({ where }: { where: { amount: { lt?: number; gte?: number }; entryType: { in: string[] } } }) => {
      const groups = new Map<string, { studentId: string; entryType: string; _sum: { amount: number } }>();
      for (const entry of entries) {
        if (!where.entryType.in.includes(entry.entryType)) continue;
        if (where.amount.lt !== undefined && entry.amount >= where.amount.lt) continue;
        if (where.amount.gte !== undefined && entry.amount < where.amount.gte) continue;
        const key = `${entry.studentId}:${entry.entryType}`;
        const group = groups.get(key) ?? { studentId: entry.studentId, entryType: entry.entryType, _sum: { amount: 0 } };
        group._sum.amount += entry.amount;
        groups.set(key, group);
      }
      return [...groups.values()];
    } },
  } as unknown as PrismaClient;
  const students = await fetchDirectoryStudents(fakeDb);
  assert.deepEqual(students.map((student) => student.financialTotals), [
    { totalChargesPaisa: 9_700, totalPaymentsPaisa: 3_200, totalDiscountsPaisa: 1_100 },
    { totalChargesPaisa: 0, totalPaymentsPaisa: 0, totalDiscountsPaisa: 0 },
  ]);
});
