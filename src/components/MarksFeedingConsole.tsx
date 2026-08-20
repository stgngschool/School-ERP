"use client";

import React, { useState, useEffect, useRef } from "react";
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
  BookOpen,
  Loader2
} from "lucide-react";

export default function MarksFeedingConsole() {
  const { user, students, schoolInfo, refreshStudents } = useAuth();

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
    if (!selectedClass) {
      if (user?.teacherProfile?.classes && user.teacherProfile.classes.length > 0) {
        const tClass = user.teacherProfile.classes[0];
        const targetStr = `${tClass.name}-${tClass.section}`;
        if (availableClasses.includes(targetStr)) {
          setSelectedClass(targetStr);
          return;
        }
      }
      if (availableClasses.length > 0) {
        setSelectedClass(availableClasses[0]);
      }
    }
    if (availableExams.length > 0 && !selectedExam) {
      setSelectedExam(availableExams[0]);
    }
  }, [user, availableClasses, availableExams]);

  useEffect(() => {
    if (selectedExam) {
      const defaultMax = examConfig.maxMarks?.toString() || "100";
      setMaxMarks(defaultMax);
    }
  }, [selectedExam, schoolInfo.examConfig]);

  const [isRosterLoaded, setIsRosterLoaded] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsRosterLoaded(false);
    setMarksRoster({});
  }, [selectedClass, selectedExam, selectedSubject, customSubject, isCustomSubjectMode]);

  const loadRoster = async () => {
    if (!selectedClass || !selectedExam || !selectedSubject) return;

    const subjectToUse = isCustomSubjectMode && customSubject.trim() ? customSubject.trim() : selectedSubject;

    if (!selectedClass || !selectedExam || !subjectToUse) return;

    setLoadingRoster(true);
    try {
      const [className, section] = selectedClass.split("-");
            if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const res = await fetch(`/api/marks/roster?class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}&exam=${encodeURIComponent(selectedExam)}&subject=${encodeURIComponent(subjectToUse)}`, { signal: abortControllerRef.current.signal });
      if (!res.ok) {
        const text = await res.text();
        try { const json = JSON.parse(text); throw new Error(json.error || "Failed"); }
        catch { throw new Error(`HTTP Error: ${res.status}`); }
      }
      const marksRecord = await res.json();

      const newRoster: any = {};
      let foundAny = false;
      let loadedMaxMarks = "100";

      classStudents.forEach((student) => {
        const existingMark = marksRecord[student.id];

        if (existingMark) {
          const initialBreakdown: { [key: string]: string } = {};
          if (existingMark.breakdown && typeof existingMark.breakdown === "object") {
            Object.entries(existingMark.breakdown).forEach(([k, v]) => {
              initialBreakdown[k] = v !== null && v !== undefined ? (v as any).toString() : "";
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
          loadedMaxMarks = existingMark.maxMarks?.toString() || "100";
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
      setIsRosterLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoster(false);
    }
  };

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
    if (val !== "") {
      const numVal = parseFloat(val);
      const maxVal = parseFloat(maxMarks) || 0;
      if (numVal > maxVal) return;
    }
    setMarksRoster((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { remarks: "", breakdown: {} }),
        marksObtained: val,
      },
    }));
  };

  const handleBreakdownChange = (studentId: string, compName: string, val: string) => {
    if (val !== "") {
      const numVal = parseFloat(val);
      const comp = splitComponents.find((c: any) => c.name === compName);
      if (comp && numVal > comp.max) return;
    }
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

      await refreshStudents();
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
      <div className="bg-white border-y sm:border border-slate-200/60 sm:rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-[10.5px] sm:text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 tracking-wider">
              <BookOpen className="h-3.5 w-3.5" /> Marks Entry & Exam Roster
            </h3>
            <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-semibold mt-1.5 leading-tight">
              Select class and examination scope to feed academic scores and generate reports.
            </p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3.5">
          <div>
            <label className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
              Class Section
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-[10.5px] sm:text-[11px] font-extrabold py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200/60 rounded-xl sm:rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
              Exam Scope
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
              Subject Name
            </label>
            {!isCustomSubjectMode ? (
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full text-[10.5px] sm:text-[11px] font-extrabold py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200/60 rounded-xl sm:rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
                <option value="Social Studies">Social Studies</option>
                <option value="Hindi">Hindi</option>
                <option value="CUSTOM">Custom...</option>
              </select>
            ) : (
              <div className="flex gap-1.5 flex-col sm:flex-row">
                <input
                  type="text"
                  required
                  placeholder="e.g. Art"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomSubjectMode(false)}
                  className="px-2.5 py-1 sm:py-0 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">
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
              className="w-full text-[10.5px] sm:text-[11px] font-extrabold py-2 px-2.5 sm:py-2.5 sm:px-3 border border-slate-200/60 rounded-xl sm:rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-all"
            />
          </div>
        </div>

        <div className="mt-3.5">
          <button
            type="button"
            disabled={loadingRoster || isRosterLoaded}
            onClick={loadRoster}
            className={`w-full py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ${isRosterLoaded ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/10'}`}
          >
            {loadingRoster ? <Loader2 className="h-4 w-4 animate-spin" /> : isRosterLoaded ? <CheckCircle2 className="h-4 w-4" /> : <Layers className="h-4 w-4" />} 
            {isRosterLoaded ? "Roster Data Loaded" : "Load Roster"}
          </button>
        </div>
      </div>

      {!isRosterLoaded ? (
        <div className="flex flex-col items-center justify-center py-10 sm:py-20 px-4 text-slate-400 text-center">
          <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-30" />
          <p className="font-bold text-xs sm:text-sm">Please click "Load Roster" to view and enter marks.</p>
        </div>
      ) : (
        <>
          {/* ─── Class Performance Overview Strip ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Class Roster</p>
                <h4 className="text-sm font-black text-slate-800 mt-0.5">
                  {enteredCount} / {classStudents.length} <span className="text-[10px] text-slate-400 font-semibold">Entered</span>
                </h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-50 border border-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Class Average</p>
                <h4 className="text-sm font-black text-slate-800 mt-0.5">
                  {classAvgScore} <span className="text-[10px] text-slate-400 font-semibold">/ {maxMarks}</span>
                </h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-50 border border-amber-100/50 rounded-2xl flex items-center justify-center text-amber-655 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Top Performer</p>
                <h4 className="text-xs font-black text-slate-800 mt-0.5 truncate max-w-[110px]" title={topScorerName}>
                  {topScorerName !== "--" ? `${highestScore} pts (${topScorerName.split(" ")[0]})` : "--"}
                </h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center gap-3">
              <div className="h-10 w-10 bg-teal-50 border border-teal-100/50 rounded-2xl flex items-center justify-center text-teal-655 shrink-0">
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400/80" />
          <input
            type="text"
            placeholder="Search student name or roll..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="w-full sm:w-64 text-xs font-extrabold py-2.5 pl-10 pr-4 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350 focus:bg-white focus:border-indigo-600 transition-all shadow-2xs text-slate-800 placeholder-slate-400"
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
        <div className="p-4 bg-white border border-slate-200/60 sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Class Roster ({filteredStudents.length} Students)
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Enter scores and click Save Roster.</p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving || hasValidationError || classStudents.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/15 disabled:opacity-50 cursor-pointer"
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
                        <span className="text-[8px] font-extrabold uppercase block leading-none text-indigo-200">TOTAL ({maxMarks})</span>
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
        <div className="hidden sm:block bg-white border border-slate-200/60 sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
          <div className="overflow-x-auto">
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
                  <th className="py-3 px-2 text-center w-28">Total ({maxMarks})</th>
                  <th className="py-3 px-2 text-center w-20">Grade</th>
                  <th className="py-3 px-3">Remarks</th>
                  
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
        </div>

        <div className="p-5 bg-slate-50/50 border-t border-slate-200/60 flex justify-end rounded-b-3xl">
          <button
            onClick={handleSaveAll}
            disabled={saving || hasValidationError || classStudents.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/15 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Roster..." : "Save Marks Roster"}
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

