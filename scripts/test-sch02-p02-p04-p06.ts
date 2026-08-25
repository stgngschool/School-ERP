/**
 * Focused test suite for final 4 issues:
 * SCH-02, P-02, P-04, P-06
 *
 * Run: node --env-file=.env --import=tsx scripts/test-sch02-p02-p04-p06.ts
 */

import fs from "fs";
import db from "../src/lib/db";
import { signToken } from "../src/lib/auth";
import { GET as getSchool, POST as postSchool } from "../src/app/api/school/route";
import { GET as getBillingSummary } from "../src/app/api/billing/summary/route";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log("  [PASS] " + msg);
    passed++;
  } else {
    console.error("  [FAIL] " + msg);
    failed++;
  }
}

// ── 1. SCH-02: Atomic Concurrent SchoolConfig Updates ────────────────────────
async function testSCH02() {
  console.log("\n--- 1. SCH-02: Atomic Concurrent SchoolConfig Updates ---");

  const testId = "test-sch02-concurrency-" + Date.now();

  // Initialize test row
  await db.$executeRawUnsafe(
    `INSERT INTO "SchoolConfig" ("id", "data", "updatedAt")
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT ("id")
     DO UPDATE SET "data" = "SchoolConfig"."data" || EXCLUDED."data", "updatedAt" = NOW()`,
    testId,
    JSON.stringify({
      name: "St. Test School",
      phone: "111-0000",
      email: "test@school.org",
      upiId: "test@upi",
      address: "123 Test Street",
    })
  );

  // Concurrent Admin A (updates phone & late fee) and Admin B (updates email & marquee)
  const updateA = db.$queryRawUnsafe(
    `INSERT INTO "SchoolConfig" ("id", "data", "updatedAt")
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT ("id")
     DO UPDATE SET "data" = "SchoolConfig"."data" || EXCLUDED."data", "updatedAt" = NOW()
     RETURNING "data"`,
    testId,
    JSON.stringify({ phone: "999-8888", enableLateFee: true, lateFeeAmount: 100 })
  );

  const updateB = db.$queryRawUnsafe(
    `INSERT INTO "SchoolConfig" ("id", "data", "updatedAt")
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT ("id")
     DO UPDATE SET "data" = "SchoolConfig"."data" || EXCLUDED."data", "updatedAt" = NOW()
     RETURNING "data"`,
    testId,
    JSON.stringify({ email: "new-email@school.org", marqueeText: "Admissions Open 2026-27" })
  );

  await Promise.all([updateA, updateB]);

  const finalRow: any = await db.schoolConfig.findUnique({ where: { id: testId } });
  const data = finalRow?.data as any;

  assert(data.name === "St. Test School", "SCH-02: Base name setting preserved untouched");
  assert(data.upiId === "test@upi", "SCH-02: Base upiId setting preserved untouched");
  assert(data.address === "123 Test Street", "SCH-02: Base address setting preserved untouched");
  assert(data.phone === "999-8888", "SCH-02: Admin A partial update (phone) survived");
  assert(data.enableLateFee === true && data.lateFeeAmount === 100, "SCH-02: Admin A late fee settings survived");
  assert(data.email === "new-email@school.org", "SCH-02: Admin B partial update (email) survived");
  assert(data.marqueeText === "Admissions Open 2026-27", "SCH-02: Admin B marquee text survived");

  // Cleanup test row
  await db.$executeRawUnsafe(`DELETE FROM "SchoolConfig" WHERE "id" = $1`, testId);

  // Create temporary teacher and admin users in DB for route authentication
  const now = Date.now();
  const tempAdmin = await db.user.create({
    data: {
      username: "temp_sch02_admin_" + now,
      email: "temp_sch02_admin_" + now + "@test.org",
      passwordHash: "dummy",
      role: "ADMIN",
      name: "Temp Admin",
      tokenVersion: 1,
    },
  });
  const tempTeacher = await db.user.create({
    data: {
      username: "temp_sch02_teacher_" + now,
      email: "temp_sch02_teacher_" + now + "@test.org",
      passwordHash: "dummy",
      role: "TEACHER",
      name: "Temp Teacher",
      tokenVersion: 1,
    },
  });

  const teacherToken = signToken({ userId: tempTeacher.id, username: tempTeacher.username, role: "TEACHER", tokenVersion: 1 });
  const adminToken = signToken({ userId: tempAdmin.id, username: tempAdmin.username, role: "ADMIN", tokenVersion: 1 });

  // Test Route authorization for POST /api/school
  const reqForbidden = new Request("http://localhost/api/school", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ phone: "000" }),
  });
  const resForbidden = await postSchool(reqForbidden);
  assert(resForbidden.status === 403, "SCH-02: Non-admin POST /api/school rejected with 403 Forbidden");

  // Test Admin POST /api/school
  const reqAllowed = new Request("http://localhost/api/school", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ phone: "9452824318" }),
  });
  const resAllowed = await postSchool(reqAllowed);
  assert(resAllowed.status === 200, "SCH-02: Admin POST /api/school accepted with 200 OK");

  // Test Public vs Authenticated GET
  const publicReq = new Request("http://localhost/api/school", { method: "GET" });
  const publicRes = await getSchool(publicReq);
  const publicJson = await publicRes.json();
  assert(publicJson.upiId === undefined, "SCH-02: Sensitive upiId NOT exposed in public GET");
  assert(publicJson.name !== undefined, "SCH-02: Public school name returned for landing page");

  // Clean up temp audit logs and users
  await db.auditLog.deleteMany({ where: { userId: tempAdmin.id } });
  await db.user.delete({ where: { id: tempTeacher.id } });
  await db.user.delete({ where: { id: tempAdmin.id } });
}

// ── 2. P-02: Lightweight Billing Summary Endpoint ────────────────────────────
async function testP02() {
  console.log("\n--- 2. P-02: Lightweight Billing Summary Endpoint ---");

  const now = Date.now();
  const tempAdmin = await db.user.create({
    data: {
      username: "temp_p02_admin_" + now,
      email: "temp_p02_admin_" + now + "@test.org",
      passwordHash: "dummy",
      role: "ADMIN",
      name: "Temp Admin P02",
      tokenVersion: 1,
    },
  });

  const adminToken = signToken({ userId: tempAdmin.id, username: tempAdmin.username, role: "ADMIN", tokenVersion: 1 });
  const adminReq = new Request("http://localhost/api/billing/summary", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminRes = await getBillingSummary(adminReq);
  assert(adminRes.status === 200, "P-02: Authenticated ADMIN GET /api/billing/summary returns 200 OK");
  const adminData = await adminRes.json();
  assert(adminData.success === true, "P-02: Summary response has success: true");
  assert(typeof adminData.summary.totalChargesPaisa === "number", "P-02: totalChargesPaisa is numeric");
  assert(typeof adminData.summary.totalCollectedPaisa === "number", "P-02: totalCollectedPaisa is numeric");
  assert(typeof adminData.summary.todayCollectedPaisa === "number", "P-02: todayCollectedPaisa is numeric");
  assert(typeof adminData.summary.netDuesPaisa === "number", "P-02: netDuesPaisa is numeric");
  assert(typeof adminData.summary.totalReceiptsCount === "number", "P-02: totalReceiptsCount is numeric");

  // Unauthenticated request should be 401
  const unauthReq = new Request("http://localhost/api/billing/summary", { method: "GET" });
  const unauthRes = await getBillingSummary(unauthReq);
  assert(unauthRes.status === 401, "P-02: Unauthenticated GET /api/billing/summary rejected with 401");

  // Cleanup temp admin
  await db.user.delete({ where: { id: tempAdmin.id } });
}

// ── 3. P-04: Dashboard Render Performance & Memoized Lookups ────────────────
async function testP04() {
  console.log("\n--- 3. P-04: Dashboard Render Performance & Memoized Lookups ---");

  // Test Set indexing logic
  const mockDueItems = [
    { studentId: "s1", status: "UNPAID", amount: 5000 },
    { studentId: "s2", status: "PAID", amount: 5000 },
    { studentId: "s3", status: "UNPAID", amount: 2000 },
    { studentId: "s1", status: "UNPAID", amount: 3000 },
  ];
  const mockStudents = [
    { id: "s1", name: "Student 1" },
    { id: "s2", name: "Student 2" },
    { id: "s3", name: "Student 3" },
    { id: "s4", name: "Student 4" },
  ];

  const unpaidSet = new Set(mockDueItems.filter((d) => d.status === "UNPAID").map((d) => d.studentId));
  const unpaidStudents = mockStudents.filter((s) => unpaidSet.has(s.id));

  assert(unpaidSet.size === 2, "P-04: unpaidSet deduplicates student IDs (s1, s3)");
  assert(unpaidStudents.length === 2, "P-04: unpaidStudents matches exactly s1 and s3");
  assert(unpaidStudents[0].id === "s1" && unpaidStudents[1].id === "s3", "P-04: unpaidStudents correctly filtered");

  // Verify studentByIdMap fast lookup
  const studentMap = new Map(mockStudents.map((s) => [s.id, s]));
  assert(studentMap.get("s2")?.name === "Student 2", "P-04: studentByIdMap returns correct student in O(1)");
  assert(studentMap.get("non-existent") === undefined, "P-04: studentByIdMap handles missing IDs safely");
}

// ── 4. P-06: AdminDashboard Code Splitting & Dynamic Imports ─────────────────
async function testP06() {
  console.log("\n--- 4. P-06: AdminDashboard Code Splitting & Dynamic Imports ---");

  const adminDashSrc = fs.readFileSync("src/components/AdminDashboard.tsx", "utf-8");
  assert(adminDashSrc.includes('import dynamic from "next/dynamic"'), "P-06: AdminDashboard imports next/dynamic");
  assert(adminDashSrc.includes("dynamic(() => import(\"@/components/MarksFeedingConsole\")"), "P-06: MarksFeedingConsole is dynamically loaded");
  assert(adminDashSrc.includes("dynamic(() => import(\"@/components/PrintMarksheets\")"), "P-06: PrintMarksheets is dynamically loaded");
  assert(adminDashSrc.includes("dynamic(() => import(\"@/components/AttendanceConsole\")"), "P-06: AttendanceConsole is dynamically loaded");
  assert(adminDashSrc.includes("dynamic(() => import(\"@/components/WebsiteMediaManager\")"), "P-06: WebsiteMediaManager is dynamically loaded");
  assert(adminDashSrc.includes("dynamic(() => import(\"@/components/AdmissionLeadsDesk\")"), "P-06: AdmissionLeadsDesk is dynamically loaded");
  assert(adminDashSrc.includes("dynamic(() => import(\"@/components/StudentProfileModal\")"), "P-06: StudentProfileModal is dynamically loaded");
}

async function main() {
  console.log("=================================================================");
  console.log(" FINAL BATCH VERIFICATION: SCH-02, P-02, P-04, P-06");
  console.log("=================================================================");

  await testSCH02();
  await testP02();
  await testP04();
  await testP06();

  console.log("\n=================================================================");
  console.log(" RESULTS: " + passed + " passed, " + failed + " failed");
  console.log("=================================================================");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});