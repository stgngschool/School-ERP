"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatP } from "@/lib/currency";
import { getTodayIST } from "@/lib/dateUtils";
import { cleanPhoneNumber } from "@/lib/whatsapp";
import { Sparkles, TrendingUp, FileText, Coins, CreditCard, GraduationCap, Printer, AlertTriangle } from "lucide-react";
import StudentProfileModal from "@/components/StudentProfileModal";
import AttendanceConsole from "@/components/AttendanceConsole";
import MarksFeedingConsole from "@/components/MarksFeedingConsole";
import NoticeBoardView from "@/components/NoticeBoardView";
import PrintMarksheets from "@/components/PrintMarksheets";

// Modular Accountant Subcomponents (Phase 1 Performance Modularization)
import PrintReceiptModal from "@/components/accountant/PrintReceiptModal";
import FeeStructuresTab from "@/components/accountant/FeeStructuresTab";
import LedgerReceiptsTab from "@/components/accountant/LedgerReceiptsTab";
import DefaultersReportTab from "@/components/accountant/DefaultersReportTab";
import FeeCollectTab from "@/components/accountant/FeeCollectTab";

// ── H-10 / L-09 / L-02: Stable module-level valid tabs list.
// Excludes unrendered tabs ('students', 'idcards', 'audit') to prevent blank screens for accountants.
const VALID_ACCOUNTANT_TABS = [
  "dashboard",
  "collect",
  "attendance",
  "defaulters",
  "ledger",
  "structures",
  "print_marksheets",
  "marks",
  "notices",
] as const;

export default function AccountantDashboard() {
  const {
    user,
    students,
    dueItems,
    receipts,
    ledgerEntries,
    feeHeads,
    feeStructures,
    concessions,
    schoolInfo,
    recordItemizedPayment,
    addFeeHead,
    addFeeStructure,
    activeTab,
    setActiveTab,
    classes,
    studentsLoaded,
    billingLoaded,
    refreshStudents,
    refreshBilling,
  } = useAuth();

  const currentTab = VALID_ACCOUNTANT_TABS.includes(activeTab as any) ? activeTab : "collect";

  useEffect(() => {
    if (!VALID_ACCOUNTANT_TABS.includes(activeTab as any)) {
      setActiveTab("collect");
    }
  }, [activeTab, setActiveTab]);

  // Cross-tab state: selected student for payment flow
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Printable receipt overlay state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  // Student Profile Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileStudentId, setProfileStudentId] = useState("");

  const handleOpenStudentProfile = (studentId: string) => {
    setProfileStudentId(studentId);
    setShowProfileModal(true);
  };

  const handleOpenReceiptModal = (receipt: any) => {
    setActiveReceipt(receipt);
    setShowReceiptModal(true);
  };

  const handleSelectStudentForPayment = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab("collect");
  };

  const handleSendReceiptWhatsApp = (rec: any) => {
    const std =
      students.find((s) => s.id === rec.studentId) ||
      students.find((s) => s.name === rec.studentName);
    const phone = std?.fatherMobile || std?.parentPhone || "";
    const parentName = std?.parentName || "Parent";

    const itemsText =
      rec.items && rec.items.length > 0
        ? rec.items
            .map(
              (i: any) =>
                `• ${i.name || i.description}: ${formatP(i.amount)}${
                  i.discount > 0 ? ` (Disc: ${formatP(i.discount)})` : ""
                }`
            )
            .join("\n")
        : `• Details: ${rec.details || "Fee Payment"}`;

    const message =
      `🏛️ *ST. GNG SCHOOL - FEE PAYMENT RECEIPT*\n\n` +
      `Dear ${parentName},\n` +
      `Fee payment has been successfully recorded.\n\n` +
      `📄 *Receipt No:* ${rec.receiptNo}\n` +
      (rec.manualReceiptNo ? `📖 *Book/Offline Rec No:* ${rec.manualReceiptNo}\n` : ``) +
      `👦 *Student / Family:* ${rec.studentName} (${rec.classSection})\n` +
      `💳 *Payment Method:* ${rec.method} Counter\n` +
      `📅 *Date:* ${rec.createdAt || getTodayIST()}\n\n` +
      `*Fee Breakdown:*\n${itemsText}\n\n` +
      `💰 *Total Paid:* ${formatP(rec.amount)}\n` +
      (rec.discount > 0 ? `🏷️ *Total Discount:* ${formatP(rec.discount)}\n` : ``) +
      (rec.arrears > 0 ? `⚠️ *Remaining Balance:* ${formatP(rec.arrears)}\n` : `✅ *All Dues Cleared*\n`) +
      `\nThank you!\n*St. GNG School Finance Office*`;

    const encoded = encodeURIComponent(message);
    const finalPhone = cleanPhoneNumber(phone);

    if (finalPhone) {
      window.open(`https://wa.me/${finalPhone}?text=${encoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  // Record Scope State: Default to "all" so small school accountants see all school data, with toggle to "my"
  const [recordScope, setRecordScope] = useState<"all" | "my">("all");

  // Top KPI Metrics
  const todayStr = getTodayIST();
  const myReceipts = receipts.filter(
    (r) =>
      r.createdById === user?.id ||
      r.collectedBy === user?.name ||
      r.collectedBy === user?.email ||
      r.collectedBy === "Accountant"
  );
  const myTodayReceipts = myReceipts.filter(
    (r) => r.createdAt && r.createdAt.startsWith(todayStr)
  );
  const myTodayCollections = myTodayReceipts.reduce((sum, r) => sum + r.amount, 0);

  // School-wide totals for instant visibility in single-counter or small school environments
  const schoolTodayReceipts = receipts.filter(
    (r) => r.createdAt && r.createdAt.startsWith(todayStr)
  );
  const schoolTodayCollections = schoolTodayReceipts.reduce((sum, r) => sum + r.amount, 0);

  const isMyScope = recordScope === "my";
  const activeReceipts = isMyScope ? myReceipts : receipts;
  const activeTodayReceipts = isMyScope ? myTodayReceipts : schoolTodayReceipts;
  const activeTodayCollections = isMyScope ? myTodayCollections : schoolTodayCollections;

  return (
    <div className="space-y-4 mobile-edge-grid">
      {/* 1. Header & Quick Overview */}
      {(currentTab === "collect" || currentTab === "dashboard") && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Welcome back, {user?.name || "Accountant"} 👋
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                  Session Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Manage school ledgers, generate receipts, record payments, and track outstanding defaulters.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Scope Switcher: All School vs My Counter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRecordScope("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    !isMyScope
                      ? "bg-white text-slate-900 shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="View all school financial collections"
                >
                  School Total ({receipts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecordScope("my")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isMyScope
                      ? "bg-white text-indigo-700 shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="View only vouchers generated from my login"
                >
                  My Counter ({myReceipts.length})
                </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* KPI 1: Daily Collection */}
            <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {isMyScope ? "My Daily Collection" : "Daily Collection (School)"}
                  </span>
                  <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <TrendingUp className="w-5 h-5" />
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                  {formatP(activeTodayCollections)}
                </h3>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100/80">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>Today ({new Date().toLocaleDateString("en-IN")}) • {isMyScope ? "My Shift" : "All Counters"}</span>
                  <span className="text-emerald-600 font-bold">Active</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-emerald-600 rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* KPI 2: Total Receipts */}
            <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {isMyScope ? "My Total Receipts" : "Total Receipts (School)"}
                  </span>
                  <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <FileText className="w-5 h-5" />
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                  {activeReceipts.length} <span className="text-sm text-slate-500 font-bold">Vouchers</span>
                </h3>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100/80">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>{isMyScope ? "Total count generated by me" : "Total vouchers in system"}</span>
                  {activeTodayReceipts.length > 0 && (
                    <span className="text-indigo-600 font-bold">{activeTodayReceipts.length} Today</span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 3: Counter Balance */}
            <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {isMyScope ? "My Counter Balance" : "Today's Counter Balance"}
                  </span>
                  <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                    <Coins className="w-5 h-5" />
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                  {formatP(activeTodayCollections)}
                </h3>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100/80">
                {(() => {
                  const todayCash = activeTodayReceipts
                    .filter((r) => r.method === "CASH")
                    .reduce((sum, r) => sum + r.amount, 0);
                  const todayUpi = activeTodayReceipts
                    .filter((r) => r.method === "UPI")
                    .reduce((sum, r) => sum + r.amount, 0);
                  const base = activeTodayCollections > 0 ? activeTodayCollections : 1;
                  return (
                    <>
                      <div className="flex justify-between items-center text-[10px] mb-1.5 font-bold">
                        <span className="text-slate-600">Cash: {formatP(todayCash)}</span>
                        <span className="text-indigo-600">UPI: {formatP(todayUpi)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                        <div className="h-full bg-slate-400" style={{ width: `${(todayCash / base) * 100}%` }} />
                        <div className="h-full bg-indigo-400" style={{ width: `${(todayUpi / base) * 100}%` }} />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick Action Navigation Strip for Accountant */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
        <button
          onClick={() => setActiveTab("collect")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === "collect"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
          Fee Collection
        </button>
        <button
          onClick={() => setActiveTab("marks")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === "marks"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <GraduationCap className={`w-3.5 h-3.5 ${currentTab === "marks" ? "text-white" : "text-indigo-600"}`} />
          Class Marks Entry
        </button>
        <button
          onClick={() => setActiveTab("print_marksheets")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === "print_marksheets"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-100"
              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-emerald-600"
          }`}
        >
          <Printer className={`w-3.5 h-3.5 ${currentTab === "print_marksheets" ? "text-white" : "text-emerald-600"}`} />
          Print Marksheets
        </button>
        <button
          onClick={() => setActiveTab("defaulters")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === "defaulters"
              ? "bg-amber-600 text-white shadow-sm shadow-amber-100"
              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-amber-600"
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${currentTab === "defaulters" ? "text-white" : "text-amber-600"}`} />
          Fee Defaulters
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === "ledger"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Receipts Ledger
        </button>
      </div>

      {/* 2. Main Tab Body */}
      {currentTab === "marks" ? (
        <MarksFeedingConsole />
      ) : currentTab === "print_marksheets" ? (
        <PrintMarksheets />
      ) : currentTab === "attendance" ? (
        <AttendanceConsole />
      ) : currentTab === "notices" ? (
        <NoticeBoardView
          title="Finance & Official School Circulars"
          subtitle="Fee deadlines, administrative circulars, and institutional announcements."
        />
      ) : (
        <div className="bg-white border-y sm:border border-slate-200/60 p-4 sm:p-8 sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          {/* TAB: Collect Fee */}
          {currentTab === "collect" && (
            <FeeCollectTab
              students={students}
              dueItems={dueItems}
              receipts={receipts}
              concessions={concessions}
              schoolInfo={schoolInfo}
              studentsLoaded={studentsLoaded}
              billingLoaded={billingLoaded}
              selectedStudentId={selectedStudentId}
              setSelectedStudentId={setSelectedStudentId}
              onViewStudentProfile={handleOpenStudentProfile}
              onOpenReceipt={handleOpenReceiptModal}
              recordItemizedPayment={recordItemizedPayment}
              refreshBilling={refreshBilling}
            />
          )}

          {/* TAB: Defaulters & Outstanding Dues Report */}
          {currentTab === "defaulters" && (
            <DefaultersReportTab
              students={students}
              dueItems={dueItems}
              receipts={receipts}
              classes={classes}
              schoolInfo={schoolInfo}
              studentsLoaded={studentsLoaded}
              billingLoaded={billingLoaded}
              onSelectStudentForPayment={handleSelectStudentForPayment}
              onViewStudentProfile={handleOpenStudentProfile}
            />
          )}

          {/* TAB: Fee Structures & Heads Configuration */}
          {currentTab === "structures" && (
            <FeeStructuresTab
              feeHeads={feeHeads}
              feeStructures={feeStructures}
              classes={classes}
              addFeeHead={addFeeHead}
              addFeeStructure={addFeeStructure}
            />
          )}

          {/* TAB: Ledger, Receipts & Cashier Shift Reconciliation */}
          {currentTab === "ledger" && (
            <LedgerReceiptsTab
              receipts={receipts}
              ledgerEntries={ledgerEntries}
              students={students}
              user={user}
              billingLoaded={billingLoaded}
              onOpenReceipt={handleOpenReceiptModal}
            />
          )}
        </div>
      )}

      {/* Global Modals */}
      <StudentProfileModal
        studentId={profileStudentId || selectedStudentId}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <PrintReceiptModal
        show={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        activeReceipt={activeReceipt}
        schoolInfo={schoolInfo}
        user={user}
        onSendWhatsApp={handleSendReceiptWhatsApp}
      />
    </div>
  );
}