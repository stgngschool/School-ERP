export function hasMarksDraftValues(entry: { marksObtained?: string; breakdown?: Record<string, string>; isAbsent?: boolean }) {
  return entry.isAbsent === true || (entry.marksObtained != null && entry.marksObtained !== "") || Object.values(entry.breakdown || {}).some(value => value != null && value !== "");
}
interface SavedMarksEntry {
  marksObtained?: number | string | null;
  remarks?: string;
  breakdown?: Record<string, unknown>;
  writtenExam?: number | null;
  notebook?: number | null;
  subjectEnrichment?: number | null;
  practical?: number | null;
}

export async function readMarksRoster(response: Response): Promise<{ marks: Record<string, SavedMarksEntry>; isLocked?: boolean }> {
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Could not load saved marks. Please retry.");
  if (!data || typeof data.marks !== "object" || data.marks === null || Array.isArray(data.marks)) {
    throw new Error("Invalid marks response. Please retry.");
  }
  return data;
}
export function createMarksLoadGuard() {
  let controller: AbortController | undefined;
  return {
    begin() {
      controller?.abort();
      const next = new AbortController();
      controller = next;
      return { signal: next.signal, abort: () => next.abort(), isCurrent: () => controller === next && !next.signal.aborted };
    },
    abort() { controller?.abort(); },
  };
}
