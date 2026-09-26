"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { formatP } from "@/lib/currency";
import { getTodayIST } from "@/lib/dateUtils";
import { cleanPhoneNumber } from "@/lib/whatsapp";
import { isGhostClassName, sortClassObjects } from "@/lib/classUtils";

const ConsoleLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px] shadow-xs">
    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-semibold text-slate-500 mt-3 tracking-wide">Loading module...</span>
  </div>
);

// Code-split modular admin tab components with on-demand dynamic loading
const DashboardOverviewTab = dynamic(() => import("@/components/admin/DashboardOverviewTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const FeeCollectTab = dynamic(() => import("@/components/admin/FeeCollectTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const FeeStructuresTab = dynamic(() => import("@/components/admin/FeeStructuresTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const UsersSecurityTab = dynamic(() => import("@/components/admin/UsersSecurityTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const NoticesTab = dynamic(() => import("@/components/admin/NoticesTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const StudentDirectoryTab = dynamic(() => import("@/components/admin/StudentDirectoryTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const IdCardsTab = dynamic(() => import("@/components/admin/IdCardsTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const SchoolSetupTab = dynamic(() => import("@/components/admin/SchoolSetupTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const AuditLogsTab = dynamic(() => import("@/components/admin/AuditLogsTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const LedgerReceiptsTab = dynamic(() => import("@/components/admin/LedgerReceiptsTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const DefaultersReportTab = dynamic(() => import("@/components/admin/DefaultersReportTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});

// Consoles & specialized tools
const MarksFeedingConsole = dynamic(() => import("@/components/MarksFeedingConsole"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const PrintMarksheets = dynamic(() => import("@/components/PrintMarksheets"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const AttendanceConsole = dynamic(() => import("@/components/AttendanceConsole"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const WebsiteMediaManager = dynamic(() => import("@/components/WebsiteMediaManager"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const AdmissionLeadsDesk = dynamic(() => import("@/components/AdmissionLeadsDesk"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const FamilyHubTab = dynamic(() => import("@/components/accountant/FamilyHubTab"), {
  loading: ConsoleLoadingFallback,
  ssr: false,
});
const PrintReceiptModal = dynamic(() => import("@/components/accountant/PrintReceiptModal"), {
  ssr: false,
});

// AD-09: validTabs is a static list — defined at module level
const VALID_ADMIN_TABS = [
  "dashboard",
  "collect",
  "attendance",
  "marks",
  "print_marksheets",
  "defaulters",
  "ledger",
  "structures",
  "students",
  "families",
  "users",
  "idcards",
  "notices",
  "enquiries",
  "school",
  "audit",
  "website_media",
] as const;

export default function AdminDashboard() {
  const [itemsPerPage, setItemsPerPage] = useState(50);
  useEffect(() => {
    const handleResize = () => setItemsPerPage(window.innerWidth < 768 ? 10 : 50);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    user,
    usersList,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    updateAdminProfile,
    registerNewStaff,
    addNotice,
    updateNotice,
    deleteNotice,
    notices,
    admissionApplications,
    students,
    schoolInfo,
    updateSchoolInfo,
    auditLogs,
    activeTab,
    setActiveTab,
    dueItems,
    receipts,
    billingSummary,
    recordItemizedPayment,
    addFeeHead,
    removeFeeHead,
    feeHeads,
    addFeeStructure,
    feeStructures,
    addClass,
    removeClass,
    classes,
    ledgerEntries,
    attendances,
    updateStudentStatus,
    promoteStudent,
    eventsList,
    addEvent,
    concessions,
    updateStudentPhoto,
    refreshBilling,
    refreshUsers,
    studentsLoaded,
    billingLoaded,
    attendanceLoaded,
    showToast,
    bulkImportStudents,
  } = useAuth();

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // Cross-tab selected student state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Privacy / Masking Mode for Sensitive Financial Figures (Default to PROTECTED / HIDDEN)
  const [privacyMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_privacy_mode");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  // AD-09: Ensure valid active tab
  useEffect(() => {
    if (!VALID_ADMIN_TABS.includes(activeTab as any)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, setActiveTab]);

  const filteredSortedClasses = useMemo(() => {
    return sortClassObjects(
      (classes || []).filter(
        (c: any) => c && c.name && !isGhostClassName(c.name)
      )
    );
  }, [classes]);

  const handleSendReceiptWhatsApp = (rec: any) => {
    const std =
      students.find((s) => s.id === rec.studentId) ||
      students.find((s) => s.name === rec.studentName) ||
      (rec.studentIds && students.find((s) => rec.studentIds.includes(s.id)));
    const phone =
      std?.fatherMobile || std?.motherMobile || std?.parentPhone || "";
    const parentName = std?.parentName || std?.fatherName || "Parent";

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
      `👦 *Student / Family:* ${rec.studentName} (${rec.classSection || ""})\n` +
      `💳 *Payment Method:* ${rec.method} Counter\n` +
      `📅 *Date:* ${rec.createdAt || getTodayIST()}\n\n` +
      `*Fee Breakdown:*\n${itemsText}\n\n` +
      `💰 *Total Paid:* ${formatP(rec.amount)}\n` +
      (rec.discount > 0 ? `🏷️ *Total Discount:* ${formatP(rec.discount)}\n` : ``) +
      (rec.arrears > 0
        ? `⚠️ *Remaining Balance:* ${formatP(rec.arrears)}\n`
        : `✅ *All Dues Cleared*\n`) +
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
    <div className="space-y-6 font-sans mobile-edge-grid w-full max-w-full overflow-x-hidden text-left">
      {/* Tabs */}
      {activeTab === "dashboard" && (
        <DashboardOverviewTab
          user={user}
          students={students}
          dueItems={dueItems}
          receipts={receipts}
          ledgerEntries={ledgerEntries}
          schoolInfo={schoolInfo}
          classes={classes}
          usersList={usersList}
          billingSummary={billingSummary}
          studentsLoaded={studentsLoaded}
          billingLoaded={billingLoaded}
          attendanceLoaded={attendanceLoaded}
          attendances={attendances}
          updateSchoolInfo={updateSchoolInfo}
          showToast={showToast}
          setActiveTab={setActiveTab}
          eventsList={eventsList}
          addEvent={addEvent}
          setSelectedStudentId={setSelectedStudentId}
        />
      )}

      {activeTab === "collect" && (
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
          onViewStudentProfile={(studentId) => {
            setSelectedStudentId(studentId);
            setActiveTab("students");
          }}
          onOpenReceipt={(receipt) => {
            setActiveReceipt(receipt);
            setShowReceiptModal(true);
          }}
          recordItemizedPayment={recordItemizedPayment}
          refreshBilling={refreshBilling}
        />
      )}

      {activeTab === "structures" && (
        <FeeStructuresTab
          feeHeads={feeHeads}
          feeStructures={feeStructures}
          classes={classes}
          filteredSortedClasses={filteredSortedClasses}
          students={students}
          schoolInfo={schoolInfo}
          updateSchoolInfo={updateSchoolInfo}
          addFeeHead={addFeeHead}
          removeFeeHead={removeFeeHead}
          addFeeStructure={addFeeStructure}
          addClass={addClass}
          removeClass={removeClass}
          refreshBilling={refreshBilling}
          showToast={showToast}
        />
      )}

      {activeTab === "users" && (
        <UsersSecurityTab
          usersList={usersList}
          user={user}
          toggleUserStatus={toggleUserStatus}
          resetUserPassword={resetUserPassword}
          deleteUser={deleteUser}
          registerNewStaff={registerNewStaff}
          refreshUsers={refreshUsers}
          filteredSortedClasses={filteredSortedClasses}
          itemsPerPage={itemsPerPage}
          showToast={showToast}
        />
      )}

      {activeTab === "notices" && (
        <NoticesTab
          notices={notices}
          addNotice={addNotice}
          updateNotice={updateNotice}
          deleteNotice={deleteNotice}
          showToast={showToast}
        />
      )}

      {activeTab === "enquiries" && <AdmissionLeadsDesk />}

      {activeTab === "families" && <FamilyHubTab />}

      {activeTab === "students" && (
        <StudentDirectoryTab
          students={students}
          dueItems={dueItems}
          classes={classes}
          filteredSortedClasses={filteredSortedClasses}
          schoolInfo={schoolInfo}
          admissionApplications={admissionApplications}
          setActiveTab={setActiveTab}
          updateStudentStatus={updateStudentStatus}
          promoteStudent={promoteStudent}
          bulkImportStudents={bulkImportStudents}
          showToast={showToast}
          setSelectedStudentId={setSelectedStudentId}
        />
      )}

      {activeTab === "idcards" && (
        <IdCardsTab
          students={students}
          filteredSortedClasses={filteredSortedClasses}
          updateStudentPhoto={updateStudentPhoto}
          showToast={showToast}
        />
      )}

      {activeTab === "school" && (
        <SchoolSetupTab
          schoolInfo={schoolInfo}
          updateSchoolInfo={updateSchoolInfo}
          showToast={showToast}
          user={user}
          updateAdminProfile={updateAdminProfile}
        />
      )}

      {activeTab === "audit" && <AuditLogsTab auditLogs={auditLogs} />}

      {activeTab === "ledger" && (
        <LedgerReceiptsTab
          receipts={receipts}
          ledgerEntries={ledgerEntries}
          students={students}
          dueItems={dueItems}
          schoolInfo={schoolInfo}
          user={user}
          refreshBilling={refreshBilling}
          onOpenReceipt={(receipt) => {
            setActiveReceipt(receipt);
            setShowReceiptModal(true);
          }}
          privacyMode={privacyMode}
        />
      )}

      {activeTab === "attendance" && <AttendanceConsole />}

      {activeTab === "marks" && <MarksFeedingConsole />}

      {activeTab === "print_marksheets" && <PrintMarksheets />}

      {activeTab === "website_media" && <WebsiteMediaManager />}

      {activeTab === "defaulters" && (
        <DefaultersReportTab
          students={students}
          dueItems={dueItems}
          receipts={receipts}
          schoolInfo={schoolInfo}
          filteredSortedClasses={filteredSortedClasses}
        />
      )}

      {/* Printable Invoice Receipt Modal */}
      <PrintReceiptModal
        show={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setActiveReceipt(null);
        }}
        activeReceipt={activeReceipt}
        schoolInfo={schoolInfo}
        user={user}
        onSendWhatsApp={(rec) => handleSendReceiptWhatsApp(rec)}
      />
    </div>
  );
}
