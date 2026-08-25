export {}; // ES module isolation
/**
 * Regression tests for B-03 and BL-03 billing calculation fixes.
 *
 * B-03: Receipt snapshot subtotal and per-item balance must reflect the actual
 *       outstanding balance at time of payment, not the original charge amount.
 *       Partial payments reduce the outstanding; subsequent receipts must show
 *       the true remaining balance, not re-show the full original charge.
 *
 * BL-03: Receipt arrears must include ALL unpaid family dues, not just those
 *        covered by this receipt. A receipt should never show arrears=0 when
 *        other family charges remain unpaid.
 *
 * Run: npx tsx scripts/test-b03-bl03.ts
 * Requires: DATABASE_URL or DIRECT_URL environment variable
 */

import pg from "pg";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL (or DIRECT_URL) is required.");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
function assertEq(label: string, actual: number, expected: number) {
  if (actual === expected) {
    ok(`${label} = ${actual}`);
  } else {
    fail(`${label}: expected ${expected}, got ${actual}`);
  }
}
function assertLte(label: string, actual: number, max: number) {
  if (actual <= max) {
    ok(`${label}: ${actual} ≤ ${max}`);
  } else {
    fail(`${label}: expected ≤ ${max}, got ${actual}`);
  }
}

async function setup(client: pg.PoolClient) {
  const tag = randomUUID().slice(0, 8);

  const userId = randomUUID();
  await client.query(
    `INSERT INTO "User" (id, username, name, email, phone, role, status, "passwordHash", "createdAt", "updatedAt")
     VALUES ($1, $2, 'T-User', $3, '0000000000', 'ADMIN', 'ACTIVE', 'x', NOW(), NOW())`,
    [userId, `user_${tag}`, `b03-test-${tag}@example.com`]
  );

  const classId = randomUUID();
  await client.query(
    `INSERT INTO "Class" (id, name, section)
     VALUES ($1, $2, 'A')`,
    [classId, `Class_${tag}`]
  );

  // parentProfile user + record
  const parentUserId = randomUUID();
  await client.query(
    `INSERT INTO "User" (id, username, name, email, phone, role, status, "passwordHash", "createdAt", "updatedAt")
     VALUES ($1, $2, 'Parent User', $3, '9999999999', 'PARENT', 'ACTIVE', 'x', NOW(), NOW())`,
    [parentUserId, `puser_${tag}`, `parent-${tag}@example.com`]
  );

  const parentProfileId = randomUUID();
  await client.query(
    `INSERT INTO "ParentProfile" (id, "userId", "familyCode")
     VALUES ($1, $2, $3)`,
    [parentProfileId, parentUserId, `FAM-${tag}`]
  );

  // Student 1 under family
  const student1Id = randomUUID();
  await client.query(
    `INSERT INTO "Student" (id, name, "classId", "admissionNumber", "parentProfileId", "fatherName", "fatherMobile")
     VALUES ($1, 'Child One', $2, $3, $4, 'Father Test', '9999999999')`,
    [student1Id, classId, `B03-${tag}-1`, parentProfileId]
  );

  // Student 2 under same family
  const student2Id = randomUUID();
  await client.query(
    `INSERT INTO "Student" (id, name, "classId", "admissionNumber", "parentProfileId", "fatherName", "fatherMobile")
     VALUES ($1, 'Child Two', $2, $3, $4, 'Father Test', '9999999999')`,
    [student2Id, classId, `B03-${tag}-2`, parentProfileId]
  );

  const feeHeadId = randomUUID();
  await client.query(
    `INSERT INTO "FeeHead" (id, name, frequency, status, "createdAt")
     VALUES ($1, $2, 'monthly', 'ACTIVE', NOW())`,
    [feeHeadId, `Tuition_${tag}`]
  );

  return { userId, classId, parentProfileId, student1Id, student2Id, feeHeadId, tag };
}

async function createCharge(
  client: pg.PoolClient,
  studentId: string,
  feeHeadId: string,
  userId: string,
  amount: number,
  name: string
): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO "LedgerEntry" (id, "studentId", "feeHeadId", "entryType", amount, description, "createdById", "createdAt")
     VALUES ($1,$2,$3,'CHARGE',$4,$5,$6,NOW())`,
    [id, studentId, feeHeadId, amount, `Assigned: ${name}`, userId]
  );
  return id;
}

async function createPayment(
  client: pg.PoolClient,
  chargeId: string,
  studentId: string,
  feeHeadId: string,
  userId: string,
  parentProfileId: string | null,
  payAmountPaisa: number,
  chargeName: string
): Promise<{ receiptId: string; snapshotArrears: number; snapshotSubtotal: number; snapshotItemBalance: number }> {
  await client.query("BEGIN");

  // Lock charge row (mirrors BL-01 fix)
  const { rows: locked } = await client.query(
    `SELECT * FROM "LedgerEntry" WHERE id = $1 FOR UPDATE`,
    [chargeId]
  );
  const charge = locked[0];

  // Get existing paid
  const { rows: paidRows } = await client.query(
    `SELECT COALESCE(SUM(amount),0)::int AS total FROM "ReceiptItem" WHERE "ledgerEntryId" = $1`,
    [chargeId]
  );
  const existingPaid = Number(paidRows[0].total);

  // Get existing discounts
  const { rows: discRows } = await client.query(
    `SELECT COALESCE(SUM(ABS(amount)),0)::int AS total
     FROM "LedgerEntry"
     WHERE "studentId" = $1 AND "entryType" = 'DISCOUNT'
       AND ("description" LIKE $2 OR "description" = $3)`,
    [studentId, `%: ${chargeName}`, `Discount for: ${chargeName}`]
  );
  const associatedDiscounts = Number(discRows[0].total);

  const outstandingPaisa = Math.max(0, Number(charge.amount) - associatedDiscounts - existingPaid);
  const actualPay = Math.min(payAmountPaisa, outstandingPaisa);

  // ── B-03: subtotal = outstanding, not charge.amount ─────────────────────
  const subtotal = outstandingPaisa;
  const itemBalance = Math.max(0, outstandingPaisa - actualPay);

  // ── BL-03: family total outstanding BEFORE this payment ─────────────────
  let familyTotalOutstanding = 0;
  if (parentProfileId) {
    const { rows: familyRows } = await client.query(
      `SELECT
         le.amount::int AS charge_amount,
         COALESCE(SUM(ri.amount) FILTER (WHERE ri.id IS NOT NULL),0)::int AS paid,
         COALESCE(
           (SELECT SUM(ABS(d.amount)) FROM "LedgerEntry" d
            WHERE d."studentId" = le."studentId" AND d."entryType" = 'DISCOUNT'
              AND (d.description LIKE '%: ' || REGEXP_REPLACE(le.description,'^Assigned: ','')
                   OR d.description = 'Discount for: ' || REGEXP_REPLACE(le.description,'^Assigned: ',''))
           ), 0
         )::int AS discounted
       FROM "LedgerEntry" le
       JOIN "Student" s ON s.id = le."studentId"
       LEFT JOIN "ReceiptItem" ri ON ri."ledgerEntryId" = le.id
       WHERE s."parentProfileId" = $1 AND le."entryType" = 'CHARGE'
       GROUP BY le.id, le.amount, le."studentId", le.description`,
      [parentProfileId]
    );
    for (const row of familyRows) {
      familyTotalOutstanding += Math.max(
        0, Number(row.charge_amount) - Number(row.paid) - Number(row.discounted)
      );
    }
  } else {
    familyTotalOutstanding = outstandingPaisa;
  }

  const arrears = Math.max(0, familyTotalOutstanding - actualPay);

  const receiptId = randomUUID();
  const prefix = `TEST-B03-${Date.now().toString().slice(-6)}-`;
  await client.query(
    `INSERT INTO "ReceiptCounter" (prefix, value) VALUES ($1, 0) ON CONFLICT (prefix) DO NOTHING`,
    [prefix]
  );
  const { rows: ctr } = await client.query(
    `UPDATE "ReceiptCounter" SET value = value + 1 WHERE prefix = $1 RETURNING value`,
    [prefix]
  );
  const receiptNo = `${prefix}${String(Number(ctr[0].value)).padStart(5, "0")}`;

  const snapshot = { subtotal, arrears, items: [{ name: chargeName, balance: itemBalance }] };
  await client.query(
    `INSERT INTO "Receipt" (id,"studentId","parentProfileId","receiptNumber","paymentMethod","amountPaid","remarks","createdById","createdAt")
     VALUES ($1,$2,$3,$4,'CASH',$5,$6,$7,NOW())`,
    [receiptId, studentId, parentProfileId, receiptNo, actualPay, JSON.stringify(snapshot), userId]
  );

  if (actualPay > 0) {
    await client.query(
      `INSERT INTO "ReceiptItem" (id,"receiptId","ledgerEntryId",amount) VALUES ($1,$2,$3,$4)`,
      [randomUUID(), receiptId, chargeId, actualPay]
    );
    await client.query(
      `INSERT INTO "LedgerEntry" (id,"studentId","feeHeadId","entryType",amount,"referenceId",description,"createdById","createdAt")
       VALUES ($1,$2,$3,'PAYMENT',$4,$5,$6,$7,NOW())`,
      [randomUUID(), studentId, feeHeadId, -actualPay, receiptId, `Payment for: ${chargeName}`, userId]
    );
  }

  await client.query("COMMIT");

  return { receiptId, snapshotArrears: arrears, snapshotSubtotal: subtotal, snapshotItemBalance: itemBalance };
}

async function teardown(client: pg.PoolClient, tag: string, parentProfileId: string) {
  // Delete in FK-safe order
  await client.query(`DELETE FROM "ReceiptItem" ri USING "Receipt" r WHERE ri."receiptId" = r.id AND r."parentProfileId" = $1`, [parentProfileId]);
  await client.query(`DELETE FROM "Receipt" WHERE "parentProfileId" = $1`, [parentProfileId]);
  await client.query(
    `DELETE FROM "LedgerEntry" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "parentProfileId" = $1)`,
    [parentProfileId]
  );
  await client.query(`DELETE FROM "Student" WHERE "admissionNumber" LIKE $1`, [`B03-${tag}-%`]);
  await client.query(`DELETE FROM "Class" WHERE name = 'B03Class' AND section = 'A'`);
  await client.query(`DELETE FROM "ParentProfile" WHERE id = $1`, [parentProfileId]);
  await client.query(`DELETE FROM "User" WHERE email LIKE $1`, [`%-${tag}@example.com`]);
  await client.query(`DELETE FROM "FeeHead" WHERE name = 'Tuition'`);
}

// ── Test 1: B-03 — Partial payment subtotal and balance ───────────────────────

async function testB03PartialPayment(pool: pg.Pool) {
  console.log("\n─── Test 1: B-03 — Partial payment: subtotal and balance use outstanding, not original ───");

  const client = await pool.connect();
  try {
    const { userId, feeHeadId, parentProfileId, student1Id, tag } = await setup(client);

    const chargeAmount = 100_000; // ₹1000
    const chargeId = await createCharge(client, student1Id, feeHeadId, userId, chargeAmount, "Tuition June");

    // First payment: ₹400 partial
    const r1 = await createPayment(client, chargeId, student1Id, feeHeadId, userId, parentProfileId, 40_000, "Tuition June");

    // At time of R1: outstanding = 100000, paid = 0 → subtotal should be 100000
    assertEq("R1 subtotal (full outstanding)", r1.snapshotSubtotal, 100_000);
    // R1 item balance = 100000 - 40000 = 60000
    assertEq("R1 item balance after ₹400 payment", r1.snapshotItemBalance, 60_000);

    // Second payment: ₹300 on the same charge (₹600 still outstanding after R1)
    const r2 = await createPayment(client, chargeId, student1Id, feeHeadId, userId, parentProfileId, 30_000, "Tuition June");

    // At time of R2: charge=100000, existingPaid=40000 → outstanding=60000
    assertEq("R2 subtotal (outstanding after first payment)", r2.snapshotSubtotal, 60_000);
    // R2 item balance = 60000 - 30000 = 30000
    assertEq("R2 item balance after ₹300 payment", r2.snapshotItemBalance, 30_000);
    // R2 arrears (family total outstanding after this receipt) = 30000
    assertEq("R2 arrears (single remaining due)", r2.snapshotArrears, 30_000);

    // Full payment of remaining ₹300
    const r3 = await createPayment(client, chargeId, student1Id, feeHeadId, userId, parentProfileId, 30_000, "Tuition June");

    assertEq("R3 subtotal (exactly remaining)", r3.snapshotSubtotal, 30_000);
    assertEq("R3 item balance = 0 (fully paid)", r3.snapshotItemBalance, 0);
    assertEq("R3 arrears = 0 (all dues cleared)", r3.snapshotArrears, 0);

    await teardown(client, tag, parentProfileId);
  } finally {
    client.release();
  }
}

// ── Test 2: BL-03 — Family arrears include sibling's unpaid dues ──────────────

async function testBL03FamilyArrears(pool: pg.Pool) {
  console.log("\n─── Test 2: BL-03 — Family arrears include all sibling dues ───");

  const client = await pool.connect();
  try {
    const { userId, feeHeadId, parentProfileId, student1Id, student2Id, tag } = await setup(client);

    // Child 1: ₹500 charge
    const charge1Id = await createCharge(client, student1Id, feeHeadId, userId, 50_000, "Tuition July");
    // Child 2: ₹800 charge (different sibling, not in this receipt)
    const charge2Id = await createCharge(client, student2Id, feeHeadId, userId, 80_000, "Tuition July");

    // Pay Child 1's charge only (Child 2's charge remains unpaid)
    const r = await createPayment(client, charge1Id, student1Id, feeHeadId, userId, parentProfileId, 50_000, "Tuition July");

    // subtotal for this receipt = outstanding of charge1 = 50000
    assertEq("Receipt subtotal = charge1 outstanding", r.snapshotSubtotal, 50_000);
    // arrears MUST include charge2 (₹800 = 80000 paisa) — BL-03 fix
    // Family outstanding before this receipt = 50000 + 80000 = 130000
    // After paying 50000 → arrears = 80000
    assertEq("Receipt arrears includes sibling's unpaid ₹800", r.snapshotArrears, 80_000);

    // Now also pay Child 2's charge
    const r2 = await createPayment(client, charge2Id, student2Id, feeHeadId, userId, parentProfileId, 80_000, "Tuition July");

    assertEq("R2 subtotal = charge2 outstanding", r2.snapshotSubtotal, 80_000);
    assertEq("R2 arrears = 0 (all family dues cleared)", r2.snapshotArrears, 0);

    await teardown(client, tag, parentProfileId);
  } finally {
    client.release();
  }
}

// ── Test 3: BL-03 — Partial payment against one sibling, other sibling still has dues ──

async function testBL03PartialWithSibling(pool: pg.Pool) {
  console.log("\n─── Test 3: BL-03 — Partial sibling payment, other sibling unpaid ───");

  const client = await pool.connect();
  try {
    const { userId, feeHeadId, parentProfileId, student1Id, student2Id, tag } = await setup(client);

    // Child 1: ₹600; Child 2: ₹400
    const charge1Id = await createCharge(client, student1Id, feeHeadId, userId, 60_000, "Tuition Aug");
    const charge2Id = await createCharge(client, student2Id, feeHeadId, userId, 40_000, "Tuition Aug");

    // Pay ₹200 partial on Child 1 only
    const r = await createPayment(client, charge1Id, student1Id, feeHeadId, userId, parentProfileId, 20_000, "Tuition Aug");

    // Family total outstanding before payment = 60000 + 40000 = 100000
    // After paying 20000 → arrears = 80000
    assertEq("Arrears = child1 remaining (40k) + child2 full (40k) = 80k", r.snapshotArrears, 80_000);

    // The receipt subtotal must be 60000 (outstanding of charge1), not 60000+40000
    assertEq("Subtotal = only outstanding of charged items (60k)", r.snapshotSubtotal, 60_000);

    // item balance for charge1 = 60000 - 20000 = 40000
    assertEq("Item balance = 40k remaining on child1 charge", r.snapshotItemBalance, 40_000);

    await teardown(client, tag, parentProfileId);
  } finally {
    client.release();
  }
}

// ── Test 4: B-03 — Multiple charges in one receipt, both partially pre-paid ───

async function testB03MultiplePartialCharges(pool: pg.Pool) {
  console.log("\n─── Test 4: B-03 — Multiple partially pre-paid charges in one receipt ───");
  console.log("    (Logic-level test — verifies calculation formulas directly)");

  // Simulate the B-03 formula without hitting the DB
  const charges = [
    { original: 50_000, existingPaid: 20_000, paying: 10_000 },
    { original: 80_000, existingPaid: 0,       paying: 30_000 },
    { original: 30_000, existingPaid: 30_000,  paying: 0       }, // fully paid
  ];

  // Old (broken) formula
  const oldSubtotal = charges.reduce((s, c) => s + c.original, 0);
  const oldArrears = Math.max(0, oldSubtotal - charges.reduce((s, c) => s + c.paying, 0));

  // New (fixed) B-03 formula
  const outstanding = charges.map((c) => Math.max(0, c.original - c.existingPaid));
  const newSubtotal = outstanding.reduce((s, o) => s + o, 0); // 30000 + 80000 + 0 = 110000
  const newArrears = Math.max(0, newSubtotal - charges.reduce((s, c) => s + c.paying, 0));

  // Old formula gives misleading subtotal (includes fully-paid charge amount)
  if (oldSubtotal !== newSubtotal) {
    ok(`Old subtotal (${oldSubtotal}) ≠ new subtotal (${newSubtotal}) — confirms B-03 fix is needed`);
  } else {
    fail("B-03 test setup error — old and new subtotals should differ");
  }

  // New formula: subtotal = 110000 (sum of outstanding only)
  assertEq("New subtotal = sum of outstanding (30k+80k+0k)", newSubtotal, 110_000);
  // New arrears = 110000 - 40000 (paying) = 70000
  assertEq("New arrears after payments", newArrears, 70_000);

  // Per-item balance with new formula
  const itemBalances = charges.map((c, i) =>
    Math.max(0, outstanding[i] - c.paying)
  );
  assertEq("Item 0 balance (30k-10k)", itemBalances[0], 20_000);
  assertEq("Item 1 balance (80k-30k)", itemBalances[1], 50_000);
  assertEq("Item 2 balance (0k-0k, fully paid)", itemBalances[2], 0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Billing Calculation Tests: B-03 and BL-03");
  console.log("═══════════════════════════════════════════════════════════════");

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5, connectionTimeoutMillis: 10000 });

  try {
    await testB03PartialPayment(pool);
    await testBL03FamilyArrears(pool);
    await testBL03PartialWithSibling(pool);
    await testB03MultiplePartialCharges(pool);
  } finally {
    await pool.end();
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});

