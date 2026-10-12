"use client";

import React, { useState, useDeferredValue, useMemo } from "react";
import {
  Printer,
  User,
  Users,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  CreditCard,
  UserSearch,
  ChevronRight,
  Phone,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";
import { formatP } from "@/lib/currency";
import { enrichReceiptWithStudentDetails } from "@/lib/receipts";
import { getTodayIST } from "@/lib/dateUtils";
import { MockReceipt, MockLedgerEntry, MockStudent, MockUser, useAuth } from "@/context/AuthContext";

const DAILY_LOOKUP_LIMIT = 50;

interface LedgerReceiptsTabProps {
  receipts: MockReceipt[];
  ledgerEntries: MockLedgerEntry[];
  students: MockStudent[];
  user: MockUser | null;
  billingLoaded: boolean;
  onOpenReceipt: (receipt: any) => void;
}

export default function LedgerReceiptsTab({
  receipts,
  students,
  user,
  billingLoaded,
  onOpenReceipt,
}: LedgerReceiptsTabProps) {
  const { refreshBilling } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Navigation: "shift" (Today's Shift Register) vs "lookup" (Parent Receipt Lookup)
  const [activeSubTab, setActiveSubTab] = useState<"shift" | "lookup">("shift");

  // Tab 1 (Shift): Quick filter within today's shift
  const [shiftFilter, setShiftFilter] = useState("");
  const deferredShiftFilter = useDeferredValue(shiftFilter);
  const [visibleReceiptsCount, setVisibleReceiptsCount] = useState(25);

  // Tab 2 (Lookup): Student-First Search
  const [lookupQuery, setLookupQuery] = useState("");
  const deferredLookupQuery = useDeferredValue(lookupQuery);
  const [selectedStudent, setSelectedStudent] = useState<MockStudent | null>(null);
  const [lookupLimitReached, setLookupLimitReached] = useState(false);

  // Privacy / Masking Mode for Sensitive Financial Figures (Default to PROTECTED / HIDDEN)
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("accountant_privacy_mode");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const togglePrivacy = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("accountant_privacy_mode", String(next));
      }
      return next;
    });
  };

  const todayIST = getTodayIST();

  // ─── Silent Daily Quota & Audit Logging Handler ───
  const handleSelectStudent = (student: MockStudent) => {
    if (typeof window !== "undefined") {
      const todayKey = `gng_acct_lookups_${todayIST}_${user?.id || "counter"}`;
      const count = parseInt(localStorage.getItem(todayKey) || "0", 10);
      if (count >= DAILY_LOOKUP_LIMIT) {
        setLookupLimitReached(true);
        setSelectedStudent(null);
        return;
      }
      localStorage.setItem(todayKey, String(count + 1));
      setLookupLimitReached(false);
    }

    setSelectedStudent(student);
    setLookupQuery(student.name);

    // Silent background audit log to server (Zero UI lag, ~50 bytes ingress, 0 egress)
    fetch("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: `PARENT_RECEIPT_LOOKUP: ${student.name} (Class: ${student.class}-${student.section}, Adm: ${student.admissionNo || "N/A"})`,
      }),
    }).catch(() => {});
  };

  // Reset pagination when shift filter changes
  React.useEffect(() => {
    setVisibleReceiptsCount(25);
  }, [deferredShiftFilter]);

  // ─── 1. Today's Counter Shift Receipts (Accountant's own shift today) ───
  const todayShiftReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const isToday = Boolean(r.createdAt) && r.createdAt.startsWith(todayIST);
      const isMyReceipt =
        !user?.id
          ? true
          : r.createdById === user.id ||
            (user.name && r.collectedBy === user.name) ||
            (user.email && r.collectedBy === user.email);
      return isToday && isMyReceipt;
    });
  }, [receipts, user, todayIST]);

  // ─── 2. Shift Reconciliation Totals (Strictly scoped to Today's Shift) ───
  const todayReceiptsCount = todayShiftReceipts.length;
  const todayCash = useMemo(
    () => todayShiftReceipts.filter((r) => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0),
    [todayShiftReceipts]
  );
  const todayUpi = useMemo(
    () => todayShiftReceipts.filter((r) => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0),
    [todayShiftReceipts]
  );
  const todayBank = useMemo(
    () =>
      todayShiftReceipts
        .filter((r) => r.method === "ONLINE" || r.method === "CHEQUE" || r.method === "BANK_TRANSFER")
        .reduce((sum, r) => sum + r.amount, 0),
    [todayShiftReceipts]
  );
  const todayTotal = useMemo(
    () => todayShiftReceipts.reduce((sum, r) => sum + r.amount, 0),
    [todayShiftReceipts]
  );

  // Today's filtered receipts for shift view
  const displayShiftReceipts = useMemo(() => {
    const q = deferredShiftFilter.trim().toLowerCase();
    if (!q) return todayShiftReceipts;
    return todayShiftReceipts.filter((r) => {
      return (
        (r.receiptNo || "").toLowerCase().includes(q) ||
        (r.manualReceiptNo || "").toLowerCase().includes(q) ||
        (r.studentName || "").toLowerCase().includes(q) ||
        (r.details || "").toLowerCase().includes(q) ||
        (r.method || "").toLowerCase().includes(q)
      );
    });
  }, [todayShiftReceipts, deferredShiftFilter]);

  // ─── 3. Tab 2: Student Lookup Matches ───
  const matchingStudents = useMemo(() => {
    const q = deferredLookupQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return students
      .filter((s) => {
        return (
          s.name.toLowerCase().includes(q) ||
          (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
          (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
          (s.parentName && s.parentName.toLowerCase().includes(q)) ||
          (s.fatherMobile && s.fatherMobile.includes(q)) ||
          (s.parentPhone && s.parentPhone.includes(q))
        );
      })
      .slice(0, 6);
  }, [students, deferredLookupQuery]);

  // Also check if lookup query is an exact receipt number
  const matchingReceiptsByNumber = useMemo(() => {
    const q = deferredLookupQuery.trim().toLowerCase();
    if (q.length < 3) return [];
    // Only match if query looks like receipt or book number
    return receipts
      .filter((r) => {
        const rNo = (r.receiptNo || "").toLowerCase();
        const mNo = (r.manualReceiptNo || "").toLowerCase();
        return rNo === q || rNo.endsWith(q) || mNo === q;
      })
      .slice(0, 3);
  }, [receipts, deferredLookupQuery]);

  // Receipts belonging to currently selected student
  const selectedStudentReceipts = useMemo(() => {
    if (!selectedStudent) return [];
    return receipts
      .filter((r) => {
        return (
          r.studentId === selectedStudent.id ||
          (r.studentName && r.studentName.toLowerCase() === selectedStudent.name.toLowerCase())
        );
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [receipts, selectedStudent]);

  // Recent students who had receipts today (quick chips)
  const todayRecentStudents = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string; class: string }[] = [];
    todayShiftReceipts.forEach((r) => {
      if (r.studentId && !seen.has(r.studentId)) {
        seen.add(r.studentId);
        const std = students.find((s) => s.id === r.studentId);
        if (std) {
          list.push({ id: std.id, name: std.name, class: `${std.class}-${std.section}` });
        }
      }
    });
    return list.slice(0, 5);
  }, [todayShiftReceipts, students]);

  if (!billingLoaded) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 w-48 rounded" />
            <div className="h-3 bg-slate-100 w-96 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 border border-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Finance Counter & Receipts Desk
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Clock className="w-2.5 h-2.5 text-indigo-500" />
              Terminal: {user?.name || "Accountant"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Manage today&apos;s shift cash settlement, or look up a student to reprint duplicate fee receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Sub-Tab Navigation Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl select-none shrink-0 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveSubTab("shift")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                activeSubTab === "shift"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-3 h-3" />
              <span>Today&apos;s Shift</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("lookup")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                activeSubTab === "lookup"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserSearch className="w-3 h-3" />
              <span>Parent Receipt Lookup</span>
            </button>
          </div>

          {/* Privacy Toggle Button */}
          {activeSubTab === "shift" && (
            <button
              type="button"
              onClick={togglePrivacy}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                privacyMode
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/80"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80"
              }`}
              title={privacyMode ? "Amounts Hidden (Click to Reveal)" : "Amounts Visible (Click to Hide)"}
            >
              {privacyMode ? <EyeOff className="w-3 h-3 text-amber-600 shrink-0" /> : <Eye className="w-3 h-3 text-emerald-600 shrink-0" />}
              <span>{privacyMode ? "Hidden" : "Visible"}</span>
            </button>
          )}

          {/* Sync Button */}
          <button
            type="button"
            onClick={async () => {
              setIsSyncing(true);
              await refreshBilling().finally(() => setIsSyncing(false));
            }}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 border border-indigo-200/80 rounded-xl py-1.5 px-2.5 text-[10px] font-bold text-indigo-800 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
            title="Sync latest receipts from server"
          >
            <RefreshCw className={`h-3 w-3 text-indigo-600 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ─── SUB-TAB 1: TODAY'S SHIFT REGISTER (Daily Cashier Closing) ─── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "shift" && (
        <div className="space-y-4">
          {/* Shift Reconciliation Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Today&apos;s Shift Reconciliation ({todayIST})
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold">
                Counter: {user?.name || "Accountant"}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  Today&apos;s Receipts
                </span>
                <span className="text-sm font-black text-slate-850 mt-1 block">
                  {todayReceiptsCount} Vouchers
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">
                  Today&apos;s Collection
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {privacyMode ? (
                    <span className="font-mono text-slate-400 tracking-widest select-none">₹••••</span>
                  ) : (
                    formatP(todayTotal)
                  )}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block">
                  Cash in Drawer
                </span>
                <span className="text-sm font-black text-emerald-700 mt-1 block">
                  {privacyMode ? (
                    <span className="font-mono text-slate-400 tracking-widest select-none">₹••••</span>
                  ) : (
                    formatP(todayCash)
                  )}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block">
                  UPI & Online
                </span>
                <span className="text-sm font-black text-blue-700 mt-1 block">
                  {privacyMode ? (
                    <span className="font-mono text-slate-400 tracking-widest select-none">₹••••</span>
                  ) : (
                    formatP(todayUpi + todayBank)
                  )}
                </span>
              </div>
            </div>

            {/* Handover Settlement Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  Cashier Shift Handover (Day-End Settlement)
                </span>
                <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                  Shift Active Today
                </span>
              </div>

              <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-2xs space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black uppercase">
                      {(user?.name || "A").substring(0, 2)}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs block">{user?.name || "Accountant"}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Terminal Active</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {todayReceiptsCount} Vouchers Issued Today
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-bold text-slate-600 pt-0.5">
                  <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/60">
                    <span className="text-[8px] text-emerald-600 uppercase tracking-wider block font-black">Cash in Drawer</span>
                    <span className="text-xs font-black text-emerald-800 mt-0.5 block">
                      {privacyMode ? "₹••••" : formatP(todayCash)}
                    </span>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100/60">
                    <span className="text-[8px] text-blue-600 uppercase tracking-wider block font-black">UPI / Online</span>
                    <span className="text-xs font-black text-blue-800 mt-0.5 block">
                      {privacyMode ? "₹••••" : formatP(todayUpi + todayBank)}
                    </span>
                  </div>
                  <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/60 col-span-2 sm:col-span-1">
                    <span className="text-[8px] text-indigo-600 uppercase tracking-wider block font-black">Total to Handover</span>
                    <span className="text-xs font-black text-indigo-900 mt-0.5 block">
                      {privacyMode ? "₹••••" : formatP(todayTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Receipts Filter Bar */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Filter today's vouchers (e.g. student name, CASH, or receipt #)..."
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full text-xs font-semibold py-2.5 pl-8 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all placeholder-slate-400 text-slate-800"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5 pointer-events-none" />
              {shiftFilter && (
                <button
                  type="button"
                  onClick={() => setShiftFilter("")}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="py-2 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Today&apos;s Feed ({displayShiftReceipts.length} vouchers)</span>
            </div>
          </div>

          {/* Today's Receipts Table */}
          <div className="bg-white border-0 sm:border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            {displayShiftReceipts.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-50/40 space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-600 font-bold">
                  {shiftFilter
                    ? `No vouchers found matching "${shiftFilter}" today.`
                    : `No receipts issued yet today (${todayIST}).`}
                </p>
                <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
                  New fee collections recorded at the counter will appear here automatically.
                </p>
                {shiftFilter && (
                  <button
                    type="button"
                    onClick={() => setShiftFilter("")}
                    className="mt-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                        <th className="py-3 px-4">Receipt No</th>
                        <th className="py-3 px-4">Student & Class</th>
                        <th className="py-3 px-4">Collected By</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Mode</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {displayShiftReceipts.slice(0, visibleReceiptsCount).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors cv-auto-row">
                          <td className="py-3.5 px-4 font-black text-indigo-700">
                            <div className="space-y-0.5">
                              <span>{rec.receiptNo}</span>
                              {rec.manualReceiptNo && (
                                <span className="block text-[8px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 w-fit">
                                  📖 Book: {rec.manualReceiptNo}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-extrabold text-slate-900">{rec.studentName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{rec.classSection}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                              <User className="h-3 w-3 text-indigo-500" />
                              {rec.collectedBy || "Finance Desk"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-[10px] text-slate-500 font-medium">
                            {rec.details}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                rec.method === "CASH"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-blue-50 text-blue-700 border-blue-100"
                              }`}
                            >
                              {rec.method}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-950">
                            {privacyMode ? (
                              <span className="font-mono text-slate-400 select-none">₹••••</span>
                            ) : (
                              formatP(rec.amount)
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenReceipt(enrichReceiptWithStudentDetails(rec, students));
                              }}
                              className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                              title="View / Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                  {displayShiftReceipts.slice(0, visibleReceiptsCount).map((rec) => (
                    <div key={rec.id} className="p-3.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-indigo-700 text-xs">{rec.receiptNo}</span>
                          {rec.manualReceiptNo && (
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                              Book: {rec.manualReceiptNo}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            rec.method === "CASH"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {rec.method}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900 text-sm">{rec.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{rec.classSection}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-slate-900 block">
                            {privacyMode ? "₹••••" : formatP(rec.amount)}
                          </span>
                        </div>
                      </div>

                      {rec.details && (
                        <p className="text-[10px] text-slate-500 font-medium line-clamp-2 bg-white p-2 rounded-xl border border-slate-200/50">
                          {rec.details}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-slate-600 font-bold text-[10px]">
                          <User className="h-3 w-3 text-indigo-500" />
                          {rec.collectedBy || "Finance Desk"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenReceipt(enrichReceiptWithStudentDetails(rec, students));
                          }}
                          className="flex items-center gap-1.5 text-indigo-700 font-black bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 text-xs shadow-2xs"
                        >
                          <Printer className="h-3.5 w-3.5 text-indigo-600" />
                          <span>View / Print</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {displayShiftReceipts.length > visibleReceiptsCount && (
                  <div className="py-3 px-4 text-center bg-slate-50/60 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setVisibleReceiptsCount((prev) => prev + 25)}
                      className="py-2 px-5 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-600 text-xs font-black rounded-xl cursor-pointer"
                    >
                      Load More Receipts ({displayShiftReceipts.length - visibleReceiptsCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── SUB-TAB 2: PARENT RECEIPT LOOKUP (Student-First Duplicate Desk) ─── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "lookup" && (
        <div className="space-y-4">
          {/* Search Box Card */}
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <UserSearch className="w-4 h-4 text-indigo-600" />
                  Parent Duplicate Receipt Desk
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Search by Student Name, Admission No, or exact Receipt No to reprint past receipts for parents.
                </p>
              </div>

              {selectedStudent && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setLookupQuery("");
                  }}
                  className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl cursor-pointer self-start sm:self-auto transition-all"
                >
                  Clear & Search Another Student
                </button>
              )}
            </div>

            {/* Input Field */}
            <div className="relative">
              <input
                type="text"
                placeholder="Type Student Name (e.g. Ayush Bhardwaj) or Admission No (e.g. 10555)..."
                value={lookupQuery}
                onChange={(e) => {
                  setLookupQuery(e.target.value);
                  if (selectedStudent) setSelectedStudent(null);
                }}
                className="w-full text-xs font-semibold py-3 pl-10 pr-10 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all placeholder-slate-400 text-slate-800 shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              {lookupQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLookupQuery("");
                    setSelectedStudent(null);
                  }}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Chips of Students from Today's Shift */}
            {!selectedStudent && !lookupQuery && todayRecentStudents.length > 0 && (
              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Select Today:
                </span>
                {todayRecentStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const fullStd = students.find((std) => std.id === s.id);
                      if (fullStd) handleSelectStudent(fullStd);
                    }}
                    className="text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    {s.name} ({s.class})
                  </button>
                ))}
              </div>
            )}

            {/* Quota Limit Reached Message (Only shown if limit exceeds 50) */}
            {lookupLimitReached && (
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-center space-y-1.5">
                <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                </div>
                <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider">
                  Daily Duplicate Lookup Limit Reached
                </h4>
                <p className="text-[11px] text-amber-700 font-semibold max-w-md mx-auto">
                  Today&apos;s counter duplicate receipt lookup quota has been fulfilled. For any urgent duplicate reprints, please contact the Principal / Administration Office.
                </p>
              </div>
            )}

            {/* Dropdown Suggestions List (When typing student name) */}
            {!selectedStudent && !lookupLimitReached && lookupQuery.trim().length >= 2 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md divide-y divide-slate-100">
                {matchingStudents.length === 0 && matchingReceiptsByNumber.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 font-semibold italic">
                    No students found matching &quot;{lookupQuery}&quot;. Please check the spelling or admission number.
                  </div>
                ) : (
                  <>
                    {/* Matching Students */}
                    {matchingStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          handleSelectStudent(s);
                        }}
                        className="p-3 hover:bg-indigo-50/70 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shrink-0">
                            {s.name.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-xs group-hover:text-indigo-700 transition-colors">
                                {s.name}
                              </span>
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                Cl {s.class}-{s.section}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold mt-0.5">
                              {s.admissionNo && <span>Adm: {s.admissionNo}</span>}
                              {s.rollNo && <span>Roll: {s.rollNo}</span>}
                              {s.parentName && <span>Parent: {s.parentName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                          <span>View Receipts</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}

                    {/* Matching Receipts by exact Receipt Number */}
                    {matchingReceiptsByNumber.length > 0 && (
                      <div className="bg-slate-50/70 p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Matching Receipt Numbers
                      </div>
                    )}
                    {matchingReceiptsByNumber.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          const std = students.find((s) => s.id === r.studentId || s.name === r.studentName);
                          if (std) handleSelectStudent(std);
                          else onOpenReceipt(enrichReceiptWithStudentDetails(r, students));
                        }}
                        className="p-3 hover:bg-emerald-50/70 transition-all cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-black text-indigo-700 text-xs">{r.receiptNo}</span>
                          <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                            {r.studentName} • {r.details}
                          </p>
                        </div>
                        <span className="text-xs font-black text-slate-900">{formatP(r.amount)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ─── Selected Student Receipt Card & History Table ─── */}
          {selectedStudent ? (
            <div className="space-y-4">
              {/* Student Overview Header */}
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase shadow-xs">
                    {selectedStudent.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 text-sm">{selectedStudent.name}</h3>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        Class {selectedStudent.class}-{selectedStudent.section}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold mt-0.5 flex-wrap">
                      {selectedStudent.admissionNo && <span>Adm No: {selectedStudent.admissionNo}</span>}
                      {selectedStudent.rollNo && <span>Roll: {selectedStudent.rollNo}</span>}
                      {selectedStudent.parentName && <span>Father: {selectedStudent.parentName}</span>}
                      {(selectedStudent.fatherMobile || selectedStudent.parentPhone) && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          {selectedStudent.fatherMobile || selectedStudent.parentPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Receipts Found
                    </span>
                    <span className="text-sm font-black text-indigo-700 block">
                      {selectedStudentReceipts.length} Vouchers
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipts Table for THIS Student ONLY */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Payment Vouchers Issued for {selectedStudent.name}</span>
                  <span className="text-[10px] text-slate-500">
                    Total Paid: {formatP(selectedStudentReceipts.reduce((s, r) => s + r.amount, 0))}
                  </span>
                </div>

                {selectedStudentReceipts.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 font-semibold italic bg-slate-50/20">
                    No payment receipts found on record for {selectedStudent.name}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/40 border-b border-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                          <th className="py-3 px-4">Receipt No</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Description / Fee Heads</th>
                          <th className="py-3 px-4">Counter Desk</th>
                          <th className="py-3 px-4">Mode</th>
                          <th className="py-3 px-4 text-right">Amount Paid</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {selectedStudentReceipts.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3.5 px-4 font-black text-indigo-700">
                              <div className="space-y-0.5">
                                <span>{rec.receiptNo}</span>
                                {rec.manualReceiptNo && (
                                  <span className="block text-[8px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 w-fit">
                                    📖 Book: {rec.manualReceiptNo}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-[10px] font-bold">
                              {rec.createdAt}
                            </td>
                            <td className="py-3.5 px-4 max-w-sm text-[10px] text-slate-600 font-medium">
                              {rec.details || "Fee Payment"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-600">
                                Fee Counter Desk
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                  rec.method === "CASH"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-blue-50 text-blue-700 border-blue-100"
                                }`}
                              >
                                {rec.method}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-slate-950">
                              {formatP(rec.amount)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenReceipt(enrichReceiptWithStudentDetails(rec, students));
                                }}
                                className="flex items-center gap-1 mx-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                                title="Print Receipt"
                              >
                                <Printer className="h-3 w-3" />
                                <span>Print</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            !lookupQuery && !lookupLimitReached && (
              <div className="bg-white border border-slate-200/70 rounded-2xl p-10 text-center space-y-2">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <UserSearch className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Lookup Student Past Receipts
                </h4>
                <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                  Enter student name (e.g. Ayush Bhardwaj or Nayra) or Admission Number in the search box above to display their complete receipt records.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}