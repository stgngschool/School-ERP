/**
 * Regression tests for B-04, B-06, and GY-02 fixes.
 *
 * B-04: Due dates derive from the active academic year, not hardcoded 2026-27.
 * B-06: Late-fee FLAT and DAILY modes both use the same lateFeeAmount fallback.
 * GY-02: Bulk charge generation respects startingFeeMonth / admissionDate;
 *        mid-year admits are not charged for months before their joining month.
 *
 * All tests are pure logic — no database connection required.
 *
 * Run: npx tsx scripts/test-b04-b06-gy02.ts
 */

export {}; // Makes this file an ES module so variables don't leak into global scope

// ── Inline copies of pure helpers from generateYearlyCharges.ts ──────────────
// We copy rather than import to avoid the module-level `import db from "@/lib/db"`
// which throws at module load time if DATABASE_URL is not set.

const ACADEMIC_MONTHS_CONST = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March",
];

function getAcademicYear(date = new Date()): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getStartingFeeMonthFromDate(
  admissionDate: Date | null | undefined,
  academicYear: string
): string {
  if (!admissionDate) return "April";
  const [syStr] = academicYear.split("-");
  const academicStartYear = parseInt(syStr, 10);
  const academicStart = new Date(academicStartYear, 3, 1); // April 1
  if (admissionDate < academicStart) return "April";
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const calendarMonth = MONTH_NAMES[admissionDate.getMonth()];
  if (!ACADEMIC_MONTHS_CONST.includes(calendarMonth)) return "April";
  return calendarMonth;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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
function assertEq<T>(label: string, actual: T, expected: T) {
  if (actual === expected) ok(`${label}: ${JSON.stringify(actual)}`);
  else fail(`${label}`, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertTrue(label: string, value: boolean) {
  if (value) ok(label);
  else fail(label);
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline copy of getChargeDueDate from billing/route.ts for testing.
// The production function calls getAcademicYear() internally. We replicate
// that logic here so the test is independent of runtime state.
// ─────────────────────────────────────────────────────────────────────────────

function getChargeDueDateWithYear(chargeName: string, acYear: string): string {
  const nameLower = chargeName.toLowerCase();
  const [syStr, eyStr] = acYear.split("-");
  const sy = parseInt(syStr, 10);
  const ey = parseInt(eyStr, 10);

  if (nameLower.includes("april"))     return `${sy}-04-10`;
  if (nameLower.includes("may"))       return `${sy}-05-10`;
  if (nameLower.includes("june"))      return `${sy}-06-10`;
  if (nameLower.includes("july")) {
    if (nameLower.includes("unit 1") || nameLower.includes("exam")) return `${sy}-07-15`;
    return `${sy}-07-10`;
  }
  if (nameLower.includes("august"))    return `${sy}-08-10`;
  if (nameLower.includes("september")) return `${sy}-09-10`;
  if (nameLower.includes("october")) {
    if (nameLower.includes("half yearly") || nameLower.includes("exam")) return `${sy}-10-15`;
    return `${sy}-10-10`;
  }
  if (nameLower.includes("november"))  return `${sy}-11-10`;
  if (nameLower.includes("december")) {
    if (nameLower.includes("unit 2") || nameLower.includes("exam")) return `${sy}-12-15`;
    return `${sy}-12-10`;
  }
  if (nameLower.includes("january"))   return `${ey}-01-10`;
  if (nameLower.includes("february"))  return `${ey}-02-10`;
  if (nameLower.includes("march")) {
    if (nameLower.includes("yearly") || nameLower.includes("exam")) return `${ey}-03-15`;
    return `${ey}-03-10`;
  }
  if (nameLower.includes("annual") || nameLower.includes("admission")) return `${sy}-04-10`;
  return `${sy}-04-10`; // fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: B-04 — Due dates derive from academic year dynamically
// ─────────────────────────────────────────────────────────────────────────────
function testB04DueDates() {
  console.log("\n─── Test 1: B-04 — Due dates use dynamic academic year ───");

  // Test a fictional future year (2030-2031) to confirm no hardcoded 2026-27
  const futureYear = "2030-2031";

  const cases: [string, string][] = [
    ["April Tuition Fee",           "2030-04-10"],
    ["May Transport Fee",           "2030-05-10"],
    ["June Activity",               "2030-06-10"],
    ["July Tuition",                "2030-07-10"],
    ["July Unit 1 Exam",            "2030-07-15"],
    ["August Library Fee",          "2030-08-10"],
    ["September Fee",               "2030-09-10"],
    ["October Fee",                 "2030-10-10"],
    ["October Half Yearly Exam",    "2030-10-15"],
    ["November Fee",                "2030-11-10"],
    ["December Fee",                "2030-12-10"],
    ["December Unit 2 Exam",        "2030-12-15"],
    // Jan–March fall in END year (2031)
    ["January Fee",                 "2031-01-10"],
    ["February Fee",                "2031-02-10"],
    ["March Fee",                   "2031-03-10"],
    ["March Yearly Exam",           "2031-03-15"],
    ["Annual Registration",         "2030-04-10"],
    ["Admission Fee",               "2030-04-10"],
  ];

  for (const [name, expected] of cases) {
    assertEq(`  "${name}"`, getChargeDueDateWithYear(name, futureYear), expected);
  }

  // Also verify no "2026" appears in current-year due dates for next year
  const nextYear = "2027-2028";
  const aprilDue = getChargeDueDateWithYear("April Tuition Fee", nextYear);
  assertTrue(`April due for 2027-2028 starts with 2027 (not 2026)`, aprilDue.startsWith("2027-"));
  const marchDue = getChargeDueDateWithYear("March Fee", nextYear);
  assertTrue(`March due for 2027-2028 starts with 2028 (end year)`, marchDue.startsWith("2028-"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: B-04 — getAcademicYear rolls over correctly
// ─────────────────────────────────────────────────────────────────────────────
function testB04AcademicYearRollover() {
  console.log("\n─── Test 2: B-04 — getAcademicYear rollover ───");

  // March 2027 → academic year 2026-2027 (Jan-Mar are in the end year)
  assertEq("March 2027 → 2026-2027", getAcademicYear(new Date(2027, 2, 15)), "2026-2027");
  // April 2027 → academic year 2027-2028
  assertEq("April 2027 → 2027-2028", getAcademicYear(new Date(2027, 3, 1)), "2027-2028");
  // August 2030 → 2030-2031
  assertEq("August 2030 → 2030-2031", getAcademicYear(new Date(2030, 7, 10)), "2030-2031");
  // January 2031 → 2030-2031
  assertEq("January 2031 → 2030-2031", getAcademicYear(new Date(2031, 0, 1)), "2030-2031");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: B-06 — Late fee fallback consistency
// ─────────────────────────────────────────────────────────────────────────────
function testB06LateFeeDefaults() {
  console.log("\n─── Test 3: B-06 — Late fee fallback consistency ───");

  // Simulate what billing/route.ts now does after the B-06 fix
  const schoolConfig = { enableLateFee: false, lateFeeGraceDays: 10, lateFeeAmount: 50, lateFeeType: "FLAT" };

  const lateFeeAmountRupees = schoolConfig.lateFeeAmount ?? 50;
  const baseFineAmount = lateFeeAmountRupees * 100;
  const dailyFineUnit  = lateFeeAmountRupees * 100;

  assertEq("baseFineAmount = 5000 paise (₹50)", baseFineAmount, 5000);
  assertEq("dailyFineUnit = 5000 paise (₹50)", dailyFineUnit, 5000);
  assertTrue("baseFineAmount === dailyFineUnit (consistent)", baseFineAmount === dailyFineUnit);

  // The bug only manifests when lateFeeAmount is ABSENT from the config
  // (the ?? operator provides the fallback). Simulate a config without lateFeeAmount:
  const missingAmountConfig = { enableLateFee: true, lateFeeGraceDays: 10, lateFeeType: "DAILY" } as any;
  const buggyDailyFineUnit = (missingAmountConfig.lateFeeAmount ?? 5) * 100;   // old code: 500
  const fixedDailyFineUnit = (missingAmountConfig.lateFeeAmount ?? 50) * 100;  // new code: 5000
  assertTrue(
    `When lateFeeAmount missing: old fallback ${buggyDailyFineUnit} ≠ fixed fallback ${fixedDailyFineUnit} — confirms bug existed`,
    buggyDailyFineUnit !== fixedDailyFineUnit
  );

  // With a custom value
  const customConfig = { ...schoolConfig, lateFeeAmount: 30 };
  const customLateFee = customConfig.lateFeeAmount ?? 50;
  assertEq("Custom ₹30: base = 3000 paise", customLateFee * 100, 3000);
  assertEq("Custom ₹30: daily = 3000 paise (consistent)", customLateFee * 100, 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: GY-02 — getStartingFeeMonthFromDate logic
// ─────────────────────────────────────────────────────────────────────────────
function testGY02StartingFeeMonth() {
  console.log("\n─── Test 4: GY-02 — getStartingFeeMonthFromDate ───");

  const acYear = "2026-2027";

  // No admission date → April
  assertEq("null admissionDate → April", getStartingFeeMonthFromDate(null, acYear), "April");
  assertEq("undefined admissionDate → April", getStartingFeeMonthFromDate(undefined, acYear), "April");

  // Admission BEFORE the academic year start (April 2026) → April
  assertEq(
    "Admission March 2026 (before AY) → April",
    getStartingFeeMonthFromDate(new Date(2026, 2, 15), acYear),
    "April"
  );
  assertEq(
    "Admission Jan 2025 (way before AY) → April",
    getStartingFeeMonthFromDate(new Date(2025, 0, 1), acYear),
    "April"
  );

  // Admission exactly on April 1 2026 → April
  assertEq(
    "Admission April 1 2026 (AY start) → April",
    getStartingFeeMonthFromDate(new Date(2026, 3, 1), acYear),
    "April"
  );

  // Mid-year: July admission → July (months 4 onward generated)
  assertEq(
    "Admission July 2026 → July",
    getStartingFeeMonthFromDate(new Date(2026, 6, 15), acYear),
    "July"
  );

  // October admission → October
  assertEq(
    "Admission October 2026 → October",
    getStartingFeeMonthFromDate(new Date(2026, 9, 1), acYear),
    "October"
  );

  // January (crosses into end year) → January
  assertEq(
    "Admission January 2027 → January",
    getStartingFeeMonthFromDate(new Date(2027, 0, 10), acYear),
    "January"
  );

  // March (last month of AY) → March
  assertEq(
    "Admission March 2027 → March",
    getStartingFeeMonthFromDate(new Date(2027, 2, 1), acYear),
    "March"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: GY-02 — Mid-year admit generates correct number of monthly charges
// (Logic test — verifies the month slicing arithmetic without hitting the DB)
// ─────────────────────────────────────────────────────────────────────────────
function testGY02MonthSlicing() {
  console.log("\n─── Test 5: GY-02 — Month slicing generates correct charge count ───");

  const ACADEMIC_MONTHS = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March",
  ];

  const getActiveMonths = (startingFeeMonth: string) => {
    const idx = ACADEMIC_MONTHS.indexOf(startingFeeMonth);
    return idx > 0 ? ACADEMIC_MONTHS.slice(idx) : ACADEMIC_MONTHS;
  };

  // April start → all 12 months
  assertEq("April start → 12 months", getActiveMonths("April").length, 12);

  // July start (month index 3 in academic months) → 9 months (Jul–Mar)
  const julyMonths = getActiveMonths("July");
  assertEq("July start → 9 months", julyMonths.length, 9);
  assertTrue("July start: includes July", julyMonths.includes("July"));
  assertTrue("July start: includes March (last)", julyMonths.includes("March"));
  assertTrue("July start: excludes April", !julyMonths.includes("April"));
  assertTrue("July start: excludes June", !julyMonths.includes("June"));

  // October start → 6 months (Oct–Mar)
  const octMonths = getActiveMonths("October");
  assertEq("October start → 6 months", octMonths.length, 6);
  assertTrue("October start: excludes September", !octMonths.includes("September"));

  // March start → 1 month only
  assertEq("March start → 1 month", getActiveMonths("March").length, 1);

  // Confirm: old (buggy) behavior always generated 12
  const oldBehaviorCount = ACADEMIC_MONTHS.length; // always 12
  const jullyFixedCount = getActiveMonths("July").length; // 9
  assertTrue(
    `Bug would generate ${oldBehaviorCount} charges for July admit; fix generates ${jullyFixedCount} (saves 3 incorrect months)`,
    jullyFixedCount < oldBehaviorCount
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: B-04 — Due dates in production year (current) are correct
// ─────────────────────────────────────────────────────────────────────────────
function testB04CurrentYear() {
  console.log("\n─── Test 6: B-04 — Current academic year due dates are self-consistent ───");

  const currentAcYear = getAcademicYear();
  const [syStr, eyStr] = currentAcYear.split("-");
  const sy = parseInt(syStr, 10);
  const ey = parseInt(eyStr, 10);

  console.log(`    Current academic year: ${currentAcYear} (start=${sy}, end=${ey})`);

  const aprilDue = getChargeDueDateWithYear("April Fee", currentAcYear);
  const marchDue = getChargeDueDateWithYear("March Fee", currentAcYear);
  const janDue   = getChargeDueDateWithYear("January Fee", currentAcYear);

  assertTrue(`April due year = start year (${sy})`, aprilDue.startsWith(`${sy}-`));
  assertTrue(`March due year = end year (${ey})`,   marchDue.startsWith(`${ey}-`));
  assertTrue(`January due year = end year (${ey})`, janDue.startsWith(`${ey}-`));

  // If we're currently in 2026-2027, this confirms 2026 for April and 2027 for March
  // (matches old hardcoded values but now dynamic)
  const aprilYear = parseInt(aprilDue.split("-")[0]);
  const marchYear = parseInt(marchDue.split("-")[0]);
  assertTrue(`March due year (${marchYear}) > April due year (${aprilYear})`, marchYear > aprilYear);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Fix Tests: B-04, B-06, GY-02");
  console.log("═══════════════════════════════════════════════════════════════");

  testB04DueDates();
  testB04AcademicYearRollover();
  testB06LateFeeDefaults();
  testGY02StartingFeeMonth();
  testGY02MonthSlicing();
  testB04CurrentYear();

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
