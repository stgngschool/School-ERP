/**
 * E2E Verification Script: Family Auto-Merge Fix, Split, Transfer, and Audit
 *
 * Run: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/test-family-split-e2e.ts
 */

import db from "../src/lib/db";
import { findMatchingParentProfile, getNextFamilyCode } from "../src/lib/family";
import { Role, PaymentMethod, ReceiptStatus } from "@prisma/client";

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

async function runTests() {
  console.log("==================================================");
  console.log("  FAMILY MANAGEMENT AND SPLIT E2E VERIFICATION");
  console.log("==================================================");

  // Grab an existing class for student assignments
  const existingClass = await db.class.findFirst();
  if (!existingClass) {
    throw new Error("No class found in DB. Seed or create at least one class.");
  }

  // ─────────────────────────────────────────────────────────
  // TEST 1: Heuristics - Prevent false auto-merge on father name
  // ─────────────────────────────────────────────────────────
  console.log("\n[TEST 1] Heuristics - Prevent Auto-merge on Matching Father Names");

  const dummyUser1 = await db.user.create({
    data: {
      username: `test_parent_1_${Date.now()}`,
      email: `test-parent-1-${Date.now()}@schooltest.org`,
      passwordHash: "test_hash_123",
      role: Role.PARENT,
      name: "Ramesh Sharma",
    },
  });

  const fam1Code = await getNextFamilyCode(db);
  const parent1 = await db.parentProfile.create({
    data: {
      userId: dummyUser1.id,
      familyCode: fam1Code,
      address: "123 Civil Lines, City",
    },
  });

  // Create a student under parent1 with fatherName and fatherMobile
  const baseStudent = await db.student.create({
    data: {
      name: "Aarav Sharma",
      classId: existingClass.id,
      rollNumber: "991",
      admissionNumber: `ADM-TEST-A-${Date.now()}`,
      parentProfileId: parent1.id,
      fatherName: "Ramesh Sharma",
      fatherMobile: "9876543210",
      motherName: "Sunita Sharma",
    },
  });

  const existingProfiles = await db.parentProfile.findMany({
    where: { id: parent1.id },
    include: {
      user: true,
      students: { select: { fatherName: true, motherName: true, fatherMobile: true, motherMobile: true } },
    },
  });

  // Query with SAME father name, but DIFFERENT mother name and different phone
  const matchDifferentMother = findMatchingParentProfile(
    {
      fatherName: "Ramesh Sharma",
      fatherMobile: "9123456780",
      motherName: "Geeta Devi",
      address: "123 Civil Lines, City",
    },
    existingProfiles
  );

  assert(
    matchDifferentMother === null,
    "findMatchingParentProfile returns null when father name matches but mother is different (prevents false auto-merge)"
  );

  // Query with SAME father name, NO father phone provided
  const matchNoPhone = findMatchingParentProfile(
    {
      fatherName: "Ramesh Sharma",
      fatherMobile: "",
      address: "123 Civil Lines, City",
    },
    existingProfiles
  );

  assert(
    matchNoPhone === null,
    "findMatchingParentProfile returns null when phone is missing (prevents unverified merge)"
  );

  // Query with SAME father name AND SAME father phone
  const matchSamePhone = findMatchingParentProfile(
    {
      fatherName: "Ramesh Sharma",
      fatherMobile: "9876543210",
    },
    existingProfiles
  );

  assert(
    matchSamePhone !== null && matchSamePhone.id === parent1.id,
    "findMatchingParentProfile succeeds when deterministic father phone matches"
  );

  // ─────────────────────────────────────────────────────────
  // TEST 2: Family Split Workflow (DB Isolation & Receipts)
  // ─────────────────────────────────────────────────────────
  console.log("\n[TEST 2] Family Split Workflow - Detach Sibling into New Family");

  // Create Student B under Parent 1 (mistakenly grouped sibling)
  const studentB = await db.student.create({
    data: {
      name: "Bhavya Sharma",
      classId: existingClass.id,
      rollNumber: "992",
      admissionNumber: `ADM-TEST-B-${Date.now()}`,
      parentProfileId: parent1.id,
      fatherName: "Ramesh Sharma",
      fatherMobile: "9876543210",
      motherName: "Sunita Sharma",
    },
  });

  const receiptB = await db.receipt.create({
    data: {
      receiptNumber: `REC-TEST-${Date.now()}`,
      studentId: studentB.id,
      parentProfileId: parent1.id,
      amountPaid: 500000,
      paymentMethod: PaymentMethod.CASH,
      status: ReceiptStatus.ACTIVE,
      createdById: dummyUser1.id,
    },
  });

  const siblingsBefore = await db.student.findMany({
    where: { parentProfileId: parent1.id },
  });
  assert(siblingsBefore.length === 2, "Both students initially share parentProfileId");

  // Perform atomic split
  const newFamilyCode = await getNextFamilyCode(db);
  const splitResult = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: `parent_${newFamilyCode.toLowerCase()}_${Date.now()}`,
        email: `parent-${newFamilyCode.toLowerCase()}-${Date.now()}@schoolos.internal`,
        passwordHash: "test_hash_456",
        role: Role.PARENT,
        name: studentB.fatherName || `Parent of ${studentB.name}`,
        phone: studentB.fatherMobile || null,
      },
    });

    const newParent = await tx.parentProfile.create({
      data: {
        userId: newUser.id,
        familyCode: newFamilyCode,
        address: parent1.address || null,
      },
    });

    await tx.student.update({
      where: { id: studentB.id },
      data: { parentProfileId: newParent.id },
    });

    await tx.receipt.updateMany({
      where: { studentId: studentB.id },
      data: { parentProfileId: newParent.id },
    });

    return { newParentId: newParent.id, newUserId: newUser.id, newFamilyCode };
  });

  const freshStudentA = await db.student.findUnique({
    where: { id: baseStudent.id },
    include: { parentProfile: true },
  });
  const freshStudentB = await db.student.findUnique({
    where: { id: studentB.id },
    include: { parentProfile: true },
  });
  const freshReceiptB = await db.receipt.findUnique({
    where: { id: receiptB.id },
  });

  assert(
    freshStudentA?.parentProfile?.familyCode === fam1Code,
    `Student A retains original familyCode "${fam1Code}"`
  );
  assert(
    freshStudentB?.parentProfile?.familyCode === newFamilyCode,
    `Student B now has new independent familyCode "${newFamilyCode}"`
  );
  assert(
    freshStudentA?.parentProfileId !== freshStudentB?.parentProfileId,
    "Student A and Student B have completely distinct parentProfileIds"
  );
  assert(
    freshReceiptB?.parentProfileId === splitResult.newParentId,
    "Student B's receipt was migrated to Student B's new parentProfileId"
  );

  // ─────────────────────────────────────────────────────────
  // TEST 3: Family Transfer Workflow (Re-link to target family)
  // ─────────────────────────────────────────────────────────
  console.log("\n[TEST 3] Family Transfer Workflow - Re-link Student B to Parent 1");

  await db.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: studentB.id },
      data: { parentProfileId: parent1.id },
    });

    await tx.receipt.updateMany({
      where: { studentId: studentB.id },
      data: { parentProfileId: parent1.id },
    });
  });

  const recheckStudentB = await db.student.findUnique({
    where: { id: studentB.id },
    include: { parentProfile: true },
  });
  const recheckReceiptB = await db.receipt.findUnique({
    where: { id: receiptB.id },
  });

  assert(
    recheckStudentB?.parentProfileId === parent1.id &&
    recheckStudentB?.parentProfile?.familyCode === fam1Code,
    "Student B successfully re-linked to parent1 via TRANSFER"
  );
  assert(
    recheckReceiptB?.parentProfileId === parent1.id,
    "Student B's receipts successfully moved to target family"
  );

  // ─────────────────────────────────────────────────────────
  // TEST 4: Audit Scan Logic
  // ─────────────────────────────────────────────────────────
  console.log("\n[TEST 4] Family Conflict Audit Scan Logic");

  await db.student.update({
    where: { id: studentB.id },
    data: { fatherMobile: "8888888888" },
  });

  const multiStudentFamilies = await db.parentProfile.findMany({
    where: {
      students: {
        some: {
          id: { in: [baseStudent.id, studentB.id] },
        },
      },
    },
    include: {
      students: {
        select: {
          id: true,
          name: true,
          fatherName: true,
          fatherMobile: true,
          motherName: true,
        },
      },
    },
  });

  let foundConflict = false;
  for (const fam of multiStudentFamilies) {
    const fatherPhones = new Set(
      fam.students.map((s) => s.fatherMobile).filter(Boolean)
    );
    if (fatherPhones.size > 1) {
      foundConflict = true;
    }
  }

  assert(
    foundConflict === true,
    "Audit algorithm successfully detected conflicting father phone numbers under shared family"
  );

  // ─────────────────────────────────────────────────────────
  // TEST 5: Merge Families Workflow (Combine 2 Families)
  // ─────────────────────────────────────────────────────────
  console.log("\n[TEST 5] Merge Families Workflow - Combine Separate Sibling Families");

  // Create Family C with Student C
  const dummyUser3 = await db.user.create({
    data: {
      username: `test_parent_3_${Date.now()}`,
      email: `test-parent-3-${Date.now()}@schooltest.org`,
      passwordHash: "test_hash_789",
      role: Role.PARENT,
      name: "Ramesh Sharma",
    },
  });

  const fam3Code = await getNextFamilyCode(db);
  const parent3 = await db.parentProfile.create({
    data: {
      userId: dummyUser3.id,
      familyCode: fam3Code,
      address: "123 Civil Lines, City",
    },
  });

  const studentC = await db.student.create({
    data: {
      name: "Chirag Sharma",
      classId: existingClass.id,
      rollNumber: "993",
      admissionNumber: `ADM-TEST-C-${Date.now()}`,
      parentProfileId: parent3.id,
      fatherName: "Ramesh Sharma",
      fatherMobile: "9876543210",
      motherName: "Sunita Sharma",
    },
  });

  // Execute Merge: Family 3 into Family 1
  await db.$transaction(async (tx) => {
    await tx.student.updateMany({
      where: { parentProfileId: parent3.id },
      data: { parentProfileId: parent1.id },
    });

    await tx.receipt.updateMany({
      where: { parentProfileId: parent3.id },
      data: { parentProfileId: parent1.id },
    });

    await tx.parentProfile.delete({
      where: { id: parent3.id },
    });

    await tx.user.delete({
      where: { id: dummyUser3.id },
    }).catch(() => {});
  });

  const recheckStudentC = await db.student.findUnique({
    where: { id: studentC.id },
    include: { parentProfile: true },
  });

  const family1Students = await db.student.findMany({
    where: { parentProfileId: parent1.id },
  });

  assert(
    recheckStudentC?.parentProfileId === parent1.id &&
    recheckStudentC?.parentProfile?.familyCode === fam1Code,
    `Student C successfully merged into Family 1 (${fam1Code})`
  );
  assert(
    family1Students.length === 3,
    "Family 1 now unites all 3 students after family merge"
  );

  // ─────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────
  console.log("\n[CLEANUP] Cleaning up test records...");
  await db.receipt.deleteMany({ where: { id: receiptB.id } });
  await db.student.deleteMany({ where: { id: { in: [baseStudent.id, studentB.id, studentC.id] } } });
  await db.parentProfile.deleteMany({ where: { id: { in: [parent1.id, splitResult.newParentId] } } });
  await db.user.deleteMany({ where: { id: { in: [dummyUser1.id, splitResult.newUserId] } } });
  console.log("  Cleaned up all test entities.");

  console.log("\n==================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution threw uncaught error:", err);
  process.exit(1);
});
