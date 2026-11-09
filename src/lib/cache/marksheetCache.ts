import type { MockStudent } from "@/context/AuthContext";
import { BoundedCache } from "./BoundedCache";

type MarksheetMark = Parameters<typeof import("../marksheetSummary").buildMarksheetSummary>[0][number] & {
  studentId: string;
};

export type MarksheetSnapshot = { marks: MarksheetMark[]; version: string };
export type ClassMarksheetSnapshot = MarksheetSnapshot & {
  studentVersions: Record<string, string>;
  emptyVersion: string;
};

const distributionTtl = 30 * 60 * 1000;
export const marksheetRosters = new BoundedCache<MockStudent[]>(20, distributionTtl);
export const studentMarksheets = new BoundedCache<MarksheetSnapshot>(300, distributionTtl);
export const classMarksheets = new BoundedCache<ClassMarksheetSnapshot>(12, distributionTtl);

let revision = 0;
const listeners = new Set<() => void>();

export const getMarksheetCacheRevision = () => revision;
export const subscribeToMarksheetChanges = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function clearMarksheetMarks() {
  studentMarksheets.clear();
  classMarksheets.clear();
  revision++;
  listeners.forEach(listener => listener());
}


const marksChannel = typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("gng-marksheet-updates")
  : null;
marksChannel?.addEventListener("message", clearMarksheetMarks);

export function invalidateMarksheetMarks() {
  clearMarksheetMarks();
  marksChannel?.postMessage("marks-saved");
}

export function clearMarksheetCache() {
  marksheetRosters.clear();
  clearMarksheetMarks();
}
