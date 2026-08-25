import * as XLSX from "xlsx";
import { MockStudent, MockDueItem, MockReceipt, MockSchoolInfo } from "@/context/AuthContext";
import { isDueUpToCurrentMonth } from "@/lib/whatsapp";
import { toRupees } from "@/lib/currency";

const ACADEMIC_MONTHS = [
  { key: "april", label: "April" },
  { key: "may", label: "May" },
  { key: "june", label: "June" },
  { key: "july", label: "July" },
  { key: "august", label: "August" },
  { key: "september", label: "September" },
  { key: "october", label: "October" },
  { key: "november", label: "November" },
  { key: "december", label: "December" },
  { key: "january", label: "January" },
  { key: "february", label: "February" },
  { key: "march", label: "March" },
];

export interface ExportFeeOptions {
  students: MockStudent[];
  dueItems: MockDueItem[];
  receipts: MockReceipt[];
  schoolInfo?: MockSchoolInfo;
  selectedClass?: string;
  searchQuery?: string;
  onlyDefaulters?: boolean;
}

/**
 * Calculates a clean description of which month a student is paid up to.
 */
function getPaidUpToMonth(studentDues: MockDueItem[]): string {
  if (!studentDues || studentDues.length === 0) return "No Fee Structure";

  const monthStatus: { [key: string]: { isPaid: boolean; hasItem: boolean } } = {};
  for (const m of ACADEMIC_MONTHS) {
    const item = studentDues.find((d) => d.name.toLowerCase().includes(m.key) && !d.name.toLowerCase().includes("exam"));
    if (item) {
      const isPaid = item.status === "PAID" || item.amount <= 0;
      monthStatus[m.key] = { isPaid, hasItem: true };
    }
  }

  // Count consecutive paid months starting from April
  let consecutivePaidCount = 0;
  for (let i = 0; i < ACADEMIC_MONTHS.length; i++) {
    const m = ACADEMIC_MONTHS[i];
    if (monthStatus[m.key]?.hasItem && monthStatus[m.key]?.isPaid) {
      consecutivePaidCount++;
    } else {
      break;
    }
  }

  if (consecutivePaidCount === 12) {
    return "Full Year Cleared (All 12 Months)";
  }

  if (consecutivePaidCount > 0) {
    const lastPaidMonth = ACADEMIC_MONTHS[consecutivePaidCount - 1].label;
    const laterPaid = ACADEMIC_MONTHS.slice(consecutivePaidCount)
      .filter((m) => monthStatus[m.key]?.isPaid)
      .map((m) => m.label);

    if (laterPaid.length > 0) {
      return `Paid up to ${lastPaidMonth} (+ ${laterPaid.join(", ")})`;
    }
    return `Paid up to ${lastPaidMonth}`;
  }

  const anyPaidMonths = ACADEMIC_MONTHS.filter((m) => monthStatus[m.key]?.isPaid).map((m) => m.label);
  if (anyPaidMonths.length > 0) {
    return `Apr Unpaid (Paid: ${anyPaidMonths.join(", ")})`;
  }

  return "No Payment Recorded";
}

/**
 * Formats a fee charge status for an Excel cell.
 */
function formatHeadStatus(item?: MockDueItem): string {
  if (!item) return "-";
  const origRs = toRupees(item.originalAmount || item.amount);
  const paidRs = toRupees(item.totalPaid || 0);
  const dueRs = toRupees(item.amount);

  if (item.status === "PAID" || dueRs <= 0) {
    return `PAID (₹${paidRs || origRs})`;
  }
  if (paidRs > 0) {
    return `PARTIAL (Paid ₹${paidRs}, Due ₹${dueRs})`;
  }
  return `DUE (₹${dueRs})`;
}

/**
 * ── AD-05: Server-backed export downloader that queries /api/export
 */
export async function downloadServerExport({
  type = "register",
  format = "xlsx",
  selectedClass = "All",
  searchQuery = "",
  onlyDefaulters = false,
  studentId,
}: {
  type?: "register" | "statement";
  format?: "xlsx" | "csv";
  selectedClass?: string;
  searchQuery?: string;
  onlyDefaulters?: boolean;
  studentId?: string;
}): Promise<void> {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("format", format);
  if (selectedClass && selectedClass !== "All") params.set("selectedClass", selectedClass);
  if (searchQuery) params.set("search", searchQuery);
  if (onlyDefaulters) params.set("onlyDefaulters", "true");
  if (studentId) params.set("studentId", studentId);

  const res = await fetch(`/api/export?${params.toString()}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: "Export failed on server." }));
    throw new Error(errData.error || "Export failed on server.");
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("Content-Disposition");
  let filename = `Export_${new Date().toISOString().split("T")[0]}.${format}`;
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
 * Generates and downloads the comprehensive Master Fee Register Excel file (.xlsx)
 */
export function exportMasterFeeRegisterXLS({
  students,
  dueItems,
  receipts,
  schoolInfo,
  selectedClass = "All",
  searchQuery = "",
  onlyDefaulters = false,
}: ExportFeeOptions) {
  // ── AD-05: Attempt authoritative server-side export first ──
  downloadServerExport({
    type: "register",
    format: "xlsx",
    selectedClass,
    searchQuery,
    onlyDefaulters,
  }).catch((err) => {
    console.warn("Server export fallback triggered:", err);
    // Continue with client fallback if offline
  });

  // Pre-group dues by studentId
  const studentDuesMap = new Map<string, MockDueItem[]>();
  const studentReceiptsMap = new Map<string, MockReceipt[]>();

  for (const d of dueItems) {
    if (!studentDuesMap.has(d.studentId)) studentDuesMap.set(d.studentId, []);
    studentDuesMap.get(d.studentId)!.push(d);
  }

  for (const r of receipts) {
    if (r.studentId) {
      if (!studentReceiptsMap.has(r.studentId)) studentReceiptsMap.set(r.studentId, []);
      studentReceiptsMap.get(r.studentId)!.push(r);
    }
    if (r.studentIds && Array.isArray(r.studentIds)) {
      for (const sid of r.studentIds) {
        if (!studentReceiptsMap.has(sid)) studentReceiptsMap.set(sid, []);
        studentReceiptsMap.get(sid)!.push(r);
      }
    }
  }

  // Filter students if class or search applied
  const filteredStudents = students.filter((s) => {
    const sClassVal = `${s.class}-${s.section}`;
    const matchesClass = selectedClass === "All" || sClassVal === selectedClass;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.parentName && s.parentName.toLowerCase().includes(q)) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q));

    if (onlyDefaulters) {
      const sDues = studentDuesMap.get(s.id) || [];
      const hasUnpaidOverdue = sDues.some((d) => d.status === "UNPAID" && isDueUpToCurrentMonth(d));
      return matchesClass && matchesSearch && hasUnpaidOverdue;
    }

    return matchesClass && matchesSearch;
  });

  // Sort students logically: Class -> Section -> Roll No / Admission No / Name
  const sortedStudents = filteredStudents.slice().sort((a, b) => {
    const classComp = (a.class || "").localeCompare(b.class || "", undefined, { numeric: true });
    if (classComp !== 0) return classComp;
    const secComp = (a.section || "").localeCompare(b.section || "");
    if (secComp !== 0) return secComp;
    const rollA = parseInt(a.rollNo || "0") || 0;
    const rollB = parseInt(b.rollNo || "0") || 0;
    if (rollA && rollB) return rollA - rollB;
    return (a.name || "").localeCompare(b.name || "");
  });

  // 1. MASTER REGISTER ROWS (All Students)
  const masterRows = sortedStudents.map((std, idx) => {
    const allDues = (studentDuesMap.get(std.id) || []).slice().sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    const unpaidDues = allDues.filter((d) => d.status === "UNPAID" && isDueUpToCurrentMonth(d));
    const totalFeePaisa = allDues.reduce((sum, d) => sum + (d.originalAmount || d.amount), 0);
    const totalPaidPaisa = allDues.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
    const totalDiscountPaisa = allDues.reduce((sum, d) => sum + (d.totalDiscount || 0), 0);
    const fullYearRemainingPaisa = Math.max(0, totalFeePaisa - totalPaidPaisa - totalDiscountPaisa);
    const overdueTillNowPaisa = unpaidDues.reduce((sum, d) => sum + d.amount, 0);

    const stdReceipts = (studentReceiptsMap.get(std.id) || []).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const latestReceipt = stdReceipts[0];

    // Find each monthly tuition fee item
    const getMonthItem = (mKey: string) =>
      allDues.find(
        (d) =>
          d.name.toLowerCase().includes(`tuition fee - ${mKey}`) ||
          (d.name.toLowerCase().includes(mKey) && !d.name.toLowerCase().includes("exam"))
      );
    const msItem = allDues.find((d) => d.name.toLowerCase().includes("m/s") || d.name.toLowerCase().includes("annual"));
    const unit1Item = allDues.find((d) => d.name.toLowerCase().includes("unit 1"));
    const halfYearlyItem = allDues.find((d) => d.name.toLowerCase().includes("half yearly"));
    const unit2Item = allDues.find((d) => d.name.toLowerCase().includes("unit 2"));
    const yearlyItem = allDues.find((d) => d.name.toLowerCase().includes("yearly") && !d.name.toLowerCase().includes("half"));
    const prevSessionItem = allDues.find((d) => d.name.toLowerCase().includes("previous session"));

    const paidUpTo = getPaidUpToMonth(allDues);

    let overallStatus = "CLEARED";
    if (overdueTillNowPaisa > 0) {
      overallStatus = `OVERDUE (₹${toRupees(overdueTillNowPaisa)})`;
    } else if (fullYearRemainingPaisa > 0) {
      overallStatus = "PAID UP TO DATE";
    } else if (totalPaidPaisa > 0) {
      overallStatus = "FULL YEAR CLEARED";
    } else {
      overallStatus = "NO RECORD";
    }

    return {
      "S.No.": idx + 1,
      "Admission No": std.admissionNo || "-",
      "Roll No": std.rollNo || "-",
      "Class": std.class,
      "Section": std.section,
      "Class-Sec": `${std.class}-${std.section}`,
      "Student Name": std.name,
      "Father's Name": std.fatherName || std.parentName || "-",
      "Mobile No": std.fatherMobile || std.parentPhone || "-",
      "Family Code": std.familyCode || "-",
      "Total Annual Fee (₹)": toRupees(totalFeePaisa),
      "Total Paid (₹)": toRupees(totalPaidPaisa),
      "Total Discount (₹)": toRupees(totalDiscountPaisa),
      "Full Year Balance (₹)": toRupees(fullYearRemainingPaisa),
      "Overdue Till Date (₹)": toRupees(overdueTillNowPaisa),
      "Overall Status": overallStatus,
      "Paid Up To Month": paidUpTo,
      "April": formatHeadStatus(getMonthItem("april")),
      "May": formatHeadStatus(getMonthItem("may")),
      "June": formatHeadStatus(getMonthItem("june")),
      "July": formatHeadStatus(getMonthItem("july")),
      "August": formatHeadStatus(getMonthItem("august")),
      "September": formatHeadStatus(getMonthItem("september")),
      "October": formatHeadStatus(getMonthItem("october")),
      "November": formatHeadStatus(getMonthItem("november")),
      "December": formatHeadStatus(getMonthItem("december")),
      "January": formatHeadStatus(getMonthItem("january")),
      "February": formatHeadStatus(getMonthItem("february")),
      "March": formatHeadStatus(getMonthItem("march")),
      "M/S & Development": formatHeadStatus(msItem),
      "Unit 1 Exam": formatHeadStatus(unit1Item),
      "Half Yearly Exam": formatHeadStatus(halfYearlyItem),
      "Unit 2 Exam": formatHeadStatus(unit2Item),
      "Yearly Exam": formatHeadStatus(yearlyItem),
      "Previous Session Dues": formatHeadStatus(prevSessionItem),
      "Last Payment Date": latestReceipt?.createdAt || "-",
      "Last Receipt No": latestReceipt?.receiptNo || "-",
      "Last Paid Amount (₹)": latestReceipt ? toRupees(latestReceipt.amount) : 0,
      "Last Payment Mode": latestReceipt?.paymentMethod || "-",
      "Total Receipts Count": stdReceipts.length,
    };
  });

  // 2. DEFAULTERS ONLY ROWS
  const defaulterRows = sortedStudents
    .map((std) => {
      const allDues = studentDuesMap.get(std.id) || [];
      const unpaidDues = allDues.filter((d) => d.status === "UNPAID" && isDueUpToCurrentMonth(d));
      if (unpaidDues.length === 0) return null;

      const totalFeePaisa = allDues.reduce((sum, d) => sum + (d.originalAmount || d.amount), 0);
      const totalPaidPaisa = allDues.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
      const totalDiscountPaisa = allDues.reduce((sum, d) => sum + (d.totalDiscount || 0), 0);
      const fullYearRemainingPaisa = Math.max(0, totalFeePaisa - totalPaidPaisa - totalDiscountPaisa);
      const overdueTillNowPaisa = unpaidDues.reduce((sum, d) => sum + d.amount, 0);

      const unpaidHeadNames = unpaidDues.map((d) => `${d.name} (₹${toRupees(d.amount)})`).join(", ");
      const stdReceipts = (studentReceiptsMap.get(std.id) || []).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      const latestReceipt = stdReceipts[0];

      return {
        "Admission No": std.admissionNo || "-",
        "Roll No": std.rollNo || "-",
        "Class-Sec": `${std.class}-${std.section}`,
        "Student Name": std.name,
        "Father's Name": std.fatherName || std.parentName || "-",
        "Mobile Number": std.fatherMobile || std.parentPhone || "-",
        "Overdue Till Date (₹)": toRupees(overdueTillNowPaisa),
        "Full Year Remaining Due (₹)": toRupees(fullYearRemainingPaisa),
        "Total Fee (₹)": toRupees(totalFeePaisa),
        "Total Paid (₹)": toRupees(totalPaidPaisa),
        "Pending Fee Heads / Months": unpaidHeadNames,
        "Paid Up To Month": getPaidUpToMonth(allDues),
        "Last Payment Date": latestReceipt?.createdAt || "No Payment",
        "Last Receipt No": latestReceipt?.receiptNo || "-",
        "Family Code": std.familyCode || "-",
      };
    })
    .filter(Boolean)
    .map((row, idx) => ({ "S.No.": idx + 1, ...row }));

  // 3. RECEIPTS & COLLECTION HISTORY
  const receiptRows = receipts.map((r, idx) => {
    return {
      "S.No.": idx + 1,
      "Receipt No": r.receiptNo,
      "Date": r.createdAt,
      "Admission No": r.admissionNo || "-",
      "Student Name": r.studentName || "-",
      "Class & Section": r.classSection || "-",
      "Father's Name": r.fatherName || "-",
      "Amount Paid (₹)": toRupees(r.amount),
      "Payment Mode": r.paymentMethod || r.method || "CASH",
      "Transaction Ref": r.transactionRef || "-",
      "Particulars / Fee Items":
        r.details ||
        r.items?.map((i) => `${i.name} (₹${toRupees(i.amount)})`).join(", ") ||
        "-",
      "Collected By": r.collectedBy || "System",
    };
  });

  // 4. CLASS-WISE FINANCIAL SUMMARY
  const classList = Array.from(new Set(students.map((s) => `${s.class}-${s.section}`)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const classSummaryRows = classList.map((cls, idx) => {
    const classStudents = students.filter((s) => `${s.class}-${s.section}` === cls);
    let classTotalFee = 0;
    let classTotalPaid = 0;
    let classTotalDiscount = 0;
    let classOverdueTillDate = 0;
    let classRemainingFullYear = 0;
    let defaultersCount = 0;
    let clearedCount = 0;

    for (const std of classStudents) {
      const sDues = studentDuesMap.get(std.id) || [];
      const unpaidDues = sDues.filter((d) => d.status === "UNPAID" && isDueUpToCurrentMonth(d));
      const sTotalFee = sDues.reduce((sum, d) => sum + (d.originalAmount || d.amount), 0);
      const sTotalPaid = sDues.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
      const sTotalDiscount = sDues.reduce((sum, d) => sum + (d.totalDiscount || 0), 0);
      const sFullYearRemaining = Math.max(0, sTotalFee - sTotalPaid - sTotalDiscount);
      const sOverdue = unpaidDues.reduce((sum, d) => sum + d.amount, 0);

      classTotalFee += sTotalFee;
      classTotalPaid += sTotalPaid;
      classTotalDiscount += sTotalDiscount;
      classOverdueTillDate += sOverdue;
      classRemainingFullYear += sFullYearRemaining;

      if (sOverdue > 0) {
        defaultersCount++;
      } else {
        clearedCount++;
      }
    }

    const collectionRate = classTotalFee > 0 ? ((classTotalPaid / classTotalFee) * 100).toFixed(1) + "%" : "0%";

    return {
      "S.No.": idx + 1,
      "Class & Section": cls,
      "Total Students": classStudents.length,
      "Fully Cleared": clearedCount,
      "With Overdue": defaultersCount,
      "Total Fee Demanded (₹)": toRupees(classTotalFee),
      "Total Fee Collected (₹)": toRupees(classTotalPaid),
      "Total Concession (₹)": toRupees(classTotalDiscount),
      "Overdue Till Date (₹)": toRupees(classOverdueTillDate),
      "Full Year Remaining (₹)": toRupees(classRemainingFullYear),
      "Collection %": collectionRate,
    };
  });

  // Build the Excel workbook
  const wb = XLSX.utils.book_new();

  // Create worksheets
  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  const wsDefaulters = XLSX.utils.json_to_sheet(defaulterRows);
  const wsReceipts = XLSX.utils.json_to_sheet(receiptRows);
  const wsClassSummary = XLSX.utils.json_to_sheet(classSummaryRows);

  // Auto-fit column widths
  const setColWidths = (ws: XLSX.WorkSheet, data: any[]) => {
    if (!data || data.length === 0) return;
    const colWidths: { [key: string]: number } = {};
    const keys = Object.keys(data[0]);

    for (const k of keys) {
      colWidths[k] = Math.max(k.length, 10);
    }

    for (const row of data) {
      for (const k of keys) {
        const valStr = String(row[k] ?? "");
        colWidths[k] = Math.max(colWidths[k], Math.min(valStr.length, 50));
      }
    }

    ws["!cols"] = keys.map((k) => ({ wch: colWidths[k] + 3 }));
  };

  setColWidths(wsMaster, masterRows);
  setColWidths(wsDefaulters, defaulterRows as any[]);
  setColWidths(wsReceipts, receiptRows);
  setColWidths(wsClassSummary, classSummaryRows);

  // Append Sheets
  XLSX.utils.book_append_sheet(wb, wsMaster, "Master Fee Register");
  XLSX.utils.book_append_sheet(wb, wsDefaulters, "Dues & Defaulters");
  XLSX.utils.book_append_sheet(wb, wsReceipts, "Receipts Ledger");
  XLSX.utils.book_append_sheet(wb, wsClassSummary, "Class-Wise Summary");

  // Create clean filename with school name and timestamp
  const dateStr = new Date().toISOString().split("T")[0];
  const safeSchoolName = (schoolInfo?.name || "School").replace(/[^a-zA-Z0-9]/g, "_");
  const classTag =
    selectedClass && selectedClass !== "All"
      ? `_Class_${selectedClass.replace(/[^a-zA-Z0-9]/g, "_")}`
      : onlyDefaulters
      ? "_Defaulters_Only"
      : "_All_Students";
  const filename = `${safeSchoolName}_Fee_Master_Register${classTag}_${dateStr}.xlsx`;

  // Download directly
  XLSX.writeFile(wb, filename);
}

/**
 * Generates and downloads a single student's fee statement Excel file (.xlsx)
 */
export function exportSingleStudentStatementXLS({
  student,
  dueItems,
  receipts,
  schoolInfo,
}: {
  student: MockStudent;
  dueItems: MockDueItem[];
  receipts: MockReceipt[];
  schoolInfo?: MockSchoolInfo;
}) {
  const stdDues = dueItems
    .filter((d) => d.studentId === student.id)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const stdReceipts = receipts
    .filter(
      (r) =>
        r.studentId === student.id ||
        r.studentIds?.includes(student.id) ||
        r.admissionNo === student.admissionNo
    )
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const duesRows = stdDues.map((d, idx) => {
    const origRs = toRupees(d.originalAmount || d.amount);
    const paidRs = toRupees(d.totalPaid || 0);
    const discRs = toRupees(d.totalDiscount || 0);
    const dueRs = toRupees(d.amount);

    return {
      "S.No.": idx + 1,
      "Fee Description / Head": d.name,
      "Due Date": d.dueDate || "-",
      "Fee Amount (₹)": origRs,
      "Paid Amount (₹)": paidRs,
      "Discount / Concession (₹)": discRs,
      "Remaining Due (₹)": dueRs,
      "Status": d.status === "PAID" || dueRs <= 0 ? "PAID" : paidRs > 0 ? "PARTIALLY PAID" : "UNPAID",
      "Overdue Currently": d.status === "UNPAID" && isDueUpToCurrentMonth(d) ? "YES (OVERDUE)" : "NO",
    };
  });

  const receiptsRows = stdReceipts.map((r, idx) => {
    return {
      "S.No.": idx + 1,
      "Receipt No": r.receiptNo,
      "Date": r.createdAt,
      "Amount Paid (₹)": toRupees(r.amount),
      "Payment Mode": r.paymentMethod || r.method || "CASH",
      "Transaction Ref": r.transactionRef || "-",
      "Particulars Covered":
        r.details ||
        r.items?.map((i) => `${i.name} (₹${toRupees(i.amount)})`).join(", ") ||
        "-",
      "Collected By": r.collectedBy || "System",
    };
  });

  const wb = XLSX.utils.book_new();
  const wsDues = XLSX.utils.json_to_sheet(duesRows);
  const wsReceipts = XLSX.utils.json_to_sheet(receiptsRows);

  XLSX.utils.book_append_sheet(wb, wsDues, "Fee Ledger & Dues");
  XLSX.utils.book_append_sheet(wb, wsReceipts, "Payment Receipts");

  const dateStr = new Date().toISOString().split("T")[0];
  const safeName = student.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Fee_Statement_${safeName}_ADM_${student.admissionNo || "NA"}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * ── AD-05: Generates and downloads the Fee Register as a standard CSV file (.csv)
 */
export function exportFeeRegisterCSV(options: ExportFeeOptions) {
  // ── AD-05: Attempt authoritative server-side export first ──
  downloadServerExport({
    type: "register",
    format: "csv",
    selectedClass: options.selectedClass,
    searchQuery: options.searchQuery,
    onlyDefaulters: options.onlyDefaulters,
  }).catch((err) => {
    console.warn("Server export fallback triggered:", err);
  });

  const { students, dueItems, receipts, schoolInfo, selectedClass, onlyDefaulters } = options;

  const rows = students
    .filter((s) => !selectedClass || selectedClass === "All" || s.class === selectedClass)
    .map((s, idx) => {
      const sDues = dueItems.filter((d) => d.studentId === s.id);
      const totalDue = sDues.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalPaid = sDues.reduce((sum, d) => sum + (d.totalPaid || 0), 0);
      const isClear = totalDue <= 0;
      return {
        "S.No.": idx + 1,
        "Student Name": s.name,
        "Admission No": s.admissionNo,
        "Class": s.class,
        "Section": s.section || "",
        "Father Name": s.fatherName || "",
        "Father Mobile": s.fatherMobile || "",
        "Total Fee (Rs)": toRupees(totalDue + totalPaid),
        "Paid Amount (Rs)": toRupees(totalPaid),
        "Remaining Due (Rs)": toRupees(totalDue),
        "Status": isClear ? "CLEAR" : "DUE",
        "Paid Up To": getPaidUpToMonth(sDues),
      };
    });

  const filtered = onlyDefaulters ? rows.filter((r) => r.Status === "DUE") : rows;
  const ws = XLSX.utils.json_to_sheet(filtered);
  const csvOutput = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });

  const dateStr = new Date().toISOString().split("T")[0];
  const safeSchoolName = (schoolInfo?.name || "School").replace(/[^a-zA-Z0-9]/g, "_");
  const classTag =
    selectedClass && selectedClass !== "All"
      ? `_Class_${selectedClass.replace(/[^a-zA-Z0-9]/g, "_")}`
      : onlyDefaulters
      ? "_Defaulters_Only"
      : "_All_Students";
  const filename = `${safeSchoolName}_Fee_Register${classTag}_${dateStr}.csv`;

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
 * ── AD-05: Generates and downloads a single student's fee statement CSV file (.csv)
 */
export function exportSingleStudentStatementCSV({
  student,
  dueItems,
  receipts,
  schoolInfo,
}: {
  student: MockStudent;
  dueItems: MockDueItem[];
  receipts: MockReceipt[];
  schoolInfo?: MockSchoolInfo;
}) {
  const stdDues = dueItems
    .filter((d) => d.studentId === student.id)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const duesRows = stdDues.map((d, idx) => {
    const origRs = toRupees(d.originalAmount || d.amount);
    const paidRs = toRupees(d.totalPaid || 0);
    const discRs = toRupees(d.totalDiscount || 0);
    const dueRs = toRupees(d.amount);

    return {
      "S.No.": idx + 1,
      "Fee Description / Head": d.name,
      "Due Date": d.dueDate || "-",
      "Fee Amount (Rs)": origRs,
      "Paid Amount (Rs)": paidRs,
      "Discount / Concession (Rs)": discRs,
      "Remaining Due (Rs)": dueRs,
      "Status": d.status === "PAID" || dueRs <= 0 ? "PAID" : paidRs > 0 ? "PARTIALLY PAID" : "UNPAID",
      "Overdue Currently": d.status === "UNPAID" && isDueUpToCurrentMonth(d) ? "YES (OVERDUE)" : "NO",
    };
  });

  const ws = XLSX.utils.json_to_sheet(duesRows);
  const csvOutput = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });

  const dateStr = new Date().toISOString().split("T")[0];
  const safeName = student.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Fee_Statement_${safeName}_ADM_${student.admissionNo || "NA"}_${dateStr}.csv`;

  if (typeof window !== "undefined") {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

