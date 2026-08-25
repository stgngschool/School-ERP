/**
 * Focused regression test suite for:
 *  PD-05 — Canonical getGroupedReceiptItems in src/lib/receipts.ts shared by all dashboards
 *  BL-05 — Authoritative RTE status and transactional charge/discount synchronization
 *  RS-03 — Elimination of dangerouslySetInnerHTML from all print styles
 *  RS-04 — Student statement print isolation excluding dashboard chrome and sidebars
 *
 * Run: node --env-file=.env --import=tsx scripts/test-pd05-bl05-rs03-rs04.ts
 */

import fs from "fs";
import path from "path";
import db from "../src/lib/db";
import { getGroupedReceiptItems, areMonthsConsecutive, ACADEMIC_MONTH_ORDER } from "../src/lib/receipts";
import { generateYearlyCharges, getAcademicYear } from "../src/lib/generateYearlyCharges";
import { EntryType, Role } from "@prisma/client";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

// ── Test 1: PD-05 — Canonical getGroupedReceiptItems Helper ────────────────

function testPD05() {
  console.log("\n─── 1. PD-05: Canonical getGroupedReceiptItems Helper ───");

  // 1. Array <= 4 items returns items as-is
  const fourItems = [
    { name: "Tuition Fee - April 2026", amount: 1000, discount: 0 },
    { name: "Tuition Fee - May 2026", amount: 1000, discount: 0 },
  ];
  const g4 = getGroupedReceiptItems(fourItems);
  assert(g4.length === 2 && g4[0].name === "Tuition Fee - April 2026", "PD-05: <=4 items returned as-is");

  // 2. Array > 4 consecutive months gets grouped into "X to Y" range
  const consecutiveItems = [
    { name: "Rahul: Tuition Fee - April 2026", amount: 1000, discount: 100 },
    { name: "Rahul: Tuition Fee - May 2026", amount: 1000, discount: 100 },
    { name: "Rahul: Tuition Fee - June 2026", amount: 1000, discount: 100 },
    { name: "Rahul: Tuition Fee - July 2026", amount: 1000, discount: 100 },
    { name: "Rahul: Tuition Fee - August 2026", amount: 1000, discount: 100 },
  ];
  const gConsecutive = getGroupedReceiptItems(consecutiveItems);
  assert(gConsecutive.length === 1, "PD-05: 5 monthly items for same student & fee head grouped into 1 row");
  assert(gConsecutive[0].name === "Rahul: Tuition Fee (April to August)", `PD-05: Grouped name is "${gConsecutive[0].name}"`);
  assert(gConsecutive[0].amount === 5000, `PD-05: Grouped amount is ${gConsecutive[0].amount}`);
  assert(gConsecutive[0].discount === 500, `PD-05: Grouped discount is ${gConsecutive[0].discount}`);

  // 3. Array > 4 non-consecutive months lists all individual months without misleading "to"
  const nonConsecutiveItems = [
    { name: "Pooja: Tuition Fee - April 2026", amount: 1000, discount: 0 },
    { name: "Pooja: Tuition Fee - July 2026", amount: 1000, discount: 0 },
    { name: "Pooja: Tuition Fee - October 2026", amount: 1000, discount: 0 },
    { name: "Pooja: Tuition Fee - December 2026", amount: 1000, discount: 0 },
    { name: "Pooja: Tuition Fee - February 2027", amount: 1000, discount: 0 },
  ];
  const gNonConsecutive = getGroupedReceiptItems(nonConsecutiveItems);
  assert(gNonConsecutive.length === 1, "PD-05: Non-consecutive items grouped into 1 row");
  assert(
    gNonConsecutive[0].name.includes("April, July, October, December, February"),
    `PD-05: Non-consecutive months listed individually: "${gNonConsecutive[0].name}"`
  );

  // 4. Verify all dashboard components import canonical helper
  const acctFile = fs.readFileSync(path.join(process.cwd(), "src/components/AccountantDashboard.tsx"), "utf-8");
  const adminFile = fs.readFileSync(path.join(process.cwd(), "src/components/AdminDashboard.tsx"), "utf-8");
  const parentFile = fs.readFileSync(path.join(process.cwd(), "src/components/ParentDashboard.tsx"), "utf-8");

  assert(acctFile.includes('import { getGroupedReceiptItems } from "@/lib/receipts"'), "PD-05: AccountantDashboard imports canonical getGroupedReceiptItems");
  assert(adminFile.includes('import { getGroupedReceiptItems } from "@/lib/receipts"'), "PD-05: AdminDashboard imports canonical getGroupedReceiptItems");
  assert(parentFile.includes('import { getGroupedReceiptItems } from "@/lib/receipts"'), "PD-05: ParentDashboard imports canonical getGroupedReceiptItems");
}

// ── Test 2: BL-05 — Authoritative RTE Status & Charge Synchronization ───────

async function testBL05() {
  console.log("\n─── 2. BL-05: Authoritative RTE Status & Charge Synchronization ───");

  // Find a class that has an active fee structure
  const feeStructures = await db.feeStructure.findMany({
    include: { items: { include: { feeHead: true } } }
  });
  let targetClassName = feeStructures.find(f => f.className !== "All")?.className || "Class 1";

  let testClass = await db.class.findFirst({ where: { name: targetClassName } });
  if (!testClass) {
    testClass = await db.class.create({ data: { name: targetClassName, section: "A" } });
  }

  // Ensure fee structure has at least one item
  let struct: any = feeStructures.find(f => f.className === targetClassName || f.className === "All");
  if (!struct || struct.items.length === 0) {
    let feeHead = await db.feeHead.findFirst();
    if (!feeHead) {
      feeHead = await db.feeHead.create({
        data: { name: "Tuition Fee", frequency: "monthly" }
      });
    }
    if (!struct) {
      struct = await db.feeStructure.create({
        data: { name: `Structure ${targetClassName}`, frequency: "monthly", className: targetClassName },
        include: { items: { include: { feeHead: true } } }
      });
    }
    await db.feeStructureItem.create({
      data: {
        feeStructureId: struct.id,
        feeHeadId: feeHead.id,
        amount: 200000,
      }
    });
  }

  // Find system user
  const systemUser = await db.user.findFirst({
    where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
  });
  if (!systemUser) throw new Error("No system user found");

  // Create test parent
  const parentUser = await db.user.create({
    data: {
      username: `parent_test_${Date.now()}`,
      email: `parent_test_${Date.now()}@example.com`,
      passwordHash: "test_hash_12345",
      phone: `999${Date.now().toString().slice(-7)}`,
      role: Role.PARENT,
      name: "RTE Test Parent",
    }
  });
  const parentProfile = await db.parentProfile.create({
    data: {
      userId: parentUser.id,
      familyCode: `FAM-TEST-${Date.now().toString().slice(-4)}`,
    }
  });

  // 1. Create RTE student
  const rteStudent = await db.student.create({
    data: {
      name: "RTE Test Student",
      admissionNumber: `ADM-RTE-${Date.now().toString().slice(-6)}`,
      classId: testClass.id,
      parentProfileId: parentProfile.id,
      isRte: true,
      fatherName: "RTE Father",
      fatherMobile: parentUser.phone,
    }
  });

  // Generate charges for RTE student
  const gen1 = await generateYearlyCharges(rteStudent.id, testClass.name, systemUser.id, getAcademicYear());
  assert(gen1.generated > 0, `BL-05: Generated charges/waivers for RTE student (count=${gen1.generated})`);

  // Verify RTE charges and discounts in DB
  const rteEntries = await db.ledgerEntry.findMany({ where: { studentId: rteStudent.id } });
  const rteCharges = rteEntries.filter(e => e.entryType === EntryType.CHARGE);
  const rteDiscounts = rteEntries.filter(e => e.entryType === EntryType.DISCOUNT && e.description.startsWith("RTE Fee Waiver:"));

  assert(rteCharges.length > 0, "BL-05: RTE student has base charge entries");
  assert(rteDiscounts.length === rteCharges.length, "BL-05: Every RTE charge is paired with a 100% RTE Fee Waiver discount");

  const totalRteCharge = rteCharges.reduce((s, e) => s + e.amount, 0);
  const totalRteDiscount = rteDiscounts.reduce((s, e) => s + e.amount, 0);
  assert(totalRteCharge + totalRteDiscount === 0, `BL-05: Net due for RTE student is 0 paise (${totalRteCharge} + ${totalRteDiscount} = 0)`);

  // 2. Idempotency test: Re-running generateYearlyCharges produces 0 new rows
  const genRerun = await generateYearlyCharges(rteStudent.id, testClass.name, systemUser.id, getAcademicYear());
  assert(genRerun.generated === 0, `BL-05: Re-running generation is strictly idempotent (generated=${genRerun.generated}, skipped=${genRerun.skipped})`);

  // 3. Create non-RTE student
  const nonRteStudent = await db.student.create({
    data: {
      name: "Non-RTE Test Student",
      admissionNumber: `ADM-NONRTE-${Date.now().toString().slice(-6)}`,
      classId: testClass.id,
      parentProfileId: parentProfile.id,
      isRte: false,
      fatherName: "Non-RTE Father",
      fatherMobile: parentUser.phone,
    }
  });

  await generateYearlyCharges(nonRteStudent.id, testClass.name, systemUser.id, getAcademicYear());
  const nonRteEntries = await db.ledgerEntry.findMany({ where: { studentId: nonRteStudent.id } });
  const nonRteDiscounts = nonRteEntries.filter(e => e.description.startsWith("RTE Fee Waiver:"));
  assert(nonRteDiscounts.length === 0, "BL-05: Non-RTE student has 0 RTE Fee Waiver discounts");

  // 4. Test Transition: Non-RTE -> RTE
  await db.student.update({ where: { id: nonRteStudent.id }, data: { isRte: true } });
  await generateYearlyCharges(nonRteStudent.id, testClass.name, systemUser.id, getAcademicYear());

  const transitionedEntries = await db.ledgerEntry.findMany({ where: { studentId: nonRteStudent.id } });
  const transitionedCharges = transitionedEntries.filter(e => e.entryType === EntryType.CHARGE);
  const transitionedDiscounts = transitionedEntries.filter(e => e.entryType === EntryType.DISCOUNT && e.description.startsWith("RTE Fee Waiver:"));
  assert(transitionedDiscounts.length === transitionedCharges.length, "BL-05: Transitioning Non-RTE -> RTE generates 100% RTE fee waivers for existing charges");

  // Cleanup test records
  await db.ledgerEntry.deleteMany({ where: { studentId: { in: [rteStudent.id, nonRteStudent.id] } } });
  await db.studentSession.deleteMany({ where: { studentId: { in: [rteStudent.id, nonRteStudent.id] } } });
  await db.student.deleteMany({ where: { id: { in: [rteStudent.id, nonRteStudent.id] } } });
  await db.parentProfile.delete({ where: { id: parentProfile.id } });
  await db.user.delete({ where: { id: parentUser.id } });
}

// ── Test 3: RS-03 — Elimination of dangerouslySetInnerHTML in Print Styles ──

function testRS03() {
  console.log("\n─── 3. RS-03: Elimination of dangerouslySetInnerHTML in Print Styles ───");

  const componentsDir = path.join(process.cwd(), "src/components");
  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith(".tsx") || f.endsWith(".ts"));

  let dangerouslyFound = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(componentsDir, file), "utf-8");
    if (content.includes("dangerouslySetInnerHTML")) {
      console.error(`Found dangerouslySetInnerHTML in ${file}`);
      dangerouslyFound++;
    }
  }

  assert(dangerouslyFound === 0, "RS-03: Zero occurrences of dangerouslySetInnerHTML across all components");

  // Verify safe React JSX <style> tag exists with valid @media print rules
  const acctFile = fs.readFileSync(path.join(process.cwd(), "src/components/AccountantDashboard.tsx"), "utf-8");
  const adminFile = fs.readFileSync(path.join(process.cwd(), "src/components/AdminDashboard.tsx"), "utf-8");
  const parentFile = fs.readFileSync(path.join(process.cwd(), "src/components/ParentDashboard.tsx"), "utf-8");
  const printMarksFile = fs.readFileSync(path.join(process.cwd(), "src/components/PrintMarksheets.tsx"), "utf-8");

  assert(acctFile.includes("<style>{`") && !acctFile.includes("dangerouslySetInnerHTML"), "RS-03: AccountantDashboard uses safe JSX <style>{`...`}</style>");
  assert(adminFile.includes("<style>{`") && !adminFile.includes("dangerouslySetInnerHTML"), "RS-03: AdminDashboard uses safe JSX <style>{`...`}</style>");
  assert(parentFile.includes("<style>{`") && !parentFile.includes("dangerouslySetInnerHTML"), "RS-03: ParentDashboard uses safe JSX <style>{`...`}</style>");
  assert(printMarksFile.includes("<style>{`") && !printMarksFile.includes("dangerouslySetInnerHTML"), "RS-03: PrintMarksheets uses safe JSX <style>{`...`}</style>");
}

// ── Test 4: RS-04 — Student Statement Print Isolation ───────────────────────

function testRS04() {
  console.log("\n─── 4. RS-04: Student Statement Print Isolation ───");

  const acctFile = fs.readFileSync(path.join(process.cwd(), "src/components/AccountantDashboard.tsx"), "utf-8");
  const adminFile = fs.readFileSync(path.join(process.cwd(), "src/components/AdminDashboard.tsx"), "utf-8");

  // 1. Check statement card has .student-statement-print-area
  assert(acctFile.includes("student-statement-print-area"), "RS-04: AccountantDashboard statement card contains student-statement-print-area class");
  assert(adminFile.includes("student-statement-print-area"), "RS-04: AdminDashboard statement card contains student-statement-print-area class");

  // 2. Check back button & action buttons have print:hidden
  assert(acctFile.includes("pb-4 print:hidden"), "RS-04: AccountantDashboard back navigation has print:hidden");
  assert(acctFile.includes("bg-slate-50/50 flex-wrap print:hidden"), "RS-04: AccountantDashboard statement action buttons have print:hidden");
  assert(adminFile.includes("pb-4 print:hidden"), "RS-04: AdminDashboard back navigation has print:hidden");
  assert(adminFile.includes("bg-slate-50/50 flex-wrap print:hidden"), "RS-04: AdminDashboard statement action buttons have print:hidden");

  // 3. Check @media print isolates .student-statement-print-area
  assert(acctFile.includes(".student-statement-print-area") && acctFile.includes("visibility: visible !important;"), "RS-04: AccountantDashboard print CSS isolates statement area");
  assert(adminFile.includes(".student-statement-print-area") && adminFile.includes("visibility: visible !important;"), "RS-04: AdminDashboard print CSS isolates statement area");
}

// ── Main Runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Focused Regression Suite: PD-05, BL-05, RS-03, RS-04");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    testPD05();
    await testBL05();
    testRS03();
    testRS04();
  } catch (err: any) {
    console.error("Fatal test error:", err);
    failed++;
  } finally {
    const total = passed + failed;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    await db.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

main();
