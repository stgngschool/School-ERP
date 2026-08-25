/**
 * Currency formatting utilities for the School Finance OS.
 * All monetary values in the database are stored as integers in PAISA (₹1 = 100 paisa).
 * These helpers ensure consistent conversion between paisa and display rupees.
 */

/**
 * Format paisa (integer cents) as an Indian Rupee display string.
 * @example formatP(70000) → "₹700"
 * @example formatP(65050) → "₹650.50"
 */
export function formatP(paisa: number): string {
  const rupees = (paisa ?? 0) / 100;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

/**
 * Convert a Rupee amount (from user input) to Paisa for database storage.
 * @example toPaisa(700) → 70000
 * @example toPaisa(650.50) → 65050
 */
export function toPaisa(rupees: number): number {
  return Math.round((rupees ?? 0) * 100);
}

/**
 * Convert paisa to rupees as a raw number (for calculations, not display).
 * @example toRupees(70000) → 700
 */
export function toRupees(paisa: number): number {
  return (paisa ?? 0) / 100;
}

/**
 * Convert paisa into capitalized Indian Currency words string.
 * @example numberToIndianWords(10000) → "One Hundred Rupees Only"
 * @example numberToIndianWords(10050) → "One Hundred Rupees and Fifty Paise Only"
 * @example numberToIndianWords(123475) → "One Thousand Two Hundred Thirty Four Rupees and Seventy Five Paise Only"
 * @example numberToIndianWords(50) → "Fifty Paise Only"
 * @example numberToIndianWords(0) → "Zero Rupees Only"
 */
export function numberToIndianWords(paisa: number): string {
  const totalPaisa = Math.round(Math.abs(paisa || 0));
  const rupees = Math.floor(totalPaisa / 100);
  const remainingPaise = totalPaisa % 100;

  // ── LC-02: Use "Zero Rupees and Zero Paise Only" for natural receipt language
  if (rupees === 0 && remainingPaise === 0) return "Zero Rupees and Zero Paise Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    return o ? `${t} ${o}` : t;
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = "";
    if (h > 0) res += `${ones[h]} Hundred`;
    if (rem > 0) {
      if (res) res += " ";
      res += convertTwoDigits(rem);
    }
    return res;
  }

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${convertThreeDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  const rupeeString = parts.length > 0 ? parts.join(" ") + " Rupees" : (rupees > 0 ? "Zero Rupees" : "");
  const paiseString = remainingPaise > 0 ? `${convertTwoDigits(remainingPaise)} Paise` : "";

  if (rupeeString && paiseString) {
    return `${rupeeString} and ${paiseString} Only`;
  } else if (rupeeString) {
    return `${rupeeString} Only`;
  } else {
    return `${paiseString} Only`;
  }
}
