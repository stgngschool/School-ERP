"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { MockStudent, MockAttendance } from "@/context/AuthContext";

interface ParentAttendanceTabProps {
  child: MockStudent | undefined;
  attendances: MockAttendance[];
}

export default function ParentAttendanceTab({ child, attendances }: ParentAttendanceTabProps) {
  const childAttendances = child ? attendances.filter((a) => a.studentId === child.id) : [];

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

  const monthAttendances = childAttendances.filter((a) =>
    a.date && a.date.startsWith(monthStrPrefix)
  );

  const totalMarkedDays = monthAttendances.length;
  const presentDays = monthAttendances.filter((a) => a.status === "PRESENT").length;
  const absentDays = monthAttendances.filter((a) => a.status === "ABSENT").length;
  const lateDays = monthAttendances.filter((a) => a.status === "LATE").length;
  const leaveDays = monthAttendances.filter((a) => a.status === "LEAVE").length;

  const monthlyAttendancePct = totalMarkedDays > 0
    ? Math.round(((presentDays + lateDays) / totalMarkedDays) * 100)
    : 0;

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setSelectedCalendarDate(null);
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setSelectedCalendarDate(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in text-left pb-12">
      {/* Month Navigation & Stats Header Card */}
      <div className="bg-white border border-slate-200/80 p-3.5 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-4 contain-paint">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
              Monthly Attendance Tracker
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={prevMonth}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              {monthNames[selectedMonth - 1].substring(0, 3)} {selectedYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Monthly Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl">
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Present</span>
            <span className="text-base font-black text-emerald-700 mt-0.5 block">{presentDays} Days</span>
          </div>
          <div className="bg-rose-50/60 border border-rose-100 p-3 rounded-xl">
            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest block">Absent</span>
            <span className="text-base font-black text-rose-700 mt-0.5 block">{absentDays} Days</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl">
            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block">Late / Half Day</span>
            <span className="text-base font-black text-amber-700 mt-0.5 block">{lateDays} Days</span>
          </div>
          <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl">
            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block">Attendance Rate</span>
            <span className="text-base font-black text-indigo-700 mt-0.5 block">{monthlyAttendancePct}%</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid View */}
      <div className="bg-white border border-slate-200/80 p-3.5 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-4 contain-paint">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] font-black uppercase text-slate-400 pb-2 border-b border-slate-100">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span className="text-rose-500">Sun</span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Leading Empty Cells */}
          {[...Array(firstDayOfWeek)].map((_, i) => (
            <div key={`empty-${i}`} className="h-10 sm:h-14 bg-slate-50/30 rounded-xl opacity-40" />
          ))}

          {/* Days of Month */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${monthStrPrefix}-${String(dayNum).padStart(2, "0")}`;
            const record = childAttendances.find((a) => a.date === dateStr);
            const status = record?.status;

            let badgeBg = "bg-slate-50 text-slate-700 border-slate-200/60";
            if (status === "PRESENT") badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200 font-black";
            else if (status === "ABSENT") badgeBg = "bg-rose-50 text-rose-700 border-rose-200 font-black";
            else if (status === "LATE") badgeBg = "bg-amber-50 text-amber-700 border-amber-200 font-black";
            else if (status === "LEAVE") badgeBg = "bg-blue-50 text-blue-700 border-blue-200 font-black";

            const isSelected = selectedCalendarDate === dateStr;

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedCalendarDate(dateStr)}
                className={`h-10 sm:h-14 p-1 sm:p-2 rounded-xl border flex flex-col justify-between items-center transition-all cursor-pointer ${badgeBg} ${
                  isSelected ? "ring-2 ring-indigo-600 scale-105 shadow-sm" : "hover:border-indigo-300"
                }`}
              >
                <span className="text-[11px] sm:text-xs font-black">{dayNum}</span>
                {status ? (
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold truncate">
                    {status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "LATE" ? "L" : "LV"}
                  </span>
                ) : (
                  <span className="text-[8px] text-slate-300">—</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Card */}
      {selectedCalendarDate && (
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl animate-fade-in flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Selected Date Log</span>
            <h4 className="text-xs font-black text-slate-900 mt-0.5">{selectedCalendarDate}</h4>
          </div>
          {(() => {
            const rec = childAttendances.find((a) => a.date === selectedCalendarDate);
            if (!rec) {
              return <span className="text-xs font-bold text-slate-400">No attendance marked on this date</span>;
            }
            return (
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  rec.status === "PRESENT"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : rec.status === "ABSENT"
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }`}
              >
                {rec.status}
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}