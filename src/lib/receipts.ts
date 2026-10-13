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
    let rawName = rec.studentName.trim();
    if (rawName.startsWith("Family (Siblings:") || rawName.startsWith("Family (")) {
      rawName = rawName.replace(/^Family\s*\((?:Siblings:\s*)?/i, "").replace(/\)$/, "").trim();
    }
    const names = rawName.split(",").map((s: string) => s.trim()).filter(Boolean);
    const classes = (rec.classSection || "").split(",").map((s: string) => s.trim());
    const rolls = (rec.rollNumber || rec.rollNo || "").split(",").map((s: string) => s.trim());
    const admissions = (rec.admissionNo || "").split(",").map((s: string) => s.trim());

    return names.map((name: string, i: number) => ({
      name,
      classSection: classes[i] && classes[i] !== "Unified Family" ? classes[i] : (classes[0] !== "Unified Family" ? classes[0] : "—"),
      rollNo: rolls[i] || rolls[0] || "—",
      admissionNo: admissions[i] && !admissions[i].startsWith("FAM-") ? admissions[i] : "—",
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
    let months: string[] = [];
    const monthRegex = new RegExp(`\\b(${MONTHS_LOWER_LIST.join("|")})\\b`, "gi");
    const monthMatches = [...rest.matchAll(monthRegex)];
    const monthCountMatch = rest.match(/\[(\d+)\s+Months?\]/i);
    const monthCount = monthCountMatch ? Number(monthCountMatch[1]) : 0;
    if (monthMatches.length > 0 && monthMatches[0].index !== undefined) {
      months = monthMatches.map((match) => match[0]);
      baseFeeHead = rest
        .slice(0, monthMatches[0].index)
        .replace(/[\s\-–(:]+$/, "")
        .replace(/\s+-\s+Exam$/i, "")
        .trim();
    }

    return { rawName, studentPrefix, baseFeeHead, months, monthCount, rest };
  };

  // Otherwise, group consolidated rows
  const groups: {
    [key: string]: {
      studentPrefix: string;
      baseFeeHead: string;
      months: string[];
      monthCount: number;
      amount: number;
      originalAmount: number;
      discount: number;
      balance: number;
    };
  } = {};

  items.forEach((item) => {
    const { studentPrefix, baseFeeHead, months, monthCount } = parseItemName(item);
    const key = `${studentPrefix}||${baseFeeHead}`;

    if (!groups[key]) {
      groups[key] = {
        studentPrefix,
        baseFeeHead,
        months: [],
        monthCount: 0,
        amount: 0,
        originalAmount: 0,
        discount: 0,
        balance: 0,
      };
    }

    for (const month of months) {
      const monthLower = month.toLowerCase();
      const matchedMonth = MONTHS_LOWER_LIST.find((m) => monthLower.includes(m));
      if (matchedMonth) {
        const capMonth = matchedMonth.charAt(0).toUpperCase() + matchedMonth.slice(1);
        if (!groups[key].months.includes(capMonth)) {
          groups[key].months.push(capMonth);
        }
      }
    }
    groups[key].monthCount = Math.max(groups[key].monthCount, monthCount);

    groups[key].amount += item.amount;
    groups[key].originalAmount += item.originalAmount !== undefined ? item.originalAmount : item.amount;
    groups[key].discount += item.discount || 0;
    groups[key].balance += item.balance || 0;
  });

  const consolidated = Object.values(groups).map((g) => {
    let baseParticular = formatCompactParticulars(g.baseFeeHead);
    if (g.months.length > 0) {
      const sorted = [...g.months].sort(
          (a, b) => ACADEMIC_MONTH_ORDER.indexOf(a) - ACADEMIC_MONTH_ORDER.indexOf(b)
      );
      const hasConsecutiveRange = areMonthsConsecutive(sorted) && sorted.length >= 3;
      const matchesExplicitRange = g.monthCount >= 2 && sorted.length >= 2 &&
        ACADEMIC_MONTH_ORDER.indexOf(sorted[sorted.length - 1]) - ACADEMIC_MONTH_ORDER.indexOf(sorted[0]) === g.monthCount - 1;
      if (hasConsecutiveRange || matchesExplicitRange) {
        const count = g.monthCount || g.months.length;
        baseParticular += ` (${sorted[0]} to ${sorted[sorted.length - 1]}) [${count} Months]`;
      } else {
        baseParticular += ` (${sorted.join(", ")})`;
      }
    }

    const finalName = g.studentPrefix ? `${g.studentPrefix}: ${baseParticular}` : baseParticular;

    return {
      name: finalName,
      studentPrefix: g.studentPrefix || undefined,
      baseFeeHead: g.baseFeeHead,
      baseParticular,
      amount: g.amount,
      originalAmount: g.originalAmount,
      discount: g.discount,
      balance: g.balance,
      months: g.months,
    };
  });

  // Keep the exam names visible, while consolidating multiple exam charges for
  // the same child into one compact row. Tuition, M/S and previous-session dues
  // remain separate rows so the receipt stays easy to audit.
  const examGroups = new Map<string, { item: GroupedReceiptItem; examNames: Set<string> }>();
  const result: GroupedReceiptItem[] = [];
  for (const item of consolidated) {
    const { baseFeeHead = "", studentPrefix = "" } = item;
    if (!/\bexam\b/i.test(baseFeeHead)) {
      result.push(item);
      continue;
    }

    const key = `${studentPrefix}||exam-fees`;
    let group = examGroups.get(key);
    if (!group) {
      group = {
        item: {
          name: "",
          studentPrefix: studentPrefix || undefined,
          baseParticular: "",
          amount: 0,
          originalAmount: 0,
          discount: 0,
          balance: 0,
        },
        examNames: new Set<string>(),
      };
      examGroups.set(key, group);
      result.push(group.item);
    }

    const examName = baseFeeHead
      .replace(/\s*-\s*Exam$/i, "")
      .replace(/\bExam\b/gi, "")
      .replace(/[()]/g, "")
      .trim();
    if (examName) group.examNames.add(formatCompactParticulars(examName));
    group.item.amount += item.amount;
    group.item.originalAmount = (group.item.originalAmount || 0) + (item.originalAmount || 0);
    group.item.discount = (group.item.discount || 0) + (item.discount || 0);
    group.item.balance = (group.item.balance || 0) + (item.balance || 0);
  }

  for (const group of examGroups.values()) {
    const examNames = [...group.examNames];
    group.item.baseParticular = examNames.length
      ? `Exam Fees (${examNames.join(", ")})`
      : "Exam Fees";
    group.item.name = group.item.studentPrefix
      ? `${group.item.studentPrefix}: ${group.item.baseParticular}`
      : group.item.baseParticular;
  }

  return result;
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

  // Cross-enrich studentsList with the student directory to guarantee full rollNo, classSection, admissionNo
  if (Array.isArray(studentsList) && studentsList.length > 0 && Array.isArray(students) && students.length > 0) {
    studentsList = studentsList.map((entry: any) => {
      const matched = students.find(
        (s: any) =>
          (entry.id && s.id === entry.id) ||
          (entry.admissionNo && (s.admissionNo === entry.admissionNo || s.admissionNumber === entry.admissionNo)) ||
          (entry.name && s.name && s.name.trim().toLowerCase() === entry.name.trim().toLowerCase())
      );
      if (!matched) return entry;
      return {
        id: entry.id || matched.id,
        name: matched.name || entry.name,
        classSection:
          (entry.classSection && entry.classSection !== "Unified Family" && entry.classSection !== "—" && entry.classSection !== "-")
            ? entry.classSection
            : matched.classSection || (matched.class ? `${matched.class}-${matched.section || "A"}` : ""),
        rollNo:
          (entry.rollNo && entry.rollNo !== "—" && entry.rollNo !== "-")
            ? entry.rollNo
            : matched.rollNo || matched.rollNumber || "",
        admissionNo:
          (entry.admissionNo && entry.admissionNo !== "—" && entry.admissionNo !== "-" && !entry.admissionNo.startsWith("FAM-"))
            ? entry.admissionNo
            : matched.admissionNo || matched.admissionNumber || "",
      };
    });
  }

  const resolvedAdmissionNo =
    (rec.admissionNo && !rec.admissionNo.startsWith("FAM-") && rec.admissionNo !== "Multi" && rec.admissionNo !== "Unified/Family")
      ? rec.admissionNo
      : (std
          ? (std.admissionNo || std.admissionNumber)
          : (Array.isArray(studentsList) && studentsList.length > 0
              ? studentsList.map((s: any) => s.admissionNo).filter(Boolean).join(", ")
              : (siblingStudents.length > 0
                  ? siblingStudents.map((s: any) => s.admissionNo || s.admissionNumber).filter(Boolean).join(", ")
                  : "Unified/Family")));

  const resolvedClassSection =
    (rec.classSection && rec.classSection !== "Unified Family")
      ? rec.classSection
      : (std
          ? (std.classSection || (std.class ? `${std.class}-${std.section || "A"}` : ""))
          : (Array.isArray(studentsList) && studentsList.length > 0
              ? Array.from(new Set(studentsList.map((s: any) => s.classSection).filter(Boolean))).join(", ")
              : (siblingStudents.length > 0
                  ? Array.from(
                      new Set(
                        siblingStudents
                          .map((s: any) => s.classSection || (s.class ? `${s.class}-${s.section || "A"}` : ""))
                          .filter(Boolean)
                      )
                    ).join(", ")
                  : "")));

  const resolvedRollNo =
    rec.rollNumber ||
    rec.rollNo ||
    (std
      ? (std.rollNo || std.rollNumber)
      : (Array.isArray(studentsList) && studentsList.length > 0
          ? studentsList.map((s: any) => s.rollNo).filter(Boolean).join(", ")
          : (siblingStudents.length > 0
              ? siblingStudents.map((s: any) => s.rollNo || s.rollNumber).filter(Boolean).join(", ")
              : "")));

  const resolvedFatherName =
    rec.fatherName ||
    std?.fatherName ||
    std?.parentName ||
    (Array.isArray(studentsList) && studentsList.length > 0
      ? students.find((s: any) => studentsList.some((sl: any) => sl.id === s.id))?.fatherName
      : undefined) ||
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

