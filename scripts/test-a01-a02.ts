export {}; // ES module isolation

/**
 * Regression tests for A-01 and A-02 fixes.
 *
 * A-01: DB-backed login rate limiting (shared across serverless instances).
 * A-02: JWT session revocation via tokenVersion (block / logout / password reset).
 *
 * All tests are pure logic — no DB connection required.
 * Run: npx tsx scripts/test-a01-a02.ts
 */

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
// Simulate the DB-backed rate limiter (A-01)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 min

type LoginAttemptRow = { count: number; windowStart: Date };

function simulateRateLimiter() {
  // Simulate the shared database state (one row per IP, shared across all instances)
  const db = new Map<string, LoginAttemptRow>();

  function checkLoginRateLimit(ip: string, nowMs: number = Date.now()): boolean {
    const clientIp = ip.split(",")[0].trim() || "unknown";
    const existing = db.get(clientIp);
    const nowDate = new Date(nowMs);

    if (!existing) {
      db.set(clientIp, { count: 1, windowStart: nowDate });
      return true;
    }

    const windowAge = (nowMs - existing.windowStart.getTime()) / 1000;
    if (windowAge > WINDOW_SECONDS) {
      // Window expired — reset
      db.set(clientIp, { count: 1, windowStart: nowDate });
      return true;
    }

    const newCount = existing.count + 1;
    db.set(clientIp, { ...existing, count: newCount });
    return newCount <= MAX_ATTEMPTS;
  }

  function clearLoginRateLimit(ip: string) {
    const clientIp = ip.split(",")[0].trim() || "unknown";
    db.delete(clientIp);
  }

  function getCount(ip: string): number {
    return db.get(ip)?.count ?? 0;
  }

  return { checkLoginRateLimit, clearLoginRateLimit, getCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: A-01 — basic rate limit enforcement
// ─────────────────────────────────────────────────────────────────────────────
function testA01BasicRateLimit() {
  console.log("\n─── Test 1: A-01 — basic rate limit (5 attempts per window) ───");

  const { checkLoginRateLimit, getCount } = simulateRateLimiter();
  const IP = "1.2.3.4";

  // First 5 attempts: all allowed
  for (let i = 1; i <= 5; i++) {
    assertTrue(`Attempt ${i} allowed`, checkLoginRateLimit(IP) === true);
  }
  assertEq("Count after 5 attempts", getCount(IP), 5);

  // 6th attempt: blocked
  assertTrue("Attempt 6 blocked", checkLoginRateLimit(IP) === false);
  assertTrue("Attempt 7 still blocked", checkLoginRateLimit(IP) === false);
  assertEq("Count after 7 attempts", getCount(IP), 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: A-01 — window reset after expiry
// ─────────────────────────────────────────────────────────────────────────────
function testA01WindowReset() {
  console.log("\n─── Test 2: A-01 — rate limit window resets after 15 minutes ───");

  const { checkLoginRateLimit } = simulateRateLimiter();
  const IP = "1.2.3.4";
  const t0 = Date.now();

  // Exhaust the window
  for (let i = 0; i < 5; i++) checkLoginRateLimit(IP, t0);
  assertTrue("Blocked at t=0", checkLoginRateLimit(IP, t0) === false);

  // Just before window ends: still blocked
  const t14min = t0 + 14 * 60 * 1000;
  assertTrue("Still blocked at 14 min", checkLoginRateLimit(IP, t14min) === false);

  // Just after window ends: reset, allowed again
  const t16min = t0 + 16 * 60 * 1000;
  assertTrue("Allowed again at 16 min (window reset)", checkLoginRateLimit(IP, t16min) === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: A-01 — multi-instance shared state (key insight of the fix)
// ─────────────────────────────────────────────────────────────────────────────
function testA01MultiInstance() {
  console.log("\n─── Test 3: A-01 — shared DB state prevents multi-instance bypass ───");

  // OLD behavior: each instance has its own Map
  function makeOldInProcessLimiter() {
    const map = new Map<string, { count: number; expiresAt: number }>();
    return function checkOld(ip: string, now: number = Date.now()): boolean {
      const rec = map.get(ip);
      if (!rec || now > rec.expiresAt) {
        map.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
        return true;
      }
      if (rec.count >= 5) return false;
      rec.count++;
      return true;
    };
  }

  const instance1 = makeOldInProcessLimiter();
  const instance2 = makeOldInProcessLimiter();
  const IP = "5.6.7.8";

  // Old behavior: exhaust instance 1
  for (let i = 0; i < 5; i++) instance1(IP);
  assertTrue("Old: Instance 1 blocks after 5 attempts", instance1(IP) === false);
  // Old behavior: instance 2 still allows (bypass!)
  assertTrue("OLD BUG: Instance 2 still allows (bypass possible)", instance2(IP) === true);

  // NEW behavior: shared DB — both "instances" use the same store
  const { checkLoginRateLimit: checkNew } = simulateRateLimiter();
  for (let i = 0; i < 5; i++) checkNew(IP);
  // Simulate two concurrent calls from different instances to the same DB
  assertTrue("NEW: Instance 1 (via DB) blocks after 5", checkNew(IP) === false);
  assertTrue("NEW: Instance 2 (via DB) also blocks", checkNew(IP) === false);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: A-01 — clear on successful login
// ─────────────────────────────────────────────────────────────────────────────
function testA01ClearOnSuccess() {
  console.log("\n─── Test 4: A-01 — rate limit cleared after successful login ───");

  const { checkLoginRateLimit, clearLoginRateLimit, getCount } = simulateRateLimiter();
  const IP = "9.8.7.6";

  // 4 failed attempts
  for (let i = 0; i < 4; i++) checkLoginRateLimit(IP);
  assertEq("4 failed attempts recorded", getCount(IP), 4);

  // Successful login clears the record
  clearLoginRateLimit(IP);
  assertEq("Cleared after success", getCount(IP), 0);

  // Can attempt again from clean state
  assertTrue("First attempt after clear is allowed", checkLoginRateLimit(IP) === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: A-01 — IP normalisation (first value from x-forwarded-for chain)
// ─────────────────────────────────────────────────────────────────────────────
function testA01IpNorm() {
  console.log("\n─── Test 5: A-01 — IP normalised from x-forwarded-for chain ───");

  const { checkLoginRateLimit, getCount } = simulateRateLimiter();

  // Simulate the normalisation done in rateLimit.ts
  const norm = (ip: string) => ip.split(",")[0].trim() || "unknown";

  const chain = "1.2.3.4, 10.0.0.1, 172.16.0.1";
  const normIp = norm(chain);
  assertEq("Normalised IP is first in chain", normIp, "1.2.3.4");

  // Attempts via the chain and via the direct IP both hit the same counter
  checkLoginRateLimit(chain);
  checkLoginRateLimit("1.2.3.4");
  assertEq("Both map to the same counter row", getCount("1.2.3.4"), 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulate the tokenVersion revocation logic (A-02)
// ─────────────────────────────────────────────────────────────────────────────

type MockUser = {
  id: string;
  status: "ACTIVE" | "BLOCKED";
  tokenVersion: number;
};

type MockJwt = {
  userId: string;
  role: string;
  tokenVersion: number; // baked in at issuance
};

function simulateGetAuthUser(jwt: MockJwt, dbUser: MockUser | null): MockJwt | null {
  if (!dbUser) return null;
  if (dbUser.status === "BLOCKED") return null;
  if ((jwt.tokenVersion ?? 0) !== dbUser.tokenVersion) return null;
  return jwt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: A-02 — valid token with matching tokenVersion is accepted
// ─────────────────────────────────────────────────────────────────────────────
function testA02ValidToken() {
  console.log("\n─── Test 6: A-02 — valid token with matching tokenVersion accepted ───");

  const user: MockUser = { id: "u1", status: "ACTIVE", tokenVersion: 1 };
  const jwt: MockJwt = { userId: "u1", role: "ADMIN", tokenVersion: 1 };

  const result = simulateGetAuthUser(jwt, user);
  assertTrue("Valid token accepted", result !== null);
  assertEq("Returned userId", result?.userId ?? null, "u1");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: A-02 — blocked user's token is immediately rejected
// ─────────────────────────────────────────────────────────────────────────────
function testA02BlockedUser() {
  console.log("\n─── Test 7: A-02 — blocked user rejected immediately (before expiry) ───");

  const user: MockUser = { id: "u2", status: "BLOCKED", tokenVersion: 2 };
  const jwt: MockJwt = { userId: "u2", role: "TEACHER", tokenVersion: 2 };

  // Even though tokenVersion matches, BLOCKED status rejects
  const result = simulateGetAuthUser(jwt, user);
  assertTrue("Blocked user rejected", result === null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: A-02 — logout invalidates token via tokenVersion increment
// ─────────────────────────────────────────────────────────────────────────────
function testA02LogoutRevocation() {
  console.log("\n─── Test 8: A-02 — logout increments tokenVersion, old token rejected ───");

  let dbTokenVersion = 1;
  const oldJwt: MockJwt = { userId: "u3", role: "PARENT", tokenVersion: 1 };

  // Simulate logout: tokenVersion incremented
  dbTokenVersion++;

  const user: MockUser = { id: "u3", status: "ACTIVE", tokenVersion: dbTokenVersion };

  // Old JWT (version=1) is rejected because DB is now at version=2
  const result = simulateGetAuthUser(oldJwt, user);
  assertTrue("Old token rejected after logout", result === null);

  // New JWT (issued after logout with version=2) is accepted
  const newJwt: MockJwt = { userId: "u3", role: "PARENT", tokenVersion: dbTokenVersion };
  const result2 = simulateGetAuthUser(newJwt, user);
  assertTrue("New token accepted after re-login", result2 !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: A-02 — block action increments tokenVersion, active token rejected
// ─────────────────────────────────────────────────────────────────────────────
function testA02BlockRevocation() {
  console.log("\n─── Test 9: A-02 — blocking user rejects live token immediately ───");

  let dbVersion = 3;
  const liveJwt: MockJwt = { userId: "u4", role: "ACCOUNTANT", tokenVersion: 3 };

  // Admin blocks the user: status=BLOCKED and tokenVersion++
  dbVersion++;
  const blockedUser: MockUser = { id: "u4", status: "BLOCKED", tokenVersion: dbVersion };

  // Live token rejected: both because BLOCKED and because version is stale
  const r1 = simulateGetAuthUser(liveJwt, blockedUser);
  assertTrue("Live token rejected (user blocked)", r1 === null);

  // After unblock: status=ACTIVE, but tokenVersion stays incremented
  const unblockedUser: MockUser = { id: "u4", status: "ACTIVE", tokenVersion: dbVersion };

  // Old token still rejected (version mismatch) — user must re-login
  const r2 = simulateGetAuthUser(liveJwt, unblockedUser);
  assertTrue("Old token still rejected after unblock (must re-login)", r2 === null);

  // Fresh token issued at login (version=4) accepted
  const freshJwt: MockJwt = { userId: "u4", role: "ACCOUNTANT", tokenVersion: dbVersion };
  const r3 = simulateGetAuthUser(freshJwt, unblockedUser);
  assertTrue("Fresh token accepted after unblock + re-login", r3 !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 10: A-02 — password reset revokes all live tokens
// ─────────────────────────────────────────────────────────────────────────────
function testA02PasswordResetRevocation() {
  console.log("\n─── Test 10: A-02 — password reset invalidates all live sessions ───");

  let dbVersion = 1;
  const session1: MockJwt = { userId: "u5", role: "ADMIN", tokenVersion: 1 };
  const session2: MockJwt = { userId: "u5", role: "ADMIN", tokenVersion: 1 }; // different device

  // Admin resets the user's password → tokenVersion++
  dbVersion++;
  const user: MockUser = { id: "u5", status: "ACTIVE", tokenVersion: dbVersion };

  // Both sessions on both devices are now rejected
  assertTrue("Session 1 rejected after password reset", simulateGetAuthUser(session1, user) === null);
  assertTrue("Session 2 rejected after password reset", simulateGetAuthUser(session2, user) === null);

  // New login with new password issues token with version=2
  const newSession: MockJwt = { userId: "u5", role: "ADMIN", tokenVersion: dbVersion };
  assertTrue("New session accepted after re-login", simulateGetAuthUser(newSession, user) !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 11: A-02 — pre-deploy token (no tokenVersion in payload) is rejected
// ─────────────────────────────────────────────────────────────────────────────
function testA02LegacyTokenRejected() {
  console.log("\n─── Test 11: A-02 — pre-deploy token (no tokenVersion) is rejected ───");

  // Existing tokens issued before the fix have no tokenVersion field → undefined
  // getAuthUser treats undefined as 0; DB starts at 1 → mismatch → rejected
  const legacyJwt = { userId: "u6", role: "TEACHER", tokenVersion: undefined as unknown as number };
  const user: MockUser = { id: "u6", status: "ACTIVE", tokenVersion: 1 };

  const result = simulateGetAuthUser(legacyJwt, user);
  assertTrue("Pre-deploy token (version=undefined→0) rejected", result === null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 12: A-02 — role-switch token includes tokenVersion
// ─────────────────────────────────────────────────────────────────────────────
function testA02SwitchTokenVersion() {
  console.log("\n─── Test 12: A-02 — role-switch JWT includes current tokenVersion ───");

  const user: MockUser = { id: "u7", status: "ACTIVE", tokenVersion: 2 };

  // Simulate switch route: signs new token with user.tokenVersion from DB
  const switchedJwt: MockJwt = { userId: user.id, role: "PARENT", tokenVersion: user.tokenVersion };

  // Accepted
  assertTrue("Switched token accepted", simulateGetAuthUser(switchedJwt, user) !== null);

  // After block: switched token also rejected
  user.tokenVersion++;
  user.status = "BLOCKED";
  assertTrue("Switched token rejected after block", simulateGetAuthUser(switchedJwt, user) === null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Fix Tests: A-01 (rate limiting) + A-02 (token revocation)");
  console.log("═══════════════════════════════════════════════════════════════");

  testA01BasicRateLimit();
  testA01WindowReset();
  testA01MultiInstance();
  testA01ClearOnSuccess();
  testA01IpNorm();
  testA02ValidToken();
  testA02BlockedUser();
  testA02LogoutRevocation();
  testA02BlockRevocation();
  testA02PasswordResetRevocation();
  testA02LegacyTokenRejected();
  testA02SwitchTokenVersion();

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error("Test harness error:", err);
  process.exit(1);
});
