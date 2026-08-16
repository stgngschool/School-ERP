"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth, AttendanceStatus, MockStudent } from "@/context/AuthContext";
import {
  Search,
  Save,
  Printer,
  CheckCircle2,
  Users,
} from "lucide-react";
import StudentProfileModal from "@/components/StudentProfileModal";
import ModernDatePicker from "@/components/ModernDatePicker";

interface AttendanceConsoleProps {
  initialClass?: string;
  hideClassSelector?: boolean;
}

export default function AttendanceConsole({ initialClass, hideClassSelector }: AttendanceConsoleProps) {
  const {
    user,
    schoolInfo,
    students,
    attendances,
    leaveRequests,
    markBatchAttendance,
  } = useAuth();

  // Selected Class & Date
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || "10-A");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeView, setActiveView] = useState<"ROSTER" | "MONTHLY">("ROSTER");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileStudentId, setProfileStudentId] = useState<string>("");

  // Save feedback state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("");

  // Helper to format student class key cleanly
  const getStudentClassKey = (s: MockStudent) => {
    if (!s.section || s.section.trim() === "") return s.class;
    if (s.class.toLowerCase().includes(s.section.toLowerCase())) return s.class;
    return `${s.class}-${s.section}`;
  };

  // Get available classes from students list
  const availableClasses = useMemo(() => {
    if (!students || students.length === 0) return ["10-A", "9-A", "1-A"];
    const classSet = new Set(students.map((s) => getStudentClassKey(s)));
    const list = Array.from(classSet).sort();
    return ["ALL", ...list];
  }, [students]);

  // Sync selected class when initialClass is resolved asynchronously or teacher profile loads
  useEffect(() => {
    if (initialClass) {
      setSelectedClass(initialClass);
    } else if (user?.role === "TEACHER" && user.teacherProfile?.classes && user.teacherProfile.classes.length > 0) {
      const cls = user.teacherProfile.classes[0];
      const classKey = cls.section && !cls.name.toLowerCase().includes(cls.section.toLowerCase()) 
        ? `${cls.name}-${cls.section}` : cls.name;
      setSelectedClass(classKey);
    }
  }, [initialClass, user]);

  // Set default class if current selectedClass has no students
  useEffect(() => {
    if (user?.role !== "TEACHER" && availableClasses.length > 1 && !availableClasses.includes(selectedClass)) {
      setSelectedClass(availableClasses[1]);
    }
  }, [availableClasses, selectedClass, user]);

  // Students in selected class
  const classStudents = useMemo(() => {
    if (!students) return [];
    if (selectedClass === "ALL") return students;
    return students.filter(
      (s) => getStudentClassKey(s) === selectedClass || s.class === selectedClass
    );
  }, [students, selectedClass]);

  // Attendance state map for current date & class: { [studentId]: AttendanceStatus }
  const [localAttendanceMap, setLocalAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [isModified, setIsModified] = useState<boolean>(false);

  // Initialize attendance map: DEFAULT EVERYTHING TO PRESENT
  useEffect(() => {
    const newMap: Record<string, AttendanceStatus> = {};

    classStudents.forEach((student) => {
      const existing = attendances.find(
        (a) => a.studentId === student.id && a.date === selectedDate
      );

      const dateKey = selectedDate.substring(0, 10);
      const hasApprovedLeave = leaveRequests.some((l) => {
        if (l.studentId !== student.id || l.status !== "APPROVED") return false;
        const start = l.startDate ? l.startDate.substring(0, 10) : "";
        const end = l.endDate ? l.endDate.substring(0, 10) : "";
        return dateKey >= start && dateKey <= end;
      });

      if (existing) {
        newMap[student.id] = existing.status;
      } else if (hasApprovedLeave) {
        newMap[student.id] = "LEAVE";
      } else {
        newMap[student.id] = "PRESENT";
      }
    });

    setLocalAttendanceMap(newMap);
    setIsModified(false);
  }, [selectedClass, selectedDate, classStudents, attendances, leaveRequests]);

  // BINARY TOGGLE: PRESENT <-> ABSENT
  const toggleStudentStatus = (studentId: string) => {
    setLocalAttendanceMap((prev) => {
      const current = prev[studentId] || "PRESENT";
      const nextStatus: AttendanceStatus = current === "PRESENT" ? "ABSENT" : "PRESENT";
      return {
        ...prev,
        [studentId]: nextStatus,
      };
    });
    setIsModified(true);
  };

  // Quick Actions
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = "PRESENT";
    });
    setLocalAttendanceMap(updated);
    setIsModified(true);
  };

  const handleMarkAllAbsent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = "ABSENT";
    });
    setLocalAttendanceMap(updated);
    setIsModified(true);
  };

  // Save Attendance to Backend
  const handleSaveAttendance = async () => {
    if (classStudents.length === 0) return;
    setIsSaving(true);
    setSaveSuccessMessage("");

    const records = Object.entries(localAttendanceMap).map(([studentId, status]) => ({
      studentId,
      date: selectedDate,
      status,
    }));

    try {
      await markBatchAttendance(records);
      setIsSaving(false);
      setIsModified(false);
      setSaveSuccessMessage(`Attendance saved for ${records.length} students`);
      setTimeout(() => setSaveSuccessMessage(""), 3500);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert("Failed to save attendance. Please try again.");
    }
  };

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return classStudents.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNo.toString().includes(searchQuery);

      const status = localAttendanceMap[student.id] || "PRESENT";
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [classStudents, searchQuery, statusFilter, localAttendanceMap]);

  // Live Counts
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;

    Object.values(localAttendanceMap).forEach((st) => {
      if (st === "ABSENT") absent++;
      else present++;
    });

    const total = classStudents.length;
    const presentPercentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, presentPercentage };
  }, [localAttendanceMap, classStudents]);

  const monthlyLogsMap = React.useMemo(() => {
    const map: Record<string, typeof attendances[0][]> = {};
    attendances.forEach(a => {
      if (a.date.startsWith(selectedMonth)) {
        if (!map[a.studentId]) map[a.studentId] = [];
        map[a.studentId].push(a);
      }
    });
    return map;
  }, [attendances, selectedMonth]);

  return (
    <div className="-mx-2 sm:mx-0 space-y-3 pb-24 md:pb-6 font-sans select-none print:m-0 print:p-0 print:space-y-0">
      {/* ─── FULL-WIDTH FLAT HEADER (ZERO WASTED MARGINS) (HIDDEN ON PRINT) ─── */}
      <div className="bg-white border-y sm:border border-slate-200/60 p-4 sm:p-6 space-y-2.5 sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] print:hidden">
        {/* Row 1: Title, Class, Date & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">Attendance</h2>
            </div>
            
            {!hideClassSelector && (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200/60 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-2xl outline-none cursor-pointer shrink-0"
              >
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls === "ALL" ? "All Classes" : `Class ${cls}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
            <ModernDatePicker
              value={selectedDate}
              onChange={(val) => val && setSelectedDate(val)}
              placeholder="Select date"
              className="flex-1 sm:flex-none"
              showClear={false}
            />

            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold shrink-0">
              <button
                onClick={() => setActiveView("ROSTER")}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeView === "ROSTER" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500"
                }`}
              >
                Roster
              </button>
              <button
                onClick={() => setActiveView("MONTHLY")}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeView === "MONTHLY" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-4 shrink-0 text-xs font-bold w-full sm:w-auto px-1 sm:px-0">
            <button onClick={handleMarkAllPresent} className="text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
              Mark All Present
            </button>
            <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
            <button onClick={handleMarkAllAbsent} className="text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors">
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Row 3: Live Count Summary Bar */}
        <div className="flex items-center justify-between text-xs font-bold pt-2 mt-1 border-t border-slate-50 text-slate-700">
          <div className="flex items-center justify-between w-full sm:w-auto sm:gap-4">
            <span className="text-emerald-700 font-extrabold">{counts.present} Present</span>
            <span className="text-rose-700 font-extrabold">{counts.absent} Absent</span>
            <span className="text-slate-400 font-semibold">Total: {counts.total}</span>
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Roster"}
          </button>
        </div>
      </div>

      {/* Save Toast */}
      {saveSuccessMessage && (
        <div className="mx-3 sm:mx-0 bg-emerald-600 text-white rounded-xl px-4 py-2 text-xs font-black flex items-center justify-between shadow-xs">
          <span>✓ {saveSuccessMessage}</span>
          <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded">Synced</span>
        </div>
      )}

      {/* ─── FULL-WIDTH ROSTER LIST (ZERO SIDE PADDING WASTE) ─── */}
      {activeView === "ROSTER" && (
        <div className="bg-white border-y sm:border border-slate-200/60 divide-y divide-slate-100 sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] mt-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-1 opacity-40" />
              <p className="text-xs font-semibold">No students found in this class</p>
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const status = localAttendanceMap[student.id] || "PRESENT";
              const isPresent = status === "PRESENT";

              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudentStatus(student.id)}
                  className={`px-3.5 py-3 sm:px-4 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isPresent
                      ? "bg-white hover:bg-emerald-50/40"
                      : "bg-rose-50/60 hover:bg-rose-50"
                  }`}
                >
                  {/* Left: Roll No + Full Student Name (NO ADM NUMBER CLUTTER) */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-black text-slate-400 shrink-0 w-12 text-left">
                      Roll {student.rollNo ? String(student.rollNo).padStart(2, "0") : String(idx + 1).padStart(2, "0")}
                    </span>

                    <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                      {student.name}
                    </span>
                  </div>

                  {/* Right: Big Crisp Clickable Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStudentStatus(student.id);
                    }}
                    className={`h-10 px-4 rounded-xl text-xs font-black transition-all press-scale shrink-0 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 ${
                      isPresent
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-rose-600 hover:bg-rose-700 text-white"
                    }`}
                  >
                    <span>{isPresent ? "✓ PRESENT" : "✕ ABSENT"}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── MONTHLY REGISTER VIEW ─── */}
      {activeView === "MONTHLY" && (
        <div className="bg-white border-y sm:border border-slate-200/60 p-4 sm:p-6 sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-3 mt-4 print:p-0 print:border-0 print:shadow-none">
          {/* Printable Official School Header (Visible ONLY on Print) */}
          <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <img src="/logo.png" alt="Logo" className="h-14 w-14 object-contain" />
              <div>
                <h1 className="text-xl font-black uppercase text-slate-900 tracking-wide">{schoolInfo?.name || "St. G.N.G. School"}</h1>
                <p className="text-xs text-slate-600 font-medium">{schoolInfo?.address || "Main Campus, Education Hub"}</p>
                {schoolInfo?.udiseCode && (
                  <p className="text-[11px] font-bold text-slate-500">UDISE: {schoolInfo.udiseCode} • Phone: {schoolInfo.phone || "N/A"}</p>
                )}
              </div>
            </div>
            <div className="mt-3 py-1 px-3 bg-slate-100 rounded inline-block">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Monthly Attendance Register — Class: {selectedClass === "ALL" ? "All Classes" : `Class ${selectedClass}`}
              </h2>
              <p className="text-[10px] font-bold text-slate-600">
                Month: {new Date(`${selectedMonth}-01`).toLocaleString("default", { month: "long", year: "numeric" })} • Generated on: {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          {/* Screen Toolbar (Hidden on Print) */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 print:hidden">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                Monthly Attendance Register — {selectedClass === "ALL" ? "All Classes" : `Class ${selectedClass}`}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Month: {new Date(`${selectedMonth}-01`).toLocaleString("default", { month: "long", year: "numeric" })} • Defaulters (&lt;75%) highlighted.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold text-slate-800 outline-none"
              />
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95"
                title="Print Official Report"
              >
                <Printer className="h-4 w-4" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 print:text-slate-700">
                  <th className="py-2.5 px-2">Roll</th>
                  <th className="py-2.5 px-2">Student Name</th>
                  <th className="py-2.5 px-2 text-center">Present</th>
                  <th className="py-2.5 px-2 text-center">Absent</th>
                  <th className="py-2.5 px-2 text-center">Leave</th>
                  <th className="py-2.5 px-2 text-center">Total Working</th>
                  <th className="py-2.5 px-2 text-right">Attendance %</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {classStudents.map((student, idx) => {
                  const studentLogs = monthlyLogsMap[student.id] || [];

                  const pCount = studentLogs.filter((a) => a.status === "PRESENT").length;
                  const aCount = studentLogs.filter((a) => a.status === "ABSENT").length;
                  const lCount = studentLogs.filter((a) => a.status === "LEAVE").length;
                  const totalLogged = studentLogs.length;
                  const pct = totalLogged > 0 ? Math.round((pCount / totalLogged) * 100) : 100;
                  const isDefaulter = pct < 75 && totalLogged > 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                      <td className="py-2 px-2 font-bold text-slate-400 print:text-slate-600">
                        Roll {student.rollNo ? String(student.rollNo).padStart(2, "0") : String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2 px-2 font-extrabold text-slate-900 truncate max-w-[160px]">
                        {student.name}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-emerald-700">{pCount}</td>
                      <td className="py-2 px-2 text-center font-black text-rose-700">{aCount}</td>
                      <td className="py-2 px-2 text-center font-bold text-amber-700">{lCount}</td>
                      <td className="py-2 px-2 text-center font-semibold text-slate-500">{totalLogged}</td>
                      <td className="py-2 px-2 text-right font-black">
                        <span className={pct >= 75 ? "text-slate-900" : "text-rose-600 font-extrabold"}>
                          {pct}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isDefaulter ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 print:border print:border-rose-300">
                            Low
                          </span>
                        ) : (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 print:border print:border-emerald-300">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Printable Signature & Stamp Footer (Visible ONLY on Print) */}
          <div className="hidden print:flex justify-between items-end pt-16 px-4 text-xs font-bold text-slate-800">
            <div className="text-center">
              <div className="w-40 border-t border-slate-900 mb-1"></div>
              <p>Class Teacher's Signature</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-slate-900 mb-1"></div>
              <p>Checked By / Admin</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-slate-900 mb-1"></div>
              <p>Principal's Signature & Stamp</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MOBILE STICKY FLOATING SAVE DOCK ─── */}
      <div className="fixed bottom-[72px] inset-x-4 sm:hidden z-40">
        <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-slate-800 flex items-center justify-between gap-3 backdrop-blur-xl">
          <div className="min-w-0 pl-1">
            <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">{selectedDate}</p>
            <p className="text-xs font-black text-emerald-400 truncate mt-0.5">
              {counts.present} P • {counts.absent} A
            </p>
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black h-11 px-5 rounded-xl text-xs transition-all shrink-0 shadow-md cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save Roster"}</span>
          </button>
        </div>
      </div>

      {/* Student Profile Modal */}
      {showProfileModal && profileStudentId && (
        <StudentProfileModal
          studentId={profileStudentId}
          isOpen={true}
          onClose={() => {
            setShowProfileModal(false);
            setProfileStudentId("");
          }}
        />
      )}
    </div>
  );
}
