/**
 * Canonical "is this marks record an ABSENT entry?" check.
 *
 * T7 fix: callers previously used `remarks.toUpperCase().includes("ABSENT")`,
 * which produced false positives for legitimate free-text remarks that merely
 * mention the word — e.g. "Was absent during pre-test but completed main exam"
 * would wrongly flip a present student to ABSENT on reload/export/report card.
 *
 * The marks writers only ever persist absence in one of these exact forms:
 *   - the whole remark is "ABSENT" (when the remark was otherwise empty) or the
 *     shorthand "AB"
 *   - an existing free-text remark gets the suffix " (ABSENT)" appended
 * so we match those explicitly instead of a loose substring.
 */
export function isAbsentRemark(remarks?: string | null): boolean {
  if (!remarks) return false;
  const clean = remarks.trim().toUpperCase();
  return clean === "ABSENT" || clean === "AB" || clean.endsWith("(ABSENT)");
}
