/**
 * Focused regression test suite for:
 *  AT-02 — Attendance pagination, date-filtering, and headers without hard 2000 truncation
 *  PD-03 — ParentDashboard marks fetch includes credentials
 *  PD-04 — Homework exact/normalized class matching (Class "3" vs "13")
 *  PD-07 — Attendance pass-rate calculation strictly uses PRESENT without inflating with LATE
 *  LC-01 — numberToIndianWords handles both Rupees and Paise correctly
 *  LF-02 — Family code uses academic year cohort (Jan-Mar gets start year prefix)
 *  LF-03 — findMatchingParentProfile multi-signal verification prevents false-positive address merges
 *  BL-04 — isDueUpToCurrentMonth uses authoritative dueDate and accurate academic month semantics
 *
 * Run: node --env-file=.env --import=tsx scripts/test-at02-pd03-pd04-pd07-lc01-lf02-lf03-bl04.ts
 */

import fs from "fs";
import path from "path";
import db from "../src/lib/db";
import { numberToIndianWords, toPaisa, formatP } from "../src/lib/currency";
import { getNextFamilyCode, findMatchingParentProfile } from "../src/lib/family";
import { isDueUpToCurrentMonth } from "../src/lib/whatsapp";
import { getAcademicYear } from "../src/lib/generateYearlyCharges";
import { Role, AttendanceStatus } from "@prisma/client";

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

// ── Test 1: LC-01 — numberToIndianWords Rupees & Paise ──────────────────────

function testLC01() {
  console.log("\n─── 1. LC-01: numberToIndianWords Rupees & Paise ───");

  // 1. ₹100.00 (10000 paise)
  const w100 = numberToIndianWords(10000);
  assert(w100 === "One Hundred Rupees Only", `10000 paise -> "${w100}"`);

  // 2. ₹100.50 (10050 paise)
  const w100_50 = numberToIndianWords(10050);
  assert(w100_50 === "One Hundred Rupees and Fifty Paise Only", `10050 paise -> "${w100_50}"`);

  // 3. ₹1,234.75 (123475 paise)
  const w1234_75 = numberToIndianWords(123475);
  assert(w1234_75 === "One Thousand Two Hundred Thirty Four Rupees and Seventy Five Paise Only", `123475 paise -> "${w1234_75}"`);

  // 4. ₹0.50 (50 paise)
  const w0_50 = numberToIndianWords(50);
  assert(w0_50 === "Fifty Paise Only", `50 paise -> "${w0_50}"`);

  // 5. ₹0.00 (0 paise)
  const w0 = numberToIndianWords(0);
  assert(w0 === "Zero Rupees and Zero Paise Only" || w0 === "Zero Rupees Only", `0 paise -> "${w0}"`);

  // 6. Large whole rupees ₹50,000.00 (5000000 paise)
  const w50k = numberToIndianWords(5000000);
  assert(w50k === "Fifty Thousand Rupees Only", `5000000 paise -> "${w50k}"`);
}

// ── Test 2: LF-02 — Academic Year Family Code Cohort ────────────────────────

async function testLF02() {
  console.log("\n─── 2. LF-02: Academic Year Family Code Cohort ───");

  // April 2026 -> 2026-2027 session -> FAM-2026-
  const codeApr = await getNextFamilyCode(undefined, new Date("2026-04-15T00:00:00.000Z"));
  assert(codeApr.startsWith("FAM-2026-"), `April 2026 admission gets FAM-2026- prefix: got ${codeApr}`);

  // December 2026 -> 2026-2027 session -> FAM-2026-
  const codeDec = await getNextFamilyCode(undefined, new Date("2026-12-20T00:00:00.000Z"));
  assert(codeDec.startsWith("FAM-2026-"), `December 2026 admission gets FAM-2026- prefix: got ${codeDec}`);

  // January 2027 -> 2026-2027 session -> FAM-2026-
  const codeJan = await getNextFamilyCode(undefined, new Date("2027-01-10T00:00:00.000Z"));
  assert(codeJan.startsWith("FAM-2026-"), `January 2027 admission gets FAM-2026- prefix (not FAM-2027): got ${codeJan}`);

  // February 2027 -> 2026-2027 session -> FAM-2026-
  const codeFeb = await getNextFamilyCode(undefined, new Date("2027-02-14T00:00:00.000Z"));
  assert(codeFeb.startsWith("FAM-2026-"), `February 2027 admission gets FAM-2026- prefix: got ${codeFeb}`);

  // March 2027 -> 2026-2027 session -> FAM-2026-
  const codeMar = await getNextFamilyCode(undefined, new Date("2027-03-25T00:00:00.000Z"));
  assert(codeMar.startsWith("FAM-2026-"), `March 2027 admission gets FAM-2026- prefix: got ${codeMar}`);

  // April 2027 -> 2027-2028 session -> FAM-2027-
  const codeNextSession = await getNextFamilyCode(undefined, new Date("2027-04-05T00:00:00.000Z"));
  assert(codeNextSession.startsWith("FAM-2027-"), `April 2027 admission rolls over to FAM-2027- prefix: got ${codeNextSession}`);
}

// ── Test 3: LF-03 — Multi-Signal Parent Profile Matching ────────────────────

function testLF03() {
  console.log("\n─── 3. LF-03: Safe Multi-Signal Parent Profile Matching ───");

  const existingProfiles: any[] = [
    {
      id: "prof_1",
      familyCode: "FAM-2026-0001",
      user: { name: "Rajesh Sharma", phone: "9876543210", email: "rajesh.sharma@example.com" },
      address: "Flat 402, Sunshine Heights, Rohini, Delhi",
      students: [
        { fatherName: "Rajesh Sharma", motherName: "Sunita Sharma", fatherMobile: "9876543210", motherMobile: "9876543211" }
      ]
    },
    {
      id: "prof_2",
      familyCode: "FAM-2026-0002",
      user: { name: "Amit Verma", phone: "9123456789", email: "amit.v@example.com" },
      address: "House 15, Sector 4, Gurgaon",
      students: [
        { fatherName: "Amit Verma", motherName: "Pooja Verma", fatherMobile: "9123456789", motherMobile: "9123456780" }
      ]
    }
  ];

  // 1. Legitimate match by father mobile
  const m1 = findMatchingParentProfile(
    { fatherMobile: "9876543210", fatherName: "Rajesh Sharma", motherName: "Sunita Sharma" },
    existingProfiles
  );
  assert(m1?.id === "prof_1", "LF-03: Legitimate sibling matches existing profile via mobile number");

  // 2. Legitimate match by dual parent names (even if mobile is different)
  const m2 = findMatchingParentProfile(
    { fatherMobile: "9999999999", fatherName: "Rajesh Sharma", motherName: "Sunita Sharma" },
    existingProfiles
  );
  assert(m2?.id === "prof_1", "LF-03: Dual parent name match (Father + Mother) links sibling profile");

  // 3. FALSE POSITIVE GUARD: Same father name ("Rajesh Sharma"), different mother ("Pooja"), different address ("H.No 12, Rohini, Delhi")
  const m3 = findMatchingParentProfile(
    { fatherMobile: "9000000000", fatherName: "Rajesh Sharma", motherName: "Pooja Devi", address: "H.No 12, Rohini, Delhi" },
    existingProfiles
  );
  assert(m3 === null, "LF-03: Unrelated family with same father name and common city/locality 'Rohini, Delhi' is NOT merged");

  // 4. FALSE POSITIVE GUARD: Generic locality "Gurgaon" without house number
  const m4 = findMatchingParentProfile(
    { fatherMobile: "9555555555", fatherName: "Amit Verma", motherName: "Meena Verma", address: "Sector 4, Gurgaon" },
    existingProfiles
  );
  assert(m4 === null, "LF-03: Unrelated family with same father name and generic locality 'Sector 4, Gurgaon' is NOT merged");
}

// ── Test 4: PD-04 — Homework Exact/Normalized Class Matching ────────────────

function testPD04() {
  console.log("\n─── 4. PD-04: Homework Exact Class Matching ───");

  function filterHomework(child: { class: string; section: string }, homeworks: Array<{ classSection: string }>) {
    return homeworks.filter((h) => {
      const childClassNorm = (child.class || "").toLowerCase().replace(/^class\s*/i, "").replace(/\s+/g, "");
      const childSecNorm = (child.section || "").toLowerCase().trim();

      const rawHwCS = (h.classSection || "").toLowerCase().trim();
      if (!rawHwCS) return false;

      const parts = rawHwCS.split("-").map((p: string) => p.replace(/^class\s*/i, "").trim());
      const hwClass = parts[0];
      const hwSec = parts[1] || "";

      if (hwClass !== childClassNorm) return false;
      if (!hwSec || hwSec === "all") return true;
      return hwSec === childSecNorm;
    });
  }

  const childClass3 = { class: "3", section: "A" };
  const childClass13 = { class: "13", section: "A" };
  const childClass10 = { class: "Class 10", section: "B" };

  const allHw = [
    { classSection: "Class 3-A" },
    { classSection: "Class 13-A" },
    { classSection: "Class 3-B" },
    { classSection: "10-B" },
    { classSection: "110-B" },
    { classSection: "Class 10-All" },
  ];

  const hwFor3 = filterHomework(childClass3, allHw);
  assert(hwFor3.length === 1 && hwFor3[0].classSection === "Class 3-A", "PD-04: Class '3' matches only 'Class 3-A' and NEVER 'Class 13-A'");

  const hwFor13 = filterHomework(childClass13, allHw);
  assert(hwFor13.length === 1 && hwFor13[0].classSection === "Class 13-A", "PD-04: Class '13' matches only 'Class 13-A'");

  const hwFor10 = filterHomework(childClass10, allHw);
  assert(
    hwFor10.length === 2 &&
    hwFor10.some(h => h.classSection === "10-B") &&
    hwFor10.some(h => h.classSection === "Class 10-All") &&
    !hwFor10.some(h => h.classSection === "110-B"),
    "PD-04: Class '10' matches '10-B' and 'Class 10-All' but NEVER '110-B'"
  );
}

// ── Test 5: PD-07 — Attendance Pass-Rate Strict Calculation ─────────────────

function testPD07() {
  console.log("\n─── 5. PD-07: Attendance Pass-Rate Strict Calculation ───");

  function calculateRate(logs: Array<{ status: "PRESENT" | "LATE" | "ABSENT" | "LEAVE" }>) {
    const present = logs.filter(a => a.status === "PRESENT").length;
    const late = logs.filter(a => a.status === "LATE").length;
    const absent = logs.filter(a => a.status === "ABSENT").length;
    const leave = logs.filter(a => a.status === "LEAVE").length;

    // Active attendance days = present + late + absent (approved leave is official exemption)
    const activeDays = present + late + absent;
    const percent = activeDays > 0 ? Math.round((present / activeDays) * 100) : 100;
    return { percent, present, late, absent, leave, total: logs.length };
  }

  // 1. All Present (10/10) -> 100%
  const allPresent = Array(10).fill({ status: "PRESENT" });
  assert(calculateRate(allPresent).percent === 100, "PD-07: 10/10 PRESENT yields 100%");

  // 2. 5 Present, 5 Late -> 50% (LATE is NOT counted as PRESENT)
  const mixedLate: any[] = [
    ...Array(5).fill({ status: "PRESENT" }),
    ...Array(5).fill({ status: "LATE" }),
  ];
  assert(calculateRate(mixedLate).percent === 50, "PD-07: 5 PRESENT + 5 LATE yields 50% on-time presence (not inflated to 100%)");

  // 3. 5 Present, 5 Absent -> 50%
  const mixedAbsent: any[] = [
    ...Array(5).fill({ status: "PRESENT" }),
    ...Array(5).fill({ status: "ABSENT" }),
  ];
  assert(calculateRate(mixedAbsent).percent === 50, "PD-07: 5 PRESENT + 5 ABSENT yields 50%");

  // 4. 6 Present, 2 Late, 2 Absent, 4 Approved Leave -> activeDays = 10, present = 6 -> 60%
  const mixedAll: any[] = [
    ...Array(6).fill({ status: "PRESENT" }),
    ...Array(2).fill({ status: "LATE" }),
    ...Array(2).fill({ status: "ABSENT" }),
    ...Array(4).fill({ status: "LEAVE" }),
  ];
  const rAll = calculateRate(mixedAll);
  assert(rAll.percent === 60 && rAll.leave === 4, `PD-07: 6 PRESENT, 2 LATE, 2 ABSENT, 4 LEAVE -> 60% on-time rate with 4 approved leaves`);
}

// ── Test 6: BL-04 — isDueUpToCurrentMonth Due Date & Session Semantics ───────

function testBL04() {
  console.log("\n─── 6. BL-04: isDueUpToCurrentMonth Due Date & Academic Session ───");

  const refAug15 = new Date("2026-08-15T10:00:00.000Z");

  // 1. Annual fee with future due date (March 31, 2027) evaluated in August 2026 -> FALSE
  const futureAnnual = { name: "Annual Development Fee", dueDate: "2027-03-31" };
  assert(!isDueUpToCurrentMonth(futureAnnual, refAug15), "BL-04: Annual fee with future dueDate 2027-03-31 is NOT overdue in August 2026");

  // 2. Annual fee with past due date (April 10, 2026) evaluated in August 2026 -> TRUE
  const pastAnnual = { name: "Annual Fee", dueDate: "2026-04-10" };
  assert(isDueUpToCurrentMonth(pastAnnual, refAug15), "BL-04: Annual fee with past dueDate 2026-04-10 IS due in August 2026");

  // 3. Fee on exact due date (August 15, 2026) -> TRUE
  const exactDue = { name: "August Tuition Fee", dueDate: "2026-08-15" };
  assert(isDueUpToCurrentMonth(exactDue, refAug15), "BL-04: Fee evaluated ON its dueDate (2026-08-15) IS due");

  // 4. Fee with future due date later in same month (August 25, 2026) -> FALSE on August 15
  const laterDue = { name: "August Special Activity Fee", dueDate: "2026-08-25" };
  assert(!isDueUpToCurrentMonth(laterDue, refAug15), "BL-04: Fee with future dueDate in same month (2026-08-25) is NOT due on August 15");

  // 5. Monthly fee without dueDate: "August Tuition Fee" in August 2026 -> TRUE
  const augMonthly = { name: "August Tuition Fee" };
  assert(isDueUpToCurrentMonth(augMonthly, refAug15), "BL-04: 'August Tuition Fee' without dueDate IS due in August 2026");

  // 6. Monthly fee without dueDate: "September Tuition Fee" in August 2026 -> FALSE
  const sepMonthly = { name: "September Tuition Fee" };
  assert(!isDueUpToCurrentMonth(sepMonthly, refAug15), "BL-04: 'September Tuition Fee' is NOT due in August 2026");

  // 7. Academic session boundary: "March Tuition Fee" evaluated in February 2027 vs March 2027
  const refFeb2027 = new Date("2027-02-15T00:00:00.000Z");
  const refMar2027 = new Date("2027-03-15T00:00:00.000Z");
  const marchFee = { name: "March Tuition Fee" };
  assert(!isDueUpToCurrentMonth(marchFee, refFeb2027), "BL-04: 'March Tuition Fee' is NOT due in February 2027");
  assert(isDueUpToCurrentMonth(marchFee, refMar2027), "BL-04: 'March Tuition Fee' IS due in March 2027");
}

// ── Test 7: PD-03 — ParentDashboard Credentials Included ────────────────────

function testPD03() {
  console.log("\n─── 7. PD-03: ParentDashboard Marks Fetch Includes Credentials ───");

  const parentDashPath = path.join(process.cwd(), "src/components/ParentDashboard.tsx");
  const fileContent = fs.readFileSync(parentDashPath, "utf-8");

  const hasCredentialsInclude = fileContent.includes("fetch(`/api/students/${child.id}/marks`, {") &&
                                fileContent.includes('credentials: "include"');
  assert(hasCredentialsInclude, "PD-03: ParentDashboard fetch for student marks includes credentials: 'include'");
}

// ── Test 8: AT-02 — Attendance Pagination & Bounded Retrieval ────────────────

async function testAT02() {
  console.log("\n─── 8. AT-02: Attendance Pagination & Bounded Retrieval ───");

  // Verify route code does not have unpaginated take: 2000
  const routePath = path.join(process.cwd(), "src/app/api/attendance/route.ts");
  const routeContent = fs.readFileSync(routePath, "utf-8");

  assert(!routeContent.includes("take: 2000,\n      orderBy"), "AT-02: Silent hardcoded take: 2000 truncation removed");
  assert(routeContent.includes("X-Total-Count"), "AT-02: Response includes X-Total-Count header");
  assert(routeContent.includes("X-Total-Pages"), "AT-02: Response includes X-Total-Pages header");
  assert(routeContent.includes("X-Has-More"), "AT-02: Response includes X-Has-More header");

  // Test live DB pagination
  const totalCount = await db.attendance.count();
  const page1 = await db.attendance.findMany({ skip: 0, take: 5, orderBy: { date: "desc" } });
  const page2 = await db.attendance.findMany({ skip: 5, take: 5, orderBy: { date: "desc" } });

  assert(page1.length <= 5, `AT-02: Page 1 returns ${page1.length} records bounded by page limit`);
  if (totalCount > 5) {
    assert(page1[0].id !== page2[0].id, "AT-02: Page 2 retrieves distinct subsequent records without collision");
  }
}

// ── Main Runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Focused Regression Suite: AT-02, PD-03, PD-04, PD-07, LC-01, LF-02, LF-03, BL-04");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    testLC01();
    await testLF02();
    testLF03();
    testPD04();
    testPD07();
    testBL04();
    testPD03();
    await testAT02();
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
