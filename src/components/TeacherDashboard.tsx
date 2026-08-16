"use client";

import React, { useState } from "react";
import { useAuth, AttendanceStatus } from "@/context/AuthContext";
import {
  UserCheck,
  BookOpen,
  FileText,
  CheckCircle,
  XCircle,
  PlusCircle,
  Clock,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  Users,
  AlertCircle,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import StudentProfileModal from "@/components/StudentProfileModal";
import MarksFeedingConsole from "@/components/MarksFeedingConsole";
import AttendanceConsole from "@/components/AttendanceConsole";
import NoticeBoardView from "@/components/NoticeBoardView";
import ModernDatePicker from "@/components/ModernDatePicker";
import {
  generateFeeReminderWhatsAppUrl,
  isDueUpToCurrentMonth,
  getCurrentMonthName,
} from "@/lib/whatsapp";
import { formatP } from "@/lib/currency";

export default function TeacherDashboard() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfileStudentId, setSelectedProfileStudentId] = useState("");

  const {
    user,
    students,
    attendances,
    leaveRequests,
    homeworks,
    dueItems,
    schoolInfo,
    markAttendance,
    addHomework,
    deleteHomework,
    updateLeaveStatus,
    activeTab,
    setActiveTab,
    studentsLoaded,
  } = useAuth();

  const validTabs = ["attendance", "homework", "leaves", "marks", "notices", "defaulters"];
  const currentTab = validTabs.includes(activeTab) ? activeTab : "attendance";

  React.useEffect(() => {
    if (!validTabs.includes(activeTab)) {
      setActiveTab("attendance");
    }
  }, [activeTab]);

  const [selectedClass, setSelectedClass] = useState("10-A");
  const [studentSearch, setStudentSearch] = useState("");
  const [feeStatusFilter, setFeeStatusFilter] = useState<"ALL" | "UNPAID" | "PAID">("UNPAID");
  const [feeSearch, setFeeSearch] = useState("");

  // Auto-set teacher's default class when user profile loads
  React.useEffect(() => {
    if (user?.teacherProfile?.classes && user.teacherProfile.classes.length > 0) {
      const tClass = user.teacherProfile.classes[0];
      setSelectedClass(`${tClass.name}-${tClass.section}`);
    }
  }, [user]);

  // Auto-select first available class if current class has no students
  React.useEffect(() => {
    if (students.length > 0) {
      const availableClasses = Array.from(new Set(students.map((s) => `${s.class}-${s.section}`)));
      const hasCurrent = students.some((s) => `${s.class}-${s.section}` === selectedClass);
      if (!hasCurrent && availableClasses.length > 0 && !user?.teacherProfile?.classes?.length) {
        setSelectedClass(availableClasses[0]);
      }
    }
  }, [students, selectedClass, user]);

  // Homework Form State
  const [hwSubject, setHwSubject] = useState("Mathematics");
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwDueDate, setHwDueDate] = useState("");
  const [hwSuccess, setHwSuccess] = useState(false);

  // Filter students based on selected class
  const classStudents = students.filter(
    (s) => `${s.class}-${s.section}` === selectedClass
  );

  // Filter students based on search string
  const filteredStudents = classStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Filter leaves that belong to class 10-A
  const pendingLeaves = leaveRequests.filter((l) => l.status === "PENDING");

  // Helper to check today's attendance status
  const todayDateStr = new Date().toISOString().split("T")[0];

  const todaysAttendanceMap = React.useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    attendances.forEach(a => {
      if (a.date === todayDateStr) map[a.studentId] = a.status;
    });
    return map;
  }, [attendances, todayDateStr]);

  const getAttendanceStatus = (studentId: string): AttendanceStatus | "UNMARKED" => {
    return todaysAttendanceMap[studentId] || "UNMARKED";
  };

  const handleMarkAttendance = (studentId: string, status: AttendanceStatus) => {
    markAttendance(studentId, todayDateStr, status);
  };

  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle || !hwDesc || !hwDueDate) return;
    addHomework(selectedClass, hwSubject, hwTitle, hwDesc, hwDueDate);
    setHwTitle("");
    setHwDesc("");
    setHwDueDate("");
    setHwSuccess(true);
    setTimeout(() => setHwSuccess(false), 3000);
  };

  // Compute stats for today
  const markedRecords = classStudents.map((s) => getAttendanceStatus(s.id));
  const presentCount = markedRecords.filter((r) => r === "PRESENT").length;
  const absentCount = markedRecords.filter((r) => r === "ABSENT").length;
  const lateCount = markedRecords.filter((r) => r === "LATE").length;
  const leaveCount = markedRecords.filter((r) => r === "LEAVE").length;

  // Filter homework history logs
  const classHomeworkHistory = homeworks.filter(
    (h) => h.classSection === selectedClass
  );

  const getStudentLeaveCount = (studentId: string) => {
    return attendances.filter((a) => a.studentId === studentId && a.status === "LEAVE").length;
  };

  const statusConfig = {
    PRESENT: { label: "Present", color: "bg-green-600", textColor: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    ABSENT: { label: "Absent", color: "bg-rose-600", textColor: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
    LATE: { label: "Late", color: "bg-amber-500", textColor: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    LEAVE: { label: "Leave", color: "bg-indigo-600", textColor: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
    UNMARKED: { label: "Unmarked", color: "bg-slate-300", textColor: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
  };

  return (
    <div className="sm:mx-0 space-y-4 mobile-edge-grid pb-4">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Teacher Console</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Attendance, coursework, and leave management.
          </p>
        </div>
      </div>



      {/* ─── Tab Content Area ─── */}
      {!studentsLoaded ? (
        <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl shadow-sm p-6 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 w-1/3 rounded" />
          <div className="h-4 bg-slate-100 w-1/4 rounded" />
          <div className="border-t border-slate-100 pt-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <div className="flex items-center gap-3 w-1/2">
                  <div className="h-8 w-8 bg-slate-200 rounded-full" />
                  <div className="h-4 bg-slate-200 w-3/4 rounded" />
                </div>
                <div className="h-6 bg-slate-100 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : currentTab === "marks" ? (
        <MarksFeedingConsole />
      ) : currentTab === "attendance" ? (
        <AttendanceConsole initialClass={selectedClass} hideClassSelector={true} />
      ) : (
        <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl shadow-sm overflow-hidden">

          {/* TAB: Homework */}
          {currentTab === "homework" && (
            <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
              {/* Assignment Form */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Assign Coursework</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Will be visible to parents of class {selectedClass}.
                  </p>
                </div>

                {hwSuccess && (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl border border-green-100 text-sm font-semibold">
                    <CheckCircle className="h-4 w-4 shrink-0" /> Homework assigned successfully!
                  </div>
                )}

                <form onSubmit={handleAddHomework} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Subject</label>
                      <select value={hwSubject} onChange={(e) => setHwSubject(e.target.value)}
                        className="w-full font-semibold py-3 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-400 text-slate-700">
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science</option>
                        <option value="English">English</option>
                        <option value="Social Studies">Social Studies</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Due Date</label>
                      <ModernDatePicker
                        value={hwDueDate}
                        onChange={(val) => setHwDueDate(val)}
                        placeholder="Select due date"
                        className="w-full"
                        showClear={false}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Title</label>
                    <input type="text" required value={hwTitle} onChange={(e) => setHwTitle(e.target.value)}
                      placeholder="e.g. Homework on Quadratic Formula..."
                      className="w-full font-semibold py-3 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-400 text-slate-700" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Instructions</label>
                    <textarea required rows={3} value={hwDesc} onChange={(e) => setHwDesc(e.target.value)}
                      placeholder="Provide specific notes and guidelines..."
                      className="w-full font-semibold py-3 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-400 resize-none text-slate-700" />
                  </div>

                  <button type="submit"
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-500/20">
                    Broadcast Assignment
                  </button>
                </form>
              </div>

              {/* Homework History */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Assignment Log — {selectedClass}
                </h3>
                {classHomeworkHistory.length > 0 ? classHomeworkHistory.map((hw) => (
                  <div key={hw.id} className="p-3 sm:p-3.5 border border-slate-200 bg-slate-50 rounded-lg sm:rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                          {hw.subject}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">Due: {hw.dueDate}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 mt-1 text-sm truncate">{hw.title}</h4>
                    </div>
                    <button onClick={() => deleteHomework(hw.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 press-scale">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-semibold">No assignments yet for {selectedClass}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Leave Requests */}
          {currentTab === "leaves" && (
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-800">Leave Requests</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {pendingLeaves.length} pending approval{pendingLeaves.length !== 1 ? "s" : ""}
                </p>
              </div>

              {pendingLeaves.length > 0 ? pendingLeaves.map((lv) => {
                const historicalCount = getStudentLeaveCount(lv.studentId);
                return (
                  <div key={lv.id} className="p-3 sm:p-4 border border-slate-200 bg-white rounded-xl sm:rounded-2xl shadow-sm space-y-3">
                    {/* Student Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-800">{lv.studentName}</h4>
                          <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                            Class {lv.classSection}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          {lv.startDate} → {lv.endDate}
                          <span className="ml-2 text-slate-300">•</span>
                          <span className="ml-2">Leave count: {historicalCount}</span>
                        </p>
                      </div>
                      <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded-lg shrink-0">Pending</span>
                    </div>

                    {/* Reason */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{lv.reason}"</p>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        onClick={() => updateLeaveStatus(lv.id, "REJECTED", "Sorry, attendance is running low.")}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-bold press-scale transition-all"
                      >
                        <XCircle className="h-4 w-4 text-rose-500" /> Reject
                      </button>
                      <button
                        onClick={() => updateLeaveStatus(lv.id, "APPROVED", "Approved. Stay healthy.")}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold press-scale transition-all shadow-lg shadow-green-500/20"
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-16">
                  <CheckCircle className="h-12 w-12 text-green-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">All caught up!</p>
                  <p className="text-xs text-slate-300 mt-1">No pending leave requests.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Notices & Bulletins */}
          {currentTab === "notices" && (
            <div className="p-3 sm:p-4">
              <NoticeBoardView
                title="Teacher Staff Bulletins & Circulars"
                subtitle="Official administration notices, directives, and academic schedules."
              />
            </div>
          )}

          {/* TAB: Class Fee Status & Dues */}
          {currentTab === "defaulters" && (() => {
            const classStudentsList = students.filter(
              (s) => `${s.class}-${s.section}` === selectedClass
            );

            const currentMonthName = getCurrentMonthName();

            // Compute student fee status scoped strictly up to current month (e.g. August)
            const studentFeeStats = classStudentsList.map((std) => {
              const unpaidForStudent = dueItems.filter(
                (d) => d.studentId === std.id && d.status === "UNPAID" && isDueUpToCurrentMonth(d)
              );
              const totalDue = unpaidForStudent.reduce((sum, d) => sum + d.amount, 0);
              return {
                student: std,
                unpaidDues: unpaidForStudent,
                totalDue,
                isDefaulter: totalDue > 0,
              };
            });

            // Defaulters only list (unpaid dues up to current month)
            const defaultersOnly = studentFeeStats.filter((item) => item.isDefaulter);
            const totalClassDues = defaultersOnly.reduce((sum, item) => sum + item.totalDue, 0);
            const defaultersCount = defaultersOnly.length;
            const clearedCount = studentFeeStats.length - defaultersCount;

            const filteredFeeList = studentFeeStats.filter((item) => {
              const matchesFilter =
                feeStatusFilter === "ALL"
                  ? true
                  : feeStatusFilter === "PAID"
                  ? !item.isDefaulter
                  : item.isDefaulter; // Default to UNPAID (defaulters only)

              const query = feeSearch.toLowerCase().trim();
              const matchesSearch =
                !query ||
                item.student.name.toLowerCase().includes(query) ||
                (item.student.rollNo && item.student.rollNo.toLowerCase().includes(query)) ||
                (item.student.admissionNo && item.student.admissionNo.toLowerCase().includes(query)) ||
                (item.student.fatherName && item.student.fatherName.toLowerCase().includes(query));

              return matchesFilter && matchesSearch;
            });

            return (
              <div className="space-y-4 sm:space-y-6 animate-fade-in text-left pb-12 font-sans">
                {/* Header Card */}
                <div className="bg-white border border-slate-200/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black uppercase text-rose-700 bg-rose-50 border border-rose-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                      <AlertTriangle className="h-3.5 w-3.5" /> Class Fee Defaulters Desk
                    </h3>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1.5">
                      Pending Dues (Up to {currentMonthName})
                    </h2>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      Class {selectedClass} • Only students with unpaid fee dues up to {currentMonthName} are listed below.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Class:</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="text-[11px] font-extrabold py-2 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      {Array.from(new Set(students.map((s) => `${s.class}-${s.section}`))).map((cs) => (
                        <option key={cs} value={cs}>
                          Class {cs}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Summary KPI Cards (Compact & Responsive) */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-white border border-slate-200/60 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Due</span>
                      <h4 className="text-sm sm:text-xl font-black text-rose-600 tracking-tight mt-0.5 sm:mt-1">{formatP(totalClassDues)}</h4>
                    </div>
                    <div className="hidden sm:flex p-3 bg-rose-50 border border-rose-100/50 text-rose-600 rounded-2xl shadow-2xs">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-wider block">Defaulters</span>
                      <h4 className="text-sm sm:text-xl font-black text-slate-800 tracking-tight mt-0.5 sm:mt-1">{defaultersCount} Students</h4>
                    </div>
                    <div className="hidden sm:flex p-3 bg-amber-50 border border-amber-100/50 text-amber-600 rounded-2xl shadow-2xs">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-wider block">All Clear</span>
                      <h4 className="text-sm sm:text-xl font-black text-emerald-600 tracking-tight mt-0.5 sm:mt-1">{clearedCount} Students</h4>
                    </div>
                    <div className="hidden sm:flex p-3 bg-emerald-50 border border-emerald-100/50 text-emerald-600 rounded-2xl shadow-2xs">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Search & Status Filters */}
                <div className="bg-white border border-slate-200/60 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student, roll, father..."
                      value={feeSearch}
                      onChange={(e) => setFeeSearch(e.target.value)}
                      className="w-full text-[11px] font-extrabold py-2.5 pl-9 pr-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all text-slate-700 shadow-2xs placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto">
                    <button
                      onClick={() => setFeeStatusFilter("UNPAID")}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        feeStatusFilter === "UNPAID"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-rose-50 border border-rose-100/60 text-rose-700 hover:bg-rose-100/80"
                      }`}
                    >
                      Pending Dues ({defaultersCount})
                    </button>
                    <button
                      onClick={() => setFeeStatusFilter("ALL")}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        feeStatusFilter === "ALL"
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
                      }`}
                    >
                      All Class ({studentFeeStats.length})
                    </button>
                    <button
                      onClick={() => setFeeStatusFilter("PAID")}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        feeStatusFilter === "PAID"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-emerald-50 border border-emerald-100/60 text-emerald-700 hover:bg-emerald-100/80"
                      }`}
                    >
                      All Clear ({clearedCount})
                    </button>
                  </div>
                </div>

                {/* ─── MOBILE VIEW: High-Density Cards (< md) ─── */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredFeeList.map((item) => {
                    const std = item.student;
                    const phone = std.fatherMobile || std.motherMobile || std.parentPhone || "";
                    const waUrl = generateFeeReminderWhatsAppUrl({
                      student: {
                        id: std.id,
                        name: std.name,
                        class: std.class,
                        section: std.section,
                        rollNo: std.rollNo,
                        admissionNo: std.admissionNo,
                        fatherName: std.fatherName,
                        fatherMobile: std.fatherMobile,
                        motherMobile: std.motherMobile,
                        parentPhone: std.parentPhone,
                      },
                      unpaidDues: item.unpaidDues,
                      schoolInfo: {
                        name: schoolInfo?.name,
                        phone: schoolInfo?.phone,
                        upiId: schoolInfo?.upiId,
                      },
                      senderRole: "TEACHER",
                    });

                    return (
                      <div
                        key={std.id}
                        className="bg-white border border-slate-200/70 p-4 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-3"
                      >
                        {/* Student Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0 shadow-2xs">
                              {std.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-sm leading-tight">{std.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                {std.rollNo ? `Roll: ${std.rollNo} • ` : ""}ADM: {std.admissionNo || "N/A"}
                              </p>
                            </div>
                          </div>

                          {item.isDefaulter ? (
                            <div className="text-right">
                              <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 font-black text-xs block">
                                {formatP(item.totalDue)}
                              </span>
                              <span className="text-[9px] text-rose-500 font-bold mt-0.5 block">
                                {item.unpaidDues.length} bill{item.unpaidDues.length > 1 ? "s" : ""} due
                              </span>
                            </div>
                          ) : std.isRte ? (
                            <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 font-black text-[10px] uppercase">
                              RTE (Govt Free)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[10px] uppercase">
                              All Clear
                            </span>
                          )}
                        </div>

                        {/* Contact & Dues Info Box */}
                        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Father</span>
                            <span className="font-bold text-slate-800">{std.fatherName || std.parentName || "Parent"}</span>
                          </div>
                          {phone && (
                            <div className="flex justify-between items-center text-slate-500 text-[11px]">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Mobile</span>
                              <span className="font-semibold text-slate-700">{phone}</span>
                            </div>
                          )}
                          {item.isDefaulter && (
                            <div className="pt-1 border-t border-slate-200/50 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                              <span>Due Period:</span>
                              <span className="font-bold text-rose-600">Up to {currentMonthName}</span>
                            </div>
                          )}
                        </div>

                        {/* 1-Click Call & WhatsApp Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          {phone ? (
                            <a
                              href={`tel:${phone}`}
                              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-600" />
                              <span>Call</span>
                            </a>
                          ) : (
                            <div className="flex items-center justify-center py-2.5 px-3 rounded-xl bg-slate-50 text-slate-400 text-xs italic">
                              No Phone
                            </div>
                          )}

                          {item.isDefaulter ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <div className="flex items-center justify-center py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">
                              Paid
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredFeeList.length === 0 && (
                    <div className="p-8 text-center bg-white border border-slate-200/60 rounded-2xl shadow-xs text-slate-400 space-y-1.5">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <h4 className="text-sm font-black text-slate-800">No Pending Dues! 🎉</h4>
                      <p className="text-xs text-slate-400">
                        All students in Class {selectedClass} have cleared their fees up to {currentMonthName}.
                      </p>
                    </div>
                  )}
                </div>

                {/* ─── DESKTOP VIEW: Clean Table (>= md) ─── */}
                <div className="hidden md:block bg-white border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/60 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3.5 px-5">Student & Details</th>
                          <th className="py-3.5 px-5">Father / Parent</th>
                          <th className="py-3.5 px-5 text-center">Fee Status (Up to {currentMonthName})</th>
                          <th className="py-3.5 px-5 text-right">Outstanding Due</th>
                          <th className="py-3.5 px-5 text-right">Follow-Up Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {filteredFeeList.map((item) => {
                          const std = item.student;
                          const phone = std.fatherMobile || std.motherMobile || std.parentPhone || "";
                          const waUrl = generateFeeReminderWhatsAppUrl({
                            student: {
                              id: std.id,
                              name: std.name,
                              class: std.class,
                              section: std.section,
                              rollNo: std.rollNo,
                              admissionNo: std.admissionNo,
                              fatherName: std.fatherName,
                              fatherMobile: std.fatherMobile,
                              motherMobile: std.motherMobile,
                              parentPhone: std.parentPhone,
                            },
                            unpaidDues: item.unpaidDues,
                            schoolInfo: {
                              name: schoolInfo?.name,
                              phone: schoolInfo?.phone,
                              upiId: schoolInfo?.upiId,
                            },
                            senderRole: "TEACHER",
                          });

                          return (
                            <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Student Info */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0 shadow-2xs">
                                    {std.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900">{std.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">
                                      {std.rollNo ? `Roll: ${std.rollNo} • ` : ""}ADM: {std.admissionNo || "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Parent Info */}
                              <td className="py-4 px-5">
                                <p className="font-bold text-slate-800">{std.fatherName || std.parentName || "Parent"}</p>
                                {phone ? (
                                  <span className="text-[10px] font-semibold text-slate-400">{phone}</span>
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic">No phone</span>
                                )}
                              </td>

                              {/* Fee Status Badge */}
                              <td className="py-4 px-5 text-center">
                                {item.isDefaulter ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 font-black text-[10px] uppercase shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    {item.unpaidDues.length} Bill{item.unpaidDues.length > 1 ? "s" : ""} Due
                                  </span>
                                ) : std.isRte ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 font-black text-[10px] uppercase shadow-2xs">
                                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                                    RTE (Govt Free)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[10px] uppercase shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    All Clear
                                  </span>
                                )}
                              </td>

                              {/* Due Amount */}
                              <td className="py-4 px-5 text-right font-black">
                                {item.isDefaulter ? (
                                  <span className="text-rose-600 text-sm font-black">{formatP(item.totalDue)}</span>
                                ) : (
                                  <span className="text-emerald-600 text-xs font-black">₹0</span>
                                )}
                              </td>

                              {/* Actions: Call & WhatsApp */}
                              <td className="py-4 px-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {phone ? (
                                    <>
                                      <a
                                        href={`tel:${phone}`}
                                        title={`Call parent (${phone})`}
                                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                      >
                                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                                      </a>

                                      {item.isDefaulter && (
                                        <a
                                          href={waUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Send Auto-Formatted WhatsApp Fee Reminder"
                                          className="flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-xs"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          <span>WhatsApp</span>
                                        </a>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 italic">No Contact</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredFeeList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-semibold italic">
                              No students found matching current filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
