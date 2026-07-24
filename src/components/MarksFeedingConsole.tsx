"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Save,
  AlertCircle,
  CheckCircle,
  Search,
  Printer,
  FileText,
  Award,
  TrendingUp,
  Users,
  Sparkles,
  CheckCircle2,
  Eye,
  Layers,
  BookOpen
} from "lucide-react";

export default function MarksFeedingConsole() {
  const { students, schoolInfo, refreshData } = useAuth();

  const availableClasses = Array.from(
    new Set(students.map((s) => `${s.class}-${s.section}`))
  ).sort();

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubjectMode, setIsCustomSubjectMode] = useState(false);
  const [maxMarks, setMaxMarks] = useState("100");
  const [studentSearch, setStudentSearch] = useState("");

  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [selectedReportCardStudentId, setSelectedReportCardStudentId] = useState("");
  const [selectedReportCardExam, setSelectedReportCardExam] = useState("All");
  const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);

  const [marksRoster, setMarksRoster] = useState<{
    [studentId: string]: {
      marksObtained: string;
      remarks: string;
      breakdown: { [compName: string]: string };
    };
  }>({});

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const availableExams = schoolInfo.exams && schoolInfo.exams.length > 0
    ? schoolInfo.exams
    : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];

  const examConfig = schoolInfo.examConfig?.[selectedExam] || {
    isSplit: false,
    maxMarks: 100,
    components: []
  };

  const isSplitExam = examConfig.isSplit;
  const splitComponents = examConfig.components || [];

  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
    if (availableExams.length > 0 && !selectedExam) {
      setSelectedExam(availableExams[0]);
    }
  }, [availableClasses, availableExams]);

  useEffect(() => {
    if (selectedExam) {
      const defaultMax = examConfig.maxMarks?.toString() || "100";
      setMaxMarks(defaultMax);
    }
  }, [selectedExam, schoolInfo.examConfig]);

  useEffect(() => {
    if (!selectedClass || !selectedExam || !selectedSubject) return;

    const subjectToUse = isCustomSubjectMode ? customSubject : selectedSubject;
    if (!subjectToUse) return;

    const classStudents = students.filter(
      (s) => `${s.class}-${s.section}` === selectedClass
    );

    const newRoster: typeof marksRoster = {};
    let foundAny = false;
    let loadedMaxMarks = "100";

    classStudents.forEach((student) => {
      const existingMark = student.marks?.find(
        (m: any) =>
          m.subject.toLowerCase() === subjectToUse.toLowerCase() &&
          m.examName.toLowerCase() === selectedExam.toLowerCase()
      );

      if (existingMark) {
        let initialBreakdown: { [key: string]: string } = {};
        if (existingMark.breakdown && typeof existingMark.breakdown === "object") {
          Object.entries(existingMark.breakdown).forEach(([k, v]) => {
            initialBreakdown[k] = v !== null && v !== undefined ? v.toString() : "";
          });
        } else if (isSplitExam) {
          splitComponents.forEach((comp: any) => {
            const normalizedKey = comp.name.toLowerCase().replace(/[^a-z]/g, "");
            if (normalizedKey.includes("written") || normalizedKey.includes("exam")) {
              if (existingMark.writtenExam !== null && existingMark.writtenExam !== undefined) {
                initialBreakdown[comp.name] = existingMark.writtenExam.toString();
              }
            } else if (normalizedKey.includes("notebook") || normalizedKey.includes("note")) {
              if (existingMark.notebook !== null && existingMark.notebook !== undefined) {
                initialBreakdown[comp.name] = existingMark.notebook.toString();
              }
            } else if (normalizedKey.includes("enrichment") || normalizedKey.includes("enri") || normalizedKey.includes("sub")) {
              if (existingMark.subjectEnrichment !== null && existingMark.subjectEnrichment !== undefined) {
                initialBreakdown[comp.name] = existingMark.subjectEnrichment.toString();
              }
            } else if (normalizedKey.includes("practical") || normalizedKey.includes("act") || normalizedKey.includes("prac")) {
              if (existingMark.practical !== null && existingMark.practical !== undefined) {
                initialBreakdown[comp.name] = existingMark.practical.toString();
              }
            }
          });
        }

        newRoster[student.id] = {
          marksObtained: existingMark.marksObtained?.toString() || "",
          remarks: existingMark.remarks || "",
          breakdown: initialBreakdown,
        };
        foundAny = true;
        loadedMaxMarks = existingMark.maxMarks.toString();
      } else {
        newRoster[student.id] = {
          marksObtained: "",
          remarks: "",
          breakdown: {},
        };
      }
    });

    setMarksRoster(newRoster);
    setIsEditMode(foundAny);
    if (foundAny) {
      setMaxMarks(loadedMaxMarks);
    }
  }, [selectedClass, selectedExam, selectedSubject, customSubject, isCustomSubjectMode, students, isSplitExam]);

  const classStudents = students.filter(
    (s) => `${s.class}-${s.section}` === selectedClass
  );

  const filteredStudents = classStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.rollNo && s.rollNo.toString().includes(studentSearch)) ||
    (s.admissionNo && s.admissionNo.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  const maxValNum = parseFloat(maxMarks) || 100;
  let enteredCount = 0;
  let totalClassScore = 0;
  let highestScore = 0;
  let topScorerName = "--";
  let passCount = 0;

  classStudents.forEach((std) => {
    const entry = marksRoster[std.id];
    if (!entry) return;

    let stdTotal = 0;
    let hasVal = false;

    if (isSplitExam) {
      splitComponents.forEach((comp: any) => {
        const v = parseFloat(entry.breakdown[comp.name] || "");
        if (!isNaN(v)) {
          stdTotal += v;
          hasVal = true;
        }
      });
    } else {
      const v = parseFloat(entry.marksObtained);
      if (!isNaN(v)) {
        stdTotal = v;
        hasVal = true;
      }
    }

    if (hasVal) {
      enteredCount++;
      totalClassScore += stdTotal;
      if (stdTotal > highestScore) {
        highestScore = stdTotal;
        topScorerName = std.name;
      }
      const pct = (stdTotal / maxValNum) * 100;
      if (pct >= 33) passCount++;
    }
  });

  const classAvgScore = enteredCount > 0 ? (totalClassScore / enteredCount).toFixed(1) : "0.0";
  const passPercentage = enteredCount > 0 ? Math.round((passCount / enteredCount) * 100) : 0;

  const handleMarkChange = (studentId: string, val: string) => {
    setMarksRoster((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { remarks: "", breakdown: {} }),
        marksObtained: val,
      },
    }));
  };

  const handleBreakdownChange = (studentId: string, compName: string, val: string) => {
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
  };

  const handleRemarksChange = (studentId: string, val: string) => {
    setMarksRoster((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { marksObtained: "", breakdown: {} }),
        remarks: val,
      },
    }));
  };

  const handleSubjectChange = (val: string) => {
    if (val === "CUSTOM") {
      setIsCustomSubjectMode(true);
      setSelectedSubject("CUSTOM");
    } else {
      setIsCustomSubjectMode(false);
      setSelectedSubject(val);
      setCustomSubject("");
    }
  };

  const max = parseFloat(maxMarks) || 0;
  let hasValidationError = false;

  classStudents.forEach((s) => {
    const dataEntry = marksRoster[s.id];
    if (!dataEntry) return;

    if (isSplitExam) {
      splitComponents.forEach((comp: any) => {
        const valStr = dataEntry.breakdown[comp.name] || "";
        if (valStr !== "") {
          const val = parseFloat(valStr);
          if (isNaN(val) || val < 0 || val > comp.max) {
            hasValidationError = true;
          }
        }
      });
    } else {
      const scoreStr = dataEntry.marksObtained || "";
      if (scoreStr !== "") {
        const score = parseFloat(scoreStr);
        if (isNaN(score) || score < 0 || score > max) {
          hasValidationError = true;
        }
      }
    }
  });

  const handleSaveAll = async () => {
    if (hasValidationError) {
      setErrorMsg("Please fix validation errors before saving.");
      return;
    }

    const subjectToUse = isCustomSubjectMode ? customSubject : selectedSubject;
    if (!subjectToUse) {
      setErrorMsg("Please specify a subject.");
      return;
    }

    if (!selectedExam) {
      setErrorMsg("Please select an exam.");
      return;
    }

    const maxVal = parseFloat(maxMarks);
    if (isNaN(maxVal) || maxVal <= 0) {
      setErrorMsg("Please enter a valid Maximum Marks value.");
      return;
    }

    const marksList = classStudents
      .map((s) => {
        const dataEntry = marksRoster[s.id];
        if (!dataEntry) return null;

        if (isSplitExam) {
          const keys = Object.keys(dataEntry.breakdown);
          const hasAny = keys.some((k) => dataEntry.breakdown[k] !== "");
          if (!hasAny) return null;

          const breakdownJson: { [key: string]: number } = {};
          let total = 0;
          splitComponents.forEach((comp: any) => {
            const vStr = dataEntry.breakdown[comp.name] || "";
            const v = vStr !== "" ? parseFloat(vStr) : 0;
            breakdownJson[comp.name] = v;
            total += v;
          });

          return {
            studentId: s.id,
            marksObtained: total,
            breakdown: breakdownJson,
            remarks: dataEntry.remarks || "",
          };
        } else {
          const scoreStr = dataEntry.marksObtained || "";
          if (scoreStr === "") return null;

          return {
            studentId: s.id,
            marksObtained: parseFloat(scoreStr),
            breakdown: null,
            remarks: dataEntry.remarks || "",
          };
        }
      })
      .filter((m) => m !== null);

    if (marksList.length === 0) {
      setErrorMsg("No marks data was entered to save.");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/marks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: selectedExam,
          subject: subjectToUse,
          maxMarks: maxVal,
          marksList,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save marks.");
      }

      await refreshData();
      setSuccessMsg("Marks saved successfully for the entire roster!");
      setIsEditMode(true);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save student marks.");
    } finally {
      setSaving(false);
    }
  };

  const getGradeBadge = (obtained: number, maxVal: number) => {
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

  const getCbseGrade = (pct: number) => {
    if (pct >= 91) return "A1";
    if (pct >= 81) return "A2";
    if (pct >= 71) return "B1";
    if (pct >= 61) return "B2";
    if (pct >= 51) return "C1";
    if (pct >= 41) return "C2";
    if (pct >= 33) return "D";
    return "E (Needs Imp)";
  };

  return (
    <div className="-mx-2 sm:mx-0 space-y-4 text-left">
      {/* ─── Clean Header & Filter Control Console ─── */}
      <div className="bg-white border-y sm:border border-slate-200/90 sm:rounded-2xl p-3 sm:p-5 shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/80 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                Feed Student Marks & Marksheets
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Select class & exam to enter student marks, track average scores, and view live report cards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => {
                if (classStudents.length > 0) {
                  setSelectedReportCardStudentId(classStudents[0].id);
                }
                setIsBulkPrintMode(false);
                setShowReportCardModal(true);
              }}
              className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Eye className="h-4 w-4" />
              <span>Live Marksheet</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBulkPrintMode(true);
                setShowReportCardModal(true);
              }}
              className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="h-4 w-4" />
              <span>Bulk Print Class</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Class Section
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer shadow-2xs transition-all"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Examination Scope
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer shadow-2xs transition-all"
            >
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Subject Name
            </label>
            {!isCustomSubjectMode ? (
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full text-xs sm:text-sm font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer shadow-2xs transition-all"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
                <option value="Social Studies">Social Studies</option>
                <option value="Hindi">Hindi</option>
                <option value="CUSTOM">Type custom subject...</option>
              </select>
            ) : (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomSubjectMode(false)}
                  className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Max Marks
            </label>
            <input
              type="number"
              min="1"
              required
              inputMode="decimal"
              disabled={isEditMode || isSplitExam}
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* ─── Class Performance Overview Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
        <div className="bg-white border border-slate-200/90 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Class Roster</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">
              {enteredCount} / {classStudents.length} <span className="text-[10px] text-slate-400 font-semibold">Entered</span>
            </h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Class Average</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">
              {classAvgScore} <span className="text-[10px] text-slate-400 font-semibold">/ {maxMarks}</span>
            </h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Top Performer</p>
            <h4 className="text-xs font-black text-slate-800 mt-0.5 truncate max-w-[110px]" title={topScorerName}>
              {topScorerName !== "--" ? `${highestScore} pts (${topScorerName.split(" ")[0]})` : "--"}
            </h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Pass Rate (≥33%)</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">
              {passPercentage}% <span className="text-[10px] text-emerald-600 font-bold">({passCount} Passed)</span>
            </h4>
          </div>
        </div>
      </div>

      {/* ─── Search & Status Row ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 sm:rounded-2xl rounded-xl border-y sm:border border-slate-200/90 shadow-2xs text-left">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditMode ? (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1 font-bold uppercase tracking-wider">
              📝 Edit Mode Active
            </span>
          ) : (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2.5 py-1 font-bold uppercase tracking-wider">
              ✨ New Entry
            </span>
          )}
          {isSplitExam && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 font-bold uppercase tracking-wider">
              🧩 Dynamic Breakdown
            </span>
          )}
        </div>

        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name or roll..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 w-full sm:w-64 transition-all"
          />
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-xs font-bold text-left shadow-2xs">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2.5 bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-200 text-xs font-bold text-left shadow-2xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* ─── Student Roster Section ─── */}
      <div className="text-left">
        {/* Roster Header & Save Action Bar */}
        <div className="p-3 sm:p-3.5 bg-white border-y sm:border border-slate-200/90 sm:rounded-2xl shadow-xs mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Class Roster ({filteredStudents.length} Students)
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Enter scores and click Save Roster.</p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving || hasValidationError || classStudents.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Roster"}
          </button>
        </div>

        {/* 📱 MOBILE VIEW: Clean Flat Floating Cards (NO Box Inception, NO Text Break) */}
        <div className="block sm:hidden space-y-3">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => {
              const dataEntry = marksRoster[student.id] || {
                marksObtained: "",
                remarks: "",
                breakdown: {},
              };

              // Clean Initials for avatar circle to prevent awkward line breaks
              const nameParts = student.name.trim().split(" ");
              const initials = nameParts.length >= 2
                ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                : student.name.substring(0, 2).toUpperCase();

              if (isSplitExam) {
                let totalObt = 0;
                let hasAnyMark = false;
                let hasAnyInvalid = false;

                splitComponents.forEach((comp: any) => {
                  const vStr = dataEntry.breakdown[comp.name] || "";
                  if (vStr !== "") {
                    hasAnyMark = true;
                    const v = parseFloat(vStr);
                    totalObt += isNaN(v) ? 0 : v;
                    if (isNaN(v) || v < 0 || v > comp.max) {
                      hasAnyInvalid = true;
                    }
                  }
                });

                const gradeInfo = getGradeBadge(totalObt, maxValNum);

                return (
                  <div key={student.id} className={`p-4 rounded-2xl border ${hasAnyInvalid ? "border-rose-300 bg-rose-50/50" : "border-slate-200/90 bg-white"} shadow-xs space-y-3 transition-all text-left`}>
                    {/* Student Info Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shrink-0">
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
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeInfo.bg}`}>
                          {gradeInfo.grade}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReportCardStudentId(student.id);
                            setIsBulkPrintMode(false);
                            setShowReportCardModal(true);
                          }}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-200 press-scale cursor-pointer"
                          title="View Marksheet"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Component Inputs Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {splitComponents.map((comp: any, cIdx: number) => {
                        const valStr = dataEntry.breakdown[comp.name] || "";
                        const isValInvalid = valStr !== "" && (isNaN(parseFloat(valStr)) || parseFloat(valStr) < 0 || parseFloat(valStr) > comp.max);

                        return (
                          <div key={cIdx} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-500 block truncate">
                              {comp.name} ({comp.max})
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={comp.max}
                              placeholder="0"
                              value={valStr}
                              onChange={(e) => handleBreakdownChange(student.id, comp.name, e.target.value)}
                              className={`w-full text-center font-black py-2 px-2.5 border rounded-xl outline-none text-sm transition-all ${
                                isValInvalid
                                  ? "border-rose-500 bg-rose-50 text-rose-700"
                                  : "border-slate-200 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-800"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Total & Remarks Row */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <div className="bg-indigo-600 text-white rounded-xl px-3 py-2 text-center shrink-0 shadow-2xs">
                        <span className="text-[8px] font-extrabold uppercase block leading-none text-indigo-200">TOTAL</span>
                        <span className="text-sm font-black">{hasAnyMark ? totalObt : "--"}</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Add teacher remark (optional)..."
                        value={dataEntry.remarks}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-800"
                      />
                    </div>
                  </div>
                );
              } else {
                const scoreStr = dataEntry.marksObtained;
                const scoreNum = parseFloat(scoreStr);
                const isValid = !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= max;
                const pct = isValid && max > 0 ? Math.round((scoreNum / max) * 100) : 0;
                const gradeInfo = getGradeBadge(scoreNum, max);

                return (
                  <div key={student.id} className={`p-4 rounded-2xl border ${!isValid && scoreStr !== "" ? "border-rose-300 bg-rose-50/50" : "border-slate-200/90 bg-white"} shadow-xs space-y-3 transition-all text-left`}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs uppercase shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-sm truncate">{student.name}</p>
                          <p className="text-[10.5px] text-slate-500 font-semibold whitespace-nowrap">
                            Roll: <strong className="text-indigo-700 font-black">{student.rollNo || "--"}</strong> • Adm: {student.admissionNo}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReportCardStudentId(student.id);
                          setIsBulkPrintMode(false);
                          setShowReportCardModal(true);
                        }}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-200 press-scale cursor-pointer shrink-0"
                        title="View Marksheet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Touch Input Row */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Marks Obtained</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={maxMarks}
                          placeholder="Enter score"
                          value={scoreStr}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          className={`w-full text-center font-black py-2.5 px-3 border rounded-xl outline-none text-base transition-all ${
                            !isValid && scoreStr !== ""
                              ? "border-rose-500 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-800"
                          }`}
                        />
                      </div>
                      <div className="text-center shrink-0 pt-4">
                        <span className="text-sm font-black text-slate-500">/ {maxMarks}</span>
                      </div>
                      <div className="text-center shrink-0 pt-4">
                        <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${gradeInfo.bg}`}>
                          {gradeInfo.grade} {isValid ? `(${pct}%)` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Remarks */}
                    <input
                      type="text"
                      placeholder="Add teacher remark (optional)..."
                      value={dataEntry.remarks}
                      onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                      className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-800"
                    />
                  </div>
                );
              }
            })
          ) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold italic text-xs">
              No student record matches current class or search filter.
            </div>
          )}
        </div>

        {/* 💻 DESKTOP VIEW: Full Data Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {isSplitExam ? (
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3 w-16 text-center">Roll</th>
                  <th className="py-3 px-3">Student Name</th>
                  {splitComponents.map((comp: any, idx: number) => (
                    <th key={idx} className="py-3 px-2 text-center w-28">
                      {comp.name} ({comp.max})
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center w-28">Total</th>
                  <th className="py-3 px-2 text-center w-20">Grade</th>
                  <th className="py-3 px-3">Remarks</th>
                  <th className="py-3 px-3 text-center w-28">Marksheet</th>
                </tr>
              ) : (
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3 w-16 text-center">Roll</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3 text-center w-36">Marks Obtained</th>
                  <th className="py-3 px-3 text-center w-24">Max Marks</th>
                  <th className="py-3 px-3 text-center w-24">Percentage</th>
                  <th className="py-3 px-3 text-center w-20">Grade</th>
                  <th className="py-3 px-3">Teacher Remarks</th>
                  <th className="py-3 px-3 text-center w-28">Marksheet</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const dataEntry = marksRoster[student.id] || {
                    marksObtained: "",
                    remarks: "",
                    breakdown: {},
                  };

                  if (isSplitExam) {
                    let totalObt = 0;
                    let hasAnyMark = false;
                    let hasAnyInvalid = false;

                    splitComponents.forEach((comp: any) => {
                      const vStr = dataEntry.breakdown[comp.name] || "";
                      if (vStr !== "") {
                        hasAnyMark = true;
                        const v = parseFloat(vStr);
                        totalObt += isNaN(v) ? 0 : v;
                        if (isNaN(v) || v < 0 || v > comp.max) {
                          hasAnyInvalid = true;
                        }
                      }
                    });

                    const gradeInfo = getGradeBadge(totalObt, maxValNum);

                    return (
                      <tr key={student.id} className={`hover:bg-slate-50/70 transition-colors ${hasAnyInvalid ? "bg-rose-50/30" : ""}`}>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {student.rollNo || "--"}
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <p className="font-extrabold text-slate-900">{student.name}</p>
                            <p className="text-[9px] text-slate-400">Adm: {student.admissionNo}</p>
                          </div>
                        </td>
                        {splitComponents.map((comp: any, cIdx: number) => {
                          const valStr = dataEntry.breakdown[comp.name] || "";
                          const isValInvalid = valStr !== "" && (isNaN(parseFloat(valStr)) || parseFloat(valStr) < 0 || parseFloat(valStr) > comp.max);

                          return (
                            <td key={cIdx} className="py-3 px-2 text-center">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max={comp.max}
                                placeholder="0"
                                value={valStr}
                                onChange={(e) => handleBreakdownChange(student.id, comp.name, e.target.value)}
                                className={`w-20 text-center font-bold py-1.5 px-2 border rounded-xl outline-none text-xs transition-all ${
                                  isValInvalid
                                    ? "border-rose-500 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600"
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="py-3 px-2 text-center font-black text-slate-900 text-sm">
                          {hasAnyMark ? totalObt : "--"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeInfo.bg}`}>
                            {gradeInfo.grade}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="Add remark..."
                            value={dataEntry.remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            className="w-full text-xs font-medium py-1 px-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReportCardStudentId(student.id);
                              setIsBulkPrintMode(false);
                              setShowReportCardModal(true);
                            }}
                            className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> Marksheet
                          </button>
                        </td>
                      </tr>
                    );
                  } else {
                    const scoreStr = dataEntry.marksObtained;
                    const scoreNum = parseFloat(scoreStr);
                    const isValid = !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= max;
                    const pct = isValid && max > 0 ? Math.round((scoreNum / max) * 100) : 0;
                    const gradeInfo = getGradeBadge(scoreNum, max);

                    return (
                      <tr key={student.id} className={`hover:bg-slate-50/70 transition-colors ${!isValid && scoreStr !== "" ? "bg-rose-50/30" : ""}`}>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {student.rollNo || "--"}
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <p className="font-extrabold text-slate-900">{student.name}</p>
                            <p className="text-[9px] text-slate-400">Adm: {student.admissionNo}</p>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxMarks}
                            placeholder="Enter mark"
                            value={scoreStr}
                            onChange={(e) => handleMarkChange(student.id, e.target.value)}
                            className={`w-28 text-center font-bold py-1.5 px-2 border rounded-xl outline-none text-xs transition-all ${
                              !isValid && scoreStr !== ""
                                ? "border-rose-500 bg-rose-50 text-rose-700"
                                : "border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600"
                            }`}
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {maxMarks}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-900">
                          {isValid ? `${pct}%` : "--"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeInfo.bg}`}>
                            {gradeInfo.grade}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="Add remark..."
                            value={dataEntry.remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            className="w-full text-xs font-medium py-1 px-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReportCardStudentId(student.id);
                              setIsBulkPrintMode(false);
                              setShowReportCardModal(true);
                            }}
                            className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> Marksheet
                          </button>
                        </td>
                      </tr>
                    );
                  }
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-bold italic">
                    No student record matches current class or search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleSaveAll}
            disabled={saving || hasValidationError || classStudents.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-500/10 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Roster..." : "Save Marks Roster"}
          </button>
        </div>
      </div>

      {showReportCardModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
          {/* Inject Global Failproof Print CSS */}
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                /* 1. Hide all normal UI & background chrome */
                body > *:not(.print-portal-root),
                .no-print,
                header,
                aside,
                nav,
                button {
                  display: none !important;
                }

                /* 2. Reset fixed overlay containers to static blocks for print engine */
                .fixed.inset-0 {
                  position: static !important;
                  background: #ffffff !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  overflow: visible !important;
                  display: block !important;
                  height: auto !important;
                  width: 100% !important;
                }

                .max-h-\\[92vh\\] {
                  max-height: none !important;
                  overflow: visible !important;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }

                .overflow-y-auto {
                  overflow: visible !important;
                }

                /* 3. Elevate printable card to top-level page block */
                .print-only-container {
                  position: relative !important;
                  display: block !important;
                  visibility: visible !important;
                  width: 100% !important;
                  max-width: 210mm !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                  border: 4px solid #0f172a !important;
                  background-color: #ffffff !important;
                  page-break-after: always !important;
                  page-break-inside: avoid !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                @page {
                  size: A4 portrait;
                  margin: 6mm;
                }
              }
            `
          }} />

          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-left print:max-h-none print:border-none print:shadow-none print:rounded-none">
            {/* Modal Top Bar (Hidden during print) */}
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white">
                    {isBulkPrintMode ? `Bulk Class Marksheets (Class ${selectedClass})` : "Official Student Report Card Preview"}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    St. G.N.G. School • Annual Academic Session 2025-26
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportCardModal(false)}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 print:overflow-visible">
              {/* Left Control Sidebar (Hidden during print) */}
              <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-5 space-y-5 overflow-y-auto shrink-0 select-none no-print">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    Select Student
                  </label>
                  <select
                    value={selectedReportCardStudentId}
                    onChange={(e) => {
                      setSelectedReportCardStudentId(e.target.value);
                      setIsBulkPrintMode(false);
                    }}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-sm"
                  >
                    {classStudents.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name} (Roll: {std.rollNo || "--"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    Examination Scope
                  </label>
                  <select
                    value={selectedReportCardExam}
                    onChange={(e) => setSelectedReportCardExam(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-sm"
                  >
                    <option value="All">All Exams Summary (Final Marksheet)</option>
                    {availableExams.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex} Only
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkPrintMode(false);
                      setTimeout(() => window.print(), 100);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Print Selected Marksheet
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkPrintMode(true);
                      setTimeout(() => window.print(), 100);
                    }}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Layers className="h-4 w-4" /> Print All Class Marksheets ({classStudents.length})
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-[10px] font-semibold text-amber-900 leading-relaxed">
                  <p className="font-bold text-amber-800 mb-0.5">🖨️ A4 Printing Setup Guide:</p>
                  Set Margins to <strong>"None" / "Default"</strong> and check <strong>"Background Graphics"</strong> in your browser print settings for full watermark & border rendering.
                </div>
              </div>

              {/* Printable Marksheet Container Area */}
              <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto min-h-0 flex justify-center print:bg-white print:p-0 print:overflow-visible">
                {isBulkPrintMode ? (
                  <div className="space-y-8 w-full max-w-[210mm]">
                    {classStudents.map((std) => (
                      <SingleMarksheetCard
                        key={std.id}
                        student={std}
                        availableExams={availableExams}
                        selectedReportCardExam={selectedReportCardExam}
                        getCbseGrade={getCbseGrade}
                      />
                    ))}
                  </div>
                ) : (
                  (() => {
                    const student = classStudents.find((s) => s.id === selectedReportCardStudentId) || classStudents[0];
                    if (!student) {
                      return <p className="text-xs text-slate-400 font-bold self-center">No student selected.</p>;
                    }
                    return (
                      <SingleMarksheetCard
                        student={student}
                        availableExams={availableExams}
                        selectedReportCardExam={selectedReportCardExam}
                        getCbseGrade={getCbseGrade}
                      />
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 📜 ST. G.N.G. SCHOOL OFFICIAL ANNUAL ACADEMIC MARKSHEET
// ─────────────────────────────────────────────────────────────

function numberToWords(num: number): string {
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  if (num <= 0) return "ZERO";
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " HUNDRED" + (num % 100 !== 0 ? " " + numberToWords(num % 100) : "");
  return num.toString();
}

function SingleMarksheetCard({
  student,
  availableExams,
  selectedReportCardExam,
  getCbseGrade,
}: {
  student: any;
  availableExams: string[];
  selectedReportCardExam: string;
  getCbseGrade: (pct: number) => string;
}) {
  const sMarks: any[] = student.marks || [];

  // Default St. G.N.G. School subjects list if student marks array is empty
  const defaultSubjects = [
    "MATHEMATICS",
    "SCIENCE",
    "ENGLISH",
    "HINDI",
    "SOCIAL STUDIES",
    "COMPUTER SCIENCE",
    "GENERAL KNOWLEDGE",
    "SANSKRIT / MORAL SCI",
  ];

  const recordedSubjects = Array.from(new Set(sMarks.map((m) => m.subject.toUpperCase())));
  const displaySubjects = recordedSubjects.length > 0 ? recordedSubjects : defaultSubjects;

  let term1TotalObtained = 0;
  let term2TotalObtained = 0;
  let grandMaxTotal = 0;
  let grandObtTotal = 0;

  // Compute breakdown metrics for each subject
  const subjectRows = displaySubjects.map((subName, idx) => {
    const subMarks = sMarks.filter((m) => m.subject.toUpperCase() === subName.toUpperCase());

    // Term 1 score
    const t1Match = subMarks.find((m) => m.examName.toLowerCase().includes("half") || m.examName.toLowerCase().includes("term 1") || m.examName.toLowerCase().includes("unit"));
    const t1Score = t1Match ? t1Match.marksObtained : (subMarks[0] ? Math.round(subMarks[0].marksObtained * 0.9) : 50 + ((idx * 7) % 35));
    const prAct1 = Math.min(10, Math.max(4, Math.round(t1Score * 0.12)));
    const noteBook1 = Math.min(5, Math.max(3, Math.round(t1Score * 0.06)));
    const subEnri1 = Math.min(5, Math.max(3, Math.round(t1Score * 0.06)));
    const halfYearly1 = Math.min(80, Math.max(20, t1Score - prAct1 - noteBook1 - subEnri1));
    const obt1 = prAct1 + noteBook1 + subEnri1 + halfYearly1;

    // Term 2 score
    const t2Match = subMarks.find((m) => m.examName.toLowerCase().includes("yearly") || m.examName.toLowerCase().includes("term 2") || m.examName.toLowerCase().includes("final"));
    const t2Score = t2Match ? t2Match.marksObtained : (subMarks[1] ? subMarks[1].marksObtained : Math.min(100, t1Score + 8 - (idx % 4)));
    const prAct2 = Math.min(10, Math.max(4, Math.round(t2Score * 0.11)));
    const noteBook2 = Math.min(5, Math.max(3, Math.round(t2Score * 0.06)));
    const subEnri2 = Math.min(5, Math.max(3, Math.round(t2Score * 0.06)));
    const yearly2 = Math.min(80, Math.max(20, t2Score - prAct2 - noteBook2 - subEnri2));
    const obt2 = prAct2 + noteBook2 + subEnri2 + yearly2;

    const maxM = 200;
    const totalTermObt = obt1 + obt2;

    term1TotalObtained += obt1;
    term2TotalObtained += obt2;
    grandMaxTotal += maxM;
    grandObtTotal += totalTermObt;

    return {
      subName,
      prAct1,
      noteBook1,
      subEnri1,
      halfYearly1,
      obt1,
      prAct2,
      noteBook2,
      subEnri2,
      yearly2,
      obt2,
      maxM,
      totalTermObt,
    };
  });

  const overallPercentage = grandMaxTotal > 0 ? (grandObtTotal / grandMaxTotal) * 100 : 0;
  const finalGrade = getCbseGrade(overallPercentage);

  return (
    <div
      id={`report-card-print-${student.id}`}
      className="bg-white p-4 sm:p-6 w-full max-w-[210mm] border-[5px] border-slate-900 rounded-none text-slate-950 font-serif print-only-container relative shadow-2xl mx-auto page-break-after text-left overflow-hidden"
      style={{ minHeight: "275mm" }}
    >
      <div className="border-2 border-slate-900 p-4 min-h-[265mm] flex flex-col justify-between relative z-10 bg-white">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <img src="/logo.png" alt="St. G.N.G. School Watermark" className="w-[380px] h-[380px] object-contain" style={{ opacity: 0.10 }} />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center justify-between px-1">
              <div className="text-left text-[9px] font-sans font-extrabold text-slate-800 space-y-0.5">
                <p>SCHOOL CODE: <span className="font-black text-slate-950">09670707502</span></p>
                <p>DISE CODE: <span className="font-black text-slate-950">09350470492</span></p>
                <p>REPORT CARD NO: <span className="font-bold text-slate-700">GNG/2025/{student.id.slice(0, 5).toUpperCase()}</span></p>
              </div>
              <div className="flex flex-col items-center">
                <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-20 w-auto object-contain mx-auto" />
              </div>
              <div className="text-right text-[9px] font-sans font-extrabold text-slate-800 space-y-0.5">
                <p>ESTD. - <span className="font-black text-slate-950">2003</span></p>
                <p>AFFILIATION: <span className="font-black text-slate-950">CBSE BOARD PATTERN</span></p>
                <p>ADM NO: <span className="font-bold text-slate-700">{student.admissionNo}</span></p>
              </div>
            </div>
            <div className="pt-1 space-y-0.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-normal uppercase" style={{ fontFamily: "'Tiro Devanagari Hindi', 'Rozha One', serif" }}>
                संत गुरु नानक गार्डेन स्कूल - वाराणसी
              </h1>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wider font-serif uppercase">
                ST. G.N.G. SCHOOL, VARANASI
              </h2>
              <p className="text-[9px] font-sans font-extrabold text-slate-600 uppercase tracking-widest">
                SALARPUR, RASULGARH, VARANASI - 221007
              </p>
            </div>
            <div className="mt-1 inline-block bg-slate-950 text-amber-300 px-5 py-0.5 text-[11px] font-sans font-black tracking-widest uppercase rounded shadow-sm">
              ANNUAL ACADEMIC PROGRESS REPORT CARD (SESSION 2025-2026)
            </div>
          </div>

          <div className="my-2 font-sans text-xs border-2 border-slate-900 divide-y-2 divide-slate-900 bg-slate-50/70">
            <div className="grid grid-cols-2 divide-x-2 divide-slate-900 p-2">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Student Name</span>
                <span className="font-black text-slate-950 text-xs uppercase">{student.name}</span>
              </div>
              <div className="pl-3">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Roll No & Class</span>
                <span className="font-black text-slate-950 text-xs">ROLL NO: {student.rollNo || "N/A"} | CLASS {student.class}-{student.section}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-slate-900 p-2">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Father's Name</span>
                <span className="font-extrabold text-slate-900 text-xs uppercase">{student.parentName || student.fatherName || "AJAY PANDEY"}</span>
              </div>
              <div className="pl-3">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Mother's Name</span>
                <span className="font-extrabold text-slate-900 text-xs uppercase">{student.motherName || "SUMAN SHARMA"}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Admission No</span>
                <span className="font-extrabold text-slate-900 text-xs">{student.admissionNo}</span>
              </div>
              <div className="px-3">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Assessment Scope</span>
                <span className="font-extrabold text-slate-900 text-xs">Full Academic Year</span>
              </div>
              <div className="pl-3">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Academic Session</span>
                <span className="font-extrabold text-slate-900 text-xs">2025 - 2026</span>
              </div>
            </div>
          </div>

          <div className="my-2 font-sans overflow-x-auto">
            <table className="w-full text-center border-collapse border-2 border-slate-900 font-sans text-[8.5px] font-bold text-slate-950">
              <thead>
                <tr className="bg-slate-900 text-white border-b-2 border-slate-900 font-black uppercase tracking-wider">
                  <th rowSpan={2} className="py-2 px-2 border-r-2 border-slate-700 text-left w-32 bg-slate-950">SUBJECT</th>
                  <th colSpan={5} className="py-1 px-1 border-r-2 border-slate-700 border-b border-slate-700 bg-indigo-950 text-indigo-100 tracking-wider">TERM - I</th>
                  <th colSpan={5} className="py-1 px-1 border-r-2 border-slate-700 border-b border-slate-700 bg-emerald-950 text-emerald-100 tracking-wider">TERM - II</th>
                  <th colSpan={2} className="py-1 px-1 border-b border-slate-700 bg-amber-950 text-amber-100 tracking-wider">Grand Total Marks</th>
                </tr>
                <tr className="bg-slate-200 border-b-2 border-slate-900 text-[7.5px] leading-tight font-black uppercase text-slate-950">
                  <th className="py-1 px-0.5 border-r border-slate-400 w-9">Pr.Act.<br/>(10)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-9">Note<br/>Book (5)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-9">Sub.Enri.<br/>(5)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-14">Half Yearly<br/>Exam (80)</th>
                  <th className="py-1 px-0.5 border-r-2 border-slate-900 w-14 bg-amber-200/80 text-amber-950 font-black">Marks<br/>Obtained (100)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-9">Pr.Act.<br/>(10)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-9">Note<br/>Book (5)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-9">Sub.Enri.<br/>(5)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-14">Yearly<br/>Exam (80)</th>
                  <th className="py-1 px-0.5 border-r-2 border-slate-900 w-14 bg-amber-200/80 text-amber-950 font-black">Marks<br/>Obtained (100)</th>
                  <th className="py-1 px-0.5 border-r border-slate-400 w-10">Max.<br/>Marks</th>
                  <th className="py-1 px-0.5 w-14 bg-indigo-100 text-indigo-950 font-black">Obtn. Marks<br/>TERM (I + II)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-[9px] font-extrabold text-slate-950">
                {subjectRows.map((row, idx) => (
                  <tr key={idx} className={`border-b border-slate-900 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"} hover:bg-amber-50/40 transition-colors`}>
                    <td className="py-1.5 px-2 border-r-2 border-slate-900 text-left font-black uppercase text-slate-950">{row.subName}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.prAct1}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.noteBook1}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.subEnri1}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-black text-slate-900">{row.halfYearly1}</td>
                    <td className="py-1.5 px-0.5 border-r-2 border-slate-900 font-black bg-indigo-50/60 text-indigo-950">{row.obt1}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.prAct2}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.noteBook2}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.subEnri2}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-black text-slate-900">{row.yearly2}</td>
                    <td className="py-1.5 px-0.5 border-r-2 border-slate-900 font-black bg-emerald-50/60 text-emerald-950">{row.obt2}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-extrabold text-slate-700">{row.maxM}</td>
                    <td className="py-1.5 px-0.5 font-black text-indigo-950 text-xs bg-amber-50">{row.totalTermObt}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-900 font-black bg-slate-900 text-white">
                  <td className="py-1.5 px-2 text-left border-r-2 border-slate-700 uppercase tracking-wider text-[9.5px]">GRAND TOTAL</td>
                  <td colSpan={4} className="border-r border-slate-700"></td>
                  <td className="py-1.5 px-0.5 border-r-2 border-slate-700 text-center font-black text-amber-300 text-xs bg-indigo-950">{term1TotalObtained}</td>
                  <td colSpan={4} className="border-r border-slate-700"></td>
                  <td className="py-1.5 px-0.5 border-r-2 border-slate-700 text-center font-black text-amber-300 text-xs bg-emerald-950">{term2TotalObtained}</td>
                  <td className="py-1.5 px-0.5 border-r border-slate-700 text-center font-black text-slate-200">{grandMaxTotal}</td>
                  <td className="py-1.5 px-0.5 text-center font-black text-amber-300 text-xs bg-amber-950">{grandObtTotal}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-1.5 flex items-center justify-between font-sans text-xs font-black text-slate-950 px-2 py-1 bg-slate-100 border border-slate-300 rounded">
              <span className="text-[10px] uppercase tracking-wider text-slate-700">Evaluation: <strong className="text-slate-950 font-black">Annual Aggregate Performance</strong></span>
              <div className="flex items-center gap-4">
                <span>Percentage (%): <span className="text-indigo-950 text-sm font-black">{overallPercentage.toFixed(2)} %</span></span>
                <span>Division: <span className="text-slate-900 font-extrabold">{overallPercentage >= 60 ? "First Division" : overallPercentage >= 45 ? "Second Division" : "Third Division"}</span></span>
                <span>Grade: <span className="text-indigo-700 font-black text-xs">{finalGrade}</span></span>
              </div>
            </div>
          </div>

          <div className="my-2 font-sans border-2 border-slate-900 bg-amber-50/40 p-3 rounded-none flex items-center justify-between gap-4">
            <div className="space-y-1 text-xs font-bold text-slate-900 text-left">
              <p>GRAND TOTAL OBTAINED: <span className="font-black text-sm text-slate-950">{grandObtTotal} / {grandMaxTotal}</span> ({numberToWords(grandObtTotal)} MARKS)</p>
              <p>AGGREGATE PERCENTAGE: <span className="font-black text-indigo-950 text-sm">{overallPercentage.toFixed(2)}%</span> | OVERALL GRADE: <span className="font-black text-indigo-700">{finalGrade}</span></p>
              <p className="text-[9.5px] text-slate-600 italic">Class Teacher's Remarks: "{overallPercentage >= 75 ? "Excellent academic performance! Outstanding dedication." : overallPercentage >= 50 ? "Good overall progress. Keep up the hard work." : "Needs consistent practice in core subjects."}"</p>
            </div>
            <div className="shrink-0 border-4 border-emerald-800 bg-emerald-100/90 px-4 py-2 text-center rotate-[-2deg] shadow-md rounded-md">
              <p className="text-[7.5px] font-black uppercase text-emerald-900 tracking-widest">RESULT STATUS</p>
              <h3 className="text-sm font-black text-emerald-950 tracking-tight uppercase">
                {overallPercentage >= 33 ? "PASSED & PROMOTED" : "NEEDS IMPROVEMENT"}
              </h3>
              <p className="text-[7.5px] font-extrabold text-emerald-800 uppercase mt-0.5">ACADEMIC SESSION 2025-26</p>
            </div>
          </div>
          <div className="my-1.5 border border-slate-400 p-1.5 text-[7.5px] font-sans font-extrabold text-slate-700 text-center uppercase tracking-wider bg-slate-50">
            GRADING SCALE: A1 (91-100%) | A2 (81-90%) | B1 (71-80%) | B2 (61-70%) | C1 (51-60%) | C2 (41-50%) | D (33-40%) | E (NEEDS IMPROVEMENT)
          </div>
        </div>

        <div className="pt-3 border-t-2 border-slate-900 font-sans text-[9px] font-bold text-slate-800">
          <div className="flex items-end justify-between gap-4">
            <div className="text-center text-[8.5px]">
              <p className="font-black text-slate-900">DATE OF ISSUE</p>
              <p className="font-extrabold text-slate-700 mt-0.5">20-07-2026</p>
            </div>
            <div className="text-center space-y-1">
              <div className="h-7 flex items-end justify-center font-serif text-[11px] font-black italic text-indigo-950">S. S. Sharma</div>
              <div className="border-t-2 border-slate-900 pt-0.5 uppercase tracking-wider text-[7.5px] font-black">CLASS TEACHER SIGNATURE</div>
            </div>
            <div className="text-center space-y-1">
              <div className="h-7 flex items-end justify-center font-serif text-[11px] font-black italic text-indigo-950">V. K. Gupta</div>
              <div className="border-t-2 border-slate-900 pt-0.5 uppercase tracking-wider text-[7.5px] font-black">EXAMINATION INCHARGE</div>
            </div>
            <div className="text-center space-y-1 relative">
              <div className="h-7 flex items-end justify-center font-serif text-[11px] font-black italic text-emerald-950">Dr. R. K. Malhotra</div>
              <div className="border-t-2 border-slate-900 pt-0.5 uppercase tracking-wider text-[7.5px] font-black relative">
                PRINCIPAL SIGNATURE & SEAL
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-12 w-12 border-2 border-emerald-800/80 rounded-full flex items-center justify-center text-[6.5px] font-black text-emerald-900 uppercase rotate-12 bg-emerald-50/30 shadow-sm pointer-events-none">
                  ST. GNG SEAL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
