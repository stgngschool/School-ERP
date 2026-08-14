import React, { useState } from "react";
import { formatP } from "@/lib/currency";
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
  ChevronLeft,
  ChevronDown,
  Paperclip,
  Loader2,
  QrCode,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import StudentProfileModal from "@/components/StudentProfileModal";
import NoticeBoardView from "@/components/NoticeBoardView";

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
    studentsLoaded,
    billingLoaded,
    attendanceLoaded,
  } = useAuth();

  // Filter students belonging to this parent dynamically
  const parentStudents = (user?.role === "PARENT" && students.length > 0)
    ? students
    : students.filter((s) => {
        if (!user) return false;
        const norm = (str?: string) => (str ? str.replace(/\D/g, "").slice(-10) : "");
        const userPhone = norm(user.phone || user.username);
        const sFatherPhone = norm(s.fatherMobile || s.parentPhone);
        const sMotherPhone = norm(s.motherMobile);
        if (userPhone && (userPhone === sFatherPhone || userPhone === sMotherPhone)) return true;
        if (user.name && s.parentName && user.name.toLowerCase().trim() === s.parentName.toLowerCase().trim()) return true;
        if (user.name && s.fatherName && user.name.toLowerCase().trim() === s.fatherName.toLowerCase().trim()) return true;
        return false;
      });
  
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
    (h) => {
      const childClass = (child.class || "").toLowerCase().replace(/\s+/g, "");
      const childSection = (child.section || "").toLowerCase().replace(/\s+/g, "");
      const hwCS = (h.classSection || "").toLowerCase().replace(/\s+/g, "");
      return hwCS.includes(childClass) || hwCS === `${childClass}-${childSection}`;
    }
  ) : [];
  const childLeaves = child ? leaveRequests.filter((l) => l.studentId === child.id) : [];

  // Selection state for payment checkouts
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState("UPI");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  
  // Printable Invoice Receipt States
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [receiptPageSize, setReceiptPageSize] = useState<"A4" | "A5">("A5");

  // Leave Form States
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFile, setLeaveFile] = useState<File | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveSuccess, setShowLeaveSuccess] = useState(false);
  const [selectedExamTab, setSelectedExamTab] = useState("");

  const [childMarks, setChildMarks] = useState<any[]>([]);

  // Attendance Month & Year Navigation
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Number of days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  // Day of week of the 1st of month (0 = Mon, 6 = Sun)
  const firstDayOfWeek = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7;

  const monthStrPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => ({
    type: "PAD" as const,
    id: `pad-${i}`,
  }));

  const activeMonthDays = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const dateStr = `${monthStrPrefix}-${String(dayNumber).padStart(2, "0")}`;
    const dayOfWeek = (firstDayOfWeek + index) % 7; // 0=Mon ... 6=Sun
    const isSunday = dayOfWeek === 6;
    const statusRecord = childAttendances.find((a) => a.date === dateStr);
    return {
      type: "DAY" as const,
      day: dayNumber,
      date: dateStr,
      isSunday,
      status: statusRecord ? statusRecord.status : (isSunday ? "SUNDAY" : "UNMARKED"),
    };
  });

  // Selected Month Attendance Stats
  const monthlyLogs = childAttendances.filter((a) => a.date.startsWith(monthStrPrefix));
  const monthlyPresent = monthlyLogs.filter((a) => a.status === "PRESENT").length;
  const monthlyAbsent = monthlyLogs.filter((a) => a.status === "ABSENT").length;
  const monthlyLeave = monthlyLogs.filter((a) => a.status === "LEAVE").length;
  const monthlyLate = monthlyLogs.filter((a) => a.status === "LATE").length;
  const monthlyTotal = monthlyLogs.length;
  const monthlyRate = monthlyTotal > 0 ? Math.round(((monthlyPresent + monthlyLeave + monthlyLate) / monthlyTotal) * 100) : 100;

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
    setSelectedCalendarDate(null);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
    setSelectedCalendarDate(null);
  };

  React.useEffect(() => {
    if (child?.id) {
      fetch(`/api/students/${child.id}/marks`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) setChildMarks(data);
        })
        .catch(console.error);
    } else {
      setChildMarks([]);
    }
  }, [child?.id]);

  const handleToggleDueSelection = (dueId: string) => {
    setSelectedDueIds((prev) =>
      prev.includes(dueId) ? prev.filter((id) => id !== dueId) : [...prev, dueId]
    );
  };

  const handleCheckoutClick = () => {
    if (selectedDueIds.length === 0) return;
    setShowPayModal(true);
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
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

    setPayLoading(true);
    try {
      const ok = await recordItemizedPayment(child.id, items, payMethod);
      if (ok) {
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
      }
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setPayLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || !leaveStart || !leaveEnd || !leaveReason) return;

    setLeaveLoading(true);
    try {
      await applyLeave(child.id, leaveStart, leaveEnd, leaveReason, leaveFile);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      setLeaveFile(null);
      setShowLeaveSuccess(true);
      setTimeout(() => setShowLeaveSuccess(false), 3500);
    } catch (err) {
      console.error("Apply leave error:", err);
    } finally {
      setLeaveLoading(false);
    }
  };

  // Compute subtotal of selected due checkouts
  const paymentSubtotal = childDues
    .filter((d) => selectedDueIds.includes(d.id))
    .reduce((sum, item) => sum + item.amount, 0);

  // Compute total outstanding balance from unpaid items
  const childBalance = childDues.reduce((sum, item) => sum + item.amount, 0);

  // Compute overall session attendance summary
  const presentDays = childAttendances.filter((a) => a.status === "PRESENT").length;
  const leaveDays = childAttendances.filter((a) => a.status === "LEAVE").length;
  const lateDays = childAttendances.filter((a) => a.status === "LATE").length;
  const absentDays = childAttendances.filter((a) => a.status === "ABSENT").length;
  const totalDays = childAttendances.length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentDays + leaveDays + lateDays) / totalDays) * 100) : 100;

  const validTabs = ["dashboard", "reportcard", "fees", "homework", "attendance", "leave", "notices"];
  React.useEffect(() => {
    if (!validTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [activeTab]);

  const availableExams = schoolInfo?.exams && schoolInfo.exams.length > 0
    ? schoolInfo.exams
    : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];

  const currentExamTab = selectedExamTab || (availableExams.length > 0 ? availableExams[0] : "");

  if (!studentsLoaded) {
    return (
      <div className="sm:mx-0 space-y-4 mobile-edge-grid pb-2 animate-pulse font-sans w-full max-w-full overflow-x-hidden">
        <div className="bg-white border border-slate-200 sm:rounded-2xl p-6 shadow-sm h-32" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl h-24" />
          ))}
        </div>
        <div className="bg-white border border-slate-200 sm:rounded-2xl shadow-sm h-96" />
      </div>
    );
  }

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
    <div className="sm:mx-0 space-y-4 mobile-edge-grid pb-2 font-sans w-full max-w-full overflow-x-hidden">
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


      {/* 2. Dynamic Views based on activeTab */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Attendance Rate */}
          <div className="bg-white border border-slate-200/60 p-5 sm:rounded-3xl rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-start justify-between hover:border-indigo-200 transition-all duration-300 relative overflow-hidden group">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{attendanceRate}%</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Current Academic Session</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100/50 shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Active Homework */}
          <div className="bg-white border border-slate-200/60 p-5 sm:rounded-3xl rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-start justify-between hover:border-indigo-200 transition-all duration-300 relative overflow-hidden group">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Homework</span>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{childHomework.length} Pending</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Due by end of this week</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-100/50 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Outstanding Dues */}
          <div className="bg-white border border-slate-200/60 p-5 sm:rounded-3xl rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-start justify-between hover:border-indigo-200 transition-all duration-300 relative overflow-hidden group">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Outstanding Dues</span>
              <div>
                <h3 className="text-2xl font-black text-rose-600 tracking-tight">{formatP(childBalance)}</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Clear via "Pay Fees" tab</p>
              </div>
            </div>
            <div className="h-10 w-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100/50 shrink-0">
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
            const examMarks = childMarks.filter(
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
        !billingLoaded ? (
          <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl p-3 sm:p-6 shadow-sm space-y-4 animate-pulse">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="h-4 bg-slate-200 w-48 rounded" />
              <div className="h-4 bg-slate-200 w-24 rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-50 border border-slate-100 rounded-xl" />
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-150 rounded-2xl h-48" />
            </div>
          </div>
        ) : (
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
                Total Dues: {formatP(childBalance)}
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
                          {formatP(item.amount)}
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
                    <span className="font-extrabold text-indigo-600">{formatP(paymentSubtotal)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckoutClick}
                  disabled={selectedDueIds.length === 0}
                  className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  Pay Selected Dues ({formatP(paymentSubtotal)})
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
                        <p className="font-extrabold text-slate-800">{formatP(rec.amount)}</p>
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
        )
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
                  <p className="text-xs text-slate-500 font-medium leading-relaxed whitespace-pre-wrap">{hw.description}</p>
                  {hw.fileUrl ? (
                    <a
                      href={hw.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors mt-1"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Attached Worksheet
                    </a>
                  ) : (
                    <span className="text-[9px] font-semibold text-slate-400 italic">No attachment file provided.</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 font-medium text-center py-8">No homework assignments.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        !attendanceLoaded ? (
          <div className="bg-white border border-slate-200/80 p-3 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-4 animate-pulse">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="h-4 bg-slate-200 w-48 rounded" />
              <div className="h-4 bg-slate-200 w-16 rounded" />
            </div>
            <div className="grid grid-cols-7 gap-2 max-w-sm">
              {[...Array(28)].map((_, i) => (
                <div key={i} className="aspect-square bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Main Attendance Calendar Card */}
          <div className="bg-white border border-slate-200/80 p-4 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-5">
            {/* Header: Month/Year Navigator & Rate */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
                      {monthNames[selectedMonth - 1]} {selectedYear}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        title="Previous Month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        title="Next Month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Viewing attendance roster for {child.name}
                  </p>
                </div>
              </div>

              {/* Monthly Stats Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  monthlyRate >= 75
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : "bg-rose-50 text-rose-700 border-rose-200/80"
                }`}>
                  Monthly Rate: {monthlyRate}%
                </span>
                <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Overall: {attendanceRate}%
                </span>
              </div>
            </div>

            {/* Quick Summary Pill Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-900">Present</span>
                </div>
                <span className="text-sm font-black text-emerald-700">{monthlyPresent}</span>
              </div>

              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-bold text-rose-900">Absent</span>
                </div>
                <span className="text-sm font-black text-rose-700">{monthlyAbsent}</span>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <span className="text-[11px] font-bold text-indigo-900">Leave</span>
                </div>
                <span className="text-sm font-black text-indigo-700">{monthlyLeave}</span>
              </div>

              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold text-amber-900">Late</span>
                </div>
                <span className="text-sm font-black text-amber-700">{monthlyLate}</span>
              </div>
            </div>

            {/* Interactive Calendar Grid */}
            <div className="max-w-2xl mx-auto pt-2">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-xs font-black uppercase text-slate-400 pb-2 border-b border-slate-100">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
                  <div key={idx} className={idx === 6 ? "text-rose-400" : ""}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2.5">
                {/* Blank Padding Cells */}
                {paddingDays.map((pad) => (
                  <div key={pad.id} className="aspect-square rounded-xl bg-slate-50/40 border border-transparent" />
                ))}

                {/* Day Cells */}
                {activeMonthDays.map((dayItem) => {
                  const { status, isSunday, day, date } = dayItem;
                  const isSelected = selectedCalendarDate === date;

                  let cellStyle = "bg-slate-50/50 border-slate-200/60 text-slate-400";
                  if (status === "PRESENT") {
                    cellStyle = "bg-emerald-50 border-emerald-300 text-emerald-700 font-black shadow-2xs";
                  } else if (status === "ABSENT") {
                    cellStyle = "bg-rose-50 border-rose-300 text-rose-700 font-black shadow-2xs";
                  } else if (status === "LEAVE") {
                    cellStyle = "bg-indigo-50 border-indigo-300 text-indigo-700 font-black shadow-2xs";
                  } else if (status === "LATE") {
                    cellStyle = "bg-amber-50 border-amber-300 text-amber-700 font-black shadow-2xs";
                  } else if (isSunday) {
                    cellStyle = "bg-slate-100/60 border-slate-200/40 text-slate-400 font-semibold";
                  }

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedCalendarDate(isSelected ? null : date)}
                      className={`aspect-square rounded-xl border text-xs sm:text-sm font-extrabold flex flex-col items-center justify-center relative transition-all cursor-pointer hover:scale-105 active:scale-95 ${cellStyle} ${
                        isSelected ? "ring-2 ring-indigo-600 ring-offset-2" : ""
                      }`}
                    >
                      <span>{day}</span>
                      {status === "PRESENT" && <span className="text-[8px] sm:text-[9px] font-black uppercase">P</span>}
                      {status === "ABSENT" && <span className="text-[8px] sm:text-[9px] font-black uppercase text-rose-600">A</span>}
                      {status === "LEAVE" && <span className="text-[8px] sm:text-[9px] font-black uppercase text-indigo-600">L</span>}
                      {status === "LATE" && <span className="text-[8px] sm:text-[9px] font-black uppercase text-amber-600">LT</span>}
                      {isSunday && status === "SUNDAY" && <span className="text-[7px] font-bold text-slate-400">OFF</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Inspector */}
            {selectedCalendarDate && (() => {
              const rec = childAttendances.find((a) => a.date === selectedCalendarDate);
              return (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs text-slate-700 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Date:</span>
                    <h5 className="font-extrabold text-slate-900">{selectedCalendarDate}</h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">Status:</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                      rec?.status === "PRESENT" ? "bg-emerald-100 text-emerald-800" :
                      rec?.status === "ABSENT" ? "bg-rose-100 text-rose-800" :
                      rec?.status === "LEAVE" ? "bg-indigo-100 text-indigo-800" :
                      rec?.status === "LATE" ? "bg-amber-100 text-amber-800" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {rec?.status || "Holiday / Unmarked"}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Detailed Attendance History List */}
          <div className="bg-white border border-slate-200/80 p-4 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Recent Daily Log History
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Verified school register logs for {child.name} ({childAttendances.length} records).
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {childAttendances.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">No attendance records logged yet.</p>
                </div>
              ) : (
                childAttendances.slice(0, 45).map((att) => (
                  <div
                    key={att.id}
                    className="p-3 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        att.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" :
                        att.status === "ABSENT" ? "bg-rose-100 text-rose-700" :
                        att.status === "LEAVE" ? "bg-indigo-100 text-indigo-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {att.status === "PRESENT" && <CheckCircle className="h-4 w-4" />}
                        {att.status === "ABSENT" && <XCircle className="h-4 w-4" />}
                        {att.status === "LEAVE" && <FileText className="h-4 w-4" />}
                        {att.status === "LATE" && <Clock className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800">{att.date}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Class {child.class}-{child.section} • Roll {child.rollNo || "N/A"}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      att.status === "PRESENT" ? "bg-emerald-100 text-emerald-800" :
                      att.status === "ABSENT" ? "bg-rose-100 text-rose-800" :
                      att.status === "LEAVE" ? "bg-indigo-100 text-indigo-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {att.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )
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

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Attachment (Doctor Note / Slip - Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="leave-file-input"
                      onChange={(e) => setLeaveFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={leaveLoading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {leaveLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {leaveLoading ? "Submitting..." : "Submit Petition"}
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

      {activeTab === "notices" && (
        <NoticeBoardView
          title="Parent Notices & Circulars"
          subtitle="Official school announcements, circular bulletins, and event alerts."
        />
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

            <form onSubmit={handleSimulatePayment} className="space-y-4 font-sans mobile-edge-grid">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Amount to Pay (Subtotal)
                </label>
                <div className="py-2 px-3 border border-slate-200/80 bg-slate-50 rounded-lg text-xs font-black text-indigo-600">
                  {formatP(paymentSubtotal)}
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
                  <option value="CASH">Counter Cash Verification</option>
                </select>
              </div>

              {payMethod === "UPI" && schoolInfo?.upiId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
                    <QrCode className="h-4 w-4" />
                    <span>School UPI VPA: {schoolInfo.upiId}</span>
                  </div>
                  {schoolInfo.upiMerchantName && (
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Payee: {schoolInfo.upiMerchantName}
                    </p>
                  )}
                  <p className="text-[9px] text-emerald-600">
                    After completing the transfer, click Authorize Payment below to generate your official receipt.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  disabled={payLoading}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  {payLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {payLoading ? "Processing..." : "Authorize Payment"}
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
                @page {
                  size: ${receiptPageSize === "A5" ? "A5 portrait" : "A4 portrait"};
                  margin: 8mm;
                }
                html, body {
                  background: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible !important;
                }
                #receipt-print-area {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  box-sizing: border-box !important;
                  padding: ${receiptPageSize === "A5" ? "4mm 6mm" : "6mm 8mm"} !important;
                  margin: 0 !important;
                  border: 1px solid #cbd5e1 !important;
                  border-radius: 16px !important;
                  box-shadow: none !important;
                  background: #ffffff !important;
                  page-break-after: avoid !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
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
                                  {formatP(item.amount)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            // Fallback parsing if items array is empty
                            <tr>
                              <td className={`max-w-[200px] truncate ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>{activeReceipt.details}</td>
                              <td className={`text-right text-slate-900 font-extrabold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                  {formatP(activeReceipt.amount)}
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
