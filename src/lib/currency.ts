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
