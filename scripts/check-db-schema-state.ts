import db from "../src/lib/db";

async function main() {
  console.log("===============================================================");
  console.log("  DATABASE SCHEMA & DATA INTEGRITY INSPECTION");
  console.log("===============================================================\n");

  // 1. Inspect LedgerEntry foreign keys and referenceId orphans
  console.log("─── 1. DB-01: LedgerEntry.referenceId ───");
  const ledgerFks: any[] = await db.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'LedgerEntry' AND kcu.column_name = 'referenceId';
  `);
  console.log("  LedgerEntry.referenceId FK constraints:", ledgerFks);

  const orphanLedgerRefs: any[] = await db.$queryRawUnsafe(`
    SELECT le.id, le."referenceId", le."entryType", le.amount, le.description
    FROM "LedgerEntry" le
    WHERE le."referenceId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Receipt" r WHERE r.id = le."referenceId");
  `);
  console.log(`  Orphaned LedgerEntry.referenceId rows count: ${orphanLedgerRefs.length}`);
  if (orphanLedgerRefs.length > 0) {
    console.log("  Orphan samples:", orphanLedgerRefs.slice(0, 5));
  }

  // 2. Inspect AcademicSession indexes
  console.log("\n─── 2. DB-06: AcademicSession indexes ───");
  const sessionIndexes: any[] = await db.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'AcademicSession';
  `);
  console.log("  AcademicSession indexes:", sessionIndexes);

  // 3. Inspect FeeAssignment indexes
  console.log("\n─── 3. DB-07: FeeAssignment indexes ───");
  const feeAssignmentIndexes: any[] = await db.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'FeeAssignment';
  `);
  console.log("  FeeAssignment indexes:", feeAssignmentIndexes);

  // 4. Inspect LedgerEntry composite indexes
  console.log("\n─── 4. DB-08: LedgerEntry indexes ───");
  const ledgerIndexes: any[] = await db.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'LedgerEntry';
  `);
  console.log("  LedgerEntry indexes:", ledgerIndexes);

  // 5. Inspect Concession.percentage column data type
  console.log("\n─── 5. DB-09: Concession.percentage data type ───");
  const concessionCols: any[] = await db.$queryRawUnsafe(`
    SELECT column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_name = 'Concession' AND column_name = 'percentage';
  `);
  console.log("  Concession.percentage column info:", concessionCols);

  const concessions: any[] = await db.$queryRawUnsafe(`
    SELECT id, name, percentage, "feeHeadName" FROM "Concession";
  `);
  console.log("  Existing concessions count:", concessions.length);
  console.log("  Existing concessions samples:", concessions);

  // 6. Inspect Attendance.markedBy FK and orphans
  console.log("\n─── 6. DB-10: Attendance.markedBy ───");
  const attendanceFks: any[] = await db.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'Attendance' AND kcu.column_name = 'markedBy';
  `);
  console.log("  Attendance.markedBy FK constraints:", attendanceFks);

  const orphanAttendance: any[] = await db.$queryRawUnsafe(`
    SELECT a.id, a."markedBy", a.date, a.status
    FROM "Attendance" a
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = a."markedBy");
  `);
  console.log(`  Orphaned Attendance.markedBy rows count: ${orphanAttendance.length}`);

  // 7. Inspect Mark table schema, sessionId nullability, unique indexes, and data
  console.log("\n─── 7. DB-11: Mark table & sessionId scoping ───");
  const markCols: any[] = await db.$queryRawUnsafe(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_name = 'Mark' AND column_name IN ('sessionId', 'studentId', 'subject', 'examName');
  `);
  console.log("  Mark columns info:", markCols);

  const markIndexes: any[] = await db.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'Mark';
  `);
  console.log("  Mark indexes:", markIndexes);

  const markDuplicates: any[] = await db.$queryRawUnsafe(`
    SELECT "studentId", "sessionId", subject, "examName", COUNT(*)
    FROM "Mark"
    GROUP BY "studentId", "sessionId", subject, "examName"
    HAVING COUNT(*) > 1;
  `);
  console.log(`  Mark duplicates under (studentId, sessionId, subject, examName): ${markDuplicates.length}`);

  const nullSessionMarks: any[] = await db.$queryRawUnsafe(`
    SELECT COUNT(*) FROM "Mark" WHERE "sessionId" IS NULL;
  `);
  console.log(`  Marks with NULL sessionId: ${nullSessionMarks[0].count}`);

  await db.$disconnect();
}

main().catch(err => {
  console.error("Inspection error:", err);
  process.exit(1);
});
