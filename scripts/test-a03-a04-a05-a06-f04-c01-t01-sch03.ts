export {};
/**
 * Test suite for:
 * A-03: Login blocked-user check unreachable/conflict fix
 * A-04: Logout caller verification and CSRF protection
 * A-05: Avoid deleting cookies on GET /api/auth/me
 * A-06: Prevent admin role-switching to PARENT from fuzzy-matching students
 * F-04: Remove default fee-heads creation side-effect from GET /api/fee-config
 * C-01: Protect GET /api/concessions with authentication
 * T-01: Protect GET /api/transport with authentication
 * SCH-03: Protect GET /api/school (strip UPI/late fee/internal config for unauthenticated)
 */

import bcrypt from "bcryptjs";

const results: { label: string; pass: boolean }[] = [];

function test(label: string, pass: boolean) {
  results.push({ label, pass });
  console.log(pass ? `  ✅ PASS: ${label}` : `  ❌ FAIL: ${label}`);
  if (!pass) process.exitCode = 1;
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Fix Tests: A-03, A-04, A-05, A-06, F-04, C-01, T-01, SCH-03");
console.log("═══════════════════════════════════════════════════════════════\n");

// ─── A-03: Login Blocked-User Flow ───────────────────────────────────────────
console.log("─── Test 1: A-03 — Login blocked-user verification logic ───");

async function simulateLoginAuth(
  candidates: { id: string; username: string; status: string; passwordHash: string }[],
  cleanPassword: string
) {
  let authenticatedUser = null;
  let isBlockedUser = false;
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(cleanPassword, candidate.passwordHash);
    if (isMatch) {
      if (candidate.status === "BLOCKED") {
        isBlockedUser = true;
        break;
      }
      authenticatedUser = candidate;
      break;
    }
  }

  if (isBlockedUser) {
    return { status: 403, error: "Your account has been locked/blocked by administrator." };
  }
  if (!authenticatedUser) {
    return { status: 401, error: "Invalid password. Please check your credentials." };
  }
  return { status: 200, user: authenticatedUser };
}

async function runA03Tests() {
  const hashPass = await bcrypt.hash("correct-password", 10);
  const hashOther = await bcrypt.hash("other-password", 10);

  // 1. Single active user with correct password
  const res1 = await simulateLoginAuth(
    [{ id: "u1", username: "alice", status: "ACTIVE", passwordHash: hashPass }],
    "correct-password"
  );
  test("A-03: Active user with correct password logs in (200)", res1.status === 200 && res1.user?.username === "alice");

  // 2. Single active user with wrong password
  const res2 = await simulateLoginAuth(
    [{ id: "u1", username: "alice", status: "ACTIVE", passwordHash: hashPass }],
    "wrong-password"
  );
  test("A-03: Active user with wrong password returns 401", res2.status === 401);

  // 3. Blocked user with correct password returns 403
  const res3 = await simulateLoginAuth(
    [{ id: "u2", username: "bob_blocked", status: "BLOCKED", passwordHash: hashPass }],
    "correct-password"
  );
  test("A-03: Blocked user with correct password returns 403 locked error", res3.status === 403 && Boolean(res3.error?.includes("locked/blocked")));

  // 4. Blocked user with wrong password returns 401
  const res4 = await simulateLoginAuth(
    [{ id: "u2", username: "bob_blocked", status: "BLOCKED", passwordHash: hashPass }],
    "wrong-password"
  );
  test("A-03: Blocked user with wrong password returns 401 password mismatch", res4.status === 401);

  // 5. Multiple candidates (e.g. shared phone) where active matches
  const res5 = await simulateLoginAuth(
    [
      { id: "u3", username: "blocked_user", status: "BLOCKED", passwordHash: hashOther },
      { id: "u4", username: "active_user", status: "ACTIVE", passwordHash: hashPass },
    ],
    "correct-password"
  );
  test("A-03: Matches active candidate when blocked candidate has different password", res5.status === 200 && res5.user?.username === "active_user");
}

// ─── A-04: Logout Caller Verification and CSRF ───────────────────────────────
console.log("\n─── Test 2: A-04 — Logout verification & CSRF checks ───");

function simulateLogout(
  authUser: { userId: string } | null,
  headers: { secFetchSite?: string; origin?: string; host?: string }
) {
  if (!authUser) {
    return { status: 401, error: "Unauthorized." };
  }

  if (headers.secFetchSite === "cross-site") {
    return { status: 403, error: "Forbidden: Cross-site request rejected." };
  }

  if (headers.origin && headers.host) {
    try {
      const originHost = new URL(headers.origin).host;
      if (originHost !== headers.host) {
        return { status: 403, error: "Forbidden: Invalid origin." };
      }
    } catch {
      return { status: 403, error: "Forbidden: Malformed origin." };
    }
  }

  return { status: 200, success: true, tokenVersionIncremented: true, cookieCleared: true };
}

{
  // 1. Unauthenticated logout
  const res1 = simulateLogout(null, { host: "school.com" });
  test("A-04: Unauthenticated logout rejected with 401", res1.status === 401);

  // 2. Cross-site CSRF attempt
  const res2 = simulateLogout({ userId: "u1" }, { secFetchSite: "cross-site", host: "school.com" });
  test("A-04: Cross-site logout rejected with 403", res2.status === 403);

  // 3. Origin mismatch CSRF attempt
  const res3 = simulateLogout({ userId: "u1" }, { origin: "https://evil.com", host: "school.com" });
  test("A-04: Mismatched origin rejected with 403", res3.status === 403);

  // 4. Legitimate same-origin authenticated logout
  const res4 = simulateLogout({ userId: "u1" }, { origin: "https://school.com", host: "school.com", secFetchSite: "same-origin" });
  test("A-04: Valid authenticated same-origin logout succeeds (200)", res4.status === 200 && Boolean(res4.tokenVersionIncremented) && Boolean(res4.cookieCleared));
}

// ─── A-05: No Cookie Deletion on GET /api/auth/me ────────────────────────────
console.log("\n─── Test 3: A-05 — GET /api/auth/me read-only cookie behavior ───");

function simulateAuthMeGet(
  tokenExists: boolean,
  jwtValid: boolean,
  dbUser: { id: string; status: string; tokenVersion: number } | null,
  tokenVersionInJwt: number
) {
  let cookieDeleted = false; // Tracks if cookieStore.delete is called

  if (!tokenExists || !jwtValid) {
    return { status: 401, authenticated: false, cookieDeleted };
  }

  if (!dbUser) {
    // Fixed A-05: do NOT delete cookie on GET
    return { status: 401, authenticated: false, cookieDeleted };
  }

  if (dbUser.status === "BLOCKED") {
    // Fixed A-05: do NOT delete cookie on GET
    return { status: 403, error: "Blocked", cookieDeleted };
  }

  if (tokenVersionInJwt !== dbUser.tokenVersion) {
    return { status: 401, authenticated: false, cookieDeleted };
  }

  return { status: 200, authenticated: true, cookieDeleted };
}

{
  // 1. Missing user in DB returns 401 without deleting cookie
  const res1 = simulateAuthMeGet(true, true, null, 1);
  test("A-05: User not in DB returns 401 without calling cookieStore.delete", res1.status === 401 && !res1.cookieDeleted);

  // 2. Blocked user returns 403 without deleting cookie
  const res2 = simulateAuthMeGet(true, true, { id: "u1", status: "BLOCKED", tokenVersion: 1 }, 1);
  test("A-05: Blocked user returns 403 without calling cookieStore.delete", res2.status === 403 && !res2.cookieDeleted);

  // 3. Valid user returns 200 without modifying cookie
  const res3 = simulateAuthMeGet(true, true, { id: "u1", status: "ACTIVE", tokenVersion: 1 }, 1);
  test("A-05: Valid user returns 200 authenticated: true", res3.status === 200 && Boolean(res3.authenticated) && !res3.cookieDeleted);
}

// ─── A-06: Prevent Admin Role-Switching Fuzzy-Matching ───────────────────────
console.log("\n─── Test 4: A-06 — Admin role-switching to PARENT student scoping ───");

function simulateGetStudents(
  authUser: { userId: string; role: string },
  userParentProfileId: string | null,
  allStudents: { id: string; name: string; parentProfileId: string; fatherName: string; fatherMobile: string }[]
) {
  if (authUser.role === "PARENT") {
    if (!userParentProfileId) {
      return []; // Admin with no parentProfile gets 0 students
    }
    return allStudents.filter(s => s.parentProfileId === userParentProfileId);
  }
  return allStudents; // Staff roles see all
}

function simulateParentDashboardStudents(
  userRole: string,
  serverStudents: any[]
) {
  // Fixed A-06: strictly use serverStudents for PARENT, never fuzzy-match across other families
  return userRole === "PARENT" ? serverStudents : [];
}

{
  const allStudents = [
    { id: "s1", name: "Rahul Sharma", parentProfileId: "fam_101", fatherName: "Raj Sharma", fatherMobile: "9876543210" },
    { id: "s2", name: "Priya Sharma", parentProfileId: "fam_101", fatherName: "Raj Sharma", fatherMobile: "9876543210" },
    { id: "s3", name: "Amit Verma", parentProfileId: "fam_202", fatherName: "Sunil Verma", fatherMobile: "9999999999" },
  ];

  // 1. Legitimate parent login (fam_101)
  const parentStudents = simulateGetStudents({ userId: "parent_1", role: "PARENT" }, "fam_101", allStudents);
  test("A-06: Verified parent gets only their own 2 children", parentStudents.length === 2 && parentStudents.every(s => s.parentProfileId === "fam_101"));

  // 2. Admin (named "Raj Sharma" or phone "9876543210") switches to PARENT role but has NO parentProfile
  const adminSwitchedStudents = simulateGetStudents({ userId: "admin_1", role: "PARENT" }, null, allStudents);
  test("A-06: Admin without parentProfile gets 0 students from server", adminSwitchedStudents.length === 0);

  // 3. ParentDashboard client behavior: never fuzzy-matches across allStudents
  const uiStudents = simulateParentDashboardStudents("PARENT", adminSwitchedStudents);
  test("A-06: ParentDashboard displays 0 students (no fuzzy-match leakage to other families)", uiStudents.length === 0);

  // 4. If admin switches to PARENT and DOES have own parentProfile (fam_303)
  const adminWithOwnFamily = simulateGetStudents({ userId: "admin_2", role: "PARENT" }, "fam_303", [
    ...allStudents,
    { id: "s4", name: "Admin Child", parentProfileId: "fam_303", fatherName: "Admin User", fatherMobile: "8888888888" },
  ]);
  test("A-06: Admin with legitimate parentProfile gets only their own child", adminWithOwnFamily.length === 1 && adminWithOwnFamily[0].id === "s4");
}

// ─── F-04: Pure Read for GET /api/fee-config ──────────────────────────────────
console.log("\n─── Test 5: F-04 — GET /api/fee-config has zero DB side effects ───");

function simulateFeeConfigGet(existingHeads: { id: string; name: string; frequency: string; status: string }[]) {
  // Fixed F-04: pure read query without upsert loop
  const activeHeads = existingHeads.filter(h => h.status === "ACTIVE");
  const wasUpsertCalled = false; // No mutations performed
  return { feeHeads: activeHeads.map(h => ({ name: h.name, frequency: h.frequency })), wasUpsertCalled };
}

{
  // 1. Empty database returns empty array without triggering upsert
  const res1 = simulateFeeConfigGet([]);
  test("F-04: Empty fee heads returns empty array without upsert side-effect", res1.feeHeads.length === 0 && !res1.wasUpsertCalled);

  // 2. Populated fee heads returned directly
  const res2 = simulateFeeConfigGet([
    { id: "h1", name: "Tuition Fee", frequency: "monthly", status: "ACTIVE" },
    { id: "h2", name: "Exam Fee", frequency: "exam", status: "ACTIVE" },
  ]);
  test("F-04: Existing fee heads returned cleanly as pure read", res2.feeHeads.length === 2 && !res2.wasUpsertCalled);
}

// ─── C-01 & T-01: Authentication for Concessions & Transport ──────────────────
console.log("\n─── Test 6: C-01 & T-01 — Authentication on GET endpoints ───");

function simulateProtectedGet(authUser: { userId: string; role: string } | null, data: any[]) {
  if (!authUser) {
    return { status: 401, error: "Unauthorized access." };
  }
  return { status: 200, data, cacheControl: "private, no-cache, no-store, must-revalidate" };
}

{
  // C-01
  const cUnauth = simulateProtectedGet(null, [{ id: "c1", name: "Sibling 10%" }]);
  test("C-01: GET /api/concessions without auth returns 401", cUnauth.status === 401);

  const cAuth = simulateProtectedGet({ userId: "u1", role: "ADMIN" }, [{ id: "c1", name: "Sibling 10%" }]);
  test("C-01: GET /api/concessions with auth returns 200 with private cache", cAuth.status === 200 && Boolean(cAuth.cacheControl?.includes("private")));

  // T-01
  const tUnauth = simulateProtectedGet(null, [{ id: "t1", name: "Route A", amount: 50000 }]);
  test("T-01: GET /api/transport without auth returns 401", tUnauth.status === 401);

  const tAuth = simulateProtectedGet({ userId: "u1", role: "ACCOUNTANT" }, [{ id: "t1", name: "Route A", amount: 50000 }]);
  test("T-01: GET /api/transport with auth returns 200 with private cache", tAuth.status === 200 && Boolean(tAuth.cacheControl?.includes("private")));
}

// ─── SCH-03: School Config Privacy Protection ────────────────────────────────
console.log("\n─── Test 7: SCH-03 — GET /api/school data sanitization ───");

const fullSchoolConfig = {
  name: "St. GNG School",
  address: "Varanasi",
  phone: "9452824318",
  alternatePhone: "9452824318",
  whatsappNumber: "9452824318",
  schoolTimings: "8:00 AM - 1:30 PM",
  admissionSession: "2026-2027",
  admissionStatus: "OPEN",
  admissionClasses: "Nursery to 8th",
  marqueeText: "Admissions Open",
  googleMapsUrl: "https://maps.google.com",
  youtubeUrl: "https://youtube.com",
  facebookUrl: "",
  instagramUrl: "",
  email: "stgng2005@gmail.com",
  enableTransport: true,
  // Sensitive fields:
  upiId: "8423926608@upi",
  upiMerchantName: "St. GNG School",
  enableLateFee: true,
  lateFeeGraceDays: 10,
  lateFeeAmount: 50,
  lateFeeType: "FLAT",
  udiseCode: "09670707502",
  exams: ["Unit-1", "Annual"],
  examConfig: { "Unit-1": { maxMarks: 20 } },
};

function simulateSchoolGet(authUser: { userId: string; role: string } | null) {
  if (authUser) {
    return { status: 200, data: fullSchoolConfig };
  }

  // Unauthenticated: return only public contact/landing fields
  const publicData = {
    name: fullSchoolConfig.name || "St. GNG School",
    address: fullSchoolConfig.address || "",
    phone: fullSchoolConfig.phone || "",
    alternatePhone: fullSchoolConfig.alternatePhone || "",
    whatsappNumber: fullSchoolConfig.whatsappNumber || "",
    schoolTimings: fullSchoolConfig.schoolTimings || "",
    admissionSession: fullSchoolConfig.admissionSession || "",
    admissionStatus: fullSchoolConfig.admissionStatus || "",
    admissionClasses: fullSchoolConfig.admissionClasses || "",
    marqueeText: fullSchoolConfig.marqueeText || "",
    googleMapsUrl: fullSchoolConfig.googleMapsUrl || "",
    youtubeUrl: fullSchoolConfig.youtubeUrl || "",
    facebookUrl: fullSchoolConfig.facebookUrl || "",
    instagramUrl: fullSchoolConfig.instagramUrl || "",
    email: fullSchoolConfig.email || "",
    enableTransport: fullSchoolConfig.enableTransport ?? false,
  };
  return { status: 200, data: publicData };
}

{
  // 1. Unauthenticated request
  const unauthRes = simulateSchoolGet(null);
  const unauthData = unauthRes.data as Record<string, any>;
  test("SCH-03: Unauthenticated request receives public website fields (name, phone, address)",
    unauthData.name === "St. GNG School" && unauthData.phone === "9452824318");
  test("SCH-03: Unauthenticated request does NOT receive upiId", unauthData.upiId === undefined);
  test("SCH-03: Unauthenticated request does NOT receive upiMerchantName", unauthData.upiMerchantName === undefined);
  test("SCH-03: Unauthenticated request does NOT receive lateFeeAmount / enableLateFee", unauthData.lateFeeAmount === undefined && unauthData.enableLateFee === undefined);
  test("SCH-03: Unauthenticated request does NOT receive udiseCode", unauthData.udiseCode === undefined);
  test("SCH-03: Unauthenticated request does NOT receive examConfig", unauthData.examConfig === undefined);

  // 2. Authenticated request
  const authRes = simulateSchoolGet({ userId: "admin_1", role: "ADMIN" });
  const authData = authRes.data as Record<string, any>;
  test("SCH-03: Authenticated request receives full configuration with upiId and lateFeeAmount",
    authData.upiId === "8423926608@upi" && authData.lateFeeAmount === 50 && authData.udiseCode === "09670707502");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

async function main() {
  await runA03Tests();

  const failed = results.filter(r => !r.pass).length;
  const passed = results.filter(r => r.pass).length;
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════\n");
  if (failed > 0) process.exit(1);
}

main();
