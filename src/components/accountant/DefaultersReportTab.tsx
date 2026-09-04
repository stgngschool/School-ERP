"use client";

import React, { useState, useDeferredValue, useMemo } from "react";
import {
  Search, LayoutGrid, TableProperties, FileSpreadsheet, Download,
  ArrowUpDown, SlidersHorizontal, RotateCcw, X, ArrowLeft, GraduationCap,
  Printer, Send, CreditCard, Phone, UserCheck, Users, FileText, Home
} from "lucide-react";
import { formatP } from "@/lib/currency";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { generateFeeReminderWhatsAppUrl, isDueUpToCurrentMonth } from "@/lib/whatsapp";
import { exportMasterFeeRegisterXLS, exportSingleStudentStatementXLS, exportFeeRegisterCSV } from "@/lib/exportFeeXLS";
import { MockStudent, MockDueItem, MockReceipt, MockSchoolInfo } from "@/context/AuthContext";
import {
  getCleanClassKey,
  matchStudentToClass,
  normalizeDisplayClassName,
  sortClasses
} from "@/lib/classUtils";

interface DefaultersReportTabProps {
  students: MockStudent[];
  dueItems: MockDueItem[];
  receipts: MockReceipt[];
  classes: { id: string; name: string; section: string }[];
  schoolInfo: MockSchoolInfo;
  studentsLoaded: boolean;
  billingLoaded: boolean;
  onSelectStudentForPayment: (studentId: string) => void;
  onViewStudentProfile?: (studentId: string) => void;
}

export default function DefaultersReportTab({
  students,
  dueItems,
  receipts,
  classes,
  schoolInfo,
  studentsLoaded,
  billingLoaded,
  onSelectStudentForPayment,
}: DefaultersReportTabProps) {
  const [defaulterViewMode, setDefaulterViewMode] = useState<"cards" | "sheet">("cards");
  const [defaulterSearch, setDefaulterSearch] = useState("");
  const deferredSearch = useDeferredValue(defaulterSearch);

  const [defaulterClass, setDefaulterClass] = useState("All");
  const [defaulterSortBy, setDefaulterSortBy] = useState<
    "NAME_ASC" | "NAME_DESC" | "DUE_DESC" | "DUE_ASC" | "PAID_DESC" | "ROLL_ASC" | "ROLL_DESC"
  >("NAME_ASC");
  const [defaulterLetter, setDefaulterLetter] = useState("ALL");
  const [defaulterCategory, setDefaulterCategory] = useState<
    "ALL" | "ZERO_PAID" | "PARTIAL_PAID" | "HEAVY_DUE" | "CLEARED"
  >("ALL");
  const [defaulterAmountRange, setDefaulterAmountRange] = useState<
    "ALL" | "UNDER_2K" | "2K_5K" | "5K_10K" | "ABOVE_10K" | "CUSTOM"
  >("ALL");
  const [defaulterCustomMinDue, setDefaulterCustomMinDue] = useState("");
  const [defaulterCustomMaxDue, setDefaulterCustomMaxDue] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [defaulterPage, setDefaulterPage] = useState(1);
  const [defaulterSheetPageSize, setDefaulterSheetPageSize] = useState(25);

  const handleSendWhatsApp = (studentName: string, parentName: string, amount: number, phone?: string) => {
    const message = `Dear ${parentName}, this is a gentle reminder that your ward ${studentName} has pending fee dues of ${formatP(
      amount
    )}. Please clear the dues at the earliest. Thank you, School Admin.`;
    const encodedMessage = encodeURIComponent(message);

    if (phone && phone.trim() !== "") {
      const numericPhone = phone.replace(/\D/g, "");
      const finalPhone = numericPhone.length === 10 ? `91${numericPhone}` : numericPhone;
      window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
    }
  };

  const { studentDuesMap, unpaidDuesMap, paidDuesMap } = useMemo(() => {
    const sMap = new Map<string, MockDueItem[]>();
    const uMap = new Map<string, MockDueItem[]>();
    const pMap = new Map<string, MockDueItem[]>();

    for (const d of dueItems) {
      const sid = d.studentId;
      if (!sMap.has(sid)) sMap.set(sid, []);
      sMap.get(sid)!.push(d);

      if (d.status === "UNPAID" && isDueUpToCurrentMonth(d)) {
        if (!uMap.has(sid)) uMap.set(sid, []);
        uMap.get(sid)!.push(d);
      } else if (d.status === "PAID") {
        if (!pMap.has(sid)) pMap.set(sid, []);
        pMap.get(sid)!.push(d);
      }
    }
    return { studentDuesMap: sMap, unpaidDuesMap: uMap, paidDuesMap: pMap };
  }, [dueItems]);

  const allUnpaidDefaultersCount = useMemo(() => {
    return students.filter((s) => (unpaidDuesMap.get(s.id) || []).length > 0).length;
  }, [students, unpaidDuesMap]);

  const fullyClearedCount = students.length - allUnpaidDefaultersCount;

  const filteredDefaulters = useMemo(() => {
    return students.filter((s) => {
      const allDues = studentDuesMap.get(s.id) || [];
      const unpaidDues = unpaidDuesMap.get(s.id) || [];
      const overdueAmt = unpaidDues.reduce((sum, d) => sum + d.amount, 0);
      const totalPaid = allDues.reduce(
        (sum, d) => sum + (d.totalPaid || (d.status === "PAID" ? d.originalAmount || d.amount : 0)),
        0
      );

      if (defaulterCategory === "CLEARED") {
        if (unpaidDues.length > 0) return false;
      } else if (defaulterCategory === "ZERO_PAID") {
        if (totalPaid > 0 || unpaidDues.length === 0) return false;
      } else if (defaulterCategory === "PARTIAL_PAID") {
        if (totalPaid === 0 || unpaidDues.length === 0) return false;
      } else if (defaulterCategory === "HEAVY_DUE") {
        if (overdueAmt < 500000) return false;
      } else {
        if (unpaidDues.length === 0) return false;
      }

      if (defaulterAmountRange === "UNDER_2K" && (overdueAmt <= 0 || overdueAmt > 200000)) return false;
      if (defaulterAmountRange === "2K_5K" && (overdueAmt <= 200000 || overdueAmt > 500000)) return false;
      if (defaulterAmountRange === "5K_10K" && (overdueAmt <= 500000 || overdueAmt > 1000000)) return false;
      if (defaulterAmountRange === "ABOVE_10K" && overdueAmt <= 1000000) return false;
      if (defaulterAmountRange === "CUSTOM") {
        const minPaisa = defaulterCustomMinDue ? parseFloat(defaulterCustomMinDue) * 100 : null;
        const maxPaisa = defaulterCustomMaxDue ? parseFloat(defaulterCustomMaxDue) * 100 : null;
        if (minPaisa !== null && !isNaN(minPaisa) && overdueAmt < minPaisa) return false;
        if (maxPaisa !== null && !isNaN(maxPaisa) && overdueAmt > maxPaisa) return false;
      }

      if (defaulterLetter !== "ALL") {
        const firstLetter = (s.name || "").trim().toUpperCase().charAt(0);
        if (firstLetter !== defaulterLetter) return false;
      }

      const q = deferredSearch.trim().toLowerCase();
      if (q) {
        const matchesName = (s.name || "").toLowerCase().includes(q);
        const matchesParent = (s.parentName || s.fatherName || "").toLowerCase().includes(q);
        const matchesAdm = (s.admissionNo || "").toLowerCase().includes(q);
        const matchesRoll = (s.rollNo || "").toLowerCase().includes(q);
        const matchesFamily = (s.familyCode || "").toLowerCase().includes(q);
        if (!matchesName && !matchesParent && !matchesAdm && !matchesRoll && !matchesFamily) {
          return false;
        }
      }

      const matchesClass = defaulterClass === "All" || matchStudentToClass(s, defaulterClass);
      if (!matchesClass) return false;

      return true;
    });
  }, [
    students,
    studentDuesMap,
    unpaidDuesMap,
    defaulterCategory,
    defaulterAmountRange,
    defaulterCustomMinDue,
    defaulterCustomMaxDue,
    defaulterLetter,
    deferredSearch,
    defaulterClass,
  ]);

  const availableDefaulterClasses = useMemo(() => {
    const classSet = new Set<string>();
    if (classes && classes.length > 0) {
      classes.forEach((c) => {
        const key = getCleanClassKey(c.name, c.section);
        if (key) classSet.add(key);
      });
    }
    if (students && students.length > 0) {
      students.forEach((s) => {
        const key = getCleanClassKey(s.class, s.section);
        if (key) classSet.add(key);
      });
    }
    return sortClasses(Array.from(classSet));
  }, [classes, students]);

  const sortedDefaulters = useMemo(() => {
    const list = [...filteredDefaulters];
    list.sort((a, b) => {
      const unpaidA = (unpaidDuesMap.get(a.id) || []).reduce((sum, d) => sum + d.amount, 0);
      const unpaidB = (unpaidDuesMap.get(b.id) || []).reduce((sum, d) => sum + d.amount, 0);
      const duesA = studentDuesMap.get(a.id) || [];
      const duesB = studentDuesMap.get(b.id) || [];
      const paidA = duesA.reduce(
        (sum, d) => sum + (d.totalPaid || (d.status === "PAID" ? d.originalAmount || d.amount : 0)),
        0
      );
      const paidB = duesB.reduce(
        (sum, d) => sum + (d.totalPaid || (d.status === "PAID" ? d.originalAmount || d.amount : 0)),
        0
      );

      switch (defaulterSortBy) {
        case "NAME_ASC":
          return (a.name || "").localeCompare(b.name || "");
        case "NAME_DESC":
          return (b.name || "").localeCompare(a.name || "");
        case "DUE_DESC":
          return unpaidB - unpaidA;
        case "DUE_ASC":
          return unpaidA - unpaidB;
        case "PAID_DESC":
          return paidB - paidA;
        case "ROLL_ASC": {
          const numA = parseInt((a.rollNo || "").replace(/\D/g, "")) || 0;
          const numB = parseInt((b.rollNo || "").replace(/\D/g, "")) || 0;
          if (numA && numB) return numA - numB;
          return (a.rollNo || "").localeCompare(b.rollNo || "");
        }
        case "ROLL_DESC": {
          const numA = parseInt((a.rollNo || "").replace(/\D/g, "")) || 0;
          const numB = parseInt((b.rollNo || "").replace(/\D/g, "")) || 0;
          if (numA && numB) return numB - numA;
          return (b.rollNo || "").localeCompare(a.rollNo || "");
        }
        default:
          return (a.name || "").localeCompare(b.name || "");
      }
    });
    return list;
  }, [filteredDefaulters, unpaidDuesMap, studentDuesMap, defaulterSortBy]);

  const totalOutstanding = useMemo(() => {
    return filteredDefaulters.reduce((sum, s) => {
      const unpaidDues = unpaidDuesMap.get(s.id) || [];
      return sum + unpaidDues.reduce((a, d) => a + d.amount, 0);
    }, 0);
  }, [filteredDefaulters, unpaidDuesMap]);

  if (!studentsLoaded || !billingLoaded) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 w-48 rounded" />
            <div className="h-3 bg-slate-100 w-96 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 border border-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl h-48 shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (expandedStudentId) {
    const std =
      filteredDefaulters.find((s) => s.id === expandedStudentId) ||
      students.find((s) => s.id === expandedStudentId);
    if (std) {
      const allDues = (studentDuesMap.get(std.id) || [])
        .slice()
        .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
      const unpaidDues = unpaidDuesMap.get(std.id) || [];
      const totalFee = allDues.reduce((s, d) => s + (d.originalAmount || d.amount), 0);
      const totalPaid = allDues.reduce((s, d) => s + (d.totalPaid || 0), 0);
      const totalDiscount = allDues.reduce((s, d) => s + (d.totalDiscount || 0), 0);
      const fullYearRemainingDue = Math.max(0, totalFee - totalPaid - totalDiscount);
      const overdueTillNow = unpaidDues.reduce((s, d) => s + d.amount, 0);

      return (
        <div className="space-y-5 animate-fade-in bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] student-statement-print-area">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
            <button
              onClick={() => setExpandedStudentId(null)}
              className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dues Report
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">Class:</span>
              <span className="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                {std.class} - {std.section}
              </span>
              <span className="text-[10px] font-bold text-slate-400 ml-2">Roll No:</span>
              <span className="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                {std.rollNo || "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md hardware-accelerated">
            <div className="flex items-center gap-4">
              {std.photoUrl ? (
                <img
                  src={std.photoUrl}
                  alt={std.name}
                  className="h-14 w-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border-2 border-white/20 flex items-center justify-center font-black text-xl text-indigo-200 uppercase">
                  {std.name.substring(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black tracking-tight">{std.name}</h3>
                  {std.isRte && (
                    <span className="text-[9px] font-black bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full">
                      RTE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-indigo-200 font-semibold flex-wrap">
                  <span>
                    ADM: <strong className="text-white">{std.admissionNo}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Father: <strong className="text-white">{std.fatherName || std.parentName}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Phone: <strong className="text-white">{std.fatherMobile || std.parentPhone}</strong>
                  </span>
                  {std.familyCode && (
                    <>
                      <span>•</span>
                      <span>
                        Family: <strong className="text-white">{std.familyCode}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <div className="text-right">
                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block">Total Paid</span>
                <span className="text-base font-black text-emerald-400">{formatP(totalPaid)}</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-right">
                <span className="text-[9px] font-bold text-rose-300 uppercase tracking-widest block">
                  Overdue Till Now
                </span>
                <span className="text-base font-black text-rose-400">{formatP(overdueTillNow)}</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Session Fee Ledger Statement ({allDues.length} Head Entries)
              </h4>
              <span className="text-[11px] font-bold text-slate-500">Academic Session 2026-2027</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                    <th className="py-3 px-5">Due Date</th>
                    <th className="py-3 px-5">Fee Details</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5 text-right text-amber-600">Concession</th>
                    <th className="py-3 px-5 text-right text-emerald-600">Paid</th>
                    <th className="py-3 px-5 text-right text-rose-600">Due</th>
                    <th className="py-3 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {allDues.map((d) => {
                    const isPaid = d.status === "PAID" || (d.amount === 0 && (d.totalPaid ?? 0) > 0);
                    const isOverdue = !isPaid && isDueUpToCurrentMonth(d);
                    return (
                      <tr
                        key={d.id}
                        className={`${
                          isOverdue ? "bg-rose-50/15" : isPaid ? "bg-emerald-50/5" : ""
                        } hover:bg-slate-50/40 transition-colors cv-auto-row`}
                      >
                        <td className="py-3 px-5 text-slate-500 font-bold whitespace-nowrap">{d.dueDate || "—"}</td>
                        <td className="py-3 px-5 font-bold text-slate-800">{d.name}</td>
                        <td className="py-3 px-5 text-right text-slate-700">
                          {formatP(d.originalAmount || d.amount)}
                        </td>
                        <td className="py-3 px-5 text-right text-amber-500 font-bold">
                          {d.totalDiscount ? formatP(d.totalDiscount) : "—"}
                        </td>
                        <td className="py-3 px-5 text-right text-emerald-600 font-black">
                          {d.totalPaid ? formatP(d.totalPaid) : isPaid ? formatP(d.originalAmount || d.amount) : "—"}
                        </td>
                        <td className="py-3 px-5 text-right text-rose-600 font-black">
                          {!isPaid ? formatP(d.amount) : "—"}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span
                            className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isPaid
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : isOverdue
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-slate-100 border-slate-200 text-slate-500"
                            }`}
                          >
                            {isPaid ? "PAID" : isOverdue ? "OVERDUE" : "UPCOMING"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-black">
                    <td colSpan={2} className="py-3.5 px-5 text-right text-slate-500 uppercase tracking-wider">
                      Grand Total
                    </td>
                    <td className="py-3.5 px-5 text-right text-slate-800">{formatP(totalFee)}</td>
                    <td className="py-3.5 px-5 text-right text-amber-500">
                      {totalDiscount ? formatP(totalDiscount) : "—"}
                    </td>
                    <td className="py-3.5 px-5 text-right text-emerald-600">{formatP(totalPaid)}</td>
                    <td className="py-3.5 px-5 text-right text-rose-600">{formatP(fullYearRemainingDue)}</td>
                    <td className="py-3.5 px-5 text-center text-[9px] text-rose-600 font-black">
                      ({formatP(overdueTillNow)} overdue)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap print:hidden">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Printer className="h-4 w-4 text-slate-500" /> Print Statement
              </button>
              <button
                onClick={() =>
                  handleSendWhatsApp(
                    std.name,
                    std.parentName,
                    overdueTillNow > 0 ? overdueTillNow : fullYearRemainingDue,
                    std.fatherMobile || std.parentPhone
                  )
                }
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <WhatsAppIcon className="h-4 w-4 text-emerald-600 shrink-0" /> WhatsApp
              </button>
              <button
                onClick={() => onSelectStudentForPayment(std.id)}
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <CreditCard className="h-4 w-4" /> Collect Fee
              </button>
              <button
                onClick={() =>
                  exportSingleStudentStatementXLS({
                    student: std,
                    dueItems,
                    receipts,
                    schoolInfo,
                  })
                }
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Download student fee statement Excel file"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export XLS
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  const ITEMS_PER_PAGE = defaulterViewMode === "sheet" ? defaulterSheetPageSize : 12;
  const totalPages = Math.ceil(sortedDefaulters.length / ITEMS_PER_PAGE) || 1;
  const activePage = Math.min(defaulterPage, totalPages);
  const paginatedDefaulters = sortedDefaulters.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Dues & Defaulters Report</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Click on any student card or row to view detailed fee breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setDefaulterViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                defaulterViewMode === "cards"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Card view with student identity badges"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-indigo-600" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setDefaulterViewMode("sheet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                defaulterViewMode === "sheet"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Live Google Sheets / Excel spreadsheet grid"
            >
              <TableProperties className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sheet View</span>
            </button>
          </div>

          <button
            onClick={() => {
              exportMasterFeeRegisterXLS({
                students,
                dueItems,
                receipts,
                schoolInfo,
                selectedClass: defaulterClass,
                searchQuery: defaulterSearch,
              });
            }}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 border border-emerald-200/80 rounded-xl py-2 px-3.5 text-[11px] font-bold text-emerald-800 cursor-pointer transition-all shadow-2xs"
            title="Export complete Multi-Sheet Excel Workbook (.xlsx) with student-by-student monthly fee breakdown"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export XLS{" "}
            {defaulterClass !== "All" ? `(Class ${defaulterClass})` : "(All Students)"}
          </button>
          <button
            onClick={() => {
              exportFeeRegisterCSV({
                students,
                dueItems,
                receipts,
                schoolInfo,
                selectedClass: defaulterClass,
                searchQuery: defaulterSearch,
              });
            }}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-700 cursor-pointer transition-all shadow-2xs"
            title="Export Fee Register as CSV (.csv)"
          >
            <Download className="h-4 w-4 text-slate-600" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters Header Block */}
      <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] contain-paint">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-7">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name, Father, ADM No, Roll No, Family Code..."
              value={defaulterSearch}
              onChange={(e) => {
                setDefaulterSearch(e.target.value);
                setExpandedStudentId(null);
                setDefaulterPage(1);
              }}
              className="w-full text-xs font-semibold py-2.5 pl-9 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all placeholder-slate-400 text-slate-800 shadow-2xs"
            />
            {defaulterSearch && (
              <button
                onClick={() => {
                  setDefaulterSearch("");
                  setDefaulterPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="sm:col-span-5">
            <select
              value={defaulterClass}
              onChange={(e) => {
                setDefaulterClass(e.target.value);
                setExpandedStudentId(null);
                setDefaulterPage(1);
              }}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600 transition-all text-slate-700 shadow-2xs cursor-pointer"
            >
              <option value="All">All Classes (Outstanding)</option>
              {availableDefaulterClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {normalizeDisplayClassName(cls)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[200px] flex items-center gap-1.5 bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0">Sort:</span>
            <select
              value={defaulterSortBy}
              onChange={(e) => {
                setDefaulterSortBy(e.target.value as any);
                setDefaulterPage(1);
              }}
              className="w-full text-xs font-bold bg-transparent outline-none text-slate-700 cursor-pointer"
            >
              <option value="NAME_ASC">Name (A to Z)</option>
              <option value="NAME_DESC">Name (Z to A)</option>
              <option value="DUE_DESC">Highest Due First (Sabse Jyada)</option>
              <option value="DUE_ASC">Lowest Due First (Kam Bakaya)</option>
              <option value="PAID_DESC">Highest Paid First</option>
              <option value="ROLL_ASC">Roll Number (Low ➔ High: 1 to 100)</option>
              <option value="ROLL_DESC">Roll Number (High ➔ Low: 100 to 1)</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px] flex items-center gap-1.5 bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0">Due Range:</span>
            <select
              value={defaulterAmountRange}
              onChange={(e) => {
                setDefaulterAmountRange(e.target.value as any);
                setDefaulterPage(1);
              }}
              className="w-full text-xs font-bold bg-transparent outline-none text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Due Amounts</option>
              <option value="UNDER_2K">Under ₹2,000</option>
              <option value="2K_5K">₹2,000 – ₹5,000</option>
              <option value="5K_10K">₹5,000 – ₹10,000</option>
              <option value="ABOVE_10K">Above ₹10,000 (Critical)</option>
              <option value="CUSTOM">Custom Specific Amount Range ✍️</option>
            </select>
          </div>

          {defaulterAmountRange === "CUSTOM" && (
            <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-indigo-700">Min:</span>
              <input
                type="number"
                placeholder="₹ Min"
                value={defaulterCustomMinDue}
                onChange={(e) => {
                  setDefaulterCustomMinDue(e.target.value);
                  setDefaulterPage(1);
                }}
                className="w-20 text-xs font-bold py-1 px-2 bg-white border border-indigo-200 rounded-lg outline-none text-slate-800"
              />
              <span className="text-[10px] font-bold text-indigo-700">Max:</span>
              <input
                type="number"
                placeholder="₹ Max"
                value={defaulterCustomMaxDue}
                onChange={(e) => {
                  setDefaulterCustomMaxDue(e.target.value);
                  setDefaulterPage(1);
                }}
                className="w-20 text-xs font-bold py-1 px-2 bg-white border border-indigo-200 rounded-lg outline-none text-slate-800"
              />
            </div>
          )}

          {(defaulterSearch ||
            defaulterClass !== "All" ||
            defaulterSortBy !== "NAME_ASC" ||
            defaulterLetter !== "ALL" ||
            defaulterCategory !== "ALL" ||
            defaulterAmountRange !== "ALL" ||
            defaulterCustomMinDue ||
            defaulterCustomMaxDue) && (
            <button
              onClick={() => {
                setDefaulterSearch("");
                setDefaulterClass("All");
                setDefaulterSortBy("NAME_ASC");
                setDefaulterLetter("ALL");
                setDefaulterCategory("ALL");
                setDefaulterAmountRange("ALL");
                setDefaulterCustomMinDue("");
                setDefaulterCustomMaxDue("");
                setDefaulterPage(1);
              }}
              className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl py-2 px-3 text-[11px] font-bold cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
              title="Reset all active filters"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          {[
            { id: "ALL", label: "All Defaulters" },
            { id: "ZERO_PAID", label: "100% Unpaid (₹0 Paid)" },
            { id: "PARTIAL_PAID", label: "Partial Paid" },
            { id: "HEAVY_DUE", label: "Heavy Dues (> ₹5,000)" },
            { id: "CLEARED", label: "Fully Cleared (₹0 Due)" },
          ].map((cat) => {
            const active = defaulterCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setDefaulterCategory(cat.id as any);
                  setDefaulterPage(1);
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50/70 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mr-1 shrink-0">A-Z Jump:</span>
          {["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => {
            const active = defaulterLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => {
                  setDefaulterLetter(letter);
                  setDefaulterPage(1);
                }}
                className={`min-w-6.5 h-6.5 px-1 rounded-md text-[10px] font-black transition-all cursor-pointer flex items-center justify-center shrink-0 border ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs scale-105"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Students", value: students.length, color: "text-slate-800" },
          { label: "Showing Students", value: filteredDefaulters.length, color: "text-indigo-600" },
          { label: "Fully Cleared", value: fullyClearedCount, color: "text-emerald-600" },
          { label: "Filtered Outstanding", value: `${formatP(totalOutstanding)}`, color: "text-rose-700" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-200/70 rounded-xl px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] contain-paint"
          >
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">{stat.label}</span>
            <span className={`text-base font-black mt-0.5 block ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {defaulterViewMode === "sheet" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">📊 Live Spreadsheet Matrix</span>
              <span className="text-slate-400">•</span>
              <span className="text-[11px] text-slate-500 font-medium">
                Showing {paginatedDefaulters.length} of {sortedDefaulters.length} records (Page {activePage} of{" "}
                {totalPages})
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows per page:</span>
              <select
                value={defaulterSheetPageSize}
                onChange={(e) => {
                  setDefaulterSheetPageSize(Number(e.target.value));
                  setDefaulterPage(1);
                }}
                className="text-xs font-bold py-1 px-2.5 border border-slate-200 rounded-lg bg-white outline-none cursor-pointer"
              >
                <option value={25}>25 Rows</option>
                <option value={50}>50 Rows</option>
                <option value={100}>100 Rows</option>
                <option value={500}>All (Fast)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto select-text scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider divide-x divide-slate-200">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-slate-100 z-10 shadow-xs hardware-accelerated">Roll No</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Student Name</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">ADM No</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Class</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Father & Mobile</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Fee</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap text-emerald-700">Paid</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap text-rose-700">Current Due</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Paid Up To</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">12-Month Quick Matrix</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {paginatedDefaulters.map((std, idx) => {
                  const allDues = (studentDuesMap.get(std.id) || [])
                    .slice()
                    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
                  const unpaidDues = unpaidDuesMap.get(std.id) || [];
                  const totalFee = allDues.reduce((s, d) => s + (d.originalAmount || d.amount), 0);
                  const totalPaid = allDues.reduce(
                    (s, d) => s + (d.totalPaid || (d.status === "PAID" ? d.originalAmount || d.amount : 0)),
                    0
                  );
                  const totalDue = unpaidDues.reduce((s, d) => s + d.amount, 0);
                  const isCleared = totalDue === 0;

                  const monthsStatus = [
                    { k: "april", l: "Apr" },
                    { k: "may", l: "May" },
                    { k: "june", l: "Jun" },
                    { k: "july", l: "Jul" },
                    { k: "august", l: "Aug" },
                    { k: "september", l: "Sep" },
                    { k: "october", l: "Oct" },
                    { k: "november", l: "Nov" },
                    { k: "december", l: "Dec" },
                    { k: "january", l: "Jan" },
                    { k: "february", l: "Feb" },
                    { k: "march", l: "Mar" },
                  ].map((m) => {
                    const item = allDues.find(
                      (d) => d.name.toLowerCase().includes(m.k) && !d.name.toLowerCase().includes("exam")
                    );
                    if (!item) return { ...m, status: "NONE" };
                    const paid = item.status === "PAID" || item.amount <= 0;
                    return { ...m, status: paid ? "PAID" : "DUE" };
                  });

                  let lastPaid = "—";
                  for (const ms of monthsStatus) {
                    if (ms.status === "PAID") lastPaid = ms.l;
                    else if (ms.status === "DUE") break;
                  }

                  const rowNumber = (activePage - 1) * ITEMS_PER_PAGE + idx + 1;

                  return (
                    <tr
                      key={std.id}
                      onClick={() => setExpandedStudentId(std.id)}
                      className="divide-x divide-slate-100 hover:bg-indigo-50/40 transition-colors cursor-pointer group cv-auto-row"
                    >
                      <td className="py-2 px-3 text-center text-[11px] font-mono text-slate-400">{rowNumber}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-white group-hover:bg-indigo-50/40 shadow-2xs hardware-accelerated">
                        {std.rollNo || "—"}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{std.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {std.admissionNo}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-700 whitespace-nowrap">
                        {std.class}-{std.section}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="text-slate-800 font-semibold text-[11px]">
                          {std.fatherName || std.parentName || "—"}
                        </div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          {std.fatherMobile || std.parentPhone || "—"}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                        {formatP(totalFee)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {formatP(totalPaid)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-rose-600 whitespace-nowrap">
                        {formatP(totalDue)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {isCleared ? (
                          <span className="text-emerald-700 font-bold text-[11px]">All 12 Months</span>
                        ) : lastPaid !== "—" ? (
                          <span className="text-slate-850 text-[11px]">Up to {lastPaid}</span>
                        ) : (
                          <span className="text-rose-500 font-bold text-[11px]">No Month Paid</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-0.5">
                          {monthsStatus.map((ms) => (
                            <span
                              key={ms.k}
                              title={`${ms.l}: ${ms.status}`}
                              className={`w-3.5 h-3.5 rounded-xs text-[8px] font-black flex items-center justify-center ${
                                ms.status === "PAID"
                                  ? "bg-emerald-500 text-white"
                                  : ms.status === "DUE"
                                  ? "bg-rose-100 text-rose-700 font-bold border border-rose-300"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {ms.l.charAt(0)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isCleared
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : totalPaid > 0
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-rose-50 border-rose-200 text-rose-700"
                          }`}
                        >
                          {isCleared ? "CLEARED" : totalPaid > 0 ? "PARTIAL" : "UNPAID"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setExpandedStudentId(std.id)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Statement
                          </button>
                          <button
                            onClick={() => onSelectStudentForPayment(std.id)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Collect
                          </button>
                          <button
                            onClick={() =>
                              handleSendWhatsApp(
                                std.name,
                                std.parentName,
                                totalDue,
                                std.fatherMobile || std.parentPhone
                              )
                            }
                            className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer"
                            title="Send WhatsApp Reminder"
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedDefaulters.map((std) => {
            const allDues = studentDuesMap.get(std.id) || [];
            const unpaidDues = unpaidDuesMap.get(std.id) || [];
            const totalFee = allDues.reduce((s, d) => s + (d.originalAmount || d.amount), 0);
            const totalPaid = allDues.reduce(
              (s, d) => s + (d.totalPaid || (d.status === "PAID" ? d.originalAmount || d.amount : 0)),
              0
            );
            const totalDue = unpaidDues.reduce((s, d) => s + d.amount, 0);

            return (
              <div
                key={std.id}
                onClick={() => setExpandedStudentId(std.id)}
                className="bg-white rounded-2xl border transition-all duration-200 overflow-hidden border-slate-200 hover:border-indigo-400 hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer group flex flex-col justify-between cv-auto-card"
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      {std.photoUrl ? (
                        <img
                          src={std.photoUrl}
                          alt={std.name}
                          className="h-9 w-9 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-750 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                          {std.name.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                          {std.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-semibold flex-wrap">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Users className="h-3 w-3 text-slate-400 shrink-0" /> ADM: {std.admissionNo}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <FileText className="h-3 w-3 text-slate-400 shrink-0" /> {allDues.length} fee records
                          </span>
                          {std.familyCode && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Home className="h-3 w-3 text-slate-400 shrink-0" /> {std.familyCode}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[8px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full mt-0.5">
                      DUE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">Class</span>
                      <span className="text-sm font-black text-slate-800 mt-0.5 block">
                        {std.class} - {std.section}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">
                        Roll No.
                      </span>
                      <span className="text-sm font-black text-slate-800 mt-0.5 block">{std.rollNo || "—"}</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 truncate">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{std.fatherName || std.parentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 truncate">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{std.fatherMobile || std.parentPhone}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border border-slate-100 rounded-xl overflow-hidden">
                    <div className="px-2 py-2 text-center border-r border-slate-100">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">
                        Total Fee
                      </span>
                      <span className="text-[11px] font-black text-slate-800 mt-0.5 block whitespace-nowrap">
                        {formatP(totalFee)}
                      </span>
                    </div>
                    <div className="px-2 py-2 text-center border-r border-slate-100">
                      <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider block">Paid</span>
                      <span className="text-[11px] font-black text-emerald-600 mt-0.5 block whitespace-nowrap">
                        {formatP(totalPaid)}
                      </span>
                    </div>
                    <div className="px-2 py-2 text-center">
                      <span className="text-[8px] font-black uppercase text-rose-500 tracking-wider block">Due</span>
                      <span className="text-[11px] font-black text-rose-600 mt-0.5 block whitespace-nowrap">
                        {formatP(totalDue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/20 group-hover:bg-indigo-50/30 transition-colors">
                  <span className="text-[10px] font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                    View Statement
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {(std.fatherMobile || std.parentPhone) && (
                      <a
                        href={`tel:${std.fatherMobile || std.parentPhone}`}
                        title="Call Parent"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {totalDue > 0 && (
                      <a
                        href={generateFeeReminderWhatsAppUrl({
                          student: std,
                          unpaidDues,
                          schoolInfo,
                          senderRole: "ACCOUNTANT",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Send WhatsApp Reminder"
                        className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition-all shadow-2xs"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-white shrink-0" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 mt-4 text-xs font-bold text-slate-500 select-none">
          <button
            disabled={activePage === 1}
            onClick={() => {
              setDefaulterPage(activePage - 1);
              setExpandedStudentId(null);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
          >
            Previous
          </button>
          <span>
            Page {activePage} of {totalPages}
          </span>
          <button
            disabled={activePage === totalPages}
            onClick={() => {
              setDefaulterPage(activePage + 1);
              setExpandedStudentId(null);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
