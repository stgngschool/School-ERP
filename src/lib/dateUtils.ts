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
