import test from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { buildExportSearchWhere, matchesExportSearch, getExportStudentSelect, readExportPages } from "../src/lib/exportQueries";

test("search intersects authorization and treats SQL wildcard characters as literals", () => {
  const scope = { classId: { in: ["teacher-class"] } };
  assert.deepEqual(buildExportSearchWhere(scope, "a%_\\b"), {
    AND: [scope, { OR: [
      { name: { contains: "a\\%\\_\\\\b", mode: "insensitive" } },
      { admissionNumber: { contains: "a\\%\\_\\\\b", mode: "insensitive" } },
      { fatherName: { contains: "a\\%\\_\\\\b", mode: "insensitive" } },
      { fatherMobile: { contains: "a\\%\\_\\\\b" } },
    ] }],
  });
  assert.deepEqual(buildExportSearchWhere({ id: "own-child" }, "asha"), {
    AND: [{ id: "own-child" }, { OR: [
      { name: { contains: "asha", mode: "insensitive" } },
      { admissionNumber: { contains: "asha", mode: "insensitive" } },
      { fatherName: { contains: "asha", mode: "insensitive" } },
      { fatherMobile: { contains: "asha" } },
    ] }],
  });
});

test("Unicode and empty searches preserve scope for exact JavaScript matching", () => {
  const scope = { id: { in: ["own-child"] } };
  assert.deepEqual(buildExportSearchWhere(scope, ""), scope);
  assert.deepEqual(buildExportSearchWhere(scope, "आरव"), scope);
  const student = { name: "İsha आरव", admissionNumber: "ADM%_1", fatherName: null, fatherMobile: "AB123" };
  assert.equal(matchesExportSearch(student, "i\u0307sha"), true);
  assert.equal(matchesExportSearch(student, "आरव"), true);
  assert.equal(matchesExportSearch(student, "%_"), true);
  assert.equal(matchesExportSearch(student, "ab123"), false);
  assert.equal(matchesExportSearch(student, "123"), true);
  assert.equal(matchesExportSearch(student, "missing"), false);
});

test("projections retain every exported directory field and active monetary allocation", () => {
  const select = getExportStudentSelect("directory");
  const fields = ["id", "name", "admissionNumber", "rollNumber", "gender", "dob", "admissionDate", "status", "category", "isRte", "fatherName", "fatherMobile", "motherName", "motherMobile", "aadhaar", "fatherAadhaar", "motherAadhaar", "religion", "motherTongue", "nationality", "disability", "parentOccupation", "familyIncome", "emergencyName", "emergencyPhone", "transportMode", "busRoute", "busStop", "prevSchoolName", "prevClassPassed", "tcNumber", "boardRegNo"];
  for (const field of fields) assert.equal((select as Record<string, unknown>)[field], true, field);
  assert.equal("photoUrl" in select, false);
  assert.equal("concessionId" in select, false);
  assert.deepEqual(select.class, { select: { name: true, section: true } });
  assert.deepEqual(select.parentProfile, { select: { familyCode: true, address: true, user: { select: { name: true, phone: true, email: true } } } });
  const ledger = select.ledgerEntries as Prisma.LedgerEntryFindManyArgs;
  assert.deepEqual(ledger.where, { entryType: "CHARGE" });
  assert.deepEqual(ledger.select, { amount: true, receiptItems: { where: { receipt: { status: "ACTIVE" } }, select: { amount: true } } });
  assert.equal(ledger.take, undefined, "financial history must not be truncated");
  assert.deepEqual(getExportStudentSelect("students"), select);
});

test("statement keeps dates and register fallback fields without directory personal data", () => {
  for (const type of ["register", "statement", "unknown"]) {
    const select = getExportStudentSelect(type);
    assert.equal("aadhaar" in select, false);
    assert.equal("dob" in select, false);
    assert.equal(select.fatherName, true);
    assert.equal(select.fatherMobile, true);
    assert.deepEqual(select.parentProfile, { select: { user: { select: { name: true, phone: true } } } });
    const ledger = select.ledgerEntries as Prisma.LedgerEntryFindManyArgs;
    assert.equal(ledger.select?.amount, true);
    assert.equal(ledger.select?.description, true);
    assert.equal(Boolean(ledger.select?.createdAt), type === "statement");
    assert.equal(ledger.take, undefined);
  }
});

test("bounded export pages include all rows and continue from the last student", async () => {
  const fixtures = Array.from({ length: 603 }, (_, i) => ({ id: `student-${i}`, amount: i * 101 }));
  const cursors: (string | undefined)[] = [];
  const rows = await readExportPages(async (cursor, pageSize) => {
    assert.ok(pageSize > 0 && pageSize <= 500);
    cursors.push(cursor);
    const from = cursor ? fixtures.findIndex(row => row.id === cursor) + 1 : 0;
    return fixtures.slice(from, from + pageSize);
  });
  assert.deepEqual(rows, fixtures);
  assert.ok(cursors.length > 1);
  assert.equal(cursors[0], undefined);
  assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), 18331803);
});

test("an exact batch boundary and an empty result do not truncate exports or loop", async () => {
  const fixtures = Array.from({ length: 500 }, (_, i) => ({ id: String(i) }));
  let calls = 0;
  const rows = await readExportPages(async (cursor, pageSize) => {
    calls++;
    const from = cursor === undefined ? 0 : Number(cursor) + 1;
    return fixtures.slice(from, from + pageSize);
  });
  assert.deepEqual(rows, fixtures);
  assert.equal(calls, 3);
  assert.deepEqual(await readExportPages(async () => []), []);
});
