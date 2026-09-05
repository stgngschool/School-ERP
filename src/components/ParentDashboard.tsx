"use client";

import React, { useState } from "react";
import { formatP } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  BookOpen,
  Calendar as CalendarIcon,
  Users,
} from "lucide-react";

import StudentProfileModal from "@/components/StudentProfileModal";
import NoticeBoardView from "@/components/NoticeBoardView";
import PrintReceiptModal from "@/components/accountant/PrintReceiptModal";
import ParentFinanceTab from "@/components/parent/ParentFinanceTab";
import ParentAttendanceTab from "@/components/parent/ParentAttendanceTab";
import ParentAcademicsTab from "@/components/parent/ParentAcademicsTab";
import ParentLeaveTab from "@/components/parent/ParentLeaveTab";
import { matchStudentToClass, normalizeDisplayClassName, getCleanClassKey } from "@/lib/classUtils";

// ── H-10 / L-09: Define valid tabs at module level so reference is stable
const VALID_PARENT_TABS = ["dashboard", "reportcard", "fees", "homework", "attendance", "leave", "notices"] as const;

export default function ParentDashboard() {
  const {
    user,
    students,
    dueItems,
    attendances,
    homeworks,
    leaveRequests,
    schoolInfo,
    receipts,
    recordItemizedPayment,
    applyLeave,
    activeTab,
    setActiveTab,
    billingLoaded,
  } = useAuth();

  // PD-01 / A-06: parentStudents contains only this parent's own children
  const parentStudents = user?.role === "PARENT" ? students : [];

  const [selectedChildId, setSelectedChildId] = useState("");
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  React.useEffect(() => {
    if (parentStudents.length > 0) {
      if (!selectedChildId || !parentStudents.some((s) => s.id === selectedChildId)) {
        setSelectedChildId(parentStudents[0].id);
      }
    }
  }, [parentStudents, selectedChildId]);

  const child = parentStudents.find((s) => s.id === selectedChildId) || parentStudents[0];

  React.useEffect(() => {
    if (!VALID_PARENT_TABS.includes(activeTab as any)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, setActiveTab]);

  // Overall Child Calculations for Overview Cards
  const childDues = child
    ? dueItems.filter((d) => d.studentId === child.id && d.status === "UNPAID")
    : [];
  const childBalance = childDues.reduce((sum, item) => sum + item.amount, 0);

  const childAttendances = child ? attendances.filter((a) => a.studentId === child.id) : [];
  const presentDays = childAttendances.filter((a) => a.status === "PRESENT").length;
  const lateDays = childAttendances.filter((a) => a.status === "LATE").length;
  const leaveDays = childAttendances.filter((a) => a.status === "LEAVE").length;
  const totalDays = childAttendances.length;
  // ── M-01 fix: Accurate attendance rate based only on attended days (present + late). Excludes leave days.
  const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : null;

  const childHomework = child
    ? homeworks.filter((h) => {
        if (!h.classSection) return false;
        return matchStudentToClass(child, h.classSection);
      })
    : [];

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* 1. Header Banner & Sibling Switcher */}
      <div className="bg-white border-y sm:border border-slate-200/80 sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 text-left">
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">
            School Parents Portal
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1.5">
            Welcome, {user?.name || "Parent"}
          </h2>
          <p className="text-xs text-slate-400 font-semibold">
            Track your ward&apos;s fees, report cards, coursework, and daily attendance.
          </p>
        </div>

        {/* Sibling Switcher */}
        {parentStudents.length > 1 && (
          <div className="flex flex-col gap-1 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl w-full sm:min-w-[220px] sm:w-auto text-left">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Ward / Child</span>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 w-full cursor-pointer shadow-2xs"
            >
              {parentStudents.map((childObj) => (
                <option key={childObj.id} value={childObj.id}>
                  {childObj.name} (Cl {childObj.class}-{childObj.section})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Child Identity Pill */}
      {child && (
        <div className="bg-white border-y sm:border border-slate-200/80 sm:rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-3 hover:border-indigo-300 transition-all text-left">
          {child.photoUrl ? (
            <img
              src={child.photoUrl}
              alt={child.name}
              className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-base uppercase shadow-inner shrink-0">
              {child.name ? child.name.substring(0, 2) : "ST"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase truncate">{child.name}</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Cl {child.class}-{child.section}</span>
              <span className="text-slate-300">•</span>
              <span>Roll {child.rollNo || "N/A"}</span>
              <span className="text-slate-300">•</span>
              <span>Adm: {child.admissionNo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFullProfile(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 press-scale"
          >
            Profile
          </button>
        </div>
      )}

      {/* Profile Modal */}
      {showFullProfile && child && (
        <StudentProfileModal
          studentId={child.id}
          isOpen={true}
          isInline={true}
          onClose={() => setShowFullProfile(false)}
        />
      )}

      {/* 2. Dynamic Tab Routing */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {/* Card 1: Attendance Rate */}
          <div
            onClick={() => setActiveTab("attendance")}
            className="bg-white border border-slate-200/70 p-5 sm:rounded-3xl rounded-2xl shadow-2xs flex items-start justify-between hover:border-indigo-300 transition-all cursor-pointer group cv-auto-card"
          >
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {attendanceRate !== null ? `${attendanceRate}%` : "No Records"}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  {totalDays > 0 ? `${presentDays + lateDays} of ${totalDays} days attended` : "Current Academic Session"}
                </p>
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100/50 shrink-0 group-hover:scale-105 transition-transform">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Active Homework */}
          <div
            onClick={() => setActiveTab("homework")}
            className="bg-white border border-slate-200/70 p-5 sm:rounded-3xl rounded-2xl shadow-2xs flex items-start justify-between hover:border-emerald-300 transition-all cursor-pointer group cv-auto-card"
          >
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Active Homework</span>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{childHomework.length} Pending</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Due this week</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-100/50 shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Outstanding Dues */}
          <div
            onClick={() => setActiveTab("fees")}
            className="bg-white border border-slate-200/70 p-5 sm:rounded-3xl rounded-2xl shadow-2xs flex items-start justify-between hover:border-rose-300 transition-all cursor-pointer group cv-auto-card"
          >
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Outstanding Dues</span>
              <div>
                <h3 className="text-2xl font-black text-rose-600 tracking-tight">{formatP(childBalance)}</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  {childBalance <= 0
                    ? "All dues cleared ✅"
                    : schoolInfo?.upiId
                      ? "Tap to pay online via UPI"
                      : "Tap to view dues breakdown"}
                </p>
              </div>
            </div>
            <div className="h-10 w-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100/50 shrink-0 group-hover:scale-105 transition-transform">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Active Tab: Fees */}
      {activeTab === "fees" && (
        <ParentFinanceTab
          child={child}
          dueItems={dueItems}
          receipts={receipts}
          schoolInfo={schoolInfo}
          recordItemizedPayment={recordItemizedPayment}
          onOpenReceipt={(rec) => {
            setActiveReceipt(rec);
            setShowReceiptModal(true);
          }}
          billingLoaded={billingLoaded}
        />
      )}

      {/* Active Tab: Attendance */}
      {activeTab === "attendance" && (
        <ParentAttendanceTab
          child={child}
          attendances={attendances}
        />
      )}

      {/* Active Tab: Homework / Report Card */}
      {(activeTab === "homework" || activeTab === "reportcard") && (
        <ParentAcademicsTab
          child={child}
          homeworks={homeworks}
          schoolInfo={schoolInfo}
        />
      )}

      {/* Active Tab: Leave */}
      {activeTab === "leave" && (
        <ParentLeaveTab
          child={child}
          leaveRequests={leaveRequests}
          applyLeave={applyLeave}
        />
      )}

      {/* Active Tab: Notices */}
      {activeTab === "notices" && (
        <NoticeBoardView
          title="Parent Notices & Circulars"
          subtitle="Official school announcements, circular bulletins, and event alerts."
        />
      )}

      {/* Official Receipt Printable Modal */}
      {showReceiptModal && activeReceipt && (
        <PrintReceiptModal
          show={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          activeReceipt={activeReceipt}
          schoolInfo={schoolInfo}
          user={user}
          onSendWhatsApp={() => {}}
        />
      )}
    </div>
  );
}