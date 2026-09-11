import * as XLSX from "xlsx";
import { MockStudent, MockDueItem, MockSchoolInfo } from "@/context/AuthContext";
import { toRupees } from "@/lib/currency";
import { formatCanonicalDOB } from "@/lib/dateUtils";

/**
 * Formats a calendar date strictly in Asia/Kolkata (IST) into DD-MM-YYYY format.
 * Prevents UTC drift and invalid date errors.
 */
export function formatExcelNumericDate(dateVal: any): string {
  if (!dateVal) return "-";
  try {
    const str = String(dateVal).trim();
    if (!str) return "-";

    // Handle DD-MMM-YYYY or YYYY-MM-DD or ISO strings
    const d = new Date(str);
    if (isNaN(d.getTime())) {
      return str;
    }

    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // en-IN returns "DD/MM/YYYY" -> replace "/" with "-"
    return formatter.format(d).replace(/\//g, "-");
  } catch {
    return String(dateVal || "-");
  }
}

export interface ExportStudentDirectoryOptions {
  students: (MockStudent | any)[];
  allStudents?: (MockStudent | any)[];
  dueItems?: MockDueItem[];
  schoolInfo?: MockSchoolInfo;
  fileNamePrefix?: string;
  filterDescription?: string;
  useServerFirst?: boolean;
}

/**
 * Attempts to download authoritative server-side student export
 */
export async function downloadServerStudentExport({
  format = "xlsx",
  selectedClass = "All",
  searchQuery = "",
  status = "ALL",
}: {
  format?: "xlsx" | "csv";
  selectedClass?: string;
  searchQuery?: string;
  status?: string;
}): Promise<void> {
  const params = new URLSearchParams();
  params.set("type", "directory");
  params.set("format", format);
  if (selectedClass && selectedClass !== "All") params.set("selectedClass", selectedClass);
  if (searchQuery) params.set("search", searchQuery);
  if (status && status !== "ALL") params.set("status", status);

  const res = await fetch(`/api/export?${params.toString()}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: "Export failed on server." }));
    throw new Error(errData.error || "Export failed on server.");
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("Content-Disposition");
  let filename = `Student_Directory_${new Date().toISOString().split("T")[0]}.${format}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  if (typeof window !== "undefined") {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Generates and downloads the comprehensive Student Directory Excel file (.xlsx)
 * with Master Directory sheet, Class-Wise Summary, and Family Groups Index.
 */
export function exportStudentDirectoryXLS({
  students,
  allStudents,
  dueItems = [],
  schoolInfo,
  fileNamePrefix = "Student_Directory",
  filterDescription = "All_Students",
  useServerFirst = false,
}: ExportStudentDirectoryOptions) {
  // Try server-side export first if enabled and exporting all students
  if (useServerFirst && filterDescription === "All_Students") {
    downloadServerStudentExport({ format: "xlsx" }).catch((err) => {
      console.warn("Server student export fallback triggered:", err);
      // Client-side fallback continues below
    });
  }

  // Pre-calculate dues map by studentId
  const duesMap = new Map<string, { totalFee: number; totalPaid: number; totalDisc: number }>();
  for (const d of dueItems) {
    if (!d.studentId) continue;
    const existing = duesMap.get(d.studentId) || { totalFee: 0, totalPaid: 0, totalDisc: 0 };
    existing.totalFee += (d.originalAmount || d.amount || 0);
    existing.totalPaid += (d.totalPaid || 0);
    existing.totalDisc += (d.totalDiscount || 0);
    duesMap.set(d.studentId, existing);
  }

  // Sort students: Class -> Section -> Roll No / Admission No -> Name
  const sortedStudents = students.slice().sort((a, b) => {
    const classComp = (a.class || "").localeCompare(b.class || "", undefined, { numeric: true });
    if (classComp !== 0) return classComp;
    const secComp = (a.section || "").localeCompare(b.section || "");
    if (secComp !== 0) return secComp;
    const rollA = parseInt(a.rollNo || a.rollNumber || "0") || 0;
    const rollB = parseInt(b.rollNo || b.rollNumber || "0") || 0;
    if (rollA && rollB) return rollA - rollB;
    return (a.name || "").localeCompare(b.name || "");
  });

  // ── 1. MASTER STUDENT DIRECTORY SHEET ROWS ──
  const directoryRows = sortedStudents.map((s, idx) => {
    const roll = s.rollNo || s.rollNumber || "-";
    const admissionNo = s.admissionNo || s.admissionNumber || "-";
    const classVal = s.class || "-";
    const sectionVal = s.section || "-";
    const classSec = `${classVal}-${sectionVal}`;
    const statusVal = s.status || "ACTIVE";
    const isRteVal = s.isRte ? "RTE (100% Waiver)" : "Standard";

    // Format dates cleanly
    const rawDob = s.dob || s.dobDisplay;
    const dobNumeric = formatExcelNumericDate(rawDob);
    const dobText = formatCanonicalDOB(rawDob) || dobNumeric;

    const rawAdmDate = s.admissionDate || s.admissionDateDisplay;
    const admDateNumeric = formatExcelNumericDate(rawAdmDate);

    // Dues calculation
    const feeInfo = duesMap.get(s.id);
    const totalFeeRs = feeInfo ? toRupees(feeInfo.totalFee) : 0;
    const totalPaidRs = feeInfo ? toRupees(feeInfo.totalPaid) : 0;
    const totalDiscRs = feeInfo ? toRupees(feeInfo.totalDisc) : 0;
    const remainingDueRs = Math.max(0, totalFeeRs - totalPaidRs - totalDiscRs);

    let feeStatus = "NO RECORD";
    if (feeInfo && totalFeeRs > 0) {
      if (remainingDueRs <= 0) {
        feeStatus = "CLEARED";
      } else if (totalPaidRs > 0) {
        feeStatus = "PARTIALLY PAID";
      } else {
        feeStatus = "UNPAID";
      }
    }

    return {
      "S.No.": idx + 1,
      "Admission No": admissionNo,
      "Roll No": roll,
      "Student Name": s.name || "-",
      "Class": classVal,
      "Section": sectionVal,
      "Class & Section": classSec,
      "Gender": s.gender || "-",
      "Date of Birth (DD-MM-YYYY)": dobNumeric,
      "DOB (Readable)": dobText,
      "Admission Date (DD-MM-YYYY)": admDateNumeric,
      "Status": statusVal,
      "Category": s.category || "General",
      "Billing Type / RTE": isRteVal,
      "Father Name": s.fatherName || s.parentName || "-",
      "Father Mobile": s.fatherMobile || s.parentPhone || "-",
      "Mother Name": s.motherName || "-",
      "Mother Mobile": s.motherMobile || "-",
      "Student Aadhaar": s.aadhaar ? `'${s.aadhaar}` : "-",
      "Father Aadhaar": s.fatherAadhaar ? `'${s.fatherAadhaar}` : "-",
      "Mother Aadhaar": s.motherAadhaar ? `'${s.motherAadhaar}` : "-",
      "Family ID": s.familyCode || "-",
      "Address": s.address || "-",
      "Parent Email": s.parentEmail || "-",
      "Religion": s.religion || "-",
      "Mother Tongue": s.motherTongue || "-",
      "Nationality": s.nationality || "Indian",
      "Disability / Special Needs": s.disability || "None",
      "Parent Occupation": s.parentOccupation || "-",
      "Annual Family Income": s.familyIncome || "-",
      "Emergency Contact Person": s.emergencyName || "-",
      "Emergency Contact Phone": s.emergencyPhone || "-",
      "Transport Mode": s.transportMode || "Self",
      "Bus Route": s.busRoute || "-",
      "Bus Stop": s.busStop || "-",
      "Previous School": s.prevSchoolName || "-",
      "Previous Class Passed": s.prevClassPassed || "-",
      "TC Number": s.tcNumber || "-",
      "Board Reg No": s.boardRegNo || "-",
      "Total Fee (₹)": totalFeeRs,
      "Total Paid (₹)": totalPaidRs,
      "Total Concession (₹)": totalDiscRs,
      "Remaining Due (₹)": remainingDueRs,
      "Fee Status": feeStatus,
    };
  });

  // ── 2. CLASS-WISE SUMMARY SHEET ROWS ──
  const classMap = new Map<string, any[]>();
  for (const s of sortedStudents) {
    const key = `${s.class}-${s.section}`;
    if (!classMap.has(key)) classMap.set(key, []);
    classMap.get(key)!.push(s);
  }

  const classSummaryRows = Array.from(classMap.entries()).map(([clsKey, classStdList], idx) => {
    let boys = 0;
    let girls = 0;
    let rte = 0;
    let active = 0;
    let left = 0;
    let generalCat = 0;
    let obcCat = 0;
    let scCat = 0;
    let stCat = 0;
    let clsFee = 0;
    let clsPaid = 0;
    let clsDue = 0;

    for (const std of classStdList) {
      const g = (std.gender || "").toLowerCase();
      if (g.startsWith("f") || g === "girl") girls++;
      else if (g.startsWith("m") || g === "boy") boys++;

      if (std.isRte) rte++;

      const st = std.status || "ACTIVE";
      if (st === "ACTIVE") active++;
      else left++;

      const cat = (std.category || "General").toUpperCase();
      if (cat === "OBC") obcCat++;
      else if (cat === "SC") scCat++;
      else if (cat === "ST") stCat++;
      else generalCat++;

      const fInfo = duesMap.get(std.id);
      if (fInfo) {
        const fee = toRupees(fInfo.totalFee);
        const paid = toRupees(fInfo.totalPaid);
        const disc = toRupees(fInfo.totalDisc);
        const due = Math.max(0, fee - paid - disc);
        clsFee += fee;
        clsPaid += paid;
        clsDue += due;
      }
    }

    return {
      "S.No.": idx + 1,
      "Class & Section": clsKey,
      "Total Enrolled": classStdList.length,
      "Active Students": active,
      "Left / Suspended": left,
      "Boys (Male)": boys,
      "Girls (Female)": girls,
      "RTE Students": rte,
      "General Category": generalCat,
      "OBC Category": obcCat,
      "SC Category": scCat,
      "ST Category": stCat,
      "Total Demanded (₹)": clsFee,
      "Total Collected (₹)": clsPaid,
      "Total Pending Dues (₹)": clsDue,
    };
  });

  // ── 3. FAMILY GROUPS INDEX ROWS ──
  const familyMap = new Map<string, any[]>();
  for (const s of sortedStudents) {
    const fCode = s.familyCode || "NO_FAMILY_CODE";
    if (!familyMap.has(fCode)) familyMap.set(fCode, []);
    familyMap.get(fCode)!.push(s);
  }

  const familyRows = Array.from(familyMap.entries()).map(([fCode, fStudents], idx) => {
    const first = fStudents[0];
    const childrenList = fStudents.map((c) => `${c.name} (${c.class}-${c.section})`).join(", ");

    return {
      "S.No.": idx + 1,
      "Family ID": fCode,
      "Father / Guardian Name": first.fatherName || first.parentName || "-",
      "Mobile Phone": first.fatherMobile || first.parentPhone || "-",
      "Enrolled Children Count": fStudents.length,
      "Children & Classes": childrenList,
      "Address": first.address || "-",
    };
  });

  // Build Workbook
  const wb = XLSX.utils.book_new();
  const wsDirectory = XLSX.utils.json_to_sheet(directoryRows);
  const wsClassSummary = XLSX.utils.json_to_sheet(classSummaryRows);
  const wsFamilies = XLSX.utils.json_to_sheet(familyRows);

  // Auto-fit column widths
  const setColWidths = (ws: XLSX.WorkSheet, data: any[]) => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const colWidths: { [key: string]: number } = {};

    for (const k of keys) {
      colWidths[k] = Math.max(k.length, 10);
    }

    for (const row of data) {
      for (const k of keys) {
        const valStr = String(row[k] ?? "");
        colWidths[k] = Math.max(colWidths[k], Math.min(valStr.length, 45));
      }
    }

    ws["!cols"] = keys.map((k) => ({ wch: colWidths[k] + 3 }));
  };

  setColWidths(wsDirectory, directoryRows);
  setColWidths(wsClassSummary, classSummaryRows);
  setColWidths(wsFamilies, familyRows);

  // Append Sheets
  XLSX.utils.book_append_sheet(wb, wsDirectory, "Student Directory");
  XLSX.utils.book_append_sheet(wb, wsClassSummary, "Class-Wise Summary");
  XLSX.utils.book_append_sheet(wb, wsFamilies, "Family Groups");

  // Output filename
  const dateStr = new Date().toISOString().split("T")[0];
  const safeSchoolName = (schoolInfo?.name || "School").replace(/[^a-zA-Z0-9]/g, "_");
  const safeTag = filterDescription.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${safeSchoolName}_Student_Directory_${safeTag}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Generates and downloads the Student Directory as a CSV file (.csv)
 */
export function exportStudentDirectoryCSV({
  students,
  dueItems = [],
  schoolInfo,
  fileNamePrefix = "Student_Directory",
  filterDescription = "All_Students",
}: ExportStudentDirectoryOptions) {
  const duesMap = new Map<string, { totalFee: number; totalPaid: number; totalDisc: number }>();
  for (const d of dueItems) {
    if (!d.studentId) continue;
    const existing = duesMap.get(d.studentId) || { totalFee: 0, totalPaid: 0, totalDisc: 0 };
    existing.totalFee += (d.originalAmount || d.amount || 0);
    existing.totalPaid += (d.totalPaid || 0);
    existing.totalDisc += (d.totalDiscount || 0);
    duesMap.set(d.studentId, existing);
  }

  const rows = students.map((s, idx) => {
    const rawDob = s.dob || s.dobDisplay;
    const dobNumeric = formatExcelNumericDate(rawDob);
    const rawAdmDate = s.admissionDate || s.admissionDateDisplay;
    const admDateNumeric = formatExcelNumericDate(rawAdmDate);

    const feeInfo = duesMap.get(s.id);
    const totalFeeRs = feeInfo ? toRupees(feeInfo.totalFee) : 0;
    const totalPaidRs = feeInfo ? toRupees(feeInfo.totalPaid) : 0;
    const remainingDueRs = Math.max(0, totalFeeRs - totalPaidRs);

    return {
      "S.No.": idx + 1,
      "Admission No": s.admissionNo || s.admissionNumber || "-",
      "Roll No": s.rollNo || s.rollNumber || "-",
      "Student Name": s.name || "-",
      "Class": s.class || "-",
      "Section": s.section || "-",
      "Gender": s.gender || "-",
      "Date of Birth": dobNumeric,
      "Admission Date": admDateNumeric,
      "Status": s.status || "ACTIVE",
      "Category": s.category || "General",
      "Billing Type": s.isRte ? "RTE" : "Standard",
      "Father Name": s.fatherName || s.parentName || "-",
      "Father Mobile": s.fatherMobile || s.parentPhone || "-",
      "Mother Name": s.motherName || "-",
      "Mother Mobile": s.motherMobile || "-",
      "Aadhaar": s.aadhaar || "-",
      "Family ID": s.familyCode || "-",
      "Address": s.address || "-",
      "Remaining Due (Rs)": remainingDueRs,
      "Fee Status": remainingDueRs <= 0 ? "CLEARED" : "DUE",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });

  const dateStr = new Date().toISOString().split("T")[0];
  const safeSchoolName = (schoolInfo?.name || "School").replace(/[^a-zA-Z0-9]/g, "_");
  const safeTag = filterDescription.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${safeSchoolName}_Student_Directory_${safeTag}_${dateStr}.csv`;

  if (typeof window !== "undefined") {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
