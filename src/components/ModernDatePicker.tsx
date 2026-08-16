"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface ModernDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  align?: "left" | "right";
  showClear?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function ModernDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
  minDate,
  maxDate,
  align = "left",
  showClear = true,
}: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view date based on value or current date
  const parseInitialDate = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState<Date>(parseInitialDate);

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      setViewDate(new Date(y, m - 1, d));
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const formatDisplayDate = (val: string) => {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return "";
    const [y, m, d] = val.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Generate calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month overflow days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // Next month overflow days to complete 35 or 42 grid cells
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSelectDay = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    onChange(todayStr);
    setViewDate(new Date());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer ${
          isOpen ? "border-indigo-600 bg-white ring-2 ring-indigo-500/10" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className={`h-4 w-4 shrink-0 transition-colors ${value ? "text-indigo-600" : "text-slate-400"}`} />
          <span className={`truncate text-xs font-semibold ${value ? "text-slate-800 font-bold" : "text-slate-400"}`}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        {value && showClear ? (
          <span
            onClick={handleClear}
            className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
            title="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>

      {/* Calendar Dropdown Card */}
      {isOpen && (
        <div
          className={`absolute top-11 ${
            align === "right" ? "right-0" : "left-0"
          } z-50 w-72 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* Header with Month / Year Dropdowns and Navigation */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-1.5 flex-1">
              {/* Month Selector */}
              <select
                value={month}
                onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
                className="bg-slate-100/80 hover:bg-slate-200/70 text-slate-900 text-xs font-black py-1 px-2 rounded-lg border-0 outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Selector (1990 to 2035) */}
              <select
                value={year}
                onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
                className="bg-slate-100/80 hover:bg-slate-200/70 text-slate-900 text-xs font-black py-1 px-2 rounded-lg border-0 outline-none cursor-pointer"
              >
                {Array.from({ length: 46 }, (_, i) => 2035 - i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_SHORT.map((d, i) => (
              <span
                key={i}
                className={`text-[10px] font-black uppercase ${
                  i === 0 ? "text-rose-500" : "text-slate-400"
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((item, idx) => {
              const isSelected = item.dateStr === value;
              const isToday = item.dateStr === todayStr;
              const isSunday = idx % 7 === 0;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.dateStr)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30 scale-105"
                      : isToday
                      ? "bg-indigo-50 text-indigo-700 font-black border border-indigo-200"
                      : item.isCurrentMonth
                      ? isSunday
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-slate-800 hover:bg-slate-100"
                      : "text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {item.dayNum}
                </button>
              );
            })}
          </div>

          {/* Bottom Quick Shortcuts */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-extrabold px-1">
            <button
              type="button"
              onClick={handleToday}
              className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
