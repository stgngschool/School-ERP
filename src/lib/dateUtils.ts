/**
 * ── Centralized Date Utilities for School Finance OS
 *
 * Prevents systemic UTC timezone drift (H-01).
 * In Indian Standard Time (IST = UTC+5:30), between 12:00 AM and 5:29:59 AM,
 * standard `.toISOString()` returns the PREVIOUS day's date in UTC.
 *
 * This utility guarantees date strings strictly correspond to the
 * Indian calendar day across both server-side runtimes and client browsers.
 */

/**
 * Returns date formatted as YYYY-MM-DD in Asia/Kolkata (IST) timezone.
 *
 * @param date Optional Date object, ISO timestamp string, or Unix epoch milliseconds.
 *             Defaults to the current moment.
 */
export function getISTDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Returns today's date in YYYY-MM-DD format (IST).
 */
export function getTodayIST(): string {
  return getISTDateString(new Date());
}

/**
 * Alias for getISTDateString, maintaining backward compatibility with
 * existing local-date callers.
 */
export function getLocalDateString(date: Date | string | number = new Date()): string {
  return getISTDateString(date);
}

/**
 * Formats a date into a human-friendly Indian format: DD MMM YYYY (e.g., "04 Sep 2026").
 */
export function formatIndianDate(date: Date | string | number = new Date()): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

// ── Canonical DOB Standards for School Finance OS ────────────────────────────
// The ERP standardizes on Asia/Kolkata (IST). DOB is a pure calendar date,
// never an instant in time. The single human-facing display format is DD-MMM-YYYY.

export const MONTHS_CANONICAL = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Internal helper to safely resolve any supported date input into a Date instance.
 */
function toCanonicalDateObj(date: Date | string | number | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === "number") {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed) return null;
    if (trimmed.includes("T")) {
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d;
    }
    return parseCanonicalDOB(trimmed);
  }
  return null;
}

/**
 * Formats a Date of Birth into the single canonical human-facing ERP format:
 * DD-MMM-YYYY (e.g. "08-Aug-2022", "27-Mar-2014") strictly in Asia/Kolkata.
 * Correctly interprets both 00:00:00 and 18:30:00 database timestamps without drift.
 */
export function formatCanonicalDOB(date: Date | string | number | null | undefined): string {
  const d = toCanonicalDateObj(date);
  if (!d) return "";

  // Extract calendar day, month, and year strictly in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.format(d).split("-");
  if (parts.length !== 3) return "";

  const [y, mStr, dStr] = parts;
  const mIndex = parseInt(mStr, 10) - 1;
  const monthName = MONTHS_CANONICAL[mIndex] || mStr;

  return `${dStr}-${monthName}-${y}`;
}

/**
 * Formats a Date of Birth into the canonical ISO calendar date string:
 * YYYY-MM-DD (e.g. "2022-08-08") strictly in Asia/Kolkata.
 * Used for HTML5 <input type="date"> bindings, database comparisons, and internal APIs.
 */
export function formatCanonicalDOBIso(date: Date | string | number | null | undefined): string {
  const d = toCanonicalDateObj(date);
  if (!d) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Safely parses any supported DOB input (DD-MMM-YYYY, YYYY-MM-DD, DD/MM/YYYY, or Date)
 * into a safe Indian calendar date object anchored at UTC midnight.
 * This guarantees:
 * 1. No backward timezone shift occurs when stored in Postgres timestamp without time zone.
 * 2. When read back in Asia/Kolkata (IST), it represents the exact intended calendar date.
 */
export function parseCanonicalDOB(input: string | Date | number | null | undefined): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [y, m, d] = formatter.format(input).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }

  const str = String(input).trim();
  if (!str) return null;

  let y = 0, m = 0, d = 0;

  // 1. DD-MMM-YYYY (e.g. 08-Aug-2022, 27-Mar-2014, 8-aug-2022)
  const dmmmMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z.]+)[-/ ](\d{4})$/);
  if (dmmmMatch) {
    d = parseInt(dmmmMatch[1], 10);
    const mStr = dmmmMatch[2].replace(".", "").toLowerCase().substring(0, 3);
    y = parseInt(dmmmMatch[3], 10);
    const mIdx = MONTHS_CANONICAL.findIndex((name) => name.toLowerCase() === mStr);
    if (mIdx !== -1) m = mIdx + 1;
  }

  // 2. YYYY-MM-DD (e.g. 2022-08-08 or 2022-8-8 with optional timestamp suffix)
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch && !dmmmMatch) {
    y = parseInt(ymdMatch[1], 10);
    m = parseInt(ymdMatch[2], 10);
    d = parseInt(ymdMatch[3], 10);
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY (e.g. 08/08/2022 or 17-04-2022)
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch && !dmmmMatch && !ymdMatch) {
    d = parseInt(dmyMatch[1], 10);
    m = parseInt(dmyMatch[2], 10);
    y = parseInt(dmyMatch[3], 10);
  }

  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) {
    return null;
  }

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > daysInMonth) {
    return null;
  }

  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}
