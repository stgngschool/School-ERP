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
  const [selectedClass, setSelectedClass] = useState("10-A");
  const [studentSearch, setStudentSearch] = useState("");

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
  const unmarkedCount = markedRecords.filter((r) => r === "UNMARKED").length;

  // Filter homework history logs
  const classHomeworkHistory = homeworks.filter(
    (h) => h.classSection === selectedClass
  );

  // Helper to calculate student's historical leaves count
  const getStudentLeaveCount = (studentId: string) => {
    return attendances.filter((a) => a.studentId === studentId && a.status === "LEAVE").length;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Class Select */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Teacher Console</h2>
          <p className="text-xs text-slate-505 font-medium">
            Manage attendance records, coursework uploads, and leave approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase text-slate-400">Classroom</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600"
          >
            <option value="10-A">Class 10-A</option>
            <option value="10-B">Class 10-B</option>
            <option value="9-A">Class 9-A</option>
          </select>
        </div>
      </div>

      {/* Quick Action Stickers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Sticker 1: Mark Attendance */}
        <button
          onClick={() => setActiveTab("attendance")}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
            <UserCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Attendance Desk</span>
        </button>

        {/* Sticker 2: Upload Homework */}
        <button
          onClick={() => setActiveTab("homework")}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:-rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 border border-pink-100 group-hover:scale-110 transition-transform">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Homework Board</span>
        </button>

        {/* Sticker 3: Leave Requests */}
        <button
          onClick={() => setActiveTab("leaves")}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Leave Approvals</span>
        </button>

        {/* Sticker 4: Active Class */}
        <div
          className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 select-none"
        >
          <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Class: {selectedClass}</span>
        </div>
      </div>

      {/* 3. Tab Contents */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
        {/* TAB 1: Attendance Grid */}
        {activeTab === "attendance" && (
          showProfileModal && selectedProfileStudentId ? (
            <StudentProfileModal
              studentId={selectedProfileStudentId}
              isOpen={true}
              isInline={true}
              onClose={() => {
                setShowProfileModal(false);
                setSelectedProfileStudentId("");
              }}
            />
          ) : (
            <div className="space-y-5">
            {/* Real-time stats row */}
            <div className="grid grid-cols-5 gap-2 border border-slate-200/80 rounded-xl bg-slate-50/50 p-3 text-center text-xs font-bold text-slate-500">
              <div>
                <p className="text-[9px] uppercase text-slate-400 mb-0.5">Strength</p>
                <p className="text-sm font-black text-slate-700">{classStudents.length}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-green-500 mb-0.5">Present</p>
                <p className="text-sm font-black text-green-600">{presentCount}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-rose-500 mb-0.5">Absent</p>
                <p className="text-sm font-black text-rose-600">{absentCount}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-amber-500 mb-0.5">Late</p>
                <p className="text-sm font-black text-amber-600">{lateCount}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-indigo-500 mb-0.5">Leaves</p>
                <p className="text-sm font-black text-indigo-600">{leaveCount}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-50 pb-2">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Roster Sheet for ({todayDateStr})
              </h3>
              
              {/* Student Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2 px-2">Roll</th>
                    <th className="py-2 px-2">Name</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const status = getAttendanceStatus(student.id);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-2 font-bold text-slate-400">{student.rollNo}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              {student.photoUrl ? (
                                <img src={student.photoUrl} alt={student.name} className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0" />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-750 flex items-center justify-center font-extrabold text-[10px] uppercase shrink-0">
                                  {student.name.substring(0, 2)}
                                </div>
                              )}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProfileStudentId(student.id);
                                    setShowProfileModal(true);
                                  }}
                                  className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-left focus:outline-none cursor-pointer block"
                                >
                                  {student.name}
                                </button>
                                <p className="text-[9px] text-slate-400">Admission No: {student.admissionNo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {status === "UNMARKED" && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 font-bold uppercase">Unmarked</span>
                            )}
                            {status === "PRESENT" && (
                              <span className="text-[10px] bg-green-50 text-green-700 border border-green-100 rounded px-1.5 py-0.5 font-bold uppercase">Present</span>
                            )}
                            {status === "ABSENT" && (
                              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-100 rounded px-1.5 py-0.5 font-bold uppercase">Absent</span>
                            )}
                            {status === "LATE" && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 font-bold uppercase">Late</span>
                            )}
                            {status === "LEAVE" && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 font-bold uppercase">Leave</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => handleMarkAttendance(student.id, "PRESENT")}
                                disabled={status === "LEAVE"}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                                  status === "PRESENT"
                                    ? "bg-green-600 border-green-600 text-white"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50"
                                }`}
                              >
                                P
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(student.id, "ABSENT")}
                                disabled={status === "LEAVE"}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                                  status === "ABSENT"
                                    ? "bg-rose-600 border-rose-600 text-white"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50"
                                }`}
                              >
                                A
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(student.id, "LATE")}
                                disabled={status === "LEAVE"}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                                  status === "LATE"
                                    ? "bg-amber-600 border-amber-600 text-white"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50"
                                }`}
                              >
                                L
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400">
                        No students match search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

        {/* TAB: Feed Student Marks */}
        {activeTab === "marks" && (
          <MarksFeedingConsole />
        )}

        {/* TAB 2: Homework Assignment & Logs */}
        {activeTab === "homework" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Create Homework Form */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Assign Coursework Worksheet
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Assigned files will immediately load on the parent dashboards of class **{selectedClass}**.
                </p>
              </div>

              {hwSuccess && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-100 text-xs font-semibold">
                  <CheckCircle className="h-4 w-4" /> Homework assigned successfully!
                </div>
              )}

              <form onSubmit={handleAddHomework} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                    <select
                      value={hwSubject}
                      onChange={(e) => setHwSubject(e.target.value)}
                      className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="English">English</option>
                      <option value="Social Studies">Social Studies</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={hwDueDate}
                      onChange={(e) => setHwDueDate(e.target.value)}
                      className="w-full text-xs font-semibold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Worksheet Title</label>
                  <input
                    type="text"
                    required
                    value={hwTitle}
                    onChange={(e) => setHwTitle(e.target.value)}
                    placeholder="e.g. Homework on Quadratic Formula..."
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Instructions note</label>
                  <textarea
                    required
                    rows={3}
                    value={hwDesc}
                    onChange={(e) => setHwDesc(e.target.value)}
                    placeholder="Provide specific notes and guidelines..."
                    className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10">
                  Broadcast Assignment
                </button>
              </form>
            </div>

            {/* Homework History list (Right column) */}
            <div className="lg:col-span-3 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Coursework Assignment Log ({selectedClass})
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {classHomeworkHistory.length > 0 ? (
                  classHomeworkHistory.map((hw) => (
                    <div
                      key={hw.id}
                      className="p-3 border border-slate-200/80 bg-slate-50/50 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700"
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                            {hw.subject}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">Due: {hw.dueDate}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 mt-1 truncate">{hw.title}</h4>
                      </div>
                      <button
                        onClick={() => deleteHomework(hw.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 shrink-0"
                        title="Delete Assignment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 font-medium text-center py-8">
                    No coursework logs found for Class {selectedClass}.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Leave Applications Requests */}
        {activeTab === "leaves" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Student Leave Petitions Pending Approval
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Review bacho ke requests and crosscheck attendance audit status.
              </p>
            </div>

            <div className="space-y-3">
              {pendingLeaves.length > 0 ? (
                pendingLeaves.map((lv) => {
                  const historicalCount = getStudentLeaveCount(lv.studentId);
                  return (
                    <div
                      key={lv.id}
                      className="p-4 border border-slate-200/80 bg-slate-50/50 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800">{lv.studentName}</h4>
                          <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                            Class {lv.classSection}
                          </span>
                          <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
                            Monthly Leave Count: {historicalCount}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                          Submitted: {lv.createdAt} | Dates: <span className="font-bold text-slate-700">{lv.startDate} to {lv.endDate}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 font-semibold mt-2 border-l-2 border-slate-300 pl-2 py-0.5">
                          "{lv.reason}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => updateLeaveStatus(lv.id, "REJECTED", "Sorry, attendance is running low.")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all"
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-500" /> Reject
                        </button>
                        <button
                          onClick={() => updateLeaveStatus(lv.id, "APPROVED", "Approved. Stay healthy.")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-white" /> Approve
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 font-medium text-center py-8">
                  No pending student leave requests!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

