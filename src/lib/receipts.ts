/**
 * Canonical helper functions for Receipt item grouping and month sorting.
 * (PD-05: Single canonical implementation shared by AccountantDashboard, AdminDashboard, and ParentDashboard)
 */

import { numberToIndianWords, formatP, toPaisa, toRupees } from "@/lib/currency";
export { numberToIndianWords, formatP, toPaisa, toRupees };

export const ACADEMIC_MONTH_ORDER = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

const MONTHS_LOWER_LIST = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

/**
 * Checks if an array of month names form a contiguous, unbroken sequence in academic order (April -> March).
 */
export function areMonthsConsecutive(months: string[]): boolean {
  if (months.length <= 1) return true;

  const indices = months
    .map((m) => ACADEMIC_MONTH_ORDER.indexOf(m))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b);

  if (indices.length !== months.length) return false;

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }

  return true;
}

/**
 * Shortens common fee particulars and academic sessions to save horizontal space.
 * e.g. "Tuition Fee - September 2026-2027" -> "T.F - September 2026-27"
 */
export function formatCompactParticulars(text: string): string {
  if (!text) return "";
  return text
    .replace(/\bTuition\s*Fee\b/gi, "T.F")
    .replace(/\b(\d{4})-(\d{2})(\d{2})\b/g, "$1-$3")
    .trim();
}

export interface ReceiptStudentInfo {
  id?: string;
  name: string;
  classSection: string;
  rollNo: string;
  admissionNo: string;
}

/**
 * Normalizes student details for any receipt, supporting single students and multi-child families.
 */
export function getReceiptStudents(rec: any): ReceiptStudentInfo[] {
  if (!rec) return [];

  // Case 1: Structured studentsList is present
  if (Array.isArray(rec.studentsList) && rec.studentsList.length > 0) {
    return rec.studentsList.map((s: any) => ({
      id: s.id,
      name: s.name || "Student",
      classSection: s.classSection || (s.class ? `${s.class.name || s.class}-${s.class.section || s.section || "A"}` : "—"),
      rollNo: s.rollNo || s.rollNumber || "—",
      admissionNo: s.admissionNo || s.admissionNumber || "—",
    }));
  }

  // Case 2: Multi-child comma-separated studentName (e.g. "Nayra Vishwakarma, Aahan Vishwakarma")
  if (rec.studentName && rec.studentName.includes(",")) {
    const names = rec.studentName.split(",").map((s: string) => s.trim()).filter(Boolean);
    const classes = (rec.classSection || "").split(",").map((s: string) => s.trim());
    const rolls = (rec.rollNumber || rec.rollNo || "").split(",").map((s: string) => s.trim());
    const admissions = (rec.admissionNo || "").split(",").map((s: string) => s.trim());

    return names.map((name: string, i: number) => ({
      name,
      classSection: classes[i] || classes[0] || "—",
      rollNo: rolls[i] || rolls[0] || "—",
      admissionNo: admissions[i] || admissions[0] || "—",
    }));
  }

  // Case 3: Single Student
  return [
    {
      id: rec.studentId,
      name: rec.studentName || "Student",
      classSection: rec.classSection || "—",
      rollNo: rec.rollNumber || rec.rollNo || "—",
      admissionNo: rec.admissionNo || "—",
    },
  ];
}

export interface ReceiptItemInput {
  name?: string;
  description?: string;
  studentPrefix?: string;
  originalAmount?: number;
  amount: number;
  discount?: number;
  balance?: number;
  [key: string]: any;
}

export interface GroupedReceiptItem {
  name: string;
  studentPrefix?: string;
  baseParticular?: string;
  amount: number;
  originalAmount?: number;
  discount: number;
  balance?: number;
  months?: string[];
  [key: string]: any;
}

/**
 * Groups multiple receipt items (e.g. monthly fees for siblings or consecutive months)
 * into a single consolidated row, extracting student attribution for clean badging.
 */
export function getGroupedReceiptItems(items: ReceiptItemInput[]): GroupedReceiptItem[] {
  if (!items || items.length === 0) return [];

  // Helper to extract student prefix and base particular from an item name
  const parseItemName = (item: ReceiptItemInput) => {
    const rawName = item.name || item.description || "";
    let studentPrefix = item.studentPrefix || "";
    let rest = rawName;

    if (rawName.includes(":")) {
      const parts = rawName.split(":");
      if (!studentPrefix) {
        studentPrefix = parts[0].trim();
      }
      rest = parts.slice(1).join(":").trim();
    }

    if (studentPrefix && rest.toLowerCase().startsWith(studentPrefix.toLowerCase())) {
      rest = rest.slice(studentPrefix.length).replace(/^[:\s-]+/, "").trim();
    }

    let baseFeeHead = rest;
    let month = "";

    if (rest.includes("-")) {
      const parts = rest.split("-");
      let monthPartIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const partLower = parts[i].toLowerCase();
        const hasMonth = MONTHS_LOWER_LIST.some((m) => partLower.includes(m));
        if (hasMonth) {
          monthPartIndex = i;
          break;
        }
      }

      if (monthPartIndex !== -1) {
        month = parts.slice(monthPartIndex).join("-").trim();
        baseFeeHead = parts.slice(0, monthPartIndex).join("-").trim();
      }
    }

    return { rawName, studentPrefix, baseFeeHead, month, rest };
  };

  // If 4 or fewer items AND no duplicate fee heads for the same child, format individual items
  const feeHeadCount: { [key: string]: number } = {};
  items.forEach((item) => {
    const { studentPrefix, baseFeeHead } = parseItemName(item);
    const key = `${studentPrefix}||${baseFeeHead}`;
    feeHeadCount[key] = (feeHeadCount[key] || 0) + 1;
  });
  const hasMultipleMonthsSameHead = Object.values(feeHeadCount).some((cnt) => cnt > 1);

  if (items.length <= 4 && !hasMultipleMonthsSameHead) {
    return items.map((item) => {
      const { studentPrefix, rest } = parseItemName(item);
      return {
        ...item,
        name: item.name || item.description || "",
        studentPrefix: studentPrefix || undefined,
        baseParticular: formatCompactParticulars(rest || item.name || item.description || ""),
        amount: item.amount,
        originalAmount: item.originalAmount !== undefined ? item.originalAmount : item.amount,
        discount: item.discount || 0,
        balance: item.balance || 0,
      };
    });
  }

  // Otherwise, group consolidated rows
  const groups: {
    [key: string]: {
      studentPrefix: string;
      baseFeeHead: string;
      months: string[];
      amount: number;
      originalAmount: number;
      discount: number;
      balance: number;
    };
  } = {};

  items.forEach((item) => {
    const { studentPrefix, baseFeeHead, month } = parseItemName(item);
    const key = `${studentPrefix}||${baseFeeHead}`;

    if (!groups[key]) {
      groups[key] = {
        studentPrefix,
        baseFeeHead,
        months: [],
        amount: 0,
        originalAmount: 0,
        discount: 0,
        balance: 0,
      };
    }

    if (month) {
      const monthLower = month.toLowerCase();
      const matchedMonth = MONTHS_LOWER_LIST.find((m) => monthLower.includes(m));
      if (matchedMonth) {
        const capMonth = matchedMonth.charAt(0).toUpperCase() + matchedMonth.slice(1);
        if (!groups[key].months.includes(capMonth)) {
          groups[key].months.push(capMonth);
        }
      }
    }

    groups[key].amount += item.amount;
    groups[key].originalAmount += item.originalAmount !== undefined ? item.originalAmount : item.amount;
    groups[key].discount += item.discount || 0;
    groups[key].balance += item.balance || 0;
  });

  return Object.values(groups).map((g) => {
    let baseParticular = formatCompactParticulars(g.baseFeeHead);
    if (g.months.length > 0) {
      if (g.months.length >= 3 && areMonthsConsecutive(g.months)) {
        const sorted = [...g.months].sort(
          (a, b) => ACADEMIC_MONTH_ORDER.indexOf(a) - ACADEMIC_MONTH_ORDER.indexOf(b)
        );
        baseParticular += ` (${sorted[0]} to ${sorted[sorted.length - 1]}) [${g.months.length} Months]`;
      } else {
        baseParticular += ` (${g.months.join(", ")})`;
      }
    }

    const finalName = g.studentPrefix ? `${g.studentPrefix}: ${baseParticular}` : baseParticular;

    return {
      name: finalName,
      studentPrefix: g.studentPrefix || undefined,
      baseParticular,
      amount: g.amount,
      originalAmount: g.originalAmount,
      discount: g.discount,
      balance: g.balance,
      months: g.months,
    };
  });
}

/**
 * Resolves student metadata (name, admissionNo, rollNo, classSection, fatherName)
 * for a receipt, seamlessly supporting both single-child and multi-child family payments.
 */
export function enrichReceiptWithStudentDetails(rec: any, students: any[]): any {
  if (!rec) return rec;
  const std = (students || []).find((s: any) => s.id === rec.studentId);
  const siblingStudents = (!std && rec.studentIds && Array.isArray(rec.studentIds))
    ? (students || []).filter((s: any) => rec.studentIds.includes(s.id))
    : [];

  let studentsList = rec.studentsList;
  if (!studentsList || !Array.isArray(studentsList) || studentsList.length === 0) {
    if (siblingStudents.length > 0) {
      studentsList = siblingStudents.map((s: any) => ({
        id: s.id,
        name: s.name,
        classSection: s.classSection || (s.class ? `${s.class}-${s.section || "A"}` : ""),
        rollNo: s.rollNo || s.rollNumber || "",
        admissionNo: s.admissionNo || s.admissionNumber || "",
      }));
    } else if (std) {
      studentsList = [
        {
          id: std.id,
          name: std.name,
          classSection: std.classSection || (std.class ? `${std.class}-${std.section || "A"}` : ""),
          rollNo: std.rollNo || std.rollNumber || "",
          admissionNo: std.admissionNo || std.admissionNumber || "",
        },
      ];
    }
  }

  const resolvedAdmissionNo =
    rec.admissionNo ||
    (std
      ? (std.admissionNo || std.admissionNumber)
      : (siblingStudents.length > 0
          ? siblingStudents.map((s: any) => s.admissionNo || s.admissionNumber).filter(Boolean).join(", ")
          : "Unified/Family"));

  const resolvedClassSection =
    rec.classSection ||
    (std
      ? (std.classSection || (std.class ? `${std.class}-${std.section || "A"}` : ""))
      : (siblingStudents.length > 0
          ? Array.from(
              new Set(
                siblingStudents
                  .map((s: any) => s.classSection || (s.class ? `${s.class}-${s.section || "A"}` : ""))
                  .filter(Boolean)
              )
            ).join(", ")
          : ""));

  const resolvedRollNo =
    rec.rollNumber ||
    rec.rollNo ||
    (std
      ? (std.rollNo || std.rollNumber)
      : (siblingStudents.length > 0
          ? siblingStudents.map((s: any) => s.rollNo || s.rollNumber).filter(Boolean).join(", ")
          : ""));

  const resolvedFatherName =
    rec.fatherName ||
    std?.fatherName ||
    std?.parentName ||
    siblingStudents.find((s: any) => s.fatherName || s.parentName)?.fatherName ||
    siblingStudents[0]?.parentName ||
    "";

  return {
    ...rec,
    studentsList,
    admissionNo: resolvedAdmissionNo,
    classSection: resolvedClassSection,
    rollNumber: resolvedRollNo,
    rollNo: resolvedRollNo,
    fatherName: resolvedFatherName,
    subtotal: rec.subtotal || rec.amount,
    discount: rec.discount || 0,
    arrears: rec.arrears || 0,
    amountInWords: rec.amountInWords || numberToIndianWords(rec.amount),
  };
}

/**
 * Institutional secret key used to generate non-linear, unguessable cryptographic tokens
 * for public QR verification URLs. Prevents IDOR enumeration (changing REC-2026-00093 to 00090).
 */
const RECEIPT_VERIFY_SECRET = "ST_GNG_INSTITUTIONAL_LEDGER_SECURITY_KEY_2026_@#!";

export function generateReceiptSecurityToken(receiptNoOrId: string): string {
  const cleanId = (receiptNoOrId || "").trim().toUpperCase();
  if (!cleanId) return "";

  let h1 = 0x811c9dc5 ^ 0x5bd1e995;
  let h2 = 0x27d4eb2f ^ 0x1b873593;
  const input = `${cleanId}:${RECEIPT_VERIFY_SECRET}:${cleanId.length}`;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ code, 1099511627);
    h1 ^= h2 >>> 13;
    h2 ^= h1 << 16;
  }

  h1 = Math.imul(h1 ^ (h1 >>> 15), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h1 ^= h2;

  const p1 = (h1 >>> 0).toString(36).toUpperCase().padStart(5, "0");
  const p2 = (h2 >>> 0).toString(36).toUpperCase().padStart(5, "0");
  return (p1 + p2).slice(0, 10);
}

export function isValidReceiptSecurityToken(
  receiptNo: string,
  token: string,
  manualReceiptNo?: string | null
): boolean {
  if (!token) return false;
  const cleanToken = token.trim().toUpperCase();

  if (receiptNo && generateReceiptSecurityToken(receiptNo) === cleanToken) {
    return true;
  }
  if (manualReceiptNo && generateReceiptSecurityToken(manualReceiptNo) === cleanToken) {
    return true;
  }
  return false;
}

