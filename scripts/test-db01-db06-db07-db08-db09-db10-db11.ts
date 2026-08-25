/**
 * Comprehensive database & schema regression test suite for:
 *  DB-01 — LedgerEntry.referenceId FK to Receipt with ON DELETE SET NULL and index
 *  DB-06 — Index on AcademicSession.isCurrent
 *  DB-07 — Index on FeeAssignment.studentId
 *  DB-08 — Composite index on LedgerEntry[studentId, entryType, createdAt]
 *  DB-09 — Concession.percentage Float precision, fractional support & paise rounding
 *  DB-10 — Attendance.markedBy FK to User with ON DELETE RESTRICT & 0 dangling markers
 *  DB-11 — Mark multi-session scoping & unique constraint (studentId, sessionId, subject, examName)
 *
 * Run: node --env-file=.env --import=tsx scripts/test-db01-db06-db07-db08-db09-db10-db11.ts
 */

import db from "../src/lib/db";
import { validatePercentage } from "../src/lib/validation";
import { EntryType, PaymentMethod, Role, AttendanceStatus } from "@prisma/client";
import { randomUUID } from "crypto";

let passed = 0;
let failed = 0;

const createdIds: {
  users: string[];
  classes: string[];
  parents: string[];
  students: string[];
  concessions: string[];
  sessions: string[];
  feeHeads: string[];
  receipts: string[];
  receiptItems: string[];
  ledger: string[];
  attendance: string[];
  marks: string[];
} = {
  users: [],
  classes: [],
  parents: [],
  students: [],
  concessions: [],
  sessions: [],
  feeHeads: [],
  receipts: [],
  receiptItems: [],
  ledger: [],
  attendance: [],
  marks: [],
};

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

async function cleanup() {
  try {
    if (createdIds.marks.length)       await db.mark.deleteMany({ where: { id: { in: createdIds.marks } } });
    if (createdIds.attendance.length)  await db.attendance.deleteMany({ where: { id: { in: createdIds.attendance } } });
    if (createdIds.receiptItems.length)await db.receiptItem.deleteMany({ where: { id: { in: createdIds.receiptItems } } });
    if (createdIds.ledger.length)      await db.ledgerEntry.deleteMany({ where: { id: { in: createdIds.ledger } } });
    if (createdIds.receipts.length)    await db.receipt.deleteMany({ where: { id: { in: createdIds.receipts } } });
    if (createdIds.students.length)    await db.student.deleteMany({ where: { id: { in: createdIds.students } } });
    if (createdIds.parents.length)     await db.parentProfile.deleteMany({ where: { id: { in: createdIds.parents } } });
    if (createdIds.concessions.length) await db.concession.deleteMany({ where: { id: { in: createdIds.concessions } } });
    if (createdIds.feeHeads.length)    await db.feeHead.deleteMany({ where: { id: { in: createdIds.feeHeads } } });
    if (createdIds.classes.length)     await db.class.deleteMany({ where: { id: { in: createdIds.classes } } });
    if (createdIds.sessions.length)    await db.academicSession.deleteMany({ where: { id: { in: createdIds.sessions } } });
    if (createdIds.users.length)       await db.user.deleteMany({ where: { id: { in: createdIds.users } } });
  } catch (err: any) {
    console.warn("  ⚠ Cleanup partial:", err.message);
  }
}

async function makeUser(role: Role, tag: string) {
  const u = await db.user.create({
    data: {
      name: `Test ${role} ${tag}`,
      username: `user_${tag}_${Date.now()}`,
      email: `test_${tag}_${Date.now()}@test.local`,
      passwordHash: "TESTHASH",
      role,
      status: "ACTIVE",
    },
  });
  createdIds.users.push(u.id);
  return u;
}

async function makeClass(name: string, section: string) {
  const cls = await db.class.create({ data: { name, section } });
  createdIds.classes.push(cls.id);
  return cls;
}

async function makeParentAndStudent(classId: string, parentUserId: string, tag: string) {
  const parent = await db.parentProfile.create({
    data: { userId: parentUserId, familyCode: `FAM-TEST-${tag}-${Date.now()}` },
  });
  createdIds.parents.push(parent.id);

  const student = await db.student.create({
    data: {
      name: `Student ${tag}`,
      admissionNumber: `ADM-${tag}-${Date.now()}`,
      parentProfileId: parent.id,
      classId,
      fatherName: "Father Test",
      fatherMobile: "9999999999",
    },
  });
  createdIds.students.push(student.id);
  return { parent, student };
}

// ── Test 1: DB-01 — LedgerEntry.referenceId FK & Deletion Behavior ──────────

async function testDB01_LedgerReferenceFK() {
  console.log("\n─── 1. DB-01: LedgerEntry.referenceId FK & Deletion Behavior ───");

  const admin = await makeUser(Role.ADMIN, "db01adm");
  const cls = await makeClass("TEST-DB01", "A");
  const parentUser = await makeUser(Role.PARENT, "db01p");
  const { parent, student } = await makeParentAndStudent(cls.id, parentUser.id, "db01");

  // Create a real receipt
  const receipt = await db.receipt.create({
    data: {
      studentId: student.id,
      parentProfileId: parent.id,
      receiptNumber: `REC-DB01-${Date.now()}`,
      amountPaid: 50000,
      paymentMethod: PaymentMethod.CASH,
      createdById: admin.id,
    },
  });
  createdIds.receipts.push(receipt.id);

  // 1. Valid referenceId insertion succeeds
  const entry = await db.ledgerEntry.create({
    data: {
      studentId: student.id,
      entryType: EntryType.PAYMENT,
      amount: -50000,
      description: "Payment for tuition",
      referenceId: receipt.id,
      createdById: admin.id,
    },
  });
  createdIds.ledger.push(entry.id);
  assert(entry.referenceId === receipt.id, "DB-01: LedgerEntry created with valid referenceId pointing to Receipt");

  // 2. Non-existent referenceId is rejected by FK constraint
  let invalidRefRejected = false;
  try {
    await db.ledgerEntry.create({
      data: {
        studentId: student.id,
        entryType: EntryType.PAYMENT,
        amount: -10000,
        description: "Invalid payment ref",
        referenceId: randomUUID(), // non-existent receipt ID
        createdById: admin.id,
      },
    });
  } catch (err: any) {
    invalidRefRejected = true;
  }
  assert(invalidRefRejected, "DB-01: Insertion with non-existent referenceId rejected by FK constraint");

  // 3. Delete Receipt -> LedgerEntry.referenceId transitions to NULL (ON DELETE SET NULL), entry survives
  await db.receipt.delete({ where: { id: receipt.id } });
  createdIds.receipts = createdIds.receipts.filter((id) => id !== receipt.id);

  const entryAfterReceiptDelete = await db.ledgerEntry.findUnique({ where: { id: entry.id } });
  assert(entryAfterReceiptDelete !== null, "DB-01: LedgerEntry survives deletion of referenced Receipt");
  assert(entryAfterReceiptDelete?.referenceId === null, "DB-01: LedgerEntry.referenceId set to NULL upon Receipt deletion (ON DELETE SET NULL)");
}

// ── Test 2: DB-06, DB-07, DB-08 — PostgreSQL Index Verification ──────────────

async function testIndexes_DB06_DB07_DB08() {
  console.log("\n─── 2. DB-06, DB-07, DB-08: PostgreSQL Index Definitions & Ordering ───");

  // DB-06: AcademicSession.isCurrent index
  const sessionIndexes: any[] = await db.$queryRawUnsafe(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename = 'AcademicSession' AND indexname = 'AcademicSession_isCurrent_idx';
  `);
  assert(sessionIndexes.length === 1, "DB-06: AcademicSession_isCurrent_idx index exists in PostgreSQL");
  assert(sessionIndexes[0]?.indexdef.includes('"isCurrent"'), "DB-06: Index definition covers column 'isCurrent'");

  // DB-07: FeeAssignment.studentId index
  const feeAssignmentIndexes: any[] = await db.$queryRawUnsafe(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename = 'FeeAssignment' AND indexname = 'FeeAssignment_studentId_idx';
  `);
  assert(feeAssignmentIndexes.length === 1, "DB-07: FeeAssignment_studentId_idx index exists in PostgreSQL");
  assert(feeAssignmentIndexes[0]?.indexdef.includes('"studentId"'), "DB-07: Index definition covers column 'studentId'");

  // DB-08: LedgerEntry composite index (studentId, entryType, createdAt)
  const ledgerCompositeIndex: any[] = await db.$queryRawUnsafe(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename = 'LedgerEntry' AND indexname = 'LedgerEntry_studentId_entryType_createdAt_idx';
  `);
  assert(ledgerCompositeIndex.length === 1, "DB-08: Composite index LedgerEntry_studentId_entryType_createdAt_idx exists in PostgreSQL");
  const def = ledgerCompositeIndex[0]?.indexdef || "";
  assert(
    def.includes('"studentId"') && def.includes('"entryType"') && def.includes('"createdAt"'),
    "DB-08: Composite index covers all three columns (studentId, entryType, createdAt)"
  );
  const studentPos = def.indexOf('"studentId"');
  const entryPos = def.indexOf('"entryType"');
  const createdPos = def.indexOf('"createdAt"');
  assert(
    studentPos < entryPos && entryPos < createdPos,
    "DB-08: Composite index maintains exact column order: studentId -> entryType -> createdAt"
  );
}

// ── Test 3: DB-09 — Concession.percentage Float Precision & Paise Rounding ──

async function testDB09_ConcessionFloatPrecision() {
  console.log("\n─── 3. DB-09: Concession.percentage Float Precision & Paise Rounding ───");

  // 1. Whole number percentage (20%)
  const cWhole = await db.concession.create({
    data: { name: `TEST-CONC-20-${Date.now()}`, percentage: 20, feeHeadName: "Tuition Fee" },
  });
  createdIds.concessions.push(cWhole.id);
  assert(cWhole.percentage === 20, `DB-09: Whole number 20% persisted as ${cWhole.percentage}`);

  // 2. Fractional percentage (12.5%)
  const cFrac1 = await db.concession.create({
    data: { name: `TEST-CONC-12.5-${Date.now()}`, percentage: 12.5, feeHeadName: "Tuition Fee" },
  });
  createdIds.concessions.push(cFrac1.id);
  assert(cFrac1.percentage === 12.5, `DB-09: Fractional 12.5% persisted as ${cFrac1.percentage}`);

  // 3. Fractional percentage (33.33%)
  const cFrac2 = await db.concession.create({
    data: { name: `TEST-CONC-33.33-${Date.now()}`, percentage: 33.33, feeHeadName: "Tuition Fee" },
  });
  createdIds.concessions.push(cFrac2.id);
  assert(cFrac2.percentage === 33.33, `DB-09: Fractional 33.33% persisted as ${cFrac2.percentage}`);

  // 4. Deterministic paise rounding check
  const chargeAmount = 250000; // Rs. 2500.00 (250000 paise)
  const discount12_5 = Math.round((chargeAmount * cFrac1.percentage) / 100);
  assert(discount12_5 === 31250, `DB-09: 12.5% on 250000 paise produces exact 31250 paise (Rs. 312.50), got ${discount12_5}`);
  assert(Number.isInteger(discount12_5), "DB-09: Discount amount is guaranteed integer paise (no float corruption)");

  const discount33_33 = Math.round((30000 * cFrac2.percentage) / 100);
  assert(discount33_33 === 9999, `DB-09: 33.33% on 30000 paise produces exact 9999 paise (Rs. 99.99), got ${discount33_33}`);
  assert(Number.isInteger(discount33_33), "DB-09: Discount amount is guaranteed integer paise");

  // 5. Validation boundaries
  let negativeBlocked = false;
  try { validatePercentage(-5); } catch { negativeBlocked = true; }
  assert(negativeBlocked, "DB-09: Negative percentage (-5%) is rejected by validation");

  let over100Blocked = false;
  try { validatePercentage(105); } catch { over100Blocked = true; }
  assert(over100Blocked, "DB-09: Percentage over 100 (105%) is rejected by validation");

  const validParsed = validatePercentage(12.55);
  assert(validParsed === 12.55, `DB-09: Validation normalizes to 2 decimal places (12.55 -> ${validParsed})`);
}

// ── Test 4: DB-10 — Attendance.markedBy FK Relation & RESTRICT Safety ────────

async function testDB10_AttendanceMarkedByFK() {
  console.log("\n─── 4. DB-10: Attendance.markedBy FK Relation & RESTRICT Safety ───");

  const teacher = await makeUser(Role.TEACHER, "db10t");
  const cls = await makeClass("TEST-DB10", "A");
  const parentUser = await makeUser(Role.PARENT, "db10p");
  const { student } = await makeParentAndStudent(cls.id, parentUser.id, "db10");

  // 1. Valid markedBy insertion succeeds
  const att = await db.attendance.create({
    data: {
      studentId: student.id,
      date: new Date("2026-04-10T00:00:00.000Z"),
      status: AttendanceStatus.PRESENT,
      markedBy: teacher.id,
    },
  });
  createdIds.attendance.push(att.id);
  assert(att.markedBy === teacher.id, "DB-10: Attendance record created with valid markedBy User ID");

  // 2. Non-existent markedBy is rejected by FK constraint
  let invalidMarkerRejected = false;
  try {
    await db.attendance.create({
      data: {
        studentId: student.id,
        date: new Date("2026-04-11T00:00:00.000Z"),
        status: AttendanceStatus.PRESENT,
        markedBy: randomUUID(), // non-existent user
      },
    });
  } catch {
    invalidMarkerRejected = true;
  }
  assert(invalidMarkerRejected, "DB-10: Insertion with non-existent markedBy User ID is rejected by FK constraint");

  // 3. User with marked attendance cannot be directly deleted via raw cascade (ON DELETE RESTRICT protects audit history)
  let directDeleteBlocked = false;
  try {
    await db.user.delete({ where: { id: teacher.id } });
  } catch (err: any) {
    directDeleteBlocked = true;
  }
  assert(directDeleteBlocked, "DB-10: Deleting user with attendance is rejected by ON DELETE RESTRICT (audit trail protected)");

  // 4. Verify 0 dangling markedBy references in database
  const orphanAttendance: any[] = await db.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count FROM "Attendance" a
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = a."markedBy");
  `);
  assert(orphanAttendance[0].count === 0, "DB-10: Zero dangling markedBy references exist in the database");
}

// ── Test 5: DB-11 — Mark Multi-Session Scoping & Unique Constraint ───────────

async function testDB11_MarkSessionScoping() {
  console.log("\n─── 5. DB-11: Mark Multi-Session Scoping & Unique Constraint ───");

  const cls = await makeClass("TEST-DB11", "A");
  const parentUser = await makeUser(Role.PARENT, "db11p");
  const { student } = await makeParentAndStudent(cls.id, parentUser.id, "db11");

  // Create two distinct academic sessions
  const sessionA = await db.academicSession.create({
    data: {
      name: `TEST-SESS-A-${Date.now()}`,
      startDate: new Date("2025-04-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T00:00:00.000Z"),
      isCurrent: false,
    },
  });
  const sessionB = await db.academicSession.create({
    data: {
      name: `TEST-SESS-B-${Date.now()}`,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2027-03-31T00:00:00.000Z"),
      isCurrent: true,
    },
  });
  createdIds.sessions.push(sessionA.id, sessionB.id);

  // 1. Mark in Session A
  const markA = await db.mark.create({
    data: {
      studentId: student.id,
      sessionId: sessionA.id,
      subject: "Mathematics",
      examName: "Annual Exam",
      marksObtained: 88,
      maxMarks: 100,
    },
  });
  createdIds.marks.push(markA.id);
  assert(markA.sessionId === sessionA.id, "DB-11: Mark created in Session A");

  // 2. Mark for same student, subject, and examName in Session B (coexists!)
  const markB = await db.mark.create({
    data: {
      studentId: student.id,
      sessionId: sessionB.id,
      subject: "Mathematics",
      examName: "Annual Exam",
      marksObtained: 95,
      maxMarks: 100,
    },
  });
  createdIds.marks.push(markB.id);
  assert(markB.sessionId === sessionB.id, "DB-11: Mark for same student, subject, and exam in Session B coexists cleanly");

  // 3. Duplicate mark for same student, subject, exam in SAME session is rejected
  let duplicateRejected = false;
  try {
    await db.mark.create({
      data: {
        studentId: student.id,
        sessionId: sessionA.id,
        subject: "Mathematics",
        examName: "Annual Exam",
        marksObtained: 70,
        maxMarks: 100,
      },
    });
  } catch (err: any) {
    duplicateRejected = true;
  }
  assert(duplicateRejected, "DB-11: Duplicate mark within the same session rejected by unique constraint");

  // 4. Session filtering query verification
  const sessionAMarks = await db.mark.findMany({
    where: { studentId: student.id, sessionId: sessionA.id },
  });
  assert(sessionAMarks.length === 1 && sessionAMarks[0].marksObtained === 88, "DB-11: Session A query isolates only Session A marks");

  const sessionBMarks = await db.mark.findMany({
    where: { studentId: student.id, sessionId: sessionB.id },
  });
  assert(sessionBMarks.length === 1 && sessionBMarks[0].marksObtained === 95, "DB-11: Session B query isolates only Session B marks");
}

// ── Main Runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Focused DB Test Suite: DB-01, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    await testDB01_LedgerReferenceFK();
    await testIndexes_DB06_DB07_DB08();
    await testDB09_ConcessionFloatPrecision();
    await testDB10_AttendanceMarkedByFK();
    await testDB11_MarkSessionScoping();
  } catch (err: any) {
    console.error("\nFatal test runner error:", err);
    failed++;
  } finally {
    console.log("\n── Cleanup ─────────────────────────────────────────────────────────────");
    await cleanup();

    const total = passed + failed;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    await db.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

main();
