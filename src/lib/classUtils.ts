/**
 * Class and Section Normalization Utilities
 * Ensures consistent handling of class names like "Class 5", "5", "5-A", "Class 5-A", "Nursery", "Pre-KG", etc.
 */

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

export function normalizeClassName(className: string): string {
  if (!className) return "";
  let norm = className.trim().replace(/^class\s*/i, "").trim();

  // If contains hyphen e.g. "5-A", "Class 10-B", but NOT compound names like "Pre-KG", "Play-Group"
  if (norm.includes("-")) {
    const parts = norm.split("-");
    const lastPart = parts[parts.length - 1].trim();
    // If the part after hyphen is a single letter (section like A, B, C, D) or "all"
    if (/^[a-zA-Z]$/i.test(lastPart) || /^all$/i.test(lastPart)) {
      norm = parts.slice(0, -1).join("-").trim().replace(/^class\s*/i, "").trim();
    }
  }

  // Remove common ordinal suffixes e.g. "5th" -> "5", "10th" -> "10", "1st" -> "1"
  norm = norm.replace(/^(\d+)(st|nd|rd|th)$/i, "$1");

  return norm;
}

export function normalizeSectionName(section?: string, fallbackFromClass?: string): string {
  if (section && section.trim() !== "") {
    return section.trim().toUpperCase();
  }
  if (fallbackFromClass && fallbackFromClass.includes("-")) {
    const parts = fallbackFromClass.split("-");
    const lastPart = parts[parts.length - 1].trim();
    if (/^[a-zA-Z]$/i.test(lastPart)) {
      return lastPart.toUpperCase();
    }
  }
  return "A";
}

/**
 * Returns a standardized class key, e.g. "5-A", "10-A", "NURSERY-A", "LKG-A", "PRE-KG-A"
 */
export function getCleanClassKey(clsName: string, secName?: string): string {
  if (!clsName) return "";
  const raw = clsName.trim();
  
  const sec = normalizeSectionName(secName, raw);
  const cName = normalizeClassName(raw);

  if (!cName) return "";
  return `${cName}-${sec}`;
}

/**
 * Matches a student's class and section against a selected class key (e.g. "5-A" or "Class 5-A" or "ALL")
 */
export function matchStudentToClass(
  student: { class: string; section?: string },
  selectedClass: string
): boolean {
  if (!selectedClass) return false;
  if (selectedClass.toUpperCase() === "ALL") return true;

  const targetKey = getCleanClassKey(selectedClass).toLowerCase();
  const studentKey = getCleanClassKey(student.class, student.section).toLowerCase();

  if (studentKey === targetKey) return true;

  // Also check if normalized class names match
  const normStudentClass = normalizeClassName(student.class).toLowerCase();
  const normTargetClass = normalizeClassName(selectedClass).toLowerCase();
  if (normStudentClass === normTargetClass) {
    const studentSec = normalizeSectionName(student.section, student.class).toLowerCase();
    const targetSec = normalizeSectionName(undefined, selectedClass).toLowerCase();
    if (studentSec === targetSec) return true;
  }

  return false;
}

/**
 * Returns user-friendly display string, e.g. "5-A" -> "Class 5-A", "NURSERY-A" -> "Class Nursery-A", "ALL" -> "All Classes"
 */
export function normalizeDisplayClassName(classKey: string): string {
  if (!classKey) return "";
  if (classKey.toUpperCase() === "ALL") return "All Classes";
  const clean = classKey.replace(/^class\s*/i, "").trim();
  return `Class ${clean}`;
}

/**
 * Natural ordering score for school classes
 */
export const classOrderScore = (cls: string): number => {
  const norm = cls.toLowerCase().replace(/^class\s*/i, "").trim();
  if (norm.includes("play") || norm.includes("daycare")) return 1;
  if (norm.includes("nurs") || norm.includes("prep")) return 2;
  if (norm.includes("lkg") || norm.includes("lower")) return 3;
  if (norm.includes("ukg") || norm.includes("upper") || norm.includes("kg")) return 4;

  const rawNum = norm.split("-")[0].trim();
  const num = parseInt(rawNum, 10);
  if (!isNaN(num)) return 10 + num;

  if (ROMAN_NUMERALS[rawNum]) {
    return 10 + ROMAN_NUMERALS[rawNum];
  }

  return 100;
};

/**
 * Sorts class keys in natural school progression order
 */
export const sortClasses = (list: string[]): string[] => {
  return [...list].sort((a, b) => {
    const scoreA = classOrderScore(a);
    const scoreB = classOrderScore(b);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
};
