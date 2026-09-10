"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatP } from "@/lib/currency";
import { getTodayIST } from "@/lib/dateUtils";
import { cleanPhoneNumber } from "@/lib/whatsapp";
import StudentProfileModal from "@/components/StudentProfileModal";
import AttendanceConsole from "@/components/AttendanceConsole";
import MarksFeedingConsole from "@/components/MarksFeedingConsole";
import NoticeBoardView from "@/components/NoticeBoardView";
import PrintMarksheets from "@/components/PrintMarksheets";

// Modular Accountant Subcomponents (Phase 1 Performance Modularization)
import AccountantOverviewTab from "@/components/accountant/AccountantOverviewTab";
import PrintReceiptModal from "@/components/accountant/PrintReceiptModal";
import FeeStructuresTab from "@/components/accountant/FeeStructuresTab";
import LedgerReceiptsTab from "@/components/accountant/LedgerReceiptsTab";
import DefaultersReportTab from "@/components/accountant/DefaultersReportTab";
import FeeCollectTab from "@/components/accountant/FeeCollectTab";
import StudentDirectoryTab from "@/components/accountant/StudentDirectoryTab";

// ── H-10 / L-09 / L-02: Stable module-level valid tabs list.
// Excludes unrendered tabs ('idcards', 'audit') to prevent blank screens for accountants.
const VALID_ACCOUNTANT_TABS = [
  "dashboard",
  "collect",
  "students",
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

  const currentTab = VALID_ACCOUNTANT_TABS.includes(activeTab as any) ? activeTab : "dashboard";

  useEffect(() => {
    if (!VALID_ACCOUNTANT_TABS.includes(activeTab as any)) {
      setActiveTab("dashboard");
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

  return (
    <div className="space-y-4 mobile-edge-grid">
      {/* Tab Body */}
      {currentTab === "dashboard" ? (
        <AccountantOverviewTab
          user={user}
          schoolInfo={schoolInfo}
          students={students}
          dueItems={dueItems}
          receipts={receipts}
          classes={classes}
          billingLoaded={billingLoaded}
          studentsLoaded={studentsLoaded}
          setActiveTab={setActiveTab}
          onSelectStudentForPayment={handleSelectStudentForPayment}
          onOpenReceipt={handleOpenReceiptModal}
        />
      ) : currentTab === "marks" ? (
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
      ) : currentTab === "students" ? (
        <StudentDirectoryTab
          onCollectFee={(studentId) => {
            setSelectedStudentId(studentId);
            setActiveTab("collect");
          }}
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