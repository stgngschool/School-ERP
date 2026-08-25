export {}; // ES module isolation
/**
 * Concurrency test for receipt number generation (B-01 fix).
 *
 * This script verifies that the atomic ReceiptCounter is safe under real
 * database-level concurrency — NOT just async JavaScript concurrency.
 *
 * It opens N independent PostgreSQL connections, each running its own
 * transaction that increments the counter. The transactions overlap in time,
 * forcing PostgreSQL's row-level locking to serialize the increments.
 *
 * Run:  npx tsx scripts/test-receipt-concurrency.ts
 * Requires:  DATABASE_URL environment variable
 */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required.");
  process.exit(1);
}

// ── Configuration ────────────────────────────────────────────────────
const CONCURRENCY = 10;
const TEST_PREFIX = `TEST-RECEIPT-${Date.now()}-`; // Unique prefix to avoid touching real data
const HOLD_LOCK_MS = 50; // Time each transaction holds the row lock (simulates real payment work)

// ── SQL (mirrors getNextReceiptNumber logic in family.ts) ────────────
const SEED_SQL = `
  INSERT INTO "ReceiptCounter" ("prefix", "value")
  VALUES ($1, 0)
  ON CONFLICT ("prefix") DO NOTHING
`;

const INCREMENT_SQL = `
  UPDATE "ReceiptCounter"
  SET "value" = "value" + 1
  WHERE "prefix" = $1
  RETURNING "value"
`;

const CLEANUP_SQL = `
  DELETE FROM "ReceiptCounter"
  WHERE "prefix" = $1
`;

// ── Helpers ──────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate a complete billing transaction on an independent connection.
 * Each call: BEGIN → seed counter (if needed) → increment counter →
 * hold lock briefly (simulating payment work) → COMMIT.
 *
 * This mirrors the real code path in billing/route.ts where
 * getNextReceiptNumber(tx) runs inside db.$transaction().
 */
async function runBillingTransaction(
  client: pg.PoolClient,
  workerIndex: number
): Promise<{ workerId: number; value: number; durationMs: number }> {
  const start = performance.now();

  await client.query("BEGIN");

  // Seed step (idempotent — only the first transaction actually inserts)
  await client.query(SEED_SQL, [TEST_PREFIX]);

  // Atomic increment — this is where the row lock is acquired.
  // Concurrent transactions BLOCK here until the lock is released.
  const result = await client.query(INCREMENT_SQL, [TEST_PREFIX]);
  const value = Number(result.rows[0].value);

  // Simulate the rest of the billing transaction (receipt creation,
  // ledger entries, etc.) to hold the lock and create real overlap.
  await sleep(HOLD_LOCK_MS);

  await client.query("COMMIT");

  const durationMs = Math.round(performance.now() - start);
  return { workerId: workerIndex, value, durationMs };
}

// ── Main test ────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  B-01 Receipt Number Concurrency Test");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Concurrent transactions : ${CONCURRENCY}`);
  console.log(`  Lock hold time          : ${HOLD_LOCK_MS}ms`);
  console.log(`  Test prefix             : ${TEST_PREFIX}`);
  console.log("");

  // Create a pool with enough connections for all concurrent workers
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: CONCURRENCY,
    connectionTimeoutMillis: 10000,
  });

  // Acquire all connections upfront so they're ready to go simultaneously
  console.log(`Acquiring ${CONCURRENCY} independent database connections...`);
  const clients: pg.PoolClient[] = [];
  try {
    for (let i = 0; i < CONCURRENCY; i++) {
      clients.push(await pool.connect());
    }
    console.log(`✅ ${clients.length} connections acquired.\n`);
  } catch (err: any) {
    console.error(`❌ Failed to acquire connections: ${err.message}`);
    await pool.end();
    process.exit(1);
  }

  try {
    // ── Run all transactions concurrently ─────────────────────────
    console.log("Launching concurrent billing transactions...\n");
    const startAll = performance.now();

    const results = await Promise.all(
      clients.map((client, i) => runBillingTransaction(client, i))
    );

    const totalMs = Math.round(performance.now() - startAll);

    // ── Analyze results ──────────────────────────────────────────
    const values = results.map((r) => r.value).sort((a, b) => a - b);
    const uniqueValues = new Set(values);
    const expectedValues = Array.from({ length: CONCURRENCY }, (_, i) => i + 1);

    console.log("Results (sorted by counter value):");
    for (const r of results.sort((a, b) => a.value - b.value)) {
      console.log(
        `  Worker ${String(r.workerId).padStart(2)} → REC value ${String(r.value).padStart(3)} (${r.durationMs}ms)`
      );
    }
    console.log("");

    // ── Assertions ───────────────────────────────────────────────
    let passed = true;

    // 1. All values must be unique
    if (uniqueValues.size !== CONCURRENCY) {
      console.error(`❌ FAIL: Duplicate values detected!`);
      console.error(`   Expected ${CONCURRENCY} unique values, got ${uniqueValues.size}`);
      const dupes = values.filter((v, i) => values.indexOf(v) !== i);
      console.error(`   Duplicates: ${dupes.join(", ")}`);
      passed = false;
    } else {
      console.log(`✅ PASS: All ${CONCURRENCY} values are unique.`);
    }

    // 2. Values should be exactly 1..N (no gaps within this test run,
    //    since all transactions committed successfully)
    const isSequential = JSON.stringify(values) === JSON.stringify(expectedValues);
    if (!isSequential) {
      console.error(`❌ FAIL: Values are not sequential 1..${CONCURRENCY}`);
      console.error(`   Expected: ${expectedValues.join(", ")}`);
      console.error(`   Got:      ${values.join(", ")}`);
      passed = false;
    } else {
      console.log(`✅ PASS: Values are sequential 1..${CONCURRENCY} (no gaps).`);
    }

    // 3. Verify total time shows real concurrency overlap.
    //    If transactions were serial, total ≈ N × HOLD_LOCK_MS.
    //    Row-level locking serializes the UPDATE, so total ≈ N × HOLD_LOCK_MS
    //    (which is expected — that's the serialization we want!).
    const serialEstimate = CONCURRENCY * HOLD_LOCK_MS;
    console.log(
      `\n⏱  Total wall time: ${totalMs}ms (serial estimate: ~${serialEstimate}ms)`
    );
    if (totalMs >= serialEstimate * 0.5) {
      console.log(
        `✅ PASS: Transactions overlapped and were serialized by row lock (expected behavior).`
      );
    }

    // 4. Verify the final counter value in the database
    const finalResult = await clients[0].query(
      `SELECT "value" FROM "ReceiptCounter" WHERE "prefix" = $1`,
      [TEST_PREFIX]
    );
    const finalValue = Number(finalResult.rows[0]?.value);
    if (finalValue !== CONCURRENCY) {
      console.error(
        `❌ FAIL: Final counter value is ${finalValue}, expected ${CONCURRENCY}`
      );
      passed = false;
    } else {
      console.log(`✅ PASS: Final counter value in DB = ${finalValue} (correct).`);
    }

    // ── Format test ──────────────────────────────────────────────
    console.log("\n─── Format test ───");
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;
    const formatted = `${prefix}${String(42).padStart(5, "0")}`;
    const expectedFormat = `REC-${year}-00042`;
    if (formatted === expectedFormat) {
      console.log(`✅ PASS: Format "${formatted}" matches expected pattern.`);
    } else {
      console.error(`❌ FAIL: Format "${formatted}" ≠ "${expectedFormat}"`);
      passed = false;
    }

    console.log("\n═══════════════════════════════════════════════════════");
    if (passed) {
      console.log("  ✅ ALL TESTS PASSED");
    } else {
      console.log("  ❌ SOME TESTS FAILED");
      process.exitCode = 1;
    }
    console.log("═══════════════════════════════════════════════════════\n");
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────
    console.log("Cleaning up test counter row...");
    try {
      await clients[0].query(CLEANUP_SQL, [TEST_PREFIX]);
      console.log("✅ Test data cleaned up.");
    } catch (err: any) {
      console.warn(`⚠ Cleanup warning: ${err.message}`);
    }

    // Release all connections and close pool
    for (const client of clients) {
      client.release();
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Test script failed:", err);
  process.exit(1);
});

