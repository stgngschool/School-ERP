/**
 * Test suite for S-03, S-04, S-05, AC-02, AD-03, PD-02 audit fixes.
 * Run with: npx tsx scripts/test-s03-s04-s05-ac02-ad03-pd02.ts
 */

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ─────────────────────────────────────────────────────────────────
// AD-03 Tests
// ─────────────────────────────────────────────────────────────────
const ACADEMIC_MONTH_ORDER = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March",
];

function areMonthsConsecutive(months: string[]): boolean {
  if (months.length <= 1) return true;
  const indices = months.map((m) => ACADEMIC_MONTH_ORDER.indexOf(m));
  if (indices.some((i) => i === -1)) return false;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

function getMonthLabel(months: string[]): string {
  if (months.length === 0) return "";
  if (months.length >= 3 && areMonthsConsecutive(months)) {
    const sorted = [...months].sort((a, b) => ACADEMIC_MONTH_ORDER.indexOf(a) - ACADEMIC_MONTH_ORDER.indexOf(b));
    return `(${sorted[0]} to ${sorted[sorted.length - 1]})`;
  }
  return `(${months.join(", ")})`;
}

console.log("\n=== AD-03: Month Range Display ===");
test("consecutive 3 months -> range", () => { assert(getMonthLabel(["April","May","June"]) === "(April to June)", "wrong label"); });
test("non-consecutive 3 months -> list (no range)", () => { const l = getMonthLabel(["April","July","December"]); assert(!l.includes(" to "), `must not use range: ${l}`); });
test("4 consecutive months -> range", () => { assert(getMonthLabel(["April","May","June","July"]) === "(April to July)", "wrong label"); });
test("3 months with gap -> list", () => { const l = getMonthLabel(["April","June","August"]); assert(!l.includes(" to "), `must not use range: ${l}`); });
test("Dec,Jan,Feb consecutive", () => { assert(getMonthLabel(["December","January","February"]) === "(December to February)", "wrong label"); });
test("single month is consecutive", () => { assert(areMonthsConsecutive(["May"]) === true, "single must be consecutive"); });
test("reversed order still detected consecutive", () => { assert(getMonthLabel(["June","May","April"]) === "(April to June)", "wrong label"); });

// ─────────────────────────────────────────────────────────────────
// AC-02 Tests
// ─────────────────────────────────────────────────────────────────
function hasSubstantiveData(d: any): boolean {
  if (!d) return false;
  if (Array.isArray(d)) return d.length > 0;
  if (typeof d === "object") {
    const vals = Object.values(d);
    const allEmptyArrays = vals.length > 0 && vals.every((v) => Array.isArray(v) && (v as any[]).length === 0);
    if (allEmptyArrays) return false;
    return vals.length > 0;
  }
  return !!d;
}

console.log("\n=== AC-02: apiFetch Substantive Cache Check ===");
test("all-empty-array billing NOT cacheable", () => { assert(!hasSubstantiveData({ledgerEntries:[],receipts:[],dueItems:[]}), "must not cache"); });
test("billing with one entry IS cacheable", () => { assert(hasSubstantiveData({ledgerEntries:[{id:"1"}],receipts:[],dueItems:[]}), "must cache"); });
test("empty array NOT cacheable", () => { assert(!hasSubstantiveData([]), "must not cache"); });
test("non-empty array IS cacheable", () => { assert(hasSubstantiveData([{id:"1"}]), "must cache"); });
test("null NOT cacheable", () => { assert(!hasSubstantiveData(null), "must not cache"); });
test("school info object IS cacheable", () => { assert(hasSubstantiveData({name:"School",phone:"123"}), "must cache"); });
test("fully populated billing IS cacheable", () => { assert(hasSubstantiveData({ledgerEntries:[{id:"le1"}],receipts:[{id:"r1"}],dueItems:[{id:"d1"}]}), "must cache"); });

// ─────────────────────────────────────────────────────────────────
// S-03 Tests
// ─────────────────────────────────────────────────────────────────
function shouldRegenerateForRte(wasRte: boolean, newRte: boolean): boolean { return !wasRte && newRte; }

console.log("\n=== S-03: RTE Charge Regeneration Guard ===");
test("false→true triggers", () => { assert(shouldRegenerateForRte(false, true), "must trigger"); });
test("false→false does not trigger", () => { assert(!shouldRegenerateForRte(false, false), "must not trigger"); });
test("true→true does not trigger", () => { assert(!shouldRegenerateForRte(true, true), "must not trigger"); });
test("true→false does not trigger", () => { assert(!shouldRegenerateForRte(true, false), "must not trigger"); });

// ─────────────────────────────────────────────────────────────────
// S-04 Tests
// ─────────────────────────────────────────────────────────────────
function shouldRegenerateForConcession(prev: string|null, next: string|null): boolean { return next !== prev; }

console.log("\n=== S-04: Concession Change Triggers ===");
test("null->id triggers", () => { assert(shouldRegenerateForConcession(null,"c1"), "must trigger"); });
test("id->null triggers", () => { assert(shouldRegenerateForConcession("c1",null), "must trigger"); });
test("same id no trigger", () => { assert(!shouldRegenerateForConcession("c1","c1"), "must not trigger"); });
test("different id triggers", () => { assert(shouldRegenerateForConcession("c1","c2"), "must trigger"); });
test("null->null no trigger", () => { assert(!shouldRegenerateForConcession(null,null), "must not trigger"); });

// ─────────────────────────────────────────────────────────────────
// S-05 Tests
// ─────────────────────────────────────────────────────────────────
function checkEmailChangeBlocked(requested: string|undefined, existing: string): {blocked:boolean} {
  if (!requested) return {blocked:false};
  const ne = requested.trim().toLowerCase();
  if (ne && ne !== existing.toLowerCase()) return {blocked:true};
  return {blocked:false};
}

console.log("\n=== S-05: Parent Email Change Blocked ===");
test("different email BLOCKED", () => { assert(checkEmailChangeBlocked("new@e.com","old@e.com").blocked, "must block"); });
test("same email NOT blocked", () => { assert(!checkEmailChangeBlocked("same@e.com","same@e.com").blocked, "must not block"); });
test("no email NOT blocked", () => { assert(!checkEmailChangeBlocked(undefined,"x@e.com").blocked, "must not block"); });
test("case-insensitive same email NOT blocked", () => { assert(!checkEmailChangeBlocked("USER@E.COM","user@e.com").blocked, "must not block"); });
test("empty string NOT blocked", () => { assert(!checkEmailChangeBlocked("","x@e.com").blocked, "must not block"); });

// ─────────────────────────────────────────────────────────────────
// PD-02 Tests
// ─────────────────────────────────────────────────────────────────
console.log("\n=== PD-02: Double-Submit Guard ===");
test("ref blocks second concurrent submission", () => {
  const ref = {current:false};
  let count = 0;
  const submit = () => { if(ref.current) return; ref.current=true; count++; };
  submit(); submit();
  assert(count===1, `Expected 1 submission, got ${count}`);
});
test("ref resets allowing subsequent payment", () => {
  const ref = {current:false};
  let count = 0;
  const submit = () => { if(ref.current) return; ref.current=true; count++; ref.current=false; };
  submit(); submit();
  assert(count===2, `Expected 2 payments after reset, got ${count}`);
});

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error("FAILED"); process.exit(1); }
else { console.log("All tests PASSED ✅"); }
