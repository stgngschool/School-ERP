import db from "./db";

// ── S-01 / LF-01 fix: Atomic admission number generation ────────────────────
// Replaces the read-max-then-increment pattern (TOCTOU race) with the same
// UPDATE ... RETURNING counter strategy used for receipt numbers (B-01).
// Must be called INSIDE a db.$transaction — the row lock serialises concurrent
// admissions automatically. If the transaction rolls back the counter rolls back
// too, so no numbers are burned and no duplicates are issued.
//
// The ReceiptCounter table is reused with the prefix "ADM-<year>-".
export async function getNextAdmissionNumber(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const prefix = `ADM-${year}-`;

  // Fast path: counter row already exists for this year
  const rows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  if (rows.length > 0) {
    return `${prefix}${String(Number(rows[0].value)).padStart(4, "0")}`;
  }

  // Slow path: first admission for this year — seed counter from existing records
  await client.$queryRawUnsafe(
    `INSERT INTO "ReceiptCounter" ("prefix", "value")
     SELECT $1, COALESCE(MAX(
       CAST(SUBSTRING("admissionNumber" FROM 'ADM-[0-9]{4}-([0-9]+)') AS INT)
     ), 0)
     FROM "Student"
     WHERE "admissionNumber" LIKE $1 || '%'
     ON CONFLICT ("prefix") DO NOTHING`,
    prefix
  );

  const seededRows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  return `${prefix}${String(Number(seededRows[0].value)).padStart(4, "0")}`;
}

import { getAcademicYear } from "./generateYearlyCharges";

// ── LF-01 / LF-02 fix: Atomic family code generation with academic year cohort ───
// Replaces the read-max-then-increment pattern with an atomic counter.
// Prefix "FAM-<academicYearStart>-" shares the ReceiptCounter table.
// Must be called INSIDE a db.$transaction for full concurrency safety.
export async function getNextFamilyCode(tx?: any, date: Date = new Date()): Promise<string> {
  const client = tx || db;
  // ── LF-02: Use authoritative academic year starting year for cohort consistency (e.g. Jan 2027 belongs to 2026-2027 session)
  const acYear = getAcademicYear(date);
  const startYear = acYear.split("-")[0];
  const prefix = `FAM-${startYear}-`;

  const rows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  if (rows.length > 0) {
    return `${prefix}${String(Number(rows[0].value)).padStart(4, "0")}`;
  }

  // Seed from existing family codes
  await client.$queryRawUnsafe(
    `INSERT INTO "ReceiptCounter" ("prefix", "value")
     SELECT $1, COALESCE(MAX(
       CAST(SUBSTRING("familyCode" FROM 'FAM-[0-9]{4}-([0-9]+)') AS INT)
     ), 0)
     FROM "ParentProfile"
     WHERE "familyCode" LIKE $1 || '%'
     ON CONFLICT ("prefix") DO NOTHING`,
    prefix
  );

  const seededRows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  return `${prefix}${String(Number(seededRows[0].value)).padStart(4, "0")}`;
}

// ── S-02 fix: Atomic roll number generation per class ────────────────────────
// Replaces db.student.count({ where: { classId } }) + 1, which races under
// concurrent admissions to the same class. Uses ReceiptCounter with prefix
// "ROLL-<classId>-" so each class has its own counter row.
// Must be called INSIDE a db.$transaction.
export async function getNextRollNumber(
  classId: string,
  className: string,
  section: string,
  tx?: any
): Promise<string> {
  const client = tx || db;
  const prefix = `ROLL-${classId}-`;

  const rows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  if (rows.length > 0) {
    const n = Number(rows[0].value);
    return `${className}-${section}-${String(n).padStart(2, "0")}`;
  }

  // Seed from existing students in this class
  await client.$queryRawUnsafe(
    `INSERT INTO "ReceiptCounter" ("prefix", "value")
     SELECT $1, COUNT(*)
     FROM "Student"
     WHERE "classId" = $2
     ON CONFLICT ("prefix") DO NOTHING`,
    prefix,
    classId
  );

  const seededRows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  const n = Number(seededRows[0].value);
  return `${className}-${section}-${String(n).padStart(2, "0")}`;
}

// ── Receipt number (B-01 — unchanged) ────────────────────────────────────────
/**
 * Generate the next receipt number atomically using a database counter.
 *
 * Concurrency model:
 * -  Uses UPDATE ... RETURNING on a single ReceiptCounter row, which acquires
 *    a PostgreSQL row-level lock for the duration of the enclosing transaction.
 * -  Concurrent transactions that call this function will BLOCK on the row lock
 *    until the first transaction commits or rolls back.
 * -  If the transaction rolls back, the counter rolls back too (it's in the same
 *    transaction). The next transaction then gets the same number — no collision
 *    because the rolled-back transaction's receipt no longer exists.
 * -  The @unique constraint on Receipt.receiptNumber is the ultimate safety net.
 *
 * First-use seeding:
 * -  On the very first call for a given year-prefix, the counter row doesn't
 *    exist. We seed it from existing Receipt records (handles migration from
 *    the old read-max pattern), then increment. The INSERT ... ON CONFLICT
 *    DO NOTHING ensures only one transaction creates the seed row.
 *
 * @param tx  Prisma interactive transaction client (must be provided for
 *            concurrency safety — the row lock is only effective within a
 *            transaction).
 */
export async function getNextReceiptNumber(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  // ── Fast path: counter row already exists ──────────────────────────
  // Atomically increment and return. The UPDATE acquires a row-level lock
  // that serializes concurrent callers until this transaction completes.
  const rows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  if (rows.length > 0) {
    return `${prefix}${String(Number(rows[0].value)).padStart(5, "0")}`;
  }

  // ── Slow path: first use for this year-prefix ──────────────────────
  // Seed the counter from existing Receipt records so we don't restart
  // numbering after the migration. ON CONFLICT DO NOTHING is safe if two
  // transactions race here — one inserts, the other skips, and both
  // proceed to the UPDATE below which serializes them.
  await client.$queryRawUnsafe(
    `INSERT INTO "ReceiptCounter" (\"prefix\", \"value\")
     SELECT $1, COALESCE(MAX(
       CAST(SUBSTRING("receiptNumber" FROM 'REC-[0-9]{4}-([0-9]+)') AS INT)
     ), 0)
     FROM "Receipt"
     WHERE "receiptNumber" LIKE $1 || '%'
     ON CONFLICT ("prefix") DO NOTHING`,
    prefix
  );

  // Increment the freshly-seeded counter (or the one the other transaction
  // seeded — either way, we get a unique value).
  const seededRows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  return `${prefix}${String(Number(seededRows[0].value)).padStart(5, "0")}`;
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractHouseIdentifier(address: string | null | undefined): string | null {
  if (!address) return null;
  const match = address.match(/(?:h(?:ouse)?\.?\s*(?:no\.?)?|flat\s*(?:no\.?)?|plot\s*(?:no\.?)?|#)\s*([a-z0-9\-\/]+)/i)
    || address.match(/\b\d+[\/\-][a-z0-9\-]+\b/i)
    || address.match(/\b\d+\b/);
  return match ? match[0].toLowerCase().replace(/\s+/g, "") : null;
}

function isCorroboratedAddressMatch(addr1: string | null | undefined, addr2: string | null | undefined): boolean {
  if (!addr1 || !addr2) return false;
  const norm1 = normalizeName(addr1);
  const norm2 = normalizeName(addr2);
  if (!norm1 || !norm2 || norm1.length < 12 || norm2.length < 12) return false;

  // Exact complete normalized address match (e.g. identical house, street, locality)
  if (norm1 === norm2) return true;

  // Extract house/flat/plot specific identifiers
  const house1 = extractHouseIdentifier(addr1);
  const house2 = extractHouseIdentifier(addr2);

  // If both have specific house numbers and they differ, they are different residences in the same locality/city!
  if (house1 && house2 && house1 !== house2) {
    return false;
  }

  // If both have the same specific house number and substantial overlapping address text
  if (house1 && house2 && house1 === house2 && (norm1.includes(norm2) || norm2.includes(norm1))) {
    return true;
  }

  return false;
}

export function findMatchingParentProfile(
  record: {
    fatherMobile?: string;
    motherMobile?: string;
    fatherName?: string;
    motherName?: string;
    parentEmail?: string;
    address?: string;
  },
  existingProfiles: Array<{
    id: string;
    familyCode: string;
    user?: { name: string; phone?: string | null; email?: string | null } | null;
    address?: string | null;
    students: Array<{ fatherName?: string | null; motherName?: string | null; fatherMobile?: string | null; motherMobile?: string | null }>;
  }>
) {
  const cleanFatherMobile = record.fatherMobile?.trim().replace(/\D/g, "");
  const cleanMotherMobile = record.motherMobile?.trim().replace(/\D/g, "");
  const cleanEmail = record.parentEmail?.trim().toLowerCase();
  const normFather = normalizeName(record.fatherName);
  const normMother = normalizeName(record.motherName);

  for (const profile of existingProfiles) {
    const userPhone = profile.user?.phone?.trim().replace(/\D/g, "");

    // ── Signal 1: Primary Deterministic Mobile Phone Match (min 8 digits)
    if (cleanFatherMobile && cleanFatherMobile.length >= 8) {
      if (
        userPhone === cleanFatherMobile ||
        profile.students.some((s) => {
          const sf = s.fatherMobile?.trim().replace(/\D/g, "");
          const sm = s.motherMobile?.trim().replace(/\D/g, "");
          return sf === cleanFatherMobile || sm === cleanFatherMobile;
        })
      ) {
        return profile;
      }
    }
    if (cleanMotherMobile && cleanMotherMobile.length >= 8) {
      if (
        userPhone === cleanMotherMobile ||
        profile.students.some((s) => {
          const sf = s.fatherMobile?.trim().replace(/\D/g, "");
          const sm = s.motherMobile?.trim().replace(/\D/g, "");
          return sf === cleanMotherMobile || sm === cleanMotherMobile;
        })
      ) {
        return profile;
      }
    }

    // ── Signal 2: Primary Deterministic Parent User Email Match
    if (cleanEmail && cleanEmail.includes("@") && profile.user?.email?.trim().toLowerCase() === cleanEmail) {
      return profile;
    }

    // ── Signal 3: Dual-Parent Identity Match (Both Father Name AND Mother Name match)
    if (normFather && normMother && normFather.length >= 3 && normMother.length >= 3) {
      const matchBothParents = profile.students.some((s) => {
        const sFather = normalizeName(s.fatherName);
        const sMother = normalizeName(s.motherName);
        return (sFather === normFather && sMother === normMother) ||
               (sFather === normFather && normalizeName(profile.user?.name) === normFather && sMother === normMother);
      });
      if (matchBothParents) return profile;
    }

    // ── Signal 4: Corroborated Parent Name + Exact Specific House/Address Match
    // (LF-03: Prevents false merges of unrelated families with common names in the same city/locality)
    if (normFather && normFather.length >= 4 && record.address && profile.address) {
      const fatherMatches =
        normalizeName(profile.user?.name) === normFather ||
        profile.students.some((s) => normalizeName(s.fatherName) === normFather);

      if (fatherMatches && isCorroboratedAddressMatch(record.address, profile.address)) {
        // Guard against conflicting primary phone numbers if both records have full phones
        const profileFatherPhone = profile.students.find((s) => s.fatherMobile)?.fatherMobile?.trim().replace(/\D/g, "");
        if (cleanFatherMobile && profileFatherPhone && cleanFatherMobile !== profileFatherPhone) {
          // Explicitly different phone numbers with only single-parent match -> do not auto-merge
          continue;
        }
        return profile;
      }
    }
  }

  return null;
}

// ── U-03: Atomic employee ID generation for staff accounts ───────────────────
// Replaces Math.random() with an atomic sequential counter per role prefix
// (e.g. "TCH-2026-0001", "ACC-2026-0001") using ReceiptCounter to prevent collisions.
export async function getNextEmployeeId(role: "TEACHER" | "ACCOUNTANT", tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const rolePrefix = role === "TEACHER" ? "TCH" : "ACC";
  const prefix = `${rolePrefix}-${year}-`;

  const rows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  if (rows.length > 0) {
    return `${prefix}${String(Number(rows[0].value)).padStart(4, "0")}`;
  }

  // Seed counter from existing profile records
  const tableName = role === "TEACHER" ? "TeacherProfile" : "AccountantProfile";
  await client.$queryRawUnsafe(
    `INSERT INTO "ReceiptCounter" ("prefix", "value")
     SELECT $1, COALESCE(MAX(
       CAST(SUBSTRING("employeeId" FROM '${rolePrefix}-[0-9]{4}-([0-9]+)') AS INT)
     ), 0)
     FROM "${tableName}"
     WHERE "employeeId" LIKE $1 || '%'
     ON CONFLICT ("prefix") DO NOTHING`,
    prefix
  );

  const seededRows: any[] = await client.$queryRawUnsafe(
    `UPDATE "ReceiptCounter"
     SET "value" = "value" + 1
     WHERE "prefix" = $1
     RETURNING "value"`,
    prefix
  );

  return `${prefix}${String(Number(seededRows[0].value)).padStart(4, "0")}`;
}

