"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  BookOpen,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Users,
  Printer,
  ChevronRight,
} from "lucide-react";

import StudentProfileModal from "@/components/StudentProfileModal";

// Groups multiple months or siblings into a single row if the list grows too long (> 4 items)
const getGroupedReceiptItems = (items: any[]) => {
  if (!items || items.length === 0) return [];
  if (items.length <= 4) return items;

  const groups: { [key: string]: { name: string; studentPrefix: string; baseFeeHead: string; months: string[]; amount: number; discount: number } } = {};

  items.forEach((item) => {
    const rawName = item.name || item.description || "";
    let studentPrefix = "";
    let rest = rawName;

    if (rawName.includes(":")) {
      const parts = rawName.split(":");
      studentPrefix = parts[0].trim();
      rest = parts.slice(1).join(":").trim();
    }

    let baseFeeHead = rest;
    let month = "";
    const monthsList = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    if (rest.includes("-")) {
      const parts = rest.split("-");
      let monthPartIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const partLower = parts[i].toLowerCase();
        const hasMonth = monthsList.some((m) => partLower.includes(m));
        if (hasMonth) {
          monthPartIndex = i;
          break;
        }
      }

      if (monthPartIndex !== -1) {
        month = parts.slice(monthPartIndex).join("-").trim();
        baseFeeHead = parts.slice(0, monthPartIndex).join("-").trim();
      }
    }

    const key = `${studentPrefix}||${baseFeeHead}`;

    if (!groups[key]) {
      groups[key] = {
        name: baseFeeHead,
        studentPrefix,
        baseFeeHead,
        months: [],
        amount: 0,
        discount: 0,
      };
    }

    if (month) {
      const monthLower = month.toLowerCase();
      const matchedMonth = monthsList.find((m) => monthLower.includes(m));
      if (matchedMonth) {
        const capMonth = matchedMonth.charAt(0).toUpperCase() + matchedMonth.slice(1);
        groups[key].months.push(capMonth);
      }
    }
    groups[key].amount += item.amount;
    groups[key].discount += item.discount || 0;
  });

  return Object.values(groups).map((g) => {
    let finalName = "";
    if (g.studentPrefix) {
      finalName += `${g.studentPrefix}: `;
    }
    finalName += g.baseFeeHead;
    if (g.months.length > 0) {
      if (g.months.length >= 3) {
        finalName += ` (${g.months[0]} to ${g.months[g.months.length - 1]})`;
      } else {
        finalName += ` (${g.months.join(", ")})`;
      }
    }
    return {
      name: finalName,
      amount: g.amount,
      discount: g.discount,
    };
  });
};

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
  } = useAuth();

  // Filter students belonging to this parent dynamically
  const parentStudents = students.filter(
    (s) => user && (s.parentPhone === user.phone || s.parentName === user.name)
  );
  
  const [selectedChildId, setSelectedChildId] = useState(
    parentStudents.length > 0 ? parentStudents[0].id : ""
  );

  React.useEffect(() => {
    if (parentStudents.length > 0) {
      if (!selectedChildId || !parentStudents.some((s) => s.id === selectedChildId)) {
        setSelectedChildId(parentStudents[0].id);
      }
    }
  }, [parentStudents, selectedChildId]);

  const [showFullProfile, setShowFullProfile] = useState(false);

  const child = students.find((s) => s.id === selectedChildId) || parentStudents[0];

  // Child-specific datasets
  const childDues = child ? dueItems.filter((d) => d.studentId === child.id && d.status === "UNPAID") : [];
  const childAttendances = child ? attendances.filter((a) => a.studentId === child.id) : [];
  const childHomework = child ? homeworks.filter(
    (h) => h.classSection === `${child.class}-${child.section}`
  ) : [];
  const childLeaves = child ? leaveRequests.filter((l) => l.studentId === child.id) : [];

  // Selection state for payment checkouts
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState("UPI");
  const [showPayModal, setShowPayModal] = useState(false);
  
  // Printable Invoice Receipt States
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [receiptPageSize, setReceiptPageSize] = useState<"A4" | "A5">("A5");

  // Leave Form States
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [showLeaveSuccess, setShowLeaveSuccess] = useState(false);
  const [selectedExamTab, setSelectedExamTab] = useState("");

  const handleToggleDueSelection = (dueId: string) => {
    setSelectedDueIds((prev) =>
      prev.includes(dueId) ? prev.filter((id) => id !== dueId) : [...prev, dueId]
    );
  };

  const handleCheckoutClick = () => {
    if (selectedDueIds.length === 0) return;
    setShowPayModal(true);
  };

  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!child) return;
    const unpaidItems = childDues.filter((d) => selectedDueIds.includes(d.id));
    const totalAmount = unpaidItems.reduce((sum, item) => sum + item.amount, 0);

    if (totalAmount <= 0) return;

    const items = unpaidItems.map((d) => ({
      ledgerEntryId: d.id,
      payAmount: d.amount,
      discountAmount: 0,
    }));
    recordItemizedPayment(child.id, items, payMethod);

    // Track recently generated receipt details for print layout
    const matchedReceipt = {
      receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: child.name,
      classSection: `${child.class}-${child.section}`,
      admissionNo: child.admissionNo,
      amount: totalAmount,
      method: payMethod,
      details: unpaidItems.map((i) => `${i.name} (Rs. ${i.amount})`).join(" + "),
      createdAt: new Date().toISOString().split("T")[0],
    };

    setActiveReceipt(matchedReceipt);
    setSelectedDueIds([]);
    setShowPayModal(false);
    setShowReceiptModal(true);
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || !leaveStart || !leaveEnd || !leaveReason) return;

    applyLeave(child.id, leaveStart, leaveEnd, leaveReason);
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("");
    setShowLeaveSuccess(true);
    setTimeout(() => setShowLeaveSuccess(false), 3000);
  };

  // Compute subtotal of selected due checkouts
  const paymentSubtotal = childDues
    .filter((d) => selectedDueIds.includes(d.id))
    .reduce((sum, item) => sum + item.amount, 0);

  // Compute total outstanding balance from unpaid items
  const childBalance = childDues.reduce((sum, item) => sum + item.amount, 0);

  // Compute attendance summary
  const presentDays = childAttendances.filter((a) => a.status === "PRESENT").length;
  const leaveDays = childAttendances.filter((a) => a.status === "LEAVE").length;
  const lateDays = childAttendances.filter((a) => a.status === "LATE").length;
  const absentDays = childAttendances.filter((a) => a.status === "ABSENT").length;
  const totalDays = childAttendances.length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentDays + leaveDays) / totalDays) * 100) : 100;

  // Generate 30-day Calendar Grid mock for July 2026
  const calendarDays = Array.from({ length: 30 }, (_, index) => {
    const dayNumber = index + 1;
    const dateStr = `2026-07-${String(dayNumber).padStart(2, "0")}`;
    const statusRecord = childAttendances.find((a) => a.date === dateStr);
    return {
      day: dayNumber,
      date: dateStr,
      status: statusRecord ? statusRecord.status : "UNMARKED",
    };
  });

  const validTabs = ["dashboard", "reportcard", "fees", "homework", "attendance", "leave"];
  React.useEffect(() => {
    if (!validTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [activeTab]);

  const availableExams = schoolInfo?.exams && schoolInfo.exams.length > 0
    ? schoolInfo.exams
    : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];

  const currentExamTab = selectedExamTab || (availableExams.length > 0 ? availableExams[0] : "");

  if (!child) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Users className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-500 text-center">No students linked to this parent account.<br/>Please contact the school administration.</p>
      </div>
    );
  }

  return (
    <div className="-mx-2 sm:mx-0 space-y-4 pb-2 font-sans w-full max-w-full overflow-x-hidden">
      {/* 1. Header Banner & Sibling Switcher */}
      <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl p-3 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">
            School Parents Portal
          </span>
          <h2 className="text-lg font-black text-slate-900 tracking-tight mt-2">Welcome, {user?.name || "Parent"}</h2>
          <p className="text-xs text-slate-500 font-medium">
            Fees, assignments, attendance, and leave requests.
          </p>
        </div>

        {/* Sibling Switcher */}
        {parentStudents.length > 1 && (
          <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 p-3 rounded-xl w-full sm:min-w-[200px] sm:w-auto">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Child</span>
            <select
              value={selectedChildId}
              onChange={(e) => { setSelectedChildId(e.target.value); setSelectedDueIds([]); }}
              className="bg-white border border-slate-200 rounded-lg py-2 px-3 font-bold text-slate-800 outline-none focus:border-indigo-600 w-full cursor-pointer"
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

      {child && (
        <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-3 hover:border-indigo-300 transition-all duration-300">
          {child.photoUrl ? (
            <img src={child.photoUrl} alt={child.name} className="h-14 w-14 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl uppercase shadow-inner shrink-0">
              {child.name ? child.name.substring(0, 2) : "ST"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-slate-800 tracking-tight uppercase truncate">{child.name}</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Cl {child.class}-{child.section}</span>
              <span className="text-slate-300">•</span>
              <span>Roll {child.rollNo || "N/A"}</span>
              <span className="text-slate-300">•</span>
              <span>{child.admissionNo}</span>
              {child.isRte && (
                <span className="bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-purple-200">RTE</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFullProfile(true)}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 press-scale"
          >
            Profile
          </button>
        </div>
      )}

      {showFullProfile ? (
        <StudentProfileModal
          studentId={child.id}
          isOpen={true}
          isInline={true}
          onClose={() => setShowFullProfile(false)}
        />
      ) : (
        <>
          {/* Quick Action Stickers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Sticker 1: Pay Fees */}
        <button
          onClick={() => setActiveTab("fees")}
          className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Pay School Fees</span>
        </button>

        {/* Sticker 2: Homework Board */}
        <button
          onClick={() => setActiveTab("homework")}
          className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:-rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 border border-pink-100 group-hover:scale-110 transition-transform">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Assignments</span>
        </button>

        {/* Sticker 3: Attendance History */}
        <button
          onClick={() => setActiveTab("attendance")}
          className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-650 border border-emerald-100 group-hover:scale-110 transition-transform">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Attendance Logs</span>
        </button>

        {/* Sticker 4: Apply for Leave */}
        <button
          onClick={() => setActiveTab("leave")}
          className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:-rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-655 border border-amber-100 group-hover:scale-110 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Apply Leave</span>
        </button>
      </div>

      {/* 2. Dynamic Views based on activeTab */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          {/* Card 1: Attendance Rate */}
          <div className="bg-white border border-slate-200/80 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm flex items-start justify-between hover:border-indigo-300 transition-all duration-300 relative overflow-hidden group">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{attendanceRate}%</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">July 2026 Academic Cycle</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Active Homework */}
          <div className="bg-white border border-slate-200/80 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm flex items-start justify-between hover:border-indigo-300 transition-all duration-300 relative overflow-hidden group">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Homework</span>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{childHomework.length} Pending</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Due by end of this week</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 border border-emerald-100 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Outstanding Dues */}
          <div className="bg-white border border-slate-200/80 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm flex items-start justify-between hover:border-indigo-300 transition-all duration-300 relative overflow-hidden group">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Dues</span>
              <div>
                <h3 className="text-2xl font-black text-rose-600 tracking-tight">Rs. {childBalance.toLocaleString("en-IN")}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Clear via "Pay Fees" tab</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {activeTab === "reportcard" && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Header Panel */}
          <div className="bg-white border border-slate-200/80 p-3 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-2">
            <h3 className="text-xs font-black uppercase text-indigo-600 tracking-widest">
              Academic Report Card
            </h3>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              {child?.name}'s Marksheets
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold">
              Toggle between exams to view grades, subject scores, aggregate performance, and teacher notes.
            </p>
          </div>

          {/* Exam Toggle Navigation (Dynamic tabs) */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {availableExams.map((exam) => {
              const isActive = currentExamTab.toLowerCase() === exam.toLowerCase();
              return (
                <button
                  key={exam}
                  onClick={() => setSelectedExamTab(exam)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {exam}
                </button>
              );
            })}
          </div>

          {/* Report Card content */}
          {(() => {
            const examMarks = (child?.marks || []).filter(
              (m: any) => m.examName.toLowerCase() === currentExamTab.toLowerCase()
            );

            if (examMarks.length === 0) {
              return (
                <div className="bg-white border border-slate-200/85 p-12 rounded-2xl shadow-sm text-center text-slate-400 font-semibold italic">
                  No academic grades recorded for {child?.name} in {currentExamTab} Examination.
                </div>
              );
            }

            const totalObtained = examMarks.reduce((sum: number, m: any) => sum + m.marksObtained, 0);
            const totalMax = examMarks.reduce((sum: number, m: any) => sum + m.maxMarks, 0);
            const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
            const isPassed = percentage >= 40;

            const getGrade = (pct: number) => {
              if (pct >= 95) return "A+";
              if (pct >= 85) return "A";
              if (pct >= 75) return "B";
              if (pct >= 60) return "C";
              if (pct >= 50) return "D";
              if (pct >= 40) return "E";
              return "F";
            };

            const finalGrade = getGrade(percentage);

            return (
              <div className="space-y-6">
                {/* Aggregate Scorecard Panel */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Score Card */}
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Marks</span>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">
                        {totalObtained} <span className="text-xs text-slate-400 font-bold">/ {totalMax}</span>
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">Marks Obtained</p>
                    </div>
                  </div>

                  {/* Percentage Card */}
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Percentage</span>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{percentage}%</h3>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full rounded-full ${isPassed ? "bg-indigo-600" : "bg-red-500"}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Aggregate Grade */}
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Overall Grade</span>
                    <div>
                      <h3 className={`text-xl font-black ${isPassed ? "text-indigo-600" : "text-rose-600"}`}>
                        {finalGrade}
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">Based on total aggregate</p>
                    </div>
                  </div>

                  {/* Pass/Fail Status Badge */}
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm flex flex-col justify-center items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Result Status</span>
                    {isPassed ? (
                      <span className="px-4 py-1.5 bg-green-50 border border-green-200 rounded-xl text-green-700 font-black text-xs uppercase tracking-wider">
                        PASSED
                      </span>
                    ) : (
                      <span className="px-4 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-black text-xs uppercase tracking-wider">
                        FAILED
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject-Wise Report Card Table */}
                <div className="bg-white border border-slate-200/80 sm:rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Subject Details ({currentExamTab})
                    </h4>
                  </div>
                  {(() => {
                    const examConfig = schoolInfo?.examConfig?.[currentExamTab] || { isSplit: false, maxMarks: 100, components: [] };
                    const isSplitExam = examConfig.isSplit;
                    const splitComponents = examConfig.components || [];

                    return (
                      <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              {isSplitExam ? (
                                <tr className="bg-white border-b border-slate-100 font-bold text-slate-400">
                                  <th className="p-3">Subject</th>
                                  {splitComponents.map((comp: any, idx: number) => (
                                    <th key={idx} className="p-3 text-center">
                                      {comp.name} ({comp.max})
                                    </th>
                                  ))}
                                  <th className="p-3 text-center">Total Obtained</th>
                                  <th className="p-3 text-center">Grade</th>
                                  <th className="p-3">Teacher Remarks</th>
                                </tr>
                              ) : (
                                <tr className="bg-white border-b border-slate-100 font-bold text-slate-400">
                                  <th className="p-3">Subject</th>
                                  <th className="p-3 text-center">Marks Obtained</th>
                                  <th className="p-3 text-center">Max Marks</th>
                                  <th className="p-3 text-center">Percentage</th>
                                  <th className="p-3 text-center">Grade</th>
                                  <th className="p-3">Teacher Remarks</th>
                                </tr>
                              )}
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                              {examMarks.map((mark: any) => {
                                const scorePct = mark.maxMarks > 0 ? Math.round((mark.marksObtained / mark.maxMarks) * 100) : 0;
                                const subjectGrade = getGrade(scorePct);

                                if (isSplitExam) {
                                  return (
                                    <tr key={mark.id} className="hover:bg-slate-50/20">
                                      <td className="p-3 text-slate-800 font-bold">{mark.subject}</td>
                                      {splitComponents.map((comp: any, idx: number) => {
                                        let val: any = mark.breakdown?.[comp.name];
                                        if (val === undefined || val === null) {
                                          // Fallback checking legacy fields
                                          const norm = comp.name.toLowerCase().replace(/[^a-z]/g, "");
                                          if (norm.includes("written") || norm.includes("exam")) val = mark.writtenExam;
                                          else if (norm.includes("notebook") || norm.includes("note")) val = mark.notebook;
                                          else if (norm.includes("enrichment") || norm.includes("enri") || norm.includes("sub")) val = mark.subjectEnrichment;
                                          else if (norm.includes("practical") || norm.includes("act") || norm.includes("prac")) val = mark.practical;
                                        }
                                        return (
                                          <td key={idx} className="p-3 text-center text-slate-500 font-medium">
                                            {val !== undefined && val !== null ? val : "--"}
                                          </td>
                                        );
                                      })}
                                      <td className="p-3 text-center font-black text-indigo-600">{mark.marksObtained} / {mark.maxMarks}</td>
                                      <td className="p-3 text-center">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-750">
                                          {subjectGrade}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-500 italic font-medium">
                                        {mark.remarks || "No comments entered."}
                                      </td>
                                    </tr>
                                  );
                                } else {
                                  return (
                                    <tr key={mark.id} className="hover:bg-slate-50/20">
                                      <td className="p-3 text-slate-800 font-bold">{mark.subject}</td>
                                      <td className="p-3 text-center font-bold text-slate-900">{mark.marksObtained}</td>
                                      <td className="p-3 text-center text-slate-400">{mark.maxMarks}</td>
                                      <td className="p-3 text-center font-black text-indigo-600">
                                        {mark.maxMarks > 0 ? `${scorePct}%` : "N/A"}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                          scorePct >= 40 ? "bg-indigo-50 text-indigo-750" : "bg-rose-50 text-rose-750"
                                        }`}>
                                          {subjectGrade}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-500 italic font-medium">
                                        {mark.remarks || "No comments entered."}
                                      </td>
                                    </tr>
                                  );
                                }
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
                          {examMarks.map((mark: any) => {
                            const scorePct = mark.maxMarks > 0 ? Math.round((mark.marksObtained / mark.maxMarks) * 100) : 0;
                            const subjectGrade = getGrade(scorePct);

                            if (isSplitExam) {
                              return (
                                <div key={mark.id} className="p-3 bg-slate-50/60 rounded-xl space-y-2 border border-slate-200/60">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-extrabold text-slate-800 text-xs">{mark.subject}</h5>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700">
                                      Grade {subjectGrade}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    {splitComponents.map((comp: any, idx: number) => {
                                      let val: any = mark.breakdown?.[comp.name];
                                      if (val === undefined || val === null) {
                                        const norm = comp.name.toLowerCase().replace(/[^a-z]/g, "");
                                        if (norm.includes("written") || norm.includes("exam")) val = mark.writtenExam;
                                        else if (norm.includes("notebook") || norm.includes("note")) val = mark.notebook;
                                        else if (norm.includes("enrichment") || norm.includes("enri") || norm.includes("sub")) val = mark.subjectEnrichment;
                                        else if (norm.includes("practical") || norm.includes("act") || norm.includes("prac")) val = mark.practical;
                                      }
                                      return (
                                        <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/60">
                                          <span className="text-slate-400 font-bold block truncate">{comp.name} ({comp.max})</span>
                                          <span className="font-black text-slate-800 text-xs">{val !== undefined && val !== null ? val : "--"}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-slate-200/50">
                                    <span className="text-slate-400 text-[10px]">Total Score</span>
                                    <span className="text-indigo-600 font-black">{mark.marksObtained} / {mark.maxMarks}</span>
                                  </div>
                                  {mark.remarks && (
                                    <p className="text-[10px] text-slate-500 italic font-medium">
                                      Teacher Note: "{mark.remarks}"
                                    </p>
                                  )}
                                </div>
                              );
                            } else {
                              return (
                                <div key={mark.id} className="p-3 bg-slate-50/60 rounded-xl space-y-2 border border-slate-200/60">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-extrabold text-slate-800 text-xs">{mark.subject}</h5>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                      scorePct >= 40 ? "bg-indigo-50 text-indigo-750" : "bg-rose-50 text-rose-750"
                                    }`}>
                                      Grade {subjectGrade}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-400 text-[10px]">Score / Max Marks</span>
                                    <span className="text-indigo-600 font-black">{mark.marksObtained} / {mark.maxMarks} ({scorePct}%)</span>
                                  </div>
                                  {mark.remarks && (
                                    <p className="text-[10px] text-slate-500 italic font-medium">
                                      Teacher Note: "{mark.remarks}"
                                    </p>
                                  )}
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "fees" && (
        <div className="space-y-6">
          {/* Outstanding Invoices Billing Desk */}
        <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl p-3 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Outstanding Invoices Billing Desk
                </h3>
              </div>
              <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded">
                Total Dues: Rs. {childBalance.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List of outstanding fees */}
              <div className="lg:col-span-2 space-y-2">
                {childDues.length > 0 ? (
                  childDues.map((item) => {
                    const isSelected = selectedDueIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleDueSelection(item.id)}
                        className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-50/50 border-indigo-500 shadow-sm"
                            : "bg-slate-50/30 border-slate-200/80 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                              Due Date: {item.dueDate}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-black text-slate-800">
                          Rs. {item.amount.toLocaleString("en-IN")}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">All Fees Fully Paid!</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                      Great! No outstanding fee invoices remaining.
                    </p>
                  </div>
                )}
              </div>

              {/* Checkout breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col justify-between h-full min-h-[160px]">
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Invoices Checkout Summary
                  </span>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-semibold">Selected Invoices</span>
                    <span className="font-bold text-slate-800">{selectedDueIds.length} item(s)</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-slate-800 font-bold">Subtotal Amount</span>
                    <span className="font-extrabold text-indigo-600">Rs. {paymentSubtotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckoutClick}
                  disabled={selectedDueIds.length === 0}
                  className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  Pay Selected Dues (Rs. {paymentSubtotal.toLocaleString("en-IN")})
                </button>
              </div>
            </div>
        </div>

          {/* Paid Receipts Ledger Log */}
          <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl p-3 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <FileText className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Paid Receipts Ledger Log
              </h3>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {receipts.filter((r) => r.studentId === child.id).length > 0 ? (
                receipts
                  .filter((r) => r.studentId === child.id)
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 border border-slate-200/80 bg-slate-50/50 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700"
                    >
                      <div>
                        <p className="font-bold text-slate-800">Receipt No: {rec.receiptNo}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Date: {rec.createdAt} | Method: {rec.method}</p>
                        <p className="text-[8px] text-indigo-600 font-bold max-w-xs truncate">{rec.details}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="font-extrabold text-slate-800">Rs. {rec.amount.toLocaleString("en-IN")}</p>
                        <button
                          onClick={() => {
                            setActiveReceipt(rec);
                            setShowReceiptModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 border border-slate-200 bg-white rounded cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-slate-400 font-medium text-center py-6">No previous receipts found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "homework" && (
        <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl p-3 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
            <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Assignments & Worksheets
            </h3>
          </div>

          <div className="space-y-3">
            {childHomework.length > 0 ? (
              childHomework.map((hw) => (
                <div key={hw.id} className="p-4 border border-slate-200/80 bg-slate-50/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                      {hw.subject}
                    </span>
                    <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-500" /> Due: {hw.dueDate}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-800">{hw.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{hw.description}</p>
                  <button className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 cursor-pointer mt-1">
                    <Download className="h-3 w-3" /> Download Worksheet
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 font-medium text-center py-8">No homework assignments.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="bg-white border border-slate-200/80 p-3 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Attendance Calendar: July 2026
              </h3>
            </div>
            <span className="text-[9px] font-black uppercase bg-green-50 text-green-700 px-2 py-0.5 rounded">
              Rate: {attendanceRate}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 border-b border-slate-200/80 pb-2 text-[9px] font-bold text-slate-400 uppercase text-center max-w-sm">
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> Present</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Absent</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Late</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500"></span> Leave</div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2 max-w-md">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
              <div key={idx} className="text-center text-[10px] font-black text-slate-400 py-1">
                {day}
              </div>
            ))}
            {calendarDays.map((dayItem) => {
              const { status } = dayItem;
              return (
                <div
                  key={dayItem.day}
                  className={`aspect-square rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center relative cursor-help transition-all ${
                    status === "PRESENT"
                      ? "bg-green-50/50 border-green-200 text-green-700"
                      : status === "ABSENT"
                      ? "bg-rose-50/50 border-rose-200 text-rose-700"
                      : status === "LATE"
                      ? "bg-amber-50/50 border-amber-200 text-amber-700"
                      : status === "LEAVE"
                      ? "bg-indigo-50/50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50/30 border-slate-200/80 text-slate-400"
                  }`}
                >
                  <span>{dayItem.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "leave" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/80 p-3 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <FileText className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Leave Application Desk
              </h3>
            </div>

            {showLeaveSuccess && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded border border-green-100 text-[11px] font-semibold">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" /> Leave petition submitted!
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reason Description</label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Mention valid health/family travel note..."
                  className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 resize-none"
                />
              </div>

              <button type="submit" className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all cursor-pointer">
                Submit Petition
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200/80 p-3 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200/80 pb-3">
              Leave Requests Log
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {leaveRequests.filter((l) => l.studentId === child.id).length > 0 ? (
                leaveRequests
                  .filter((l) => l.studentId === child.id)
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-3 border border-slate-200/80 bg-slate-50/50 rounded-xl flex items-center justify-between text-xs text-slate-700 font-semibold"
                    >
                      <div>
                        <p className="font-bold text-slate-800">Reason: {req.reason}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Dates: {req.startDate} to {req.endDate}</p>
                        {req.remarks && <p className="text-[9px] text-indigo-600 font-bold mt-1">Remarks: {req.remarks}</p>}
                      </div>
                      <div>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            req.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : req.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-slate-400 font-medium text-center py-8">No leave requests found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Unified Billing Payment Gateway Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-sm font-black uppercase text-slate-800 mb-1 border-b border-slate-200/80 pb-2">
              Unified Billing Payment Gateway
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mb-4">
              Simulating payment clearance via integrated gateway protocols.
            </p>

            <form onSubmit={handleSimulatePayment} className="space-y-4 font-sans">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Amount to Pay (Subtotal)
                </label>
                <div className="py-2 px-3 border border-slate-200/80 bg-slate-50 rounded-lg text-xs font-black text-indigo-600">
                  Rs. {paymentSubtotal.toLocaleString("en-IN")}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Select Billing Mode
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                >
                  <option value="UPI">UPI (QR Code / Instant Transfer)</option>
                  <option value="ONLINE">Credit/Debit Card Portal</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  Authorize Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Printable Invoice Receipt Modal */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl w-full p-6 shadow-2xl relative space-y-4 transition-all ${
            receiptPageSize === "A5" ? "max-w-md" : "max-w-2xl"
          }`}>
            
            {/* Page Size Selector */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-bold text-slate-500 gap-2 shrink-0">
              <span>Print Page Layout:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setReceiptPageSize("A5")}
                  className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                    receiptPageSize === "A5"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-655"
                  }`}
                >
                  📄 A5 Compact
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPageSize("A4")}
                  className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                    receiptPageSize === "A4"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-655"
                  }`}
                >
                  📄 A4 Standard
                </button>
              </div>
            </div>

            {/* Print Styling Override */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible;
                }
                #receipt-print-area {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                  box-sizing: border-box;
                  padding: ${receiptPageSize === "A5" ? "8mm" : "15mm"} !important;
                  margin: 0 !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                }
                @page {
                  size: ${receiptPageSize === "A5" ? "A5 portrait" : "A4 portrait"};
                  margin: 0;
                }
              }
            `}} />
            
            <div
              id="receipt-print-area"
              className={`border-2 rounded-2xl bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all ${
                receiptPageSize === "A5"
                  ? "border-slate-200 p-4 space-y-3 text-[9px]"
                  : "border-slate-300 p-8 space-y-6 text-sm"
              } ${
                (() => {
                  const text = (activeReceipt.details || activeReceipt.remarks || "").toLowerCase();
                  const months = ["april", "may", "june", "july", "august", "september", "october", "november", "december", "january", "february", "march"];
                  let isAnnual = text.includes("full year") || text.includes("annual") || text.includes("1 year") || text.includes("12 months");
                  if (activeReceipt.items) {
                    const itemTexts = activeReceipt.items.map((i: any) => (i.name || i.description || "").toLowerCase()).join(" ");
                    const matches = months.filter(m => itemTexts.includes(m) || text.includes(m));
                    if (matches.length >= 10) isAnnual = true;
                  }
                  return isAnnual ? "border-amber-400 bg-amber-50/10 shadow-md shadow-amber-500/5" : "";
                })()
              }`}
            >
              {/* Annual Clearance Banner */}
              {(() => {
                const text = (activeReceipt.details || activeReceipt.remarks || "").toLowerCase();
                const months = ["april", "may", "june", "july", "august", "september", "october", "november", "december", "january", "february", "march"];
                let isAnnual = text.includes("full year") || text.includes("annual") || text.includes("1 year") || text.includes("12 months");
                if (activeReceipt.items) {
                  const itemTexts = activeReceipt.items.map((i: any) => (i.name || i.description || "").toLowerCase()).join(" ");
                  const matches = months.filter(m => itemTexts.includes(m) || text.includes(m));
                  if (matches.length >= 10) isAnnual = true;
                }
                return isAnnual ? (
                  <div className={`bg-amber-500/10 border border-amber-300 text-amber-700 font-black uppercase py-1 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 select-none ${
                    receiptPageSize === "A5" ? "text-[10px]" : "text-sm py-2"
                  }`}>
                    🏆 ★ FULL YEAR ANNUAL CLEARANCE VOUCHER ★ 🏆
                  </div>
                ) : null;
              })()}

              {/* Receipt Header */}
              <div className="text-center border-b border-slate-200 pb-3 flex flex-col items-center justify-center">
                <img src="/logo.png" alt="School Logo" className={`rounded-full object-contain border border-slate-100 bg-white mb-1.5 ${
                  receiptPageSize === "A5" ? "h-10 w-10" : "h-14 w-14"
                }`} />
                <h4 className={`font-black text-indigo-700 uppercase leading-tight ${
                  receiptPageSize === "A5" ? "text-sm" : "text-xl"
                }`}>{schoolInfo.name}</h4>
                <p className={`text-slate-500 font-semibold ${
                  receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                }`}>{schoolInfo.address}</p>
                <p className={`text-slate-400 font-bold ${
                  receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                }`}>Phone: {schoolInfo.phone} | Email: {schoolInfo.email}</p>
              </div>

              {/* Metadata Card */}
              <div className={`grid grid-cols-2 bg-slate-50/70 border border-slate-100/80 rounded-xl gap-x-4 ${
                receiptPageSize === "A5" ? "text-[9px] p-2.5 gap-y-1.5" : "text-xs p-4 gap-y-2.5"
              }`}>
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-bold">Receipt No:</p>
                  <p className={`font-extrabold text-slate-900 truncate leading-tight ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>{activeReceipt.receiptNo}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-slate-400 font-bold">Date:</p>
                  <p className={`font-extrabold text-slate-900 truncate leading-tight ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>{activeReceipt.createdAt}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-bold">Student Name:</p>
                  <p className={`font-extrabold text-slate-900 leading-tight ${
                    receiptPageSize === "A5" ? "" : "text-sm"
                  }`}>{activeReceipt.studentName}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-slate-400 font-bold">Class / ID:</p>
                  <p className={`font-extrabold text-slate-900 leading-tight ${
                    receiptPageSize === "A5" ? "" : "text-sm"
                  }`}>{activeReceipt.classSection} (Adm: {activeReceipt.admissionNo})</p>
                </div>
              </div>

              {/* Itemized Table */}
              {(() => {
                const groupedItems = getGroupedReceiptItems(activeReceipt.items || []);
                const hasDiscounts = groupedItems.some((i: any) => i.discount > 0);
                
                return (
                  <div className="space-y-1.5">
                    <p className={`font-black uppercase text-slate-400 tracking-wider ${
                      receiptPageSize === "A5" ? "text-[8px]" : "text-[10px]"
                    }`}>Receipt Breakdown</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 ${
                            receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                          }`}>
                            <th className={receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}>Description</th>
                            {hasDiscounts && (
                              <th className={`text-right ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>Discount</th>
                            )}
                            <th className={`text-right ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>Paid Amount</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y divide-slate-100 font-semibold text-slate-700 ${
                          receiptPageSize === "A5" ? "text-[9px]" : "text-xs"
                        }`}>
                          {groupedItems.length > 0 ? (
                            groupedItems.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/20">
                                <td className={`max-w-[200px] truncate ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>{item.name || item.description}</td>
                                {hasDiscounts && (
                                  <td className={`text-right text-indigo-650 font-bold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                    {item.discount > 0 ? `₹${item.discount}` : "-"}
                                  </td>
                                )}
                                <td className={`text-right text-slate-900 font-extrabold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                  ₹{item.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))
                          ) : (
                            // Fallback parsing if items array is empty
                            <tr>
                              <td className={`max-w-[200px] truncate ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>{activeReceipt.details}</td>
                              <td className={`text-right text-slate-900 font-extrabold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                  ₹{activeReceipt.amount.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Status and Accounts Office */}
              <div className="flex justify-between items-center pt-2">
                <div className={`border border-green-200 bg-green-50 text-green-700 font-black uppercase rounded ${
                  receiptPageSize === "A5" ? "text-[8px] px-2.5 py-1" : "text-xs px-3.5 py-1.5"
                }`}>
                  Transaction Paid - Verified
                </div>
                <div className="text-center">
                  <p className={`text-slate-400 font-semibold border-t border-slate-350 pt-0.5 mt-0.5 ${
                    receiptPageSize === "A5" ? "text-[8px] w-24" : "text-xs w-32"
                  }`}>
                    Accounts Office
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Copy
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setActiveReceipt(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                Dismiss Receipt
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
