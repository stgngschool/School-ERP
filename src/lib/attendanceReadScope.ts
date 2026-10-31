import type { Prisma } from "@prisma/client";
import { getCleanClassKey, normalizeSectionName } from "./classUtils";

export type AttendanceReadScope = {
  startDate: string;
  endDate: string;
  className?: string;
  classNames?: string[];
  section?: string;
};

type ScopeSelection = {
  selectedClass: string;
  selectedDate: string;
  selectedMonth: string;
  activeView: "ROSTER" | "MONTHLY";
  classes: { name: string; section: string }[];
};

function distinctClassNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAttendanceReadScope(selection: ScopeSelection): AttendanceReadScope {
  let startDate = selection.selectedDate;
  let endDate = startDate;
  if (selection.activeView === "MONTHLY") {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selection.selectedMonth)) throw new Error("Select a valid month.");
    const [year, month] = selection.selectedMonth.split("-").map(Number);
    startDate = `${selection.selectedMonth}-01`;
    endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  } else {
    const parsed = new Date(`${startDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== startDate) {
      throw new Error("Select a valid date.");
    }
  }
  if (selection.selectedClass === "ALL") return { startDate, endDate };
  const key = getCleanClassKey(selection.selectedClass).toLowerCase();
  const matchingNames = selection.classes
    .filter((item) => getCleanClassKey(item.name, item.section).toLowerCase() === key)
    .map((item) => item.name);
  const names = distinctClassNames(matchingNames);
  if (!names.length) throw new Error("Select an available class before loading attendance.");
  const section = normalizeSectionName(undefined, selection.selectedClass);
  return { startDate, endDate, ...(names.length === 1 ? { className: names[0] } : { classNames: names }), section };
}

/** Validate the opt-in alias list before it can influence an attendance query. */
export function parseAttendanceClassNames(raw: string | null): string[] | undefined {
  if (raw === null) return undefined;
  const invalid = () => new Error("classNames must be a JSON array of 1 to 50 class names, each 1 to 100 characters.");
  if (raw.length > 10_000) throw invalid();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw invalid(); }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50 || parsed.some((name) => typeof name !== "string" || !name.trim() || name.length > 100)) throw invalid();
  return distinctClassNames((parsed as string[]).map((name) => name.trim()));
}

/** Add requested class restrictions without replacing any role/student/date scope. */
export function withAttendanceClassFilter(
  authorizedWhere: Prisma.AttendanceWhereInput,
  className?: string | null,
  section?: string | null,
  classNames?: string[],
): Prisma.AttendanceWhereInput {
  const name = className?.trim();
  const classSection = section?.trim();
  if (!name && !classSection && !classNames?.length) return authorizedWhere;
  return {
    AND: [authorizedWhere, {
      student: {
        class: {
          ...(classNames?.length ? { name: { in: classNames, mode: "insensitive" } } : name ? { name: { equals: name, mode: "insensitive" } } : {}),
          ...(classSection ? { section: { equals: classSection, mode: "insensitive" } } : {}),
        },
      },
    }],
  };
}
