"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  FileText,
  Coins,
  AlertTriangle,
  Users,
  CreditCard,
  ArrowRightLeft,
  GraduationCap,
  Printer,
  ArrowRight,
  CheckCircle,
  Calendar,
  ChevronRight,
  Clock,
  Wallet,
  Receipt,
  UserCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatP } from "@/lib/currency";
import { getTodayIST } from "@/lib/dateUtils";
import { isDueUpToCurrentMonth } from "@/lib/whatsapp";
import { MockStudent, MockDueItem, MockReceipt, MockSchoolInfo } from "@/context/AuthContext";

interface AccountantOverviewTabProps {
  user: any;
  schoolInfo: MockSchoolInfo;
  students: MockStudent[];
  dueItems: MockDueItem[];
  receipts: MockReceipt[];
  classes: { id: string; name: string; section?: string }[];
  billingLoaded: boolean;
  studentsLoaded: boolean;
  recordScope?: "all" | "my";
  setRecordScope?: (scope: "all" | "my") => void;
  setActiveTab: (tab: string) => void;
  onSelectStudentForPayment: (studentId: string) => void;
  onOpenReceipt: (receipt: any) => void;
}

export default function AccountantOverviewTab({
  user,
  schoolInfo,
  students,
  dueItems,
  receipts,
  classes,
  billingLoaded,
  studentsLoaded,
  setActiveTab,
  onSelectStudentForPayment,
  onOpenReceipt,
}: AccountantOverviewTabProps) {
  const todayStr = getTodayIST();

  // Privacy / Masking Mode for Sensitive Financial Figures (Default to PROTECTED / HIDDEN)
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("accountant_privacy_mode");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  const toggleCardPrivacy = (cardKey: string) => {
    setRevealedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const toggleGlobalPrivacy = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("accountant_privacy_mode", String(next));
      }
      if (next) {
        setRevealedCards({});
      } else {
        setRevealedCards({
          counter: true,
          drawer: true,
          reconciliation: true,
        });
      }
      return next;
    });
  };

  const isCardMasked = (cardKey: string) => {
    if (!privacyMode) return false;
    return !revealedCards[cardKey];
  };

  const PrivacyEyeButton = ({
    cardKey,
    title = "Amount",
    className = "",
  }: {
    cardKey: string;
    title?: string;
    className?: string;
  }) => {
    const masked = isCardMasked(cardKey);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleCardPrivacy(cardKey);
        }}
        title={masked ? `Reveal ${title}` : `Hide ${title}`}
        className={`p-1 rounded-lg transition-all cursor-pointer hover:bg-slate-100 active:scale-90 ${
          masked ? "text-slate-400 hover:text-slate-700" : "text-indigo-600 hover:text-indigo-800 bg-indigo-50/70"
        } ${className}`}
        aria-label={masked ? `Reveal ${title}` : `Hide ${title}`}
      >
        {masked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    );
  };

  // Accountant view is strictly locked to their OWN counter to protect macro school financials
  const myReceipts = useMemo(() => {
    return receipts.filter(
      (r) =>
        r.createdById === user?.id ||
        r.collectedBy === user?.name ||
        r.collectedBy === user?.email ||
        (user?.id && (r as any).collectedById === user.id) ||
        r.collectedBy === "Accountant"
    );
  }, [receipts, user]);

  const activeTodayReceipts = useMemo(() => {
    return myReceipts.filter(
      (r) => r.createdAt && r.createdAt.startsWith(todayStr)
    );
  }, [myReceipts, todayStr]);

  const activeTodayCollections = useMemo(() => {
    return activeTodayReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [activeTodayReceipts]);

  const todayCash = useMemo(() => {
    return activeTodayReceipts
      .filter((r) => r.method === "CASH")
      .reduce((sum, r) => sum + r.amount, 0);
  }, [activeTodayReceipts]);

  const todayUpi = useMemo(() => {
    return activeTodayReceipts
      .filter((r) => r.method === "UPI")
      .reduce((sum, r) => sum + r.amount, 0);
  }, [activeTodayReceipts]);

  const todayBank = useMemo(() => {
    return activeTodayReceipts
      .filter((r) => r.method === "BANK_TRANSFER" || r.method === "CHEQUE" || r.method === "ONLINE")
      .reduce((sum, r) => sum + r.amount, 0);
  }, [activeTodayReceipts]);

  // Defaulters Count for follow-up (Student count ONLY - NO multi-lakh grand amounts exposed!)
  const { defaultersCount, topDefaulters } = useMemo(() => {
    const studentByIdMap = new Map<string, MockStudent>();
    students.forEach((s) => studentByIdMap.set(s.id, s));

    const defaulterMap = new Map<
      string,
      { student?: MockStudent; name: string; classSection: string; amount: number; count: number; admNo: string }
    >();

    dueItems.forEach((d) => {
      if (d.status === "UNPAID" && isDueUpToCurrentMonth(d)) {
        const std = studentByIdMap.get(d.studentId);
        const existing = defaulterMap.get(d.studentId);
        if (!existing) {
          defaulterMap.set(d.studentId, {
            student: std,
            name: std?.name || "Student",
            classSection: std ? `${std.class}-${std.section}` : "N/A",
            amount: d.amount,
            count: 1,
            admNo: std?.admissionNo || "",
          });
        } else {
          existing.amount += d.amount;
          existing.count += 1;
        }
      }
    });

    const list = Array.from(defaulterMap.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));

    const sorted = [...list].sort((a, b) => b.amount - a.amount).slice(0, 5);

    return {
      defaultersCount: list.length,
      topDefaulters: sorted,
    };
  }, [dueItems, students]);

  // Recent Receipts Stream (latest vouchers generated by this cashier/counter)
  const recentReceipts = useMemo(() => {
    const sourceList = myReceipts.length > 0 ? myReceipts : receipts;
    return [...sourceList]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "") || (b.id || "").localeCompare(a.id || ""))
      .slice(0, 6);
  }, [myReceipts, receipts]);

  const baseRatio = activeTodayCollections > 0 ? activeTodayCollections : 1;

  return (
    <div className="space-y-6 font-sans text-left">
      {/* ─── 1. Header with Greeting & Counter Status ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Welcome back, {user?.name || "Accountant"} 👋
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
              Counter Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Cashier Shift & Fee Collection Console for{" "}
            <span className="font-bold text-slate-700">{schoolInfo.name || "School ERP"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Counter Shift Badge */}
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200/70 text-xs font-bold text-slate-700">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Counter: {user?.name || "Cashier"}</span>
          </div>

          <div className="h-10 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              System Live
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. Quick Command Hub ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Quick Actions Hub:
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("collect")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fee Collection Counter</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Student Directory</span>
          </button>
          <button
            onClick={() => setActiveTab("defaulters")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Defaulters & Dues</span>
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-violet-600" />
            <span>Receipts & Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab("marks")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            <span>Class Marks Entry</span>
          </button>
          <button
            onClick={() => setActiveTab("print_marksheets")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Marksheets</span>
          </button>
          <button
            onClick={toggleGlobalPrivacy}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
              privacyMode
                ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/80"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80"
            }`}
            title={
              privacyMode
                ? "Privacy Mode is ON (Amounts hidden). Click to reveal."
                : "Privacy Mode is OFF (Amounts visible). Click to protect."
            }
          >
            {privacyMode ? (
              <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span>{privacyMode ? "Privacy: Hidden" : "Privacy: Visible"}</span>
          </button>
        </div>
      </div>

      {/* ─── 3. Operational Counter Metric Cards (No Macro-Financial Aggregates) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: My Daily Counter Collection */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  My Counter Collection
                </span>
                <PrivacyEyeButton cardKey="counter" title="Counter Collections" />
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            {!billingLoaded ? (
              <div className="mt-4 animate-pulse">
                <div className="h-8 w-28 bg-slate-200/70 rounded-xl" />
              </div>
            ) : (
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                {isCardMasked("counter") ? (
                  <span className="font-mono tracking-widest text-slate-400 select-none">₹••••••</span>
                ) : (
                  formatP(activeTodayCollections)
                )}
              </h3>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Today ({new Date().toLocaleDateString("en-IN")}) • Shift</span>
              <span className="text-emerald-600 font-bold">Active</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-emerald-600 rounded-full w-full" />
            </div>
          </div>
        </div>

        {/* KPI 2: Today's Receipts Issued by Me */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Today&apos;s Receipts Issued
              </span>
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <FileText className="w-5 h-5" />
              </span>
            </div>
            {!billingLoaded ? (
              <div className="mt-4 animate-pulse">
                <div className="h-8 w-24 bg-slate-200/70 rounded-xl" />
              </div>
            ) : (
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                {activeTodayReceipts.length} <span className="text-sm text-slate-500 font-bold">Vouchers</span>
              </h3>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Generated at my counter today</span>
              <span className="text-indigo-600 font-bold">Shift Tally</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Cash in Hand (Shift Handover) */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  My Counter Cash in Hand
                </span>
                <PrivacyEyeButton cardKey="drawer" title="Drawer Cash" />
              </div>
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                <Coins className="w-5 h-5" />
              </span>
            </div>
            {!billingLoaded ? (
              <div className="mt-4 animate-pulse">
                <div className="h-8 w-28 bg-slate-200/70 rounded-xl" />
              </div>
            ) : (
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                {isCardMasked("drawer") ? (
                  <span className="font-mono tracking-widest text-slate-400 select-none">₹••••••</span>
                ) : (
                  formatP(todayCash)
                )}
              </h3>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100/80">
            <div className="flex justify-between items-center text-[10px] mb-1.5 font-bold">
              <span className="text-slate-600">Cash: {isCardMasked("drawer") ? "₹••••" : formatP(todayCash)}</span>
              <span className="text-indigo-600">UPI: {isCardMasked("drawer") ? "₹••••" : formatP(todayUpi)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
              <div className="h-full bg-slate-400" style={{ width: `${(todayCash / baseRatio) * 100}%` }} />
              <div className="h-full bg-indigo-400" style={{ width: `${(todayUpi / baseRatio) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* KPI 4: Students with Overdue Dues (Operational Count ONLY - NO multi-lakh amount) */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Students with Overdue Dues
              </span>
              <span className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                <AlertTriangle className="w-5 h-5" />
              </span>
            </div>
            {!billingLoaded ? (
              <div className="mt-4 animate-pulse">
                <div className="h-8 w-28 bg-slate-200/70 rounded-xl" />
              </div>
            ) : (
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                {defaultersCount} <span className="text-sm text-slate-500 font-bold">Students</span>
              </h3>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Follow-up required</span>
              <button
                type="button"
                onClick={() => setActiveTab("defaulters")}
                className="text-rose-600 font-bold hover:underline cursor-pointer"
              >
                View Students &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. Main Two-Column Lower Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Receipts Stream */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Recent Fee Receipts & Transactions
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Latest vouchers issued at the counter. Click to print or WhatsApp receipt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("ledger")}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
              >
                <span>Full Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentReceipts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">No receipts found yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Start collecting fees from the Fee Collection counter to generate vouchers.
                </p>
                <button
                  onClick={() => setActiveTab("collect")}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm inline-flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Go to Fee Counter</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Receipt #</th>
                      <th className="pb-3">Student & Class</th>
                      <th className="pb-3">Mode</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3 text-center pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentReceipts.map((rec) => {
                      const methodBadge =
                        rec.method === "CASH"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : rec.method === "UPI"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                          : "bg-blue-50 text-blue-700 border-blue-100";

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          onClick={() => onOpenReceipt(rec)}
                        >
                          <td className="py-3 pl-2 font-mono font-bold text-slate-700">
                            {rec.receiptNo}
                            {rec.manualReceiptNo && (
                              <span className="block text-[9px] text-slate-400 font-sans">
                                Book: {rec.manualReceiptNo}
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-slate-800 block">
                              {rec.studentName || "Student"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {rec.classSection || "General"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${methodBadge}`}
                            >
                              {rec.method}
                            </span>
                          </td>
                          <td className="py-3 text-right font-black text-slate-800">
                            {formatP(rec.amount)}
                          </td>
                          <td className="py-3 text-center pr-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReceipt(rec);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Print / View Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Showing latest {recentReceipts.length} vouchers</span>
            <button
              onClick={() => setActiveTab("ledger")}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Search all in Ledger &rarr;
            </button>
          </div>
        </div>

        {/* Right 1 Col: Top Defaulters & Shift Reconciliation */}
        <div className="space-y-6">
          {/* Top Defaulters Follow-up */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-black text-slate-800 tracking-tight">
                  Defaulter Follow-up List
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("defaulters")}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                View All &rarr;
              </button>
            </div>

            {topDefaulters.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                🎉 No overdue defaulters pending up to current month!
              </div>
            ) : (
              <div className="space-y-2.5">
                {topDefaulters.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50/50 border border-slate-100 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {item.classSection} {item.admNo ? `• Adm: ${item.admNo}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-500 block">
                        Due: {formatP(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectStudentForPayment(item.id)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer mt-0.5 inline-flex items-center gap-0.5"
                      >
                        <span>Collect</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cashier Shift Drawer Breakdown (My Desk Only) */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Wallet className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-black text-slate-800 tracking-tight">
                  My Shift Drawer Reconciliation
                </h4>
                <PrivacyEyeButton cardKey="reconciliation" title="Shift Reconciliation" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Today
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Cash in My Drawer:
                </span>
                <span className="font-bold text-slate-800">{isCardMasked("reconciliation") ? "₹••••••" : formatP(todayCash)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  UPI / QR Collections:
                </span>
                <span className="font-bold text-indigo-600">{isCardMasked("reconciliation") ? "₹••••••" : formatP(todayUpi)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Bank / Cheque / Online:
                </span>
                <span className="font-bold text-blue-600">{isCardMasked("reconciliation") ? "₹••••••" : formatP(todayBank)}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Shift Total Handover:</span>
                <span className="text-sm font-black text-emerald-600">
                  {isCardMasked("reconciliation") ? "₹••••••" : formatP(activeTodayCollections)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
