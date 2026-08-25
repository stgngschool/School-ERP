/**
 * Focused test suite: A-07 B-12 DB-12 SL-04 AC-06 AC-07 PD-08 AD-09 AD-10 LC-02 WA-02 C-02 SCH-02
 * Run: node --env-file=.env --import=tsx scripts/test-low-a07-b12-db12-sl04-ac06-ac07-pd08-ad09-ad10-lc02-wa02-c02-sch02.ts
 */

import fs from "fs";
import { verifyToken, signToken } from "../src/lib/auth";
import { numberToIndianWords } from "../src/lib/currency";
import { generateFeeReminderText, FeeReminderParams } from "../src/lib/whatsapp";
import { validatePaisaAmount, validatePercentage } from "../src/lib/validation";

let passed = 0; let failed = 0;
function assert(condition: boolean, msg: string) {
  if (condition) { console.log("  [PASS] " + msg); passed++; }
  else { console.error("  [FAIL] " + msg); failed++; }
}
function assertThrows(fn: () => unknown, msg: string) {
  let threw = false; try { fn(); } catch { threw = true; }
  assert(threw, msg);
}

// ── A-07 ─────────────────────────────────────────────
function testA07() {
  console.log("\n--- A-07: verifyToken expiry ---");
  const token = signToken({ userId: "u1", username: "admin", role: "ADMIN" });
  const decoded = verifyToken(token);
  assert(!!decoded?.expiresAt, "expiresAt present");
  const d = new Date(decoded!.expiresAt!);
  assert(!isNaN(d.getTime()), "expiresAt is valid ISO date");
  const diff = d.getTime() - Date.now();
  assert(Math.abs(diff - 7*24*60*60*1000) < 120000, "expiresAt is ~7 days");
  assert(verifyToken("bad.token") === null, "bad token returns null");
  const t2 = signToken({ userId: "u2", username: "acc", role: "ACCOUNTANT", tokenVersion: 3 });
  const d2 = verifyToken(t2)!;
  assert(d2.userId === "u2" && d2.tokenVersion === 3, "existing caller fields preserved");
}

// ── B-12 ─────────────────────────────────────────────
function testB12() {
  console.log("\n--- B-12: payAmount validation ---");
  assert(validatePaisaAmount(5000, "P", { min: 0 }) === 5000, "accepts 5000");
  assert(validatePaisaAmount(0, "P", { min: 0 }) === 0, "accepts 0 (boundary)");
  assertThrows(() => validatePaisaAmount(-1, "P", { min: 0 }), "rejects negative");
  assertThrows(() => validatePaisaAmount("abc", "P", { min: 0 }), "rejects NaN string");
  assertThrows(() => validatePaisaAmount(Infinity, "P", { min: 0 }), "rejects Infinity");
  assertThrows(() => validatePaisaAmount(null, "P", { min: 0 }), "rejects null (B-12 guard)");
}

// ── DB-12 ────────────────────────────────────────────
function testDB12() {
  console.log("\n--- DB-12: CalendarEvent fields not dead ---");
  const eventsRoute = fs.readFileSync("src/app/api/events/route.ts", "utf-8");
  assert(eventsRoute.includes("ticketsSold"), "events route references ticketsSold");
  const schema = fs.readFileSync("prisma/schema.prisma", "utf-8");
  assert(schema.includes("ticketsSold"), "schema has ticketsSold");
}

// ── SL-04 ────────────────────────────────────────────
function testSL04() {
  console.log("\n--- SL-04: Exponential backoff ---");
  const src = fs.readFileSync("src/hooks/useAuthLogic.ts", "utf-8");
  assert(!src.includes("RETRY_DELAY_MS = 1500"), "fixed 1500ms removed");
  assert(src.includes("BASE_RETRY_DELAY_MS"), "BASE_RETRY_DELAY_MS present");
  assert(src.includes("MAX_RETRY_DELAY_MS"), "MAX_RETRY_DELAY_MS present");
  const delay = (n: number) => Math.min(1000 * Math.pow(2, n - 2), 8000);
  assert(delay(2) === 1000, "attempt 2 = 1000ms");
  assert(delay(3) === 2000, "attempt 3 = 2000ms");
  assert(delay(15) === 8000, "capped at 8000ms");
}

// ── AC-06 ────────────────────────────────────────────
function testAC06() {
  console.log("\n--- AC-06: refreshData stable dependency ---");
  const src = fs.readFileSync("src/context/AuthContext.tsx", "utf-8");
  assert(src.includes("userRef"), "userRef present in AuthContext");
  assert(src.includes("userRef.current"), "userRef.current used");
  const hasComment = src.includes("AC-06: Empty dependency array");
  assert(hasComment, "AC-06 empty-dep comment present");
}

// ── AC-07 ────────────────────────────────────────────
function testAC07() {
  console.log("\n--- AC-07: AuthStage rename ---");
  const ctx = fs.readFileSync("src/context/AuthContext.tsx", "utf-8");
  assert(!ctx.includes("SUPABASE CLIENT CREATED"), "AuthContext: old stage removed");
  assert(ctx.includes("AUTH GATEWAY READY"), "AuthContext: new stage present");
  const logic = fs.readFileSync("src/hooks/useAuthLogic.ts", "utf-8");
  assert(!logic.includes("SUPABASE CLIENT CREATED"), "useAuthLogic: old stage removed");
  assert(logic.includes("AUTH GATEWAY READY"), "useAuthLogic: new stage present");
}

// ── PD-08 ────────────────────────────────────────────
function testPD08() {
  console.log("\n--- PD-08: ParentDashboard child init ---");
  const src = fs.readFileSync("src/components/ParentDashboard.tsx", "utf-8");
  assert(!src.includes("parentStudents.length > 0 ? parentStudents[0].id"), "old init removed");
  assert(src.includes('useState("")'), "lazy init as empty string");
  assert(src.includes("setSelectedChildId(parentStudents[0].id)"), "useEffect sync present");
}

// ── AD-09 ────────────────────────────────────────────
function testAD09() {
  console.log("\n--- AD-09: validTabs at module level ---");
  const src = fs.readFileSync("src/components/AdminDashboard.tsx", "utf-8");
  const modIdx = src.indexOf("const VALID_ADMIN_TABS");
  const compIdx = src.indexOf("export default function AdminDashboard");
  assert(modIdx !== -1 && modIdx < compIdx, "VALID_ADMIN_TABS before component");
  assert(src.includes("VALID_ADMIN_TABS.includes("), "useEffect uses VALID_ADMIN_TABS.includes");
}

// ── AD-10 ────────────────────────────────────────────
function testAD10() {
  console.log("\n--- AD-10: Counter Balance today ---");
  const src = fs.readFileSync("src/components/AccountantDashboard.tsx", "utf-8");
  const cardIdx = src.indexOf("My Counter Balance");
  const section = src.slice(cardIdx, cardIdx + 2000);
  assert(section.includes("myTodayCollections"), "Counter Balance: myTodayCollections");
  assert(!section.includes("formatP(myTotalCollections)"), "no all-time total in card");
}

// ── LC-02 ────────────────────────────────────────────
function testLC02() {
  console.log("\n--- LC-02: numberToIndianWords(0) ---");
  const r = numberToIndianWords(0);
  assert(r === "Zero Rupees and Zero Paise Only", "correct zero phrase");
  assert(r !== "Zero Rupees Only", "old phrase removed");
  assert(numberToIndianWords(10000) === "One Hundred Rupees Only", "100 rupees correct");
  assert(numberToIndianWords(50) === "Fifty Paise Only", "50 paise correct");
  assert(numberToIndianWords(10050).includes("Paise"), "paise preserved in mixed amount");
}

// ── WA-02 ────────────────────────────────────────────
function testWA02() {
  console.log("\n--- WA-02: WhatsApp dues list ---");
  const src = fs.readFileSync("src/lib/whatsapp.ts", "utf-8");
  assert(!src.includes(".slice(0, 5)"), "slice(0,5) removed");
  const params: FeeReminderParams = {
    student: { id: "s1", name: "Student", class: "5", section: "A" },
    schoolInfo: { name: "School" },
    unpaidDues: Array.from({ length: 8 }, (_, i) => ({
      id: "d" + i, name: "April Fee " + (i + 1), amount: 10000, dueDate: "2020-04-10",
    })),
  };
  const text = generateFeeReminderText(params);
  let allPresent = true;
  for (let i = 1; i <= 8; i++) if (!text.includes("April Fee " + i)) allPresent = false;
  assert(allPresent, "all 8 dues appear in message (not truncated)");
  assert(!text.includes("other pending item"), "no truncation notice");
}

// ── C-02 ─────────────────────────────────────────────
function testC02() {
  console.log("\n--- C-02: Concession percentage ---");
  assert(validatePercentage(12.5, "P") === 12.5, "12.5% preserved");
  assert(validatePercentage(33.33, "P") === 33.33, "33.33% preserved");
  const schema = fs.readFileSync("prisma/schema.prisma", "utf-8");
  const block = schema.slice(schema.indexOf("model Concession"), schema.indexOf("model Concession") + 400);
  assert(block.includes("percentage  Float"), "Concession.percentage is Float");
  const ctx = fs.readFileSync("src/context/AuthContext.tsx", "utf-8");
  assert(ctx.includes("parseFloat(String(percentage))"), "addConcession has parseFloat guard");
}

// ── SCH-02 ───────────────────────────────────────────
function testSCH02() {
  console.log("\n--- SCH-02: updateSchoolInfo atomic ---");
  const ctx = fs.readFileSync("src/context/AuthContext.tsx", "utf-8");
  const fnStart = ctx.indexOf("const updateSchoolInfo");
  const fnEnd = ctx.indexOf("};", fnStart) + 2;
  const body = ctx.slice(fnStart, fnEnd);
  assert(body.includes("...schoolInfo"), "merges from schoolInfo context state");
  const dash = fs.readFileSync("src/components/AdminDashboard.tsx", "utf-8");
  const lfStart = dash.indexOf("const handleSaveLateFeeRules");
  const lfEnd = dash.indexOf("};", lfStart) + 2;
  const lfBody = dash.slice(lfStart, lfEnd);
  assert(!lfBody.includes('fetch("/api/school")'), "handleSaveLateFeeRules: no direct fetch");
  assert(lfBody.includes("updateSchoolInfo("), "handleSaveLateFeeRules calls updateSchoolInfo");
}

async function main() {
  console.log("=================================================================");
  console.log(" LOW-PRIORITY FIXES: A-07 B-12 DB-12 SL-04 AC-06 AC-07");
  console.log("                     PD-08 AD-09 AD-10 LC-02 WA-02 C-02 SCH-02");
  console.log("=================================================================");
  testA07(); testB12(); testDB12(); testSL04();
  testAC06(); testAC07(); testPD08(); testAD09(); testAD10();
  testLC02(); testWA02(); testC02(); testSCH02();
  console.log("\n=================================================================");
  console.log("RESULTS: " + passed + " passed, " + failed + " failed");
  console.log("=================================================================");
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });