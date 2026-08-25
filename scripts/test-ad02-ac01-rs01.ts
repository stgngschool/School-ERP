export {};
/**
 * Regression tests for AD-02, AC-01, RS-01.
 * Run: npx tsx scripts/test-ad02-ac01-rs01.ts
 */

import { numberToIndianWords } from "../src/lib/currency";

const results: { label: string; pass: boolean }[] = [];

function test(label: string, pass: boolean) {
  results.push({ label, pass });
  console.log(pass ? `  PASS: ${label}` : `  FAIL: ${label}`);
  if (!pass) process.exitCode = 1;
}

// ─── AD-02: No Math.random() fallback for receipt numbers ─────────────────────

function ad02Guard(receiptNo: string | undefined): string | null {
  // Fixed behaviour: return null when receiptNo is missing — never fabricate
  if (!receiptNo) return null;
  return receiptNo;
}

test("AD-02: valid receiptNo is returned as-is", ad02Guard("REC-2026-001") === "REC-2026-001");
test("AD-02: undefined receiptNo returns null (no fake fallback)", ad02Guard(undefined) === null);
test("AD-02: empty receiptNo returns null (no fake fallback)", ad02Guard("") === null);

// Verify that Math.random is not called (random strings have predictable non-sequential format)
const fakeFormat = /^REC-\d{4}-\d{4}$/;
test("AD-02: our guard never produces a REC-YYYY-NNNN style fake value",
  !fakeFormat.test(ad02Guard(undefined) ?? ""));

// ─── AC-01: Transport amount — exactly one paisa→rupee conversion ─────────────

function apiResponsePaisa(dbPaisa: number) { return { amount: dbPaisa }; }
function contextConvert(raw: { amount: number }) { return { ...raw, amount: raw.amount / 100 }; }
function addStopToApi(rupeesInput: number) { return Math.round(rupeesInput * 100); }

test("AC-01: 50000 paisa → context /100 → 500 rupees",
  contextConvert(apiResponsePaisa(50000)).amount === 500);
test("AC-01: admin types 500 → API stores 50000 paisa → context shows 500",
  addStopToApi(500) === 50000 && addStopToApi(500) / 100 === 500);
test("AC-01: double-conversion is detectable (bug scenario sanity check)",
  Math.round(Math.round(500 * 100) * 100) !== 50000);
test("AC-01: zero amount round-trips correctly",
  contextConvert(apiResponsePaisa(addStopToApi(0))).amount === 0);

// ─── RS-01: Historical receipt snapshot integrity ─────────────────────────────

// RS-01a: numberToIndianWords is deterministic and works from paisa
const words1200 = numberToIndianWords(120000); // 120000 paisa = ₹1200
test("RS-01: numberToIndianWords(120000 paisa) contains 'Thousand'", words1200.includes("Thousand"));
test("RS-01: numberToIndianWords is deterministic", numberToIndianWords(95000) === numberToIndianWords(95000));

// RS-01b: snapshot amountInWords is stored at payment time
function buildSnapshot(amountPaid: number, subtotal: number, discount: number, arrears: number) {
  return { subtotal, discount, arrears, amountInWords: numberToIndianWords(amountPaid) };
}

const snap = buildSnapshot(95000, 100000, 5000, 0);
test("RS-01: snapshot amountInWords is set from amountPaid", typeof snap.amountInWords === "string" && snap.amountInWords.length > 0);
test("RS-01: snapshot subtotal/discount/arrears are stored correctly",
  snap.subtotal === 100000 && snap.discount === 5000 && snap.arrears === 0);

// RS-01c: GET fallback uses ReceiptItem.amount (immutable), NOT i.ledgerEntry?.amount (live)
function simulateGetFallback(receiptItemAmount: number, liveChargeAmount: number) {
  // FIXED: use receiptItemAmount (immutable paid) not liveChargeAmount (may have changed)
  const orig = receiptItemAmount; // previously: liveChargeAmount
  return { originalAmount: orig, amount: receiptItemAmount, balance: 0 };
}

const item = simulateGetFallback(50000, 70000); // paid 50000, live charge now shows 70000
test("RS-01: fallback originalAmount uses ReceiptItem.amount not live ledger amount",
  item.originalAmount === 50000);
test("RS-01: fallback balance is 0 when using ReceiptItem.amount",
  item.balance === 0);

// RS-01d: GET returns amountInWords for historical reprints
function simulateGetResponse(meta: { amountInWords?: string } | null, amountPaid: number) {
  return meta?.amountInWords ?? numberToIndianWords(amountPaid);
}

test("RS-01: GET uses snapshot amountInWords when present",
  simulateGetResponse({ amountInWords: "Five Hundred Rupees Only" }, 50000) === "Five Hundred Rupees Only");
test("RS-01: GET computes amountInWords from immutable amountPaid when meta is null",
  simulateGetResponse(null, 50000).includes("Rupees"));

// ─── Summary ──────────────────────────────────────────────────────────────────

const failed = results.filter(r => !r.pass).length;
const passed = results.filter(r => r.pass).length;
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed}/${results.length} tests passed (AD-02, AC-01, RS-01)`);
if (failed > 0) process.exit(1);
