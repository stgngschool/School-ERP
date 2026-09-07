"use client";

import React, { useState, useEffect, useRef, useDeferredValue, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getCleanClassKey,
  matchStudentToClass,
  normalizeDisplayClassName,
  sortClasses,
  normalizeClassName,
  normalizeSectionName
} from "@/lib/classUtils";
import {
  Save,
  AlertCircle,
  CheckCircle,
  Search,
  Award,
  TrendingUp,
  Users,
  CheckCircle2,
  BookOpen,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
  Info,
  Trash2,
  ArrowUpDown,
  Download
} from "lucide-react";

const DEFAULT_EXAM_CONFIG: Record<string, { isSplit: boolean; maxMarks: number; components?: { name: string; max: number }[] }> = {
  "Unit-1": {
    isSplit: true,
    maxMarks: 20,
    components: [
      { name: "Note Book", max: 5 },
      { name: "Sub. Enrich.", max: 5 },
      { name: "Pr. Act.", max: 10 },
    ],
  },
  "Half Yearly": {
    isSplit: true,
    maxMarks: 100,
    components: [
      { name: "Written Exam", max: 80 },
      { name: "Note Book", max: 5 },
      { name: "Sub. Enrich.", max: 5 },
      { name: "Pr. Act.", max: 10 },
    ],
  },
  "Annual": {
    isSplit: true,
    maxMarks: 100,
    components: [
      { name: "Written Exam", max: 80 },
      { name: "Note Book", max: 5 },
      { name: "Sub. Enrich.", max: 5 },
      { name: "Pr. Act.", max: 10 },
    ],
  },
  "Pre-Board": {
    isSplit: false,
    maxMarks: 100,
  },
};

const CLASS_SUBJECT_MAP: Record<string, string[]> = {
  PRE_PRIMARY: ["ENGLISH", "HINDI", "MATHEMATICS", "DRAWING"],
  PRIMARY: ["ENGLISH", "HINDI", "MATHEMATICS", "SCIENCE/EVS", "COMPUTER", "DRAWING", "G.K.", "SANSKRIT"],
  MIDDLE: ["ENGLISH", "HINDI", "MATHEMATICS", "SCIENCE/EVS", "COMPUTER", "DRAWING", "G.K.", "SOCIAL SCIENCE", "SANSKRIT"],
  SECONDARY: ["ENGLISH", "HINDI", "MATHEMATICS", "SCIENCE/EVS", "COMPUTER", "DRAWING", "G.K.", "SOCIAL SCIENCE", "SANSKRIT"],
};

function getSubjectsForClass(className: string): string[] {
  const norm = className.toUpperCase().trim();
  if (
    norm.includes("NURSERY") ||
    norm.includes("LKG") ||
    norm.includes("UKG") ||
    norm.includes("PRE-KG") ||
    norm.includes("PLAY") ||
    norm.startsWith("KG") ||
    norm.includes(" KG") ||
    norm.includes("-KG") ||
    norm.includes("PRE_PRIMARY") ||
    norm.includes("PRE-PRIMARY")
  ) {
    return CLASS_SUBJECT_MAP.PRE_PRIMARY;
  }
  
  const match = norm.match(/\d+/);
  let classNum = match ? parseInt(match[0], 10) : NaN;
  if (isNaN(classNum)) {
    const romanMap: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
    const cleaned = norm.replace(/CLASS/g, "").replace(/SEC(TION)?/g, "").replace(/-[A-Z]$/g, "").trim().toLowerCase();
    if (romanMap[cleaned]) {
      classNum = romanMap[cleaned];
    }
  }

  if (!isNaN(classNum)) {
    if (classNum >= 1 && classNum <= 5) {
      return CLASS_SUBJECT_MAP.PRIMARY;
    }
    if (classNum >= 6) {
      return CLASS_SUBJECT_MAP.MIDDLE;
    }
  }
  
  return CLASS_SUBJECT_MAP.MIDDLE;
}

const getGradeBadge = (obtained: number, maxVal: number, isAbsent?: boolean) => {
  if (isAbsent) return { grade: "AB", bg: "bg-rose-100 text-rose-800 border-rose-300 font-black" };
  if (maxVal <= 0) return { grade: "N/A", bg: "bg-slate-100 text-slate-600 border-slate-200" };
  const percentage = Math.round((obtained / maxVal) * 100);
  if (percentage >= 90) return { grade: "A+", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (percentage >= 80) return { grade: "A", bg: "bg-teal-50 text-teal-700 border-teal-200" };
  if (percentage >= 70) return { grade: "B", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  if (percentage >= 60) return { grade: "C", bg: "bg-amber-50 text-amber-700 border-amber-200" };
  if (percentage >= 50) return { grade: "D", bg: "bg-orange-50 text-orange-700 border-orange-200" };
  if (percentage >= 33) return { grade: "E", bg: "bg-yellow-50 text-yellow-800 border-yellow-200" };
  return { grade: "F", bg: "bg-rose-50 text-rose-700 border-rose-200" };
};

// ─── MEMOIZED STUDENT MOBILE CARD (Zero-Lag on Mobile Phone) ─────────────────
interface StudentEntry {
  marksObtained: string;
  remarks: string;
  breakdown: Record<string, string>;
  isAbsent?: boolean;
}

const EMPTY_ENTRY: StudentEntry = Object.freeze({
  marksObtained: "",
  remarks: "",
  breakdown: {},
  isAbsent: false,
});

const StudentMobileCard = React.memo(function StudentMobileCard({
  student,
  entry,
  isSplitExam,
  splitComponents,
  maxMarks,
  maxValNum,
  onMarkChange,
  onBreakdownChange,
  onRemarksChange,
  isSaved,
  isSaving,
  onSaveSingle,
  onToggleAbsent,
  onClearSingle,
  wasSavedInDb,
}: {
  student: any;
  entry: StudentEntry;
  isSplitExam: boolean;
  splitComponents: { name: string; max: number }[];
  maxMarks: string;
  maxValNum: number;
  onMarkChange: (studentId: string, val: string) => void;
  onBreakdownChange: (studentId: string, compName: string, val: string) => void;
  onRemarksChange: (studentId: string, val: string) => void;
  isSaved?: boolean;
  isSaving?: boolean;
  onSaveSingle?: (studentId: string) => void;
  onToggleAbsent?: (studentId: string) => void;
  onClearSingle?: (studentId: string) => void;
  wasSavedInDb?: boolean;
}) {
  const nameParts = student.name.trim().split(" ");
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : student.name.substring(0, 2).toUpperCase();

  const isAbsent = !!entry.isAbsent;

  if (isSplitExam) {
    let totalObt = 0;
    let hasAnyMark = false;
    let hasAnyInvalid = false;

      if (!isAbsent) {
        splitComponents.forEach((comp) => {
          const vStr = entry.breakdown?.[comp.name] || "";
          if (vStr !== "") {
            hasAnyMark = true;
            const v = parseFloat(vStr);
            totalObt += isNaN(v) ? 0 : v;
            if (isNaN(v) || v < 0 || v > comp.max) {
              hasAnyInvalid = true;
            }
          }
        });
        if (!hasAnyMark && entry.marksObtained !== "") {
          const v = parseFloat(entry.marksObtained);
          if (!isNaN(v)) {
            totalObt = v;
            hasAnyMark = true;
          }
        }
      }

      const gradeInfo = getGradeBadge(totalObt, maxValNum, isAbsent);

    return (
      <div
        id={`student-card-${student.id}`}
        className={`p-4 rounded-2xl border ${
          isAbsent
            ? "border-rose-300 bg-rose-50/20"
            : hasAnyInvalid
            ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200"
            : "border-slate-200/90 bg-white"
        } shadow-xs space-y-3 transition-all text-left cv-auto-card`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 text-sm truncate">{student.name}</p>
              <p className="text-[10.5px] text-slate-500 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                Roll: <strong className="text-indigo-700 font-black">{student.rollNo || "--"}</strong> • Adm: {student.admissionNo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 🔴 ABSENT TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => onToggleAbsent?.(student.id)}
              title={isAbsent ? "Click to Mark Present" : "Click to Mark Absent"}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                isAbsent
                  ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                  : "bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200"
              }`}
            >
              {isAbsent ? "✓ Absent" : "AB"}
            </button>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeInfo.bg}`}>
              {gradeInfo.grade}
            </span>
          </div>
        </div>

        {/* Component Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {splitComponents.map((comp, cIdx) => {
            const valStr = entry.breakdown?.[comp.name] || "";
            const numVal = parseFloat(valStr);
            const isValInvalid = !isAbsent && valStr !== "" && (isNaN(numVal) || numVal < 0 || numVal > comp.max);

            return (
              <div key={cIdx} className={`p-2.5 rounded-xl border space-y-1 ${isAbsent ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/80 border-slate-100"}`}>
                <div className="flex items-center justify-between">
                  <label className="text-[9.5px] font-extrabold uppercase text-slate-500 block truncate">
                    {comp.name}
                  </label>
                  <span className="text-[9px] font-black text-slate-400">/{comp.max}</span>
                </div>
                <input
                  type={isAbsent ? "text" : "number"}
                  inputMode={isAbsent ? undefined : "decimal"}
                  step="0.5"
                  min="0"
                  max={comp.max}
                  placeholder={isAbsent ? "AB" : "-"}
                  disabled={isAbsent}
                  value={isAbsent ? "AB" : valStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onBreakdownChange(student.id, comp.name, e.target.value)}
                  className={`w-full text-center font-black py-2 px-2 border rounded-xl outline-none text-base transition-all ${
                    isAbsent
                      ? "border-rose-300 bg-rose-100/50 text-rose-700 cursor-not-allowed"
                      : isValInvalid
                      ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200"
                      : "border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-800"
                  }`}
                />
                {isValInvalid && (
                  <span className="text-[8px] font-bold text-rose-600 block text-center">
                    Max: {comp.max}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Total & Instant Save Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 shadow-2xs ${
            isAbsent ? "bg-rose-700 text-white" : "bg-indigo-600 text-white"
          }`}>
            <span className="text-[8px] font-extrabold uppercase block leading-none opacity-80">TOTAL ({maxMarks}):</span>
            <span className="text-sm font-black">{isAbsent ? "ABSENT" : hasAnyMark ? totalObt : "--"}</span>
          </div>

          <div className="flex items-center gap-2">
            {isSaving ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
              </span>
            ) : isSaved ? (
              <div className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Saved
                </span>
                <button
                  type="button"
                  onClick={() => onClearSingle?.(student.id)}
                  title="Clear Marks"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : isAbsent ? (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSaveSingle?.(student.id)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 text-[11px] font-black px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" /> Save Absent
                </button>
                <button
                  type="button"
                  onClick={() => onClearSingle?.(student.id)}
                  title="Reset"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : hasAnyMark ? (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSaveSingle?.(student.id)}
                  disabled={hasAnyInvalid || isSaving}
                  className="inline-flex items-center gap-1.5 text-[11px] font-black px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => onClearSingle?.(student.id)}
                  title="Clear Marks"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : wasSavedInDb ? (
              <button
                type="button"
                onClick={() => onClearSingle?.(student.id)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 shadow-2xs transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Clear Marks
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const scoreStr = entry.marksObtained || "";
  const scoreNum = parseFloat(scoreStr);
  const maxNum = parseFloat(maxMarks) || 100;
  const isInvalid = !isAbsent && scoreStr !== "" && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxNum);
  const isValid = !isAbsent && scoreStr !== "" && !isInvalid;
  const pct = isValid && maxNum > 0 ? Math.round((scoreNum / maxNum) * 100) : 0;
  const gradeInfo = getGradeBadge(scoreNum, maxNum, isAbsent);

  return (
    <div
      id={`student-card-${student.id}`}
      className={`p-4 rounded-2xl border ${
        isAbsent
          ? "border-rose-300 bg-rose-50/20"
          : isInvalid
          ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200"
          : "border-slate-200/90 bg-white"
      } shadow-xs space-y-3 transition-all text-left cv-auto-card`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 text-sm truncate">{student.name}</p>
            <p className="text-[10.5px] text-slate-500 font-semibold whitespace-nowrap">
              Roll: <strong className="text-indigo-700 font-black">{student.rollNo || "--"}</strong> • Adm: {student.admissionNo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 🔴 ABSENT TOGGLE BUTTON */}
          <button
            type="button"
            onClick={() => onToggleAbsent?.(student.id)}
            title={isAbsent ? "Click to Mark Present" : "Click to Mark Absent"}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
              isAbsent
                ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                : "bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200"
            }`}
          >
            {isAbsent ? "✓ Absent" : "AB"}
          </button>
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeInfo.bg}`}>
            {gradeInfo.grade} {isValid ? `(${pct}%)` : ""}
          </span>
        </div>
      </div>

      {/* Touch Input & Save Row */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Marks Obtained</label>
          <input
            type={isAbsent ? "text" : "number"}
            inputMode={isAbsent ? undefined : "decimal"}
            step="0.5"
            min="0"
            max={maxMarks}
            placeholder={isAbsent ? "AB" : "-"}
            disabled={isAbsent}
            value={isAbsent ? "AB" : scoreStr}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onMarkChange(student.id, e.target.value)}
            className={`w-full text-center font-black py-2.5 px-3 border rounded-xl outline-none text-base transition-all ${
              isAbsent
                ? "border-rose-300 bg-rose-100/50 text-rose-700 cursor-not-allowed"
                : isInvalid
                ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200"
                : "border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-800"
            }`}
          />
          {isInvalid && (
            <span className="text-[8.5px] font-bold text-rose-600 block text-center mt-0.5">
              Maximum marks is {maxMarks}
            </span>
          )}
        </div>
        <div className="text-center shrink-0 pt-4">
          <span className="text-sm font-black text-slate-500">/ {maxMarks}</span>
        </div>

        <div className="shrink-0 pt-4">
          {isSaving ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-2 rounded-xl bg-slate-100 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          ) : isSaved ? (
            <div className="inline-flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Saved
              </span>
              <button
                type="button"
                onClick={() => onClearSingle?.(student.id)}
                title="Clear Marks"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : isAbsent ? (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSaveSingle?.(student.id)}
                disabled={isSaving}
                className="inline-flex items-center gap-1 text-[11px] font-black px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Save AB
              </button>
              <button
                type="button"
                onClick={() => onClearSingle?.(student.id)}
                title="Reset"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : scoreStr !== "" ? (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSaveSingle?.(student.id)}
                disabled={isInvalid || isSaving}
                className="inline-flex items-center gap-1 text-[11px] font-black px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <button
                type="button"
                onClick={() => onClearSingle?.(student.id)}
                title="Clear Marks"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : wasSavedInDb ? (
            <button
              type="button"
              onClick={() => onClearSingle?.(student.id)}
              disabled={isSaving}
              className="inline-flex items-center gap-1 text-[10.5px] font-black px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 shadow-2xs transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.student.id === next.student.id &&
    prev.entry === next.entry &&
    prev.isSaved === next.isSaved &&
    prev.isSaving === next.isSaving &&
    prev.wasSavedInDb === next.wasSavedInDb &&
    prev.isSplitExam === next.isSplitExam &&
    prev.maxMarks === next.maxMarks &&
    prev.maxValNum === next.maxValNum &&
    prev.onMarkChange === next.onMarkChange &&
    prev.onBreakdownChange === next.onBreakdownChange &&
    prev.onRemarksChange === next.onRemarksChange &&
    prev.onSaveSingle === next.onSaveSingle &&
    prev.onToggleAbsent === next.onToggleAbsent &&
    prev.onClearSingle === next.onClearSingle
  );
});

// ─── MEMOIZED STUDENT TABLE ROW (Zero-Lag on Desktop/Laptop) ───────────────────
const StudentTableRow = React.memo(
  function StudentTableRow({
    student,
    entry,
    isSplitExam,
    splitComponents,
    maxMarks,
    maxValNum,
    onMarkChange,
    onBreakdownChange,
    isRowSaved,
    isRowSaving,
    onSaveSingle,
    onToggleAbsent,
    onClearSingle,
    wasSavedInDb,
  }: {
    student: any;
    entry: StudentEntry;
    isSplitExam: boolean;
    splitComponents: { name: string; max: number }[];
    maxMarks: string;
    maxValNum: number;
    onMarkChange: (studentId: string, val: string) => void;
    onBreakdownChange: (studentId: string, compName: string, val: string) => void;
    isRowSaved: boolean;
    isRowSaving: boolean;
    onSaveSingle: (studentId: string) => void;
    onToggleAbsent: (studentId: string) => void;
    onClearSingle: (studentId: string) => void;
    wasSavedInDb?: boolean;
  }) {
    const isAbsent = !!entry.isAbsent;

    if (isSplitExam) {
      let totalObt = 0;
      let hasAnyMark = false;
      let hasAnyInvalid = false;

      if (!isAbsent) {
        splitComponents.forEach((comp: any) => {
          const vStr = entry.breakdown?.[comp.name] || "";
          if (vStr !== "") {
            hasAnyMark = true;
            const v = parseFloat(vStr);
            totalObt += isNaN(v) ? 0 : v;
            if (isNaN(v) || v < 0 || v > comp.max) {
              hasAnyInvalid = true;
            }
          }
        });
        if (!hasAnyMark && entry.marksObtained !== "") {
          const v = parseFloat(entry.marksObtained);
          if (!isNaN(v)) {
            totalObt = v;
            hasAnyMark = true;
          }
        }
      }

      const gradeInfo = getGradeBadge(totalObt, maxValNum, isAbsent);

      return (
        <tr
          key={student.id}
          className={`hover:bg-slate-50/70 transition-colors cv-auto-row ${
            isAbsent ? "bg-rose-50/20" : hasAnyInvalid ? "bg-rose-50/30" : ""
          }`}
        >
          <td className="py-3 px-3 text-center font-bold text-slate-400">
            {student.rollNo || "--"}
          </td>
          <td className="py-3 px-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-extrabold text-slate-900">{student.name}</p>
                <p className="text-[9px] text-slate-400">Adm: {student.admissionNo}</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleAbsent(student.id)}
                title={isAbsent ? "Click to Mark Present" : "Click to Mark Absent"}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                  isAbsent
                    ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                    : "bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200 hover:border-rose-200"
                }`}
              >
                {isAbsent ? "✓ AB" : "AB"}
              </button>
            </div>
          </td>
          {splitComponents.map((comp: any, cIdx: number) => {
            const valStr = entry.breakdown?.[comp.name] || "";
            const num = parseFloat(valStr);
            const isValInvalid = !isAbsent && valStr !== "" && (isNaN(num) || num < 0 || num > comp.max);

            return (
              <td key={cIdx} className="py-3 px-2 text-center">
                <input
                  type={isAbsent ? "text" : "number"}
                  inputMode={isAbsent ? undefined : "decimal"}
                  step="0.5"
                  min="0"
                  max={comp.max}
                  placeholder={isAbsent ? "AB" : "-"}
                  disabled={isAbsent}
                  value={isAbsent ? "AB" : valStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onBreakdownChange(student.id, comp.name, e.target.value)}
                  className={`w-20 text-center font-bold py-1.5 px-2 border rounded-xl outline-none text-xs transition-all ${
                    isAbsent
                      ? "border-rose-300 bg-rose-100/50 text-rose-700 cursor-not-allowed"
                      : isValInvalid
                      ? "border-rose-500 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600"
                  }`}
                />
              </td>
            );
          })}
          <td className="py-3 px-2 text-center font-black text-slate-900 text-sm">
            {isAbsent ? <span className="text-rose-600 font-black">AB</span> : hasAnyMark ? totalObt : "--"}
          </td>
          <td className="py-3 px-2 text-center">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeInfo.bg}`}>
              {gradeInfo.grade}
            </span>
          </td>
          <td className="py-3 px-2 text-center">
            {isRowSaving ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
              </span>
            ) : isRowSaved ? (
              <div className="inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Saved
                </span>
                <button
                  type="button"
                  onClick={() => onClearSingle(student.id)}
                  title="Clear Marks"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ) : isAbsent ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSaveSingle(student.id)}
                  disabled={isRowSaving}
                  className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer"
                >
                  <Save className="h-3 w-3" /> Save AB
                </button>
                <button
                  type="button"
                  onClick={() => onClearSingle(student.id)}
                  title="Reset"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ) : hasAnyMark ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSaveSingle(student.id)}
                  disabled={hasAnyInvalid || isRowSaving}
                  className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3 w-3" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => onClearSingle(student.id)}
                  title="Clear Marks"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ) : wasSavedInDb ? (
              <button
                type="button"
                onClick={() => onClearSingle(student.id)}
                disabled={isRowSaving}
                className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="h-3 w-3 text-rose-600" /> Clear
              </button>
            ) : (
              <span className="text-slate-300 text-xs">-</span>
            )}
          </td>
        </tr>
      );
    } else {
      const scoreStr = entry.marksObtained || "";
      const scoreNum = parseFloat(scoreStr);
      const isValid = !isAbsent && !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= maxValNum;
      const isInvalid = !isAbsent && scoreStr !== "" && !isValid;
      const pct = isValid && maxValNum > 0 ? Math.round((scoreNum / maxValNum) * 100) : 0;
      const gradeInfo = getGradeBadge(scoreNum, maxValNum, isAbsent);

      return (
        <tr
          key={student.id}
          className={`hover:bg-slate-50/70 transition-colors cv-auto-row ${
            isAbsent ? "bg-rose-50/20" : isInvalid ? "bg-rose-50/30" : ""
          }`}
        >
          <td className="py-3 px-3 text-center font-bold text-slate-400">
            {student.rollNo || "--"}
          </td>
          <td className="py-3 px-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-extrabold text-slate-900">{student.name}</p>
                <p className="text-[9px] text-slate-400">Adm: {student.admissionNo}</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleAbsent(student.id)}
                title={isAbsent ? "Click to Mark Present" : "Click to Mark Absent"}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                  isAbsent
                    ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                    : "bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200 hover:border-rose-200"
                }`}
              >
                {isAbsent ? "✓ AB" : "AB"}
              </button>
            </div>
          </td>
          <td className="py-3 px-3 text-center">
            <input
              type={isAbsent ? "text" : "number"}
              inputMode={isAbsent ? undefined : "decimal"}
              step="0.5"
              min="0"
              max={maxMarks}
              placeholder={isAbsent ? "AB" : "-"}
              disabled={isAbsent}
              value={isAbsent ? "AB" : scoreStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => onMarkChange(student.id, e.target.value)}
              className={`w-28 text-center font-bold py-1.5 px-2 border rounded-xl outline-none text-xs transition-all ${
                isAbsent
                  ? "border-rose-300 bg-rose-100/50 text-rose-700 cursor-not-allowed font-black"
                  : isInvalid
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600"
              }`}
            />
          </td>
          <td className="py-3 px-3 text-center font-bold text-slate-400">
            {maxMarks}
          </td>
          <td className="py-3 px-3 text-center font-black text-slate-900">
            {isAbsent ? <span className="text-rose-600">AB</span> : isValid ? `${pct}%` : "--"}
          </td>
          <td className="py-3 px-2 text-center">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeInfo.bg}`}>
              {gradeInfo.grade}
            </span>
          </td>
          <td className="py-3 px-2 text-center">
            {isRowSaving ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
              </span>
            ) : isRowSaved ? (
              <div className="inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Saved
                </span>
                <button
                  type="button"
                  onClick={() => onClearSingle(student.id)}
                  title="Clear Marks"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ) : isAbsent ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSaveSingle(student.id)}
                  disabled={isRowSaving}
                  className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer"
                >
                  <Save className="h-3 w-3" /> Save AB
                </button>
                <button
                  type="button"
                  onClick={() => onClearSingle(student.id)}
                  title="Reset"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ) : scoreStr !== "" ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSaveSingle(student.id)}
                  disabled={isInvalid || isRowSaving}
                  className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3 w-3" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => onClearSingle(student.id)}
                  title="Clear Marks"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ) : wasSavedInDb ? (
              <button
                type="button"
                onClick={() => onClearSingle(student.id)}
                disabled={isRowSaving}
                className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="h-3 w-3 text-rose-600" /> Clear
              </button>
            ) : (
              <span className="text-slate-300 text-xs">-</span>
            )}
          </td>
        </tr>
      );
    }
  },
  (prev, next) => {
    return (
      prev.student.id === next.student.id &&
      prev.entry === next.entry &&
      prev.isRowSaved === next.isRowSaved &&
      prev.isRowSaving === next.isRowSaving &&
      prev.wasSavedInDb === next.wasSavedInDb &&
      prev.isSplitExam === next.isSplitExam &&
      prev.maxMarks === next.maxMarks &&
      prev.maxValNum === next.maxValNum &&
      prev.onMarkChange === next.onMarkChange &&
      prev.onBreakdownChange === next.onBreakdownChange &&
      prev.onSaveSingle === next.onSaveSingle &&
      prev.onToggleAbsent === next.onToggleAbsent &&
      prev.onClearSingle === next.onClearSingle
    );
  }
);

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function MarksFeedingConsole() {
  const { user, students, classes, schoolInfo } = useAuth();

  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    if (classes && classes.length > 0) {
      classes.forEach((c) => {
        if (c.name.toLowerCase().startsWith("class_") || c.name.toLowerCase().startsWith("sec-")) return;
        const key = getCleanClassKey(c.name, c.section);
        if (key) classSet.add(key);
      });
    }
    if (students && students.length > 0) {
      students.forEach((s) => {
        const key = getCleanClassKey(s.class, s.section);
        if (key && !key.toLowerCase().startsWith("class_") && !key.toLowerCase().startsWith("sec-")) {
          classSet.add(key);
        }
      });
    }
    return sortClasses(Array.from(classSet));
  }, [students, classes]);

  const availableExams = useMemo(() => {
    return schoolInfo.exams && schoolInfo.exams.length > 0
      ? schoolInfo.exams
      : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];
  }, [schoolInfo.exams]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState(availableExams[0] || "Unit-1");

  // Dynamic Subjects filtered by selected class curriculum
  const availableSubjects = useMemo(() => {
    return getSubjectsForClass(selectedClass);
  }, [selectedClass]);

  const [selectedSubject, setSelectedSubject] = useState(availableSubjects[0] || "ENGLISH");
  const [studentSearch, setStudentSearch] = useState("");
  const deferredStudentSearch = useDeferredValue(studentSearch);
  const [sortBy, setSortBy] = useState<"roll" | "name_asc" | "name_desc" | "status">("roll");

  // Synchronize subject when class changes
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  // Derive active exam configuration
  const activeExamKey = selectedExam || availableExams[0] || "Unit-1";
  const examConfig = (schoolInfo.examConfig && schoolInfo.examConfig[activeExamKey]) || DEFAULT_EXAM_CONFIG[activeExamKey] || {
    isSplit: false,
    maxMarks: 80,
    components: []
  };

  const isSplitExam = examConfig.isSplit;
  const splitComponents = examConfig.components || [];
  const maxMarks = (examConfig.maxMarks ?? (isSplitExam ? 20 : 80)).toString();
  const maxValNum = parseFloat(maxMarks) || 100;

  const [marksRoster, setMarksRoster] = useState<{
    [studentId: string]: StudentEntry;
  }>({});

  const [saving, setSaving] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [savedInDbMap, setSavedInDbMap] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Floating Toast Notification
  const [toast, setToast] = useState<{
    id: number;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback(
    (type: "success" | "error" | "info", title: string, message: string, duration = 3500) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      const id = Date.now();
      setToast({ id, type, title, message });
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, duration);
    },
    []
  );


  // Save All Success Confirmation Modal
  const [saveSuccessModal, setSaveSuccessModal] = useState<{
    isOpen: boolean;
    totalSaved: number;
    totalStudents: number;
    className: string;
    subject: string;
    exam: string;
  } | null>(null);

  // Live Batch Saving Progress
  const [savingProgress, setSavingProgress] = useState<{
    currentBatch: number;
    totalBatches: number;
    saved: number;
    total: number;
  } | null>(null);

  // Active students for selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => matchStudentToClass(s, selectedClass));
  }, [students, selectedClass]);

  const filteredStudents = useMemo(() => {
    const q = deferredStudentSearch.trim().toLowerCase();
    let list = classStudents;
    if (q) {
      list = classStudents.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.toString().includes(q)) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "roll") {
        // Natural numeric sort for roll numbers (1, 2, 3... 10, 11)
        const rawA = a.rollNo !== undefined && a.rollNo !== null ? a.rollNo.toString().trim() : "";
        const rawB = b.rollNo !== undefined && b.rollNo !== null ? b.rollNo.toString().trim() : "";
        const numA = parseInt(rawA.replace(/\D/g, ""), 10);
        const numB = parseInt(rawB.replace(/\D/g, ""), 10);
        const hasA = !isNaN(numA);
        const hasB = !isNaN(numB);

        if (hasA && hasB) {
          if (numA !== numB) return numA - numB;
        } else if (hasA) {
          return -1; // Students with roll numbers come first
        } else if (hasB) {
          return 1;
        }

        // Fallback to alphabetical order
        return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });
      }

      if (sortBy === "name_asc") {
        return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });
      }

      if (sortBy === "name_desc") {
        return (b.name || "").localeCompare(a.name || "", undefined, { numeric: true, sensitivity: "base" });
      }

      if (sortBy === "status") {
        const hasMarkA = !!(marksRoster[a.id]?.marksObtained || marksRoster[a.id]?.isAbsent);
        const hasMarkB = !!(marksRoster[b.id]?.marksObtained || marksRoster[b.id]?.isAbsent);
        if (hasMarkA === hasMarkB) {
          const rawA = a.rollNo !== undefined && a.rollNo !== null ? a.rollNo.toString().trim() : "";
          const rawB = b.rollNo !== undefined && b.rollNo !== null ? b.rollNo.toString().trim() : "";
          const numA = parseInt(rawA.replace(/\D/g, ""), 10);
          const numB = parseInt(rawB.replace(/\D/g, ""), 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (a.name || "").localeCompare(b.name || "");
        }
        return hasMarkA ? 1 : -1;
      }

      return 0;
    });
  }, [classStudents, deferredStudentSearch, sortBy, marksRoster]);

  const defaultClassInitializedRef = useRef(false);

  // Auto-set teacher's assigned class as default, while allowing changing to any class
  useEffect(() => {
    if (defaultClassInitializedRef.current) return;

    if (user?.teacherProfile?.classes && user.teacherProfile.classes.length > 0) {
      const tClass = user.teacherProfile.classes[0];
      const targetStr = getCleanClassKey(tClass.name, tClass.section);
      if (availableClasses.includes(targetStr)) {
        setSelectedClass(targetStr);
        defaultClassInitializedRef.current = true;
        return;
      }
    }

    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [user, availableClasses, selectedClass]);

  useEffect(() => {
    if (availableExams.length > 0 && !selectedExam) {
      setSelectedExam(availableExams[0]);
    }
  }, [availableExams, selectedExam]);

  // ─── LOAD MARKS FUNCTION (With Draft & Server Sync) ─────────────────────────
  const loadMarks = useCallback(async () => {
    if (!selectedClass || !selectedExam || !selectedSubject) return;

    setLoadingMarks(true);
    setErrorMsg("");
    setSuccessMsg("");
    setIsDraftRestored(false);

    try {
      const rawClass = normalizeClassName(selectedClass);
      const section = normalizeSectionName(undefined, selectedClass);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      // Check for phone draft in localStorage
      const draftKey = `draft_marks_${selectedClass}_${selectedExam}_${selectedSubject}`;
      let draftData: Record<string, StudentEntry> | null = null;
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          draftData = JSON.parse(saved);
        }
      } catch (e) {
        // ignore
      }

      let serverRecord: Record<string, any> = {};
      try {
        const res = await fetch(
          `/api/marks/roster?class=${encodeURIComponent(rawClass)}&section=${encodeURIComponent(section)}&exam=${encodeURIComponent(selectedExam)}&subject=${encodeURIComponent(selectedSubject)}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: abortControllerRef.current.signal,
          }
        );
        if (res.ok) {
          serverRecord = await res.json();
        }
      } catch (fetchErr: any) {
        if (fetchErr.name !== "AbortError") {
          console.warn("Could not fetch remote marks, initializing local list:", fetchErr);
        }
      }

      const newRoster: Record<string, StudentEntry> = {};
      const newSavedMap: Record<string, boolean> = {};
      const newSavedInDbMap: Record<string, boolean> = {};
      let foundServer = false;
      let hasDraft = false;

      const studentsToUse = classStudents.length > 0
        ? classStudents
        : students.filter((s) => matchStudentToClass(s, selectedClass));

      studentsToUse.forEach((student) => {
        const existingMark = serverRecord[student.id];
        const draftMark = draftData ? draftData[student.id] : null;

        // Check if draft has genuinely entered values (ignore stale dummy all-zero entries)
        let draftHasValues = false;
        if (draftMark) {
          if (draftMark.breakdown && typeof draftMark.breakdown === "object") {
            Object.keys(draftMark.breakdown).forEach((k) => {
              const val = draftMark.breakdown[k];
              if (val !== "") {
                const n = parseFloat(val);
                const comp = splitComponents.find((c: any) => c.name === k);
                const maxVal = comp ? comp.max : maxValNum;
                if (!isNaN(n) && (n > maxVal || n < 0)) {
                  draftMark.breakdown[k] = "";
                }
              }
            });
          }
          if (draftMark.marksObtained !== "") {
            const n = parseFloat(draftMark.marksObtained);
            if (!isNaN(n) && (n > maxValNum || n < 0)) {
              draftMark.marksObtained = "";
            }
          }

          draftHasValues = (
            draftMark.isAbsent === true ||
            (draftMark.marksObtained !== "" && draftMark.marksObtained !== "0") ||
            (draftMark.breakdown && Object.values(draftMark.breakdown).some((v) => v !== "" && v !== "0"))
          );
        }

        if (draftHasValues && draftMark) {
          newRoster[student.id] = draftMark;
          newSavedMap[student.id] = false;
          newSavedInDbMap[student.id] = !!existingMark;
          hasDraft = true;
        } else if (existingMark) {
          const isAbsent = existingMark.remarks?.toUpperCase().includes("ABSENT") || false;
          const initialBreakdown: Record<string, string> = {};
          if (existingMark.breakdown && typeof existingMark.breakdown === "object") {
            Object.entries(existingMark.breakdown).forEach(([k, v]) => {
              initialBreakdown[k] = v !== null && v !== undefined ? (v as any).toString() : "";
            });
          } else if (isSplitExam) {
            let hasColumnFields = false;
            splitComponents.forEach((comp: any) => {
              const normalizedKey = comp.name.toLowerCase().replace(/[^a-z]/g, "");
              if (normalizedKey.includes("written") || normalizedKey.includes("exam")) {
                if (existingMark.writtenExam !== null && existingMark.writtenExam !== undefined) {
                  initialBreakdown[comp.name] = existingMark.writtenExam.toString();
                  hasColumnFields = true;
                }
              } else if (normalizedKey.includes("notebook") || normalizedKey.includes("note")) {
                if (existingMark.notebook !== null && existingMark.notebook !== undefined) {
                  initialBreakdown[comp.name] = existingMark.notebook.toString();
                  hasColumnFields = true;
                }
              } else if (normalizedKey.includes("enrichment") || normalizedKey.includes("enri") || normalizedKey.includes("sub")) {
                if (existingMark.subjectEnrichment !== null && existingMark.subjectEnrichment !== undefined) {
                  initialBreakdown[comp.name] = existingMark.subjectEnrichment.toString();
                  hasColumnFields = true;
                }
              } else if (normalizedKey.includes("practical") || normalizedKey.includes("act") || normalizedKey.includes("prac")) {
                if (existingMark.practical !== null && existingMark.practical !== undefined) {
                  initialBreakdown[comp.name] = existingMark.practical.toString();
                  hasColumnFields = true;
                }
              }
            });

            // Pro-rate across components if mark has total but no component breakdown
            if (!hasColumnFields && existingMark.marksObtained !== null && existingMark.marksObtained !== undefined && !isAbsent) {
              const total = parseFloat(existingMark.marksObtained) || 0;
              let rem = total;
              splitComponents.forEach((comp: any, idx: number) => {
                if (idx === splitComponents.length - 1) {
                  initialBreakdown[comp.name] = Math.min(rem, comp.max).toString();
                } else {
                  const val = Math.min(rem, comp.max);
                  initialBreakdown[comp.name] = val.toString();
                  rem = Math.max(0, rem - val);
                }
              });
            }
          }

          newRoster[student.id] = {
            marksObtained: isAbsent ? "" : (existingMark.marksObtained?.toString() || ""),
            remarks: existingMark.remarks || "",
            breakdown: isAbsent ? {} : initialBreakdown,
            isAbsent,
          };
          newSavedMap[student.id] = true;
          newSavedInDbMap[student.id] = true;
          foundServer = true;
        } else {
          newRoster[student.id] = {
            marksObtained: "",
            remarks: "",
            breakdown: {},
            isAbsent: false,
          };
          newSavedMap[student.id] = false;
          newSavedInDbMap[student.id] = false;
        }
      });

      // Also ensure any student present in serverRecord is populated into newRoster
      // so even if students list is still hydrating, server marks are never lost
      Object.entries(serverRecord).forEach(([studentId, existingMark]: [string, any]) => {
        if (!newRoster[studentId]) {
          const isAbsent = existingMark.remarks?.toUpperCase().includes("ABSENT") || false;
          const initialBreakdown: Record<string, string> = {};
          if (existingMark.breakdown && typeof existingMark.breakdown === "object" && Object.keys(existingMark.breakdown).length > 0) {
            Object.entries(existingMark.breakdown).forEach(([k, v]) => {
              initialBreakdown[k] = v !== null && v !== undefined ? (v as any).toString() : "";
            });
          }
          newRoster[studentId] = {
            marksObtained: isAbsent ? "" : (existingMark.marksObtained?.toString() || ""),
            remarks: existingMark.remarks || "",
            breakdown: isAbsent ? {} : initialBreakdown,
            isAbsent,
          };
          newSavedMap[studentId] = true;
          newSavedInDbMap[studentId] = true;
          foundServer = true;
        }
      });

      setMarksRoster(newRoster);
      setSavedMap(newSavedMap);
      setSavedInDbMap(newSavedInDbMap);
      setIsEditMode(foundServer);
      if (hasDraft) {
        setIsDraftRestored(true);
      }
    } catch (err) {
      console.error("loadMarks error:", err);
      const fallbackRoster: Record<string, StudentEntry> = {};
      classStudents.forEach((student) => {
        fallbackRoster[student.id] = { marksObtained: "", remarks: "", breakdown: {}, isAbsent: false };
      });
      setMarksRoster(fallbackRoster);
      setSavedMap({});
      setSavedInDbMap({});
    } finally {
      setLoadingMarks(false);
    }
  }, [selectedClass, selectedExam, selectedSubject, classStudents, students, isSplitExam, splitComponents, maxValNum]);

  // ─── AUTO-LOAD MARKS WHEN FILTER OR STUDENTS CHANGE ─────────────────────────
  useEffect(() => {
    if (selectedClass && selectedExam && selectedSubject) {
      loadMarks();
    }
  }, [selectedClass, selectedExam, selectedSubject, classStudents.length, loadMarks]);

  // ─── DRAFT AUTO-SAVE TO LOCALSTORAGE ON EDIT (Debounced by 800ms) ──────────
  useEffect(() => {
    if (!selectedClass || !selectedExam || !selectedSubject) return;
    const draftKey = `draft_marks_${selectedClass}_${selectedExam}_${selectedSubject}`;
    
    // Check if there are any entered marks that are NOT yet saved to server
    const hasUnsavedEntered = Object.entries(marksRoster).some(([studentId, m]) => {
      const hasValue =
        m.marksObtained !== "" ||
        (m.breakdown && Object.values(m.breakdown).some((v) => v !== ""));
      return hasValue && !savedMap[studentId];
    });

    if (!hasUnsavedEntered) {
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {}
      return;
    }

    // Debounce draft write so typing remains ultra-smooth at 60 FPS on low-spec phones
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(marksRoster));
      } catch (e) {
        // ignore
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [marksRoster, savedMap, selectedClass, selectedExam, selectedSubject]);

  const clearDraft = () => {
    const draftKey = `draft_marks_${selectedClass}_${selectedExam}_${selectedSubject}`;
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {}
    setIsDraftRestored(false);
    loadMarks();
  };

  // ─── STATS & VALIDATION MEMO (Zero-Lag recalculation) ───────────────────────
  const {
    enteredCount,
    classAvgScore,
    highestScore,
    topScorerName,
    passPercentage,
    passCount,
    hasValidationError,
    firstErrorStudentId,
  } = useMemo(() => {
    let count = 0;
    let totalScore = 0;
    let maxScore = 0;
    let topName = "--";
    let passed = 0;
    let invalid = false;
    let firstErrId = "";

    classStudents.forEach((std) => {
      const entry = marksRoster[std.id];
      if (!entry) return;

      let stdTotal = 0;
      let hasVal = false;

      if (isSplitExam) {
        splitComponents.forEach((comp: any) => {
          const vStr = entry.breakdown?.[comp.name] || "";
          if (vStr !== "") {
            const num = parseFloat(vStr);
            if (isNaN(num) || num < 0 || num > comp.max) {
              invalid = true;
              if (!firstErrId) firstErrId = std.id;
            } else {
              stdTotal += num;
              hasVal = true;
            }
          }
        });
        if (!hasVal && entry.marksObtained !== "") {
          const num = parseFloat(entry.marksObtained);
          if (!isNaN(num) && num >= 0 && num <= maxValNum) {
            stdTotal = num;
            hasVal = true;
          }
        }
      } else {
        const scoreStr = entry.marksObtained || "";
        if (scoreStr !== "") {
          const num = parseFloat(scoreStr);
          if (isNaN(num) || num < 0 || num > maxValNum) {
            invalid = true;
            if (!firstErrId) firstErrId = std.id;
          } else {
            stdTotal = num;
            hasVal = true;
          }
        }
      }

      if (hasVal) {
        count++;
        totalScore += stdTotal;
        if (stdTotal > maxScore) {
          maxScore = stdTotal;
          topName = std.name;
        }
        const pct = (stdTotal / maxValNum) * 100;
        if (pct >= 33) passed++;
      }
    });

    const avg = count > 0 ? (totalScore / count).toFixed(1) : "0.0";
    const passPct = count > 0 ? Math.round((passed / count) * 100) : 0;

    return {
      enteredCount: count,
      classAvgScore: avg,
      highestScore: maxScore,
      topScorerName: topName,
      passPercentage: passPct,
      passCount: passed,
      hasValidationError: invalid,
      firstErrorStudentId: firstErrId,
    };
  }, [classStudents, marksRoster, isSplitExam, splitComponents, maxValNum]);

  // ─── INPUT HANDLERS (Strict Bounds Validation: 0 to Max Marks) ──────────────
  const handleMarkChange = useCallback(
    (studentId: string, val: string) => {
      if (val !== "") {
        const num = parseFloat(val);
        if (!isNaN(num) && (num > maxValNum || num < 0)) {
          return; // Strictly reject values exceeding maximum marks
        }
      }

      setSavedMap((prev) => (prev[studentId] ? { ...prev, [studentId]: false } : prev));
      setMarksRoster((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || { remarks: "", breakdown: {} }),
          marksObtained: val,
        },
      }));
    },
    [maxValNum]
  );

  const handleBreakdownChange = useCallback(
    (studentId: string, compName: string, val: string) => {
      if (val !== "") {
        const num = parseFloat(val);
        const comp = splitComponents.find((c: any) => c.name === compName);
        const maxVal = comp ? comp.max : maxValNum;
        if (!isNaN(num) && (num > maxVal || num < 0)) {
          return; // Strictly reject values exceeding component max marks
        }
      }

      setSavedMap((prev) => (prev[studentId] ? { ...prev, [studentId]: false } : prev));
      setMarksRoster((prev) => {
        const entry = prev[studentId] || { marksObtained: "", remarks: "", breakdown: {} };
        return {
          ...prev,
          [studentId]: {
            ...entry,
            breakdown: {
              ...entry.breakdown,
              [compName]: val,
            },
          },
        };
      });
    },
    [splitComponents, maxValNum]
  );

  const handleRemarksChange = useCallback((studentId: string, val: string) => {
    setSavedMap((prev) => (prev[studentId] ? { ...prev, [studentId]: false } : prev));
    setMarksRoster((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { marksObtained: "", breakdown: {} }),
        remarks: val,
      },
    }));
  }, []);

  // ─── ABSENT TOGGLE HANDLER ──────────────────────────────────────────────────
  const handleToggleAbsent = useCallback((studentId: string) => {
    setSavedMap((prev) => (prev[studentId] ? { ...prev, [studentId]: false } : prev));
    setMarksRoster((prev) => {
      const current = prev[studentId] || EMPTY_ENTRY;
      const nextAbsent = !current.isAbsent;
      return {
        ...prev,
        [studentId]: {
          marksObtained: nextAbsent ? "" : "",
          breakdown: nextAbsent ? {} : current.breakdown,
          remarks: nextAbsent ? "ABSENT" : "",
          isAbsent: nextAbsent,
        },
      };
    });
  }, []);

  // ─── CLEAR / RESET SINGLE STUDENT MARKS ─────────────────────────────────────
  const handleClearSingle = useCallback(
    async (studentId: string) => {
      const student = classStudents.find((s) => s.id === studentId);
      const studentName = student ? student.name : "Student";
      const wasSaved = !!savedInDbMap[studentId];

      // Immediately clear in-memory state
      setMarksRoster((prev) => ({
        ...prev,
        [studentId]: { marksObtained: "", remarks: "", breakdown: {}, isAbsent: false },
      }));
      setSavedMap((prev) => ({ ...prev, [studentId]: false }));

      if (wasSaved) {
        if (!selectedSubject || !selectedExam) return;
        setSavingStudentId(studentId);
        try {
          const res = await fetch("/api/marks/bulk", {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              examName: selectedExam,
              subject: selectedSubject,
              studentId,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed to clear marks.");
          setSavedInDbMap((prev) => ({ ...prev, [studentId]: false }));
          showToast("success", "Cleared ✓", `${studentName}: Marks removed from cloud.`, 2500);
        } catch (err: any) {
          console.error("handleClearSingle error:", err);
          showToast("error", "Clear Failed", err.message || "Failed to clear marks.", 4000);
        } finally {
          setSavingStudentId(null);
        }
      } else {
        showToast("info", "Reset", `${studentName}: Entry cleared.`, 2000);
      }
    },
    [classStudents, savedInDbMap, selectedSubject, selectedExam, showToast]
  );

  // ─── PAYLOAD CONSTRUCTOR HELPER ─────────────────────────────────────────────
  const getStudentPayload = useCallback(
    (studentId: string) => {
      const dataEntry = marksRoster[studentId];
      if (!dataEntry) return null;

      if (dataEntry.isAbsent) {
        return {
          studentId,
          marksObtained: 0,
          isAbsent: true,
          breakdown: null,
          remarks: "ABSENT",
        };
      }

      if (isSplitExam) {
        let hasAny = false;
        const breakdownJson: Record<string, number> = {};
        let total = 0;
        splitComponents.forEach((comp: any) => {
          const vStr = dataEntry.breakdown?.[comp.name] || "";
          if (vStr !== "") {
            hasAny = true;
            const numVal = parseFloat(vStr) || 0;
            breakdownJson[comp.name] = numVal;
            total += numVal;
          }
        });

        if (!hasAny) return null;

        return {
          studentId,
          marksObtained: total,
          isAbsent: false,
          breakdown: breakdownJson,
          remarks: dataEntry.remarks || "",
        };
      } else {
        const scoreStr = dataEntry.marksObtained || "";
        if (scoreStr === "") return null;

        return {
          studentId,
          marksObtained: parseFloat(scoreStr),
          isAbsent: false,
          breakdown: null,
          remarks: dataEntry.remarks || "",
        };
      }
    },
    [marksRoster, isSplitExam, splitComponents]
  );

  // ─── INSTANT SAVE FOR A SINGLE STUDENT ──────────────────────────────────────
  const handleSaveSingle = useCallback(
    async (studentId: string) => {
      const student = classStudents.find((s) => s.id === studentId);
      const studentName = student ? student.name : "Student";

      if (!selectedSubject) {
        showToast("error", "Subject Required", "Please select a subject first.");
        return;
      }

      if (!selectedExam) {
        showToast("error", "Exam Required", "Please select an exam first.");
        return;
      }

      const payload = getStudentPayload(studentId);
      if (!payload) {
        showToast("error", "Marks Missing", `Please enter marks for ${studentName} before saving.`);
        return;
      }

      setSavingStudentId(studentId);
      setErrorMsg("");

      try {
        const res = await fetch("/api/marks/bulk", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examName: selectedExam,
            subject: selectedSubject,
            maxMarks: maxValNum,
            marksList: [payload],
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to save student marks.");
        }

        setSavedMap((prev) => ({ ...prev, [studentId]: true }));
        setSavedInDbMap((prev) => ({ ...prev, [studentId]: true }));
        const actionLabel = payload.isAbsent ? "Absent status recorded!" : "Marks safely saved!";
        showToast("success", "Saved ✓", `${studentName}: ${actionLabel}`, 2500);
      } catch (err: any) {
        console.error("handleSaveSingle error:", err);
        showToast("error", "Save Failed", err.message || "Failed to save student mark. Please try again.", 4000);
      } finally {
        setSavingStudentId(null);
      }
    },
    [classStudents, selectedSubject, selectedExam, getStudentPayload, maxValNum, showToast]
  );

  // ─── SAVE ALL MARKS (Safe Chunked 15-Student Execution) ──────────────────────
  const handleSaveAll = async () => {
    if (hasValidationError) {
      showToast("error", "Invalid Marks", "Please fix marks highlighted in red before saving.", 4000);
      if (firstErrorStudentId) {
        const el = document.getElementById(`student-card-${firstErrorStudentId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    if (!selectedSubject) {
      showToast("error", "Subject Required", "Please select a subject.", 3500);
      return;
    }

    if (!selectedExam) {
      showToast("error", "Exam Required", "Please select an exam.", 3500);
      return;
    }

    const marksList = classStudents
      .map((s) => getStudentPayload(s.id))
      .filter((m): m is NonNullable<typeof m> => m !== null);

    // Detect students who were previously stored in DB but have now been cleared
    const deletedStudentIds = classStudents
      .filter((s) => {
        const wasInDb = !!savedInDbMap[s.id];
        if (!wasInDb) return false;
        const entry = marksRoster[s.id];
        if (!entry) return true;
        if (entry.isAbsent) return false;
        if (entry.marksObtained !== "") return false;
        if (entry.breakdown && Object.values(entry.breakdown).some((v) => v !== "")) return false;
        return true;
      })
      .map((s) => s.id);

    if (marksList.length === 0 && deletedStudentIds.length === 0) {
      showToast("error", "No Marks Entered", "Please enter marks or mark absent for at least one student before saving.", 3500);
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    const BATCH_SIZE = 15;
    const totalBatches = Math.max(1, Math.ceil(marksList.length / BATCH_SIZE));
    let totalSaved = 0;
    setSavingProgress({ currentBatch: 1, totalBatches, saved: 0, total: marksList.length });

    try {
      if (marksList.length > 0) {
        for (let i = 0; i < marksList.length; i += BATCH_SIZE) {
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          setSavingProgress({
            currentBatch: batchNum,
            totalBatches,
            saved: totalSaved,
            total: marksList.length,
          });

          const chunk = marksList.slice(i, i + BATCH_SIZE);
          const res = await fetch("/api/marks/bulk", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              examName: selectedExam,
              subject: selectedSubject,
              maxMarks: maxValNum,
              marksList: chunk,
              deletedStudentIds: i === 0 && deletedStudentIds.length > 0 ? deletedStudentIds : undefined,
            }),
          });

          const json = await res.json();

          if (!res.ok) {
            throw new Error(
              json.error ||
                `Failed while saving batch ${batchNum}. ${totalSaved} students were already saved.`
            );
          }

          // Mark this chunk as saved immediately
          setSavedMap((prev) => {
            const next = { ...prev };
            chunk.forEach((item) => {
              next[item.studentId] = true;
            });
            return next;
          });

          totalSaved += (json.count || chunk.length);
        }
      } else if (deletedStudentIds.length > 0) {
        // Only deletions
        const res = await fetch("/api/marks/bulk", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examName: selectedExam,
            subject: selectedSubject,
            maxMarks: maxValNum,
            marksList: [],
            deletedStudentIds,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to clear student marks.");
        }
      }

      // Update savedInDbMap: mark saved as in DB, clear deleted
      setSavedInDbMap((prev) => {
        const next = { ...prev };
        deletedStudentIds.forEach((id) => {
          delete next[id];
        });
        marksList.forEach((item) => {
          next[item.studentId] = true;
        });
        return next;
      });

      // Clear phone draft after all batches finish successfully
      const draftKey = `draft_marks_${selectedClass}_${selectedExam}_${selectedSubject}`;
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {}
      setIsDraftRestored(false);
      setIsEditMode(true);

      // Trigger the reassuring Confirmation Popup Modal!
      setSaveSuccessModal({
        isOpen: true,
        totalSaved: totalSaved + deletedStudentIds.length,
        totalStudents: classStudents.length,
        className: selectedClass,
        subject: selectedSubject,
        exam: selectedExam,
      });

      // Also trigger a floating toast for instant feedback
      showToast("success", "Saved to Cloud ✓", `Saved successfully for ${totalSaved} students!`, 4000);
    } catch (err: any) {
      console.error("handleSaveAll error:", err);
      showToast("error", "Saving Interrupted", err.message || "Failed to save marks. Please check connection and retry.", 5000);
    } finally {
      setSaving(false);
      setSavingProgress(null);
    }
  };

  return (
    <div className="-mx-2 sm:mx-0 space-y-4 text-left pb-24 sm:pb-8">
      {/* ─── FLOATING SCREEN TOAST (Always in Viewport at Top Center) ─── */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] sm:w-auto min-w-[300px] max-w-md flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
            toast.type === "success"
              ? "bg-slate-900/95 border-emerald-500/40 text-white"
              : toast.type === "error"
              ? "bg-slate-900/95 border-rose-500/40 text-white"
              : "bg-slate-900/95 border-indigo-500/40 text-white"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === "success" ? (
              <div className="h-7 w-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            ) : toast.type === "error" ? (
              <div className="h-7 w-7 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
            ) : (
              <div className="h-7 w-7 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Info className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 text-left">
              <p className="text-xs font-black leading-tight text-white">{toast.title}</p>
              <p className="text-[10px] text-slate-300 font-semibold leading-tight truncate mt-0.5">{toast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── CONFIRMATION POPUP MODAL (Save All Success) ─── */}
      {saveSuccessModal && saveSuccessModal.isOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/60 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.15)] relative space-y-4 text-center animate-in zoom-in-95 duration-200">
            {/* Decorative success icon */}
            <div className="relative mx-auto w-16 h-16">
              <div className="h-16 w-16 bg-emerald-50 border-2 border-emerald-200 rounded-3xl flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs">
                <Sparkles className="h-3 w-3" />
              </div>
            </div>

            {/* Heading & Subtitle */}
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Marks Saved to Cloud!</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Sabhi marks database me safe save ho chuke hain.
              </p>
            </div>

            {/* Details Capsule Card */}
            <div className="bg-slate-50/90 border border-slate-100 rounded-2xl p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-black uppercase text-[9px] tracking-wider">Class</span>
                <span className="text-slate-800 font-black">{normalizeDisplayClassName(saveSuccessModal.className)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-black uppercase text-[9px] tracking-wider">Subject & Exam</span>
                <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/70 text-[10px] font-black">
                  {saveSuccessModal.subject} • {saveSuccessModal.exam}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Records Saved</span>
                <span className="text-emerald-700 font-black bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                  ✓ {saveSuccessModal.totalSaved} of {saveSuccessModal.totalStudents} Students
                </span>
              </div>
            </div>

            {/* Reassuring note */}
            <p className="text-[10px] text-slate-400 font-bold leading-tight">
              Aap doosre subject ya class ke marks feed karna shuru kar sakte hain.
            </p>

            {/* Close / Action Button */}
            <button
              type="button"
              onClick={() => setSaveSuccessModal(null)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/25 cursor-pointer"
            >
              Theek Hai / Continue
            </button>
          </div>
        </div>
      )}

      {/* ─── Header & Selection Panel ─── */}
      <div className="bg-white border-y sm:border border-slate-200/60 sm:rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-[10.5px] sm:text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 tracking-wider">
              <BookOpen className="h-3.5 w-3.5" /> Student Marks Entry
            </h3>
            <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-semibold mt-1.5 leading-tight">
              Select class, exam name, and subject to enter and save student marks.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {selectedClass && (
              <a
                href={`/api/marks/export?type=all&exam=${encodeURIComponent(selectedExam || "Unit-1")}&class=${encodeURIComponent(selectedClass)}`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-[10px] font-black text-teal-700 hover:bg-teal-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
                title={`Download CSV of marks for ${selectedClass} only`}
              >
                <Download className="h-3 w-3 text-teal-600" />
                <span>Download CSV ({selectedClass})</span>
              </a>
            )}
            <a
              href={`/api/marks/export?type=all&exam=${encodeURIComponent(selectedExam || "Unit-1")}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-black text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Download full CSV of all students with marks"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              <span>Download CSV (All)</span>
            </a>
            <a
              href={`/api/marks/export?type=xlsx&exam=${encodeURIComponent(selectedExam || "Unit-1")}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-[10px] font-black text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Download Excel Report with Summary & Pending sheets"
            >
              <Download className="h-3 w-3 text-indigo-600" />
              <span>Excel Report</span>
            </a>
            <button
              type="button"
              onClick={loadMarks}
              disabled={loadingMarks}
              title="Reload from server"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RotateCcw className={`h-3 w-3 ${loadingMarks ? "animate-spin text-indigo-600" : ""}`} />
              <span>{loadingMarks ? "Loading..." : "Reload Marks"}</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3.5">
          <div>
            <label className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
              Class & Section
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-[10.5px] sm:text-[11px] font-extrabold py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200/60 rounded-xl sm:rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {normalizeDisplayClassName(cls)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
              Exam Name
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full text-[10.5px] sm:text-[11px] font-extrabold py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200/60 rounded-xl sm:rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-[10.5px] sm:text-[11px] font-extrabold py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200/60 rounded-xl sm:rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                Maximum Marks
              </label>
              <span className="text-[7.5px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-1 py-0.5 rounded leading-none">
                Exam Max
              </span>
            </div>
            <input
              type="text"
              readOnly
              disabled
              value={maxMarks}
              className="w-full text-[10.5px] sm:text-[11px] font-black py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200/60 rounded-xl sm:rounded-2xl outline-none bg-slate-100/80 text-slate-600 opacity-90 cursor-not-allowed shadow-2xs transition-all select-none"
            />
          </div>
        </div>
      </div>

      {/* ─── Draft Restored Alert Banner ─── */}
      {isDraftRestored && (
        <div className="flex items-center justify-between bg-amber-50 text-amber-900 border border-amber-200/80 p-3 rounded-2xl text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Unsaved draft restored from this phone. Tap "Save Marks" to submit to server.</span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="text-[10px] font-black uppercase text-rose-700 hover:underline cursor-pointer shrink-0 ml-2"
          >
            Discard Draft
          </button>
        </div>
      )}

      {/* ─── Class Performance Overview Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider">Total Students</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">
              {enteredCount} / {classStudents.length} <span className="text-[10px] text-slate-400 font-semibold">Entered</span>
            </h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-50 border border-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider">Class Average</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">
              {classAvgScore} <span className="text-[10px] text-slate-400 font-semibold">/ {maxMarks}</span>
            </h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-amber-50 border border-amber-100/50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider">Top Scorer</p>
            <h4 className="text-xs font-black text-slate-800 mt-0.5 truncate max-w-[110px]" title={topScorerName}>
              {topScorerName !== "--" ? `${highestScore} (${topScorerName.split(" ")[0]})` : "--"}
            </h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-teal-50 border border-teal-100/50 rounded-2xl flex items-center justify-center text-teal-600 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider">Pass % (≥33%)</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">
              {passPercentage}% <span className="text-[10px] text-emerald-600 font-bold">({passCount} Pass)</span>
            </h4>
          </div>
        </div>
      </div>

      {/* ─── Search & Status Row ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 sm:rounded-2xl rounded-xl border-y sm:border border-slate-200/90 shadow-2xs text-left">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditMode ? (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1 font-bold uppercase tracking-wider">
              📝 Saved Marks (Edit Mode)
            </span>
          ) : (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2.5 py-1 font-bold uppercase tracking-wider">
              ✨ Fresh Entry
            </span>
          )}
          {isSplitExam && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 font-bold uppercase tracking-wider">
              🧩 Component Marks
            </span>
          )}
          {loadingMarks && (
            <span className="text-[10px] bg-slate-100 text-slate-600 rounded-lg px-2 py-0.5 font-bold inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* SORT / FILTER SELECTOR (Defaults to Roll No as requested) */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 rounded-2xl px-3 py-2 transition-all shadow-2xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 shrink-0">Order:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value="roll">Roll No (1 - 99)</option>
              <option value="name_asc">Name (A - Z)</option>
              <option value="name_desc">Name (Z - A)</option>
              <option value="status">Pending First</option>
            </select>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400/80" />
            <input
              type="text"
              placeholder="Search student name or roll..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full sm:w-60 text-xs font-extrabold py-2.5 pl-10 pr-4 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 transition-all shadow-2xs text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-xs font-bold text-left shadow-2xs animate-fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2.5 bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-200 text-xs font-bold text-left shadow-2xs animate-fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* ─── Student List & Save Header ─── */}
      <div className="text-left">
        <div className="p-4 bg-white border border-slate-200/60 sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Students Marks List ({filteredStudents.length} Students)
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Enter marks and tap Save Marks.</p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving || classStudents.length === 0}
            className="hidden sm:flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/15 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {savingProgress
                    ? `Saving (${savingProgress.saved}/${savingProgress.total})...`
                    : "Saving Marks..."}
                </span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Marks</span>
              </>
            )}
          </button>
        </div>

        {/* 📱 MOBILE VIEW: Optimized Fast Cards */}
        <div className="block sm:hidden space-y-3">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <StudentMobileCard
                key={student.id}
                student={student}
                entry={marksRoster[student.id] || EMPTY_ENTRY}
                isSplitExam={isSplitExam}
                splitComponents={splitComponents}
                maxMarks={maxMarks}
                maxValNum={maxValNum}
                onMarkChange={handleMarkChange}
                onBreakdownChange={handleBreakdownChange}
                onRemarksChange={handleRemarksChange}
                isSaved={!!savedMap[student.id]}
                isSaving={savingStudentId === student.id}
                onSaveSingle={handleSaveSingle}
                onToggleAbsent={handleToggleAbsent}
                onClearSingle={handleClearSingle}
                wasSavedInDb={!!savedInDbMap[student.id]}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold italic text-xs">
              No students found for Class {selectedClass}.
            </div>
          )}
        </div>

        {/* 💻 DESKTOP VIEW: Full Data Table */}
        <div className="hidden sm:block bg-white border border-slate-200/60 sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {isSplitExam ? (
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider select-none">
                    <th
                      onClick={() => setSortBy("roll")}
                      className={`py-3 px-3 w-16 text-center cursor-pointer transition-colors ${
                        sortBy === "roll" ? "bg-indigo-50/90 text-indigo-900 font-black" : "hover:bg-slate-100"
                      }`}
                      title="Click to sort by Roll Number"
                    >
                      <span className="inline-flex items-center justify-center gap-0.5">
                        Roll {sortBy === "roll" && <span className="text-indigo-600 font-black text-[9px]">▲</span>}
                      </span>
                    </th>
                    <th
                      onClick={() => setSortBy(sortBy === "name_asc" ? "name_desc" : "name_asc")}
                      className={`py-3 px-3 cursor-pointer transition-colors ${
                        sortBy === "name_asc" || sortBy === "name_desc"
                          ? "bg-indigo-50/90 text-indigo-900 font-black"
                          : "hover:bg-slate-100"
                      }`}
                      title="Click to sort by Name"
                    >
                      <span className="inline-flex items-center gap-1">
                        Student Name
                        {sortBy === "name_asc" && <span className="text-indigo-600 font-black text-[9px]">▲ A-Z</span>}
                        {sortBy === "name_desc" && <span className="text-indigo-600 font-black text-[9px]">▼ Z-A</span>}
                      </span>
                    </th>
                    {splitComponents.map((comp: any, idx: number) => (
                      <th key={idx} className="py-3 px-2 text-center w-28">
                        {comp.name} ({comp.max})
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center w-28">Total ({maxMarks})</th>
                    <th className="py-3 px-2 text-center w-20">Grade</th>
                    <th className="py-3 px-2 text-center w-24">Save</th>
                  </tr>
                ) : (
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider select-none">
                    <th
                      onClick={() => setSortBy("roll")}
                      className={`py-3 px-3 w-16 text-center cursor-pointer transition-colors ${
                        sortBy === "roll" ? "bg-indigo-50/90 text-indigo-900 font-black" : "hover:bg-slate-100"
                      }`}
                      title="Click to sort by Roll Number"
                    >
                      <span className="inline-flex items-center justify-center gap-0.5">
                        Roll {sortBy === "roll" && <span className="text-indigo-600 font-black text-[9px]">▲</span>}
                      </span>
                    </th>
                    <th
                      onClick={() => setSortBy(sortBy === "name_asc" ? "name_desc" : "name_asc")}
                      className={`py-3 px-3 cursor-pointer transition-colors ${
                        sortBy === "name_asc" || sortBy === "name_desc"
                          ? "bg-indigo-50/90 text-indigo-900 font-black"
                          : "hover:bg-slate-100"
                      }`}
                      title="Click to sort by Name"
                    >
                      <span className="inline-flex items-center gap-1">
                        Student Name
                        {sortBy === "name_asc" && <span className="text-indigo-600 font-black text-[9px]">▲ A-Z</span>}
                        {sortBy === "name_desc" && <span className="text-indigo-600 font-black text-[9px]">▼ Z-A</span>}
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center w-36">Marks Obtained</th>
                    <th className="py-3 px-3 text-center w-24">Max Marks</th>
                    <th className="py-3 px-3 text-center w-24">Percentage</th>
                    <th className="py-3 px-2 text-center w-20">Grade</th>
                    <th className="py-3 px-2 text-center w-24">Save</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <StudentTableRow
                      key={student.id}
                      student={student}
                      entry={marksRoster[student.id] || EMPTY_ENTRY}
                      isSplitExam={isSplitExam}
                      splitComponents={splitComponents}
                      maxMarks={maxMarks}
                      maxValNum={maxValNum}
                      onMarkChange={handleMarkChange}
                      onBreakdownChange={handleBreakdownChange}
                      isRowSaved={!!savedMap[student.id]}
                      isRowSaving={savingStudentId === student.id}
                      onSaveSingle={handleSaveSingle}
                      onToggleAbsent={handleToggleAbsent}
                      onClearSingle={handleClearSingle}
                      wasSavedInDb={!!savedInDbMap[student.id]}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isSplitExam ? splitComponents.length + 5 : 7}
                      className="py-8 text-center text-slate-400 font-bold italic"
                    >
                      No students found matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Desktop Bottom Save Action Bar */}
        <div className="hidden sm:flex p-5 bg-slate-50/50 border-t border-slate-200/60 justify-end rounded-b-3xl">
          <button
            onClick={handleSaveAll}
            disabled={saving || classStudents.length === 0}
            className="flex items-center gap-2 py-3 px-7 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/15 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {savingProgress
                    ? `Saving (${savingProgress.saved}/${savingProgress.total})...`
                    : "Saving Marks..."}
                </span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Marks</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 📱 MOBILE FLOATING STICKY SAVE BAR (Always reachable while scrolling) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] flex items-center justify-between sm:hidden animate-slide-up">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-[8px] font-black uppercase text-slate-400 block leading-none">Class Total</span>
            <span className="text-xs font-black text-slate-800">
              {enteredCount} / {classStudents.length} Entered
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || classStudents.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {savingProgress
                  ? `Saving (${savingProgress.saved}/${savingProgress.total})`
                  : "Saving..."}
              </span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Marks</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
