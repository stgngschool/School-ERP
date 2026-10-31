import { getISTDateString } from "./dateUtils";

export function calculateLateFee(input: { enabled?: boolean; type?: string; amountRupees: number; graceDays: number; dueDate: string; outstanding: number; now: number }) {
  if (input.enabled !== true || input.outstanding <= 0) return 0;
  const endOfDueDay = Date.parse(`${input.dueDate}T23:59:59.999+05:30`);
  const grace = Math.max(0, Math.floor(input.graceDays));
  const deadline = endOfDueDay + grace * 86400000;
  if (!Number.isFinite(deadline) || input.now <= deadline || !Number.isFinite(input.amountRupees) || input.amountRupees <= 0) return 0;
  const days = Math.floor((input.now - deadline - 1) / 86400000) + 1;
  return Math.round(input.amountRupees * 100) * (['DAILY', 'PER_DAY'].includes(input.type || '') ? days : 1);
}

export function getChargeDueDate(chargeName: string, fallbackTime: number): string {
  const nameLower = chargeName.toLowerCase();

  // 1. Check if charge description explicitly has a 4-digit academic year pattern like "2024-2025" or "2025-26"
  let sy: number | null = null;
  let ey: number | null = null;

  const yearRangeMatch = chargeName.match(/(\d{4})\s*-\s*(\d{2,4})/);
  if (yearRangeMatch) {
    const rawSy = parseInt(yearRangeMatch[1], 10);
    let rawEy = parseInt(yearRangeMatch[2], 10);
    if (rawEy < 100) rawEy = Math.floor(rawSy / 100) * 100 + rawEy;
    if (rawSy >= 2000 && rawSy <= 2100) {
      sy = rawSy;
      ey = rawEy;
    }
  }

  // 2. If not found in text, derive from fallbackTime (createdAt timestamp)
  if (!sy || !ey) {
    if (fallbackTime && Number.isFinite(fallbackTime) && fallbackTime > 0) {
      const d = new Date(fallbackTime);
      const m = d.getMonth(); // 0 = Jan, 3 = Apr
      sy = m >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      ey = sy + 1;
    }
  }

  // 3. Fallback to active academic year if fallbackTime was missing/invalid
  if (!sy || !ey) {
    const now = new Date();
    const year = now.getFullYear() - (now.getMonth() < 3 ? 1 : 0);
    const acYear = `${year}-${year + 1}`;
    const [syStr, eyStr] = acYear.split("-");
    sy = parseInt(syStr, 10);
    ey = parseInt(eyStr, 10);
  }

  // Months April–December fall in the START year; Jan–March in the END year.
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
  if (nameLower.includes("yearly exam") || nameLower.includes("annual exam")) return `${ey}-03-15`;
  if (
    nameLower.includes("m/s") ||
    nameLower.includes("annual") ||
    nameLower.includes("admission") ||
    nameLower.includes("previous session")
  ) {
    return `${sy}-04-10`;
  }

  // Specific Exam Fallbacks if month name was not explicitly in the description
  if (nameLower.includes("unit 1") || nameLower.includes("unit-1") || nameLower.includes("unit1")) return `${sy}-07-15`;
  if (nameLower.includes("half yearly") || nameLower.includes("half-yearly")) return `${sy}-10-15`;
  if (nameLower.includes("unit 2") || nameLower.includes("unit-2") || nameLower.includes("unit2")) return `${sy}-12-15`;
  if (nameLower.includes("yearly exam") || nameLower.includes("annual exam")) return `${ey}-03-15`;

  return getISTDateString(fallbackTime);
}


