export {}; // ES module isolation

/**
 * Regression tests for DB-02, DB-03, DB-04, and DB-05 fixes.
 *
 * DB-02: Receipt.studentId referential action (SetNull on student deletion preserves financial records).
 * DB-03: ReceiptItem.ledgerEntryId referential action (Restrict deletion prevents orphaned allocations).
 * DB-04: Receipt.status database enum (ACTIVE, REVERSED).
 * DB-05: Class.status database enum (ACTIVE, ARCHIVED).
 *
 * All tests are pure logic / contract simulation — no live DB connection required.
 * Run: npx tsx scripts/test-db02-db03-db04-db05.ts
 */

import * as fs from "fs";
import * as path from "path";
import { ClassStatus, ReceiptStatus } from "@prisma/client";

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✅ PASS: ${label}`);
  passed++;
}
function fail(label: string, detail = "") {
  console.error(`  ❌ FAIL: ${label}${detail ? "\n        " + detail : ""}`);
  failed++;
}
function assertTrue(label: string, value: boolean) {
  value ? ok(label) : fail(label);
}
function assertEq<T>(label: string, actual: T, expected: T) {
  JSON.stringify(actual) === JSON.stringify(expected)
    ? ok(`${label}: ${JSON.stringify(actual)}`)
    : fail(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: DB-02 — Receipt.studentId SetNull referential behavior
// ─────────────────────────────────────────────────────────────────────────────
function testDB02ReceiptStudentSetNull() {
  console.log("\n─── Test 1: DB-02 — Receipt.studentId SetNull on student deletion ───");

  // In-memory simulation of DB relational tables with referential constraints
  type StudentRecord = { id: string; name: string };
  type ReceiptRecord = { id: string; studentId: string | null; receiptNumber: string; amountPaid: number };

  const students = new Map<string, StudentRecord>();
  const receipts = new Map<string, ReceiptRecord>();

  // Setup: create a student and linked receipts
  students.set("std_1", { id: "std_1", name: "Rohan Sharma" });
  receipts.set("rec_1", { id: "rec_1", studentId: "std_1", receiptNumber: "REC-2026-0001", amountPaid: 500000 });
  receipts.set("rec_2", { id: "rec_2", studentId: "std_1", receiptNumber: "REC-2026-0002", amountPaid: 350000 });

  // Simulate onDelete: SetNull behavior when deleting student
  function deleteStudentWithSetNull(studentId: string) {
    if (!students.has(studentId)) return false;
    students.delete(studentId);
    // ON DELETE SET NULL on Receipt.studentId
    for (const [recId, receipt] of receipts.entries()) {
      if (receipt.studentId === studentId) {
        receipts.set(recId, { ...receipt, studentId: null });
      }
    }
    return true;
  }

  const deleted = deleteStudentWithSetNull("std_1");
  assertTrue("Student deleted successfully", deleted);
  assertTrue("Student std_1 no longer in students table", !students.has("std_1"));

  // Receipts must NOT be deleted — financial records preserved!
  assertEq("Total receipts count remained 2", receipts.size, 2);
  const rec1 = receipts.get("rec_1");
  const rec2 = receipts.get("rec_2");
  assertEq("rec_1 studentId is now null", rec1?.studentId, null);
  assertEq("rec_1 receiptNumber is intact", rec1?.receiptNumber, "REC-2026-0001");
  assertEq("rec_1 amountPaid is intact", rec1?.amountPaid, 500000);
  assertEq("rec_2 studentId is now null", rec2?.studentId, null);
  assertEq("rec_2 receiptNumber is intact", rec2?.receiptNumber, "REC-2026-0002");
  assertEq("rec_2 amountPaid is intact", rec2?.amountPaid, 350000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: DB-03 — ReceiptItem.ledgerEntryId Restrict referential behavior
// ─────────────────────────────────────────────────────────────────────────────
function testDB03ReceiptItemLedgerEntryRestrict() {
  console.log("\n─── Test 2: DB-03 — ReceiptItem.ledgerEntryId Restrict on ledger entry deletion ───");

  type LedgerRecord = { id: string; amount: number; description: string };
  type ReceiptItemRecord = { id: string; receiptId: string; ledgerEntryId: string; amount: number };

  const ledgerEntries = new Map<string, LedgerRecord>();
  const receiptItems = new Map<string, ReceiptItemRecord>();

  // Setup: ledger entry with linked receipt item (committed payment allocation)
  ledgerEntries.set("le_1", { id: "le_1", amount: 50000, description: "Tuition Fee - April" });
  ledgerEntries.set("le_2", { id: "le_2", amount: 30000, description: "Transport Fee - April" }); // unlinked
  receiptItems.set("ri_1", { id: "ri_1", receiptId: "rec_1", ledgerEntryId: "le_1", amount: 50000 });

  // Simulate onDelete: Restrict behavior when deleting ledger entry
  function deleteLedgerEntryWithRestrict(ledgerEntryId: string): { success: boolean; error?: string } {
    if (!ledgerEntries.has(ledgerEntryId)) {
      return { success: false, error: "Not found" };
    }
    // Check if any ReceiptItem references this ledgerEntryId
    for (const ri of receiptItems.values()) {
      if (ri.ledgerEntryId === ledgerEntryId) {
        return {
          success: false,
          error: "Foreign key violation: cannot delete LedgerEntry referenced by ReceiptItem (RESTRICT)",
        };
      }
    }
    ledgerEntries.delete(ledgerEntryId);
    return { success: true };
  }

  // Attempting to delete le_1 (has linked receipt items) MUST fail
  const res1 = deleteLedgerEntryWithRestrict("le_1");
  assertTrue("Deleting linked ledger entry is restricted", !res1.success);
  assertTrue("Error indicates foreign key restriction", !!res1.error?.includes("RESTRICT"));
  assertTrue("Ledger entry le_1 remains in database", ledgerEntries.has("le_1"));
  assertTrue("ReceiptItem ri_1 remains intact", receiptItems.has("ri_1"));

  // Deleting unlinked le_2 should succeed
  const res2 = deleteLedgerEntryWithRestrict("le_2");
  assertTrue("Deleting unlinked ledger entry succeeds", res2.success);
  assertTrue("Ledger entry le_2 removed", !ledgerEntries.has("le_2"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: DB-04 — ReceiptStatus enum validation
// ─────────────────────────────────────────────────────────────────────────────
function testDB04ReceiptStatusEnum() {
  console.log("\n─── Test 3: DB-04 — ReceiptStatus enum validation ───");

  // Validate Prisma generated enum values
  assertEq("ReceiptStatus.ACTIVE value", ReceiptStatus.ACTIVE, "ACTIVE");
  assertEq("ReceiptStatus.REVERSED value", ReceiptStatus.REVERSED, "REVERSED");

  const validStatuses = Object.values(ReceiptStatus);
  assertEq("ReceiptStatus has exactly 2 values", validStatuses.length, 2);
  assertTrue("ReceiptStatus contains ACTIVE", validStatuses.includes("ACTIVE" as any));
  assertTrue("ReceiptStatus contains REVERSED", validStatuses.includes("REVERSED" as any));

  // Type validator simulation
  function isValidReceiptStatus(status: string): status is ReceiptStatus {
    return Object.values(ReceiptStatus).includes(status as ReceiptStatus);
  }

  assertTrue("ACTIVE is valid ReceiptStatus", isValidReceiptStatus("ACTIVE"));
  assertTrue("REVERSED is valid ReceiptStatus", isValidReceiptStatus("REVERSED"));
  assertTrue("PAID is rejected", !isValidReceiptStatus("PAID"));
  assertTrue("PENDING is rejected", !isValidReceiptStatus("PENDING"));
  assertTrue("CANCELLED is rejected", !isValidReceiptStatus("CANCELLED"));
  assertTrue("active (lowercase) is rejected", !isValidReceiptStatus("active"));
  assertTrue("Empty string is rejected", !isValidReceiptStatus(""));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: DB-05 — ClassStatus enum validation
// ─────────────────────────────────────────────────────────────────────────────
function testDB05ClassStatusEnum() {
  console.log("\n─── Test 4: DB-05 — ClassStatus enum validation ───");

  // Validate Prisma generated enum values
  assertEq("ClassStatus.ACTIVE value", ClassStatus.ACTIVE, "ACTIVE");
  assertEq("ClassStatus.ARCHIVED value", ClassStatus.ARCHIVED, "ARCHIVED");

  const validStatuses = Object.values(ClassStatus);
  assertEq("ClassStatus has exactly 2 values", validStatuses.length, 2);
  assertTrue("ClassStatus contains ACTIVE", validStatuses.includes("ACTIVE" as any));
  assertTrue("ClassStatus contains ARCHIVED", validStatuses.includes("ARCHIVED" as any));

  // Type validator simulation
  function isValidClassStatus(status: string): status is ClassStatus {
    return Object.values(ClassStatus).includes(status as ClassStatus);
  }

  assertTrue("ACTIVE is valid ClassStatus", isValidClassStatus("ACTIVE"));
  assertTrue("ARCHIVED is valid ClassStatus", isValidClassStatus("ARCHIVED"));
  assertTrue("DELETED is rejected", !isValidClassStatus("DELETED"));
  assertTrue("INACTIVE is rejected", !isValidClassStatus("INACTIVE"));
  assertTrue("archived (lowercase) is rejected", !isValidClassStatus("archived"));
  assertTrue("Empty string is rejected", !isValidClassStatus(""));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Schema and Migration file integrity checks
// ─────────────────────────────────────────────────────────────────────────────
function testSchemaAndMigrationIntegrity() {
  console.log("\n─── Test 5: Schema & Migration integrity verification ───");

  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  assertTrue("prisma/schema.prisma exists", fs.existsSync(schemaPath));
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  // Check enum definitions in schema
  assertTrue("schema contains enum ClassStatus", schemaContent.includes("enum ClassStatus"));
  assertTrue("schema contains enum ReceiptStatus", schemaContent.includes("enum ReceiptStatus"));

  // Check Class model
  assertTrue("Class model has status ClassStatus", schemaContent.includes("status         ClassStatus"));

  // Check Receipt model
  assertTrue("Receipt model has studentId onDelete: SetNull", /student\s+Student\?\s+@relation\(fields:\s*\[studentId\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/.test(schemaContent));
  assertTrue("Receipt model has status ReceiptStatus", schemaContent.includes("status               ReceiptStatus"));

  // Check ReceiptItem model
  assertTrue("ReceiptItem model has ledgerEntry onDelete: Restrict", /ledgerEntry\s+LedgerEntry\s+@relation\(fields:\s*\[ledgerEntryId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/.test(schemaContent));

  // Check migration file
  const migrationPath = path.join(process.cwd(), "prisma", "migrations", "20260825_db02_db03_db04_db05_schema", "migration.sql");
  assertTrue("Migration SQL exists", fs.existsSync(migrationPath));
  const migrationContent = fs.readFileSync(migrationPath, "utf-8");

  assertTrue("Migration creates ClassStatus enum", migrationContent.includes('CREATE TYPE "ClassStatus" AS ENUM'));
  assertTrue("Migration creates ReceiptStatus enum", migrationContent.includes('CREATE TYPE "ReceiptStatus" AS ENUM'));
  assertTrue("Migration alters Class status using enum", migrationContent.includes('ALTER COLUMN "status" TYPE "ClassStatus"'));
  assertTrue("Migration alters Receipt status using enum", migrationContent.includes('ALTER COLUMN "status" TYPE "ReceiptStatus"'));
  assertTrue("Migration sets Receipt_studentId_fkey ON DELETE SET NULL", migrationContent.includes('ON DELETE SET NULL'));
  assertTrue("Migration sets ReceiptItem_ledgerEntryId_fkey ON DELETE RESTRICT", migrationContent.includes('ON DELETE RESTRICT'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Fix Tests: DB-02, DB-03, DB-04, DB-05");
  console.log("═══════════════════════════════════════════════════════════════");

  testDB02ReceiptStudentSetNull();
  testDB03ReceiptItemLedgerEntryRestrict();
  testDB04ReceiptStatusEnum();
  testDB05ClassStatusEnum();
  testSchemaAndMigrationIntegrity();

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
