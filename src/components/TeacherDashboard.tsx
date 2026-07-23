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
} from "lucide-react";
import StudentProfileModal from "@/components/StudentProfileModal";
import MarksFeedingConsole from "@/components/MarksFeedingConsole";

export default function TeacherDashboard() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfileStudentId, setSelectedProfileStudentId] = useState("");

  const {
    students,
    attendances,
    leaveRequests,
    homeworks,
    markAttendance,
    addHomework,
    deleteHomework,
    updateLeaveStatus,
    activeTab,
    setActiveTab,
  } = useAuth();

  const validTabs = ["attendance", "homework", "leaves", "marks"];
  const currentTab = validTabs.includes(activeTab) ? activeTab : "attendance";

  React.useEffect(() => {
    if (!validTabs.includes(activeTab)) {
      setActiveTab("attendance");
    }
  }, [activeTab]);

  const [selectedClass, setSelectedClass] = useState("10-A");
  const [studentSearch, setStudentSearch] = useState("");

  // Auto-select first available class if current class has no students
  React.useEffect(() => {
    if (students.length > 0) {
      const availableClasses = Array.from(new Set(students.map((s) => `${s.class}-${s.section}`)));
      const hasCurrent = students.some((s) => `${s.class}-${s.section}` === selectedClass);
      if (!hasCurrent && availableClasses.length > 0) {
        setSelectedClass(availableClasses[0]);
      }
    }
  }, [students, selectedClass]);

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

  const getAttendanceStatus = (studentId: string): AttendanceStatus | "UNMARKED" => {
    const record = attendances.find((a) => a.studentId === studentId && a.date === todayDateStr);
    return record ? record.status : "UNMARKED";
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
    <div className="space-y-4 pb-4">
      {/* ─── Header & Class Selector ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Teacher Console</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Attendance, coursework, and leave management.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Users className="h-4 w-4 text-indigo-500 shrink-0" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
          >
            <option value="10-A">Class 10-A</option>
            <option value="10-B">Class 10-B</option>
            <option value="9-A">Class 9-A</option>
          </select>
        </div>
      </div>

      {/* ─── Quick Action Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { tab: "attendance", label: "Attendance Desk", icon: UserCheck, color: "bg-indigo-50 text-indigo-600 border-indigo-100", rotate: "hover:rotate-1" },
          { tab: "homework", label: "Homework Board", icon: BookOpen, color: "bg-pink-50 text-pink-600 border-pink-100", rotate: "hover:-rotate-1" },
          { tab: "leaves", label: "Leave Approvals", icon: FileText, color: "bg-emerald-50 text-emerald-600 border-emerald-100", rotate: "hover:rotate-1" },
          { tab: "marks", label: "Feed Marks", icon: PlusCircle, color: "bg-amber-50 text-amber-600 border-amber-100", rotate: "hover:-rotate-1" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 press-scale transition-all duration-200 ${item.rotate} ${isActive ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content Area ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* TAB: Attendance */}
        {currentTab === "attendance" && (
          showProfileModal && selectedProfileStudentId ? (
            <StudentProfileModal
              studentId={selectedProfileStudentId}
              isOpen={true}
              isInline={true}
              onClose={() => { setShowProfileModal(false); setSelectedProfileStudentId(""); }}
            />
          ) : (
            <div className="p-4 space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div className="text-center hidden sm:block">
                  <p className="text-[9px] uppercase text-slate-400 mb-0.5 font-bold">Strength</p>
                  <p className="text-base font-black text-slate-700">{classStudents.length}</p>
                </div>
                {[
                  { label: "Present", count: presentCount, color: "text-green-600" },
                  { label: "Absent", count: absentCount, color: "text-rose-600" },
                  { label: "Late", count: lateCount, color: "text-amber-600" },
                  { label: "Leave", count: leaveCount, color: "text-indigo-600" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[9px] uppercase text-slate-400 mb-0.5 font-bold">{s.label}</p>
                    <p className={`text-base font-black ${s.color}`}>{s.count}</p>
                  </div>
                ))}
              </div>

              {/* Search + Date */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-400"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl shrink-0">
                  <CalendarIcon className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[11px] font-bold text-indigo-700">{todayDateStr}</span>
                </div>
              </div>

              {/* ── MOBILE: Student Attendance Cards ── */}
              <div className="block sm:hidden space-y-2">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                  const status = getAttendanceStatus(student.id);
                  const cfg = statusConfig[status];
                  return (
                    <div key={student.id} className={`p-3.5 rounded-2xl border ${cfg.border} ${cfg.bg}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
                          {student.name.substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => { setSelectedProfileStudentId(student.id); setShowProfileModal(true); }}
                            className="font-bold text-sm text-slate-800 text-left w-full truncate block"
                          >
                            {student.name}
                          </button>
                          <p className="text-[10px] text-slate-400">Roll {student.rollNo} • {student.admissionNo}</p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${cfg.border} ${cfg.textColor} ${cfg.bg} shrink-0`}>
                          {cfg.label}
                        </span>
                      </div>
                      {/* Action Buttons */}
                      {status !== "LEAVE" && (
                        <div className="grid grid-cols-3 gap-2">
                          {(["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map((s) => {
                            const sCfg = statusConfig[s];
                            const isSelected = status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => handleMarkAttendance(student.id, s)}
                                className={`py-3 rounded-xl text-xs font-black transition-all press-scale active:scale-95 touch-manipulation ${
                                  isSelected
                                    ? `${sCfg.color} text-white shadow-sm`
                                    : "bg-white border border-slate-200 text-slate-600"
                                }`}
                              >
                                {sCfg.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {status === "LEAVE" && (
                        <div className="text-center py-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl">
                          On Approved Leave
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-10 text-slate-400">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No students match search</p>
                  </div>
                )}
              </div>

              {/* ── DESKTOP: Attendance Table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2 px-2">Roll</th>
                      <th className="py-2 px-2">Name</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                      const status = getAttendanceStatus(student.id);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-2 font-bold text-slate-400">{student.rollNo}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-[10px] uppercase shrink-0">
                                {student.name.substring(0, 2)}
                              </div>
                              <div>
                                <button onClick={() => { setSelectedProfileStudentId(student.id); setShowProfileModal(true); }}
                                  className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-left focus:outline-none">
                                  {student.name}
                                </button>
                                <p className="text-[9px] text-slate-400">{student.admissionNo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {(() => {
                              const cfg = statusConfig[status];
                              return (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${cfg.bg} ${cfg.border} ${cfg.textColor}`}>
                                  {cfg.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="inline-flex gap-1">
                              {(["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map((s) => {
                                const sCfg = statusConfig[s];
                                return (
                                  <button key={s}
                                    onClick={() => handleMarkAttendance(student.id, s)}
                                    disabled={status === "LEAVE"}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all disabled:opacity-50 ${
                                      status === s ? `${sCfg.color} border-transparent text-white` : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                                    }`}>
                                    {s.charAt(0)}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={4} className="text-center py-6 text-slate-400">No students match search criteria.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* TAB: Feed Marks */}
        {currentTab === "marks" && (
          <div className="p-4">
            <MarksFeedingConsole />
          </div>
        )}

        {/* TAB: Homework */}
        {currentTab === "homework" && (
          <div className="p-4 space-y-6">
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
                <div className="grid grid-cols-2 gap-3">
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
                    <input type="date" required value={hwDueDate} onChange={(e) => setHwDueDate(e.target.value)}
                      className="w-full font-semibold py-3 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-400 text-slate-700" />
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
                <div key={hw.id} className="p-3.5 border border-slate-200 bg-slate-50 rounded-xl flex items-center justify-between gap-3">
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
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">Leave Requests</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {pendingLeaves.length} pending approval{pendingLeaves.length !== 1 ? "s" : ""}
              </p>
            </div>

            {pendingLeaves.length > 0 ? pendingLeaves.map((lv) => {
              const historicalCount = getStudentLeaveCount(lv.studentId);
              return (
                <div key={lv.id} className="p-4 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-3">
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
                  <div className="grid grid-cols-2 gap-3">
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
      </div>
    </div>
  );
}
