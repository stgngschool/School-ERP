type MarksSaveResult = { count?: number; failedStudentIds?: string[]; warnings?: string[] };

/** HTTP 200 may contain partial row failures. Never mark an unconfirmed batch as saved. */
export function assertMarksSaved(result: MarksSaveResult, expected: number): void {
  if (result.count !== expected || result.failedStudentIds?.length || result.warnings?.length) {
    throw new Error(`${result.count ?? 0} of ${expected} marks saved. ${result.warnings?.[0] || "Some rows were not confirmed. Retry the unsaved entries."}`);
  }
}
