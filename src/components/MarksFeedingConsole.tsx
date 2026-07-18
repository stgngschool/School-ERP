"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Save, AlertCircle, CheckCircle, Search } from "lucide-react";

export default function MarksFeedingConsole() {
  const { students, schoolInfo, refreshData } = useAuth();

  // 1. Available Classes from Students
  const availableClasses = Array.from(
    new Set(students.map((s) => `${s.class}-${s.section}`))
  ).sort();

  // State selections
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubjectMode, setIsCustomSubjectMode] = useState(false);
  const [maxMarks, setMaxMarks] = useState("100");
  const [studentSearch, setStudentSearch] = useState("");

  // Roster input states
  const [marksRoster, setMarksRoster] = useState<{
    [studentId: string]: {
      marksObtained: string;
      remarks: string;
      breakdown: { [compName: string]: string };
    };
  }>({});

  // Status/Messages
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Default exams fallback if schoolInfo.exams is empty
  const availableExams = schoolInfo.exams && schoolInfo.exams.length > 0
    ? schoolInfo.exams
    : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];

  // Fetch dynamic exam configuration
  const examConfig = schoolInfo.examConfig?.[selectedExam] || {
    isSplit: false,
    maxMarks: 100,
    components: []
  };

  const isSplitExam = examConfig.isSplit;
  const splitComponents = examConfig.components || [];

  // Initialize filters
  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
    if (availableExams.length > 0 && !selectedExam) {
      setSelectedExam(availableExams[0]);
    }
  }, [availableClasses, availableExams]);

  // Sync maxMarks configuration dynamically
  useEffect(() => {
    if (selectedExam) {
      const defaultMax = examConfig.maxMarks?.toString() || "100";
      setMaxMarks(defaultMax);
    }
  }, [selectedExam, schoolInfo.examConfig]);

  // Load existing marks when class, exam, subject, or students list changes
  useEffect(() => {
    if (!selectedClass || !selectedExam || !selectedSubject) return;

    const subjectToUse = isCustomSubjectMode ? customSubject : selectedSubject;
    if (!subjectToUse) return;

    // Filter students of selected class
    const classStudents = students.filter(
      (s) => `${s.class}-${s.section}` === selectedClass
    );

    const newRoster: typeof marksRoster = {};
    let foundAny = false;
    let loadedMaxMarks = "100";

    classStudents.forEach((student) => {
      // Find existing mark for this subject and exam
      const existingMark = student.marks?.find(
        (m: any) =>
          m.subject.toLowerCase() === subjectToUse.toLowerCase() &&
          m.examName.toLowerCase() === selectedExam.toLowerCase()
      );

      if (existingMark) {
        // Initialize dynamic components breakdown
        let initialBreakdown: { [key: string]: string } = {};
        if (existingMark.breakdown && typeof existingMark.breakdown === "object") {
          Object.entries(existingMark.breakdown).forEach(([k, v]) => {
            initialBreakdown[k] = v !== null && v !== undefined ? v.toString() : "";
          });
        } else if (isSplitExam) {
          // Fallback parsing from legacy static fields if matching component names
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

  // Filter class students based on search string
  const classStudents = students.filter(
    (s) => `${s.class}-${s.section}` === selectedClass
  );

  const filteredStudents = classStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Input change handlers
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

  // Validate inputs
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

    // Construct marks list
    const marksList = classStudents
      .map((s) => {
        const dataEntry = marksRoster[s.id];
        if (!dataEntry) return null;

        if (isSplitExam) {
          // If all fields are empty, don't submit this student
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

  // Helper to calculate Grade dynamically
  const getGrade = (obtained: number, maxVal: number) => {
    if (maxVal <= 0) return "N/A";
    const percentage = Math.round((obtained / maxVal) * 100);
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    if (percentage >= 40) return "E";
    return "F";
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Panel */}
      <div className="text-left space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Configure Academic Marks Roster
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Select Class, Exam, and Subject to start feeding marks data. Saves/Updates are performed in bulk.
          </p>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Class Select */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Class Section
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Select */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Examination
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
            >
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Subject
            </label>
            {!isCustomSubjectMode ? (
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
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
                  placeholder="e.g. Science Lab..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomSubjectMode(false)}
                  className="px-2 bg-slate-105 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Max Marks */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Maximum Marks
            </label>
            <input
              type="number"
              min="1"
              required
              inputMode="decimal"
              disabled={isEditMode || isSplitExam}
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Banner/Indicators */}
        <div className="flex flex-wrap gap-2 items-center justify-between border-t border-slate-150 pt-3">
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                Editing recorded marks roster
              </span>
            ) : (
              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                New Marks Entry Session
              </span>
            )}
            {isSplitExam && (
              <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                Dynamic components grading active
              </span>
            )}
            <span className="text-[9px] text-slate-400 font-semibold">
              Class Strength: {classStudents.length} Students
            </span>
          </div>

          {/* Student Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by student name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 w-48"
            />
          </div>
        </div>
      </div>

      {/* Main Roster Panel */}
      <div className="text-left space-y-4 border-t border-slate-200 pt-6">
        {successMsg && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl border border-green-100 text-xs font-semibold">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* 1. Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {isSplitExam ? (
                <tr className="border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-2 px-2 w-16">Roll</th>
                  <th className="py-2 px-2">Student Name</th>
                  {splitComponents.map((comp: any, idx: number) => (
                    <th key={idx} className="py-2 px-2 text-center w-24">
                      {comp.name} ({comp.max})
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center w-24">Total Obtained</th>
                  <th className="py-2 px-2 text-center w-20">Grade</th>
                  <th className="py-2 px-2">Remarks / Teacher Notes</th>
                </tr>
              ) : (
                <tr className="border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-2 px-2 w-16">Roll</th>
                  <th className="py-2 px-2">Student Name</th>
                  <th className="py-2 px-2 text-center w-36">Marks Obtained</th>
                  <th className="py-2 px-2 text-center w-24">Max Marks</th>
                  <th className="py-2 px-2 text-center w-24">Percentage</th>
                  <th className="py-2 px-2 text-center w-20">Grade</th>
                  <th className="py-2 px-2">Remarks / Teacher Notes</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
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

                    return (
                      <tr key={student.id} className={`hover:bg-slate-50/50 ${hasAnyInvalid ? "bg-red-50/20" : ""}`}>
                        <td className="py-3 px-2 font-bold text-slate-400">
                          {student.rollNo || "--"}
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-bold text-slate-800">{student.name}</p>
                            <p className="text-[9px] text-slate-400">Adm: {student.admissionNo}</p>
                          </div>
                        </td>
                        {/* Render inputs for each dynamic component */}
                        {splitComponents.map((comp: any, cIdx: number) => {
                          const valStr = dataEntry.breakdown[comp.name] || "";
                          const isValInvalid = valStr !== "" && (isNaN(parseFloat(valStr)) || parseFloat(valStr) < 0 || parseFloat(valStr) > comp.max);

                          return (
                            <td key={cIdx} className="py-3 px-2 text-center">
                              <input
                                type="number"
                                step="0.5"
                                inputMode="decimal"
                                placeholder={`Max ${comp.max}`}
                                value={valStr}
                                onChange={(e) => handleBreakdownChange(student.id, comp.name, e.target.value)}
                                className={`w-20 text-center font-bold py-1 px-1 border rounded-lg outline-none text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-600 transition-colors ${
                                  isValInvalid ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200"
                                }`}
                              />
                            </td>
                          );
                        })}
                        {/* Total obtained score sum */}
                        <td className="py-3 px-2 text-center text-slate-800 font-black">
                          {hasAnyMark ? `${totalObt} / ${max}` : "--"}
                        </td>
                        <td className="py-3 px-2 text-center font-black">
                          {hasAnyMark ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700">
                              {getGrade(totalObt, max)}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            placeholder="Add details (optional)..."
                            value={dataEntry.remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            className="w-full text-xs font-medium py-1 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600"
                          />
                        </td>
                      </tr>
                    );
                  } else {
                    const obtVal = parseFloat(dataEntry.marksObtained);
                    const isInvalid = dataEntry.marksObtained !== "" && (isNaN(obtVal) || obtVal < 0 || obtVal > max);
                    const showPercentage = dataEntry.marksObtained !== "" && !isNaN(obtVal) && max > 0;
                    const pct = showPercentage ? Math.round((obtVal / max) * 100) : 0;

                    return (
                      <tr key={student.id} className={`hover:bg-slate-50/50 ${isInvalid ? "bg-red-50/20" : ""}`}>
                        <td className="py-3 px-2 font-bold text-slate-400">
                          {student.rollNo || "--"}
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-bold text-slate-800">{student.name}</p>
                            <p className="text-[9px] text-slate-400">Adm: {student.admissionNo}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="inline-block relative">
                            <input
                              type="number"
                              step="0.5"
                              inputMode="decimal"
                              min="0"
                              max={max}
                              placeholder="Score"
                              value={dataEntry.marksObtained}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              className={`w-24 text-center font-bold py-1 px-2 border rounded-lg outline-none text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-600 transition-colors ${
                                isInvalid ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:bg-red-50" : "border-slate-200"
                              }`}
                            />
                            {isInvalid && (
                              <span className="block text-[8px] text-red-500 font-bold mt-0.5 absolute left-0 right-0 text-center">
                                Max is {max}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-400 font-bold">
                          {max}
                        </td>
                        <td className="py-3 px-2 text-center text-slate-500 font-bold">
                          {showPercentage ? `${pct}%` : "--"}
                        </td>
                        <td className="py-3 px-2 text-center font-black">
                          {showPercentage ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${pct >= 40 ? "bg-indigo-50 text-indigo-700" : "bg-red-50 text-red-700"}`}>
                              {getGrade(obtVal, max)}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            placeholder="Add details (optional)..."
                            value={dataEntry.remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            className="w-full text-xs font-medium py-1 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600"
                          />
                        </td>
                      </tr>
                    );
                  }
                })
              ) : (
                <tr>
                  <td colSpan={isSplitExam ? splitComponents.length + 5 : 7} className="text-center py-8 text-slate-400 italic">
                    No students match selection criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 2. Mobile View: Touch-Optimized Cards */}
        <div className="block md:hidden space-y-4">
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

                const studentGrade = hasAnyMark ? getGrade(totalObt, max) : "--";

                return (
                  <div 
                    key={student.id} 
                    className={`bg-white border rounded-2xl p-4 space-y-3 shadow-sm transition-all ${
                      hasAnyInvalid ? "border-red-300 bg-red-50/10" : "border-slate-200/80"
                    }`}
                  >
                    {/* Header: Student Roll & Name */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center border border-slate-200 shrink-0">
                          {student.rollNo || "--"}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">{student.name}</h4>
                          <span className="text-[9px] font-bold text-slate-400">Adm: {student.admissionNo}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 block">Grade</span>
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {studentGrade}
                        </span>
                      </div>
                    </div>

                    {/* Components Inputs Grid */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      {splitComponents.map((comp: any, cIdx: number) => {
                        const valStr = dataEntry.breakdown[comp.name] || "";
                        const isValInvalid = valStr !== "" && (isNaN(parseFloat(valStr)) || parseFloat(valStr) < 0 || parseFloat(valStr) > comp.max);

                        return (
                          <div key={cIdx} className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                              {comp.name} <span className="text-slate-400">({comp.max})</span>
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              inputMode="decimal"
                              placeholder={`Max ${comp.max}`}
                              value={valStr}
                              onChange={(e) => handleBreakdownChange(student.id, comp.name, e.target.value)}
                              className={`w-full font-extrabold text-xs py-2 px-3 border rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-colors ${
                                isValInvalid ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Score Summary Banner */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-bold">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider">Calculated Score</span>
                      <span className="text-indigo-650 font-black text-xs">
                        {hasAnyMark ? `${totalObt} / ${max}` : "No marks entered"}
                      </span>
                    </div>

                    {/* Remarks Input */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Teacher Remarks / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Add optional notes..."
                        value={dataEntry.remarks}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        className="w-full text-xs font-medium py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                  </div>
                );
              } else {
                const obtVal = parseFloat(dataEntry.marksObtained);
                const isInvalid = dataEntry.marksObtained !== "" && (isNaN(obtVal) || obtVal < 0 || obtVal > max);
                const showPercentage = dataEntry.marksObtained !== "" && !isNaN(obtVal) && max > 0;
                const pct = showPercentage ? Math.round((obtVal / max) * 100) : 0;
                const studentGrade = showPercentage ? getGrade(obtVal, max) : "--";

                return (
                  <div 
                    key={student.id} 
                    className={`bg-white border rounded-2xl p-4 space-y-3 shadow-sm transition-all ${
                      isInvalid ? "border-red-300 bg-red-50/10" : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center border border-slate-200 shrink-0">
                          {student.rollNo || "--"}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">{student.name}</h4>
                          <span className="text-[9px] font-bold text-slate-400">Adm: {student.admissionNo}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 block">Grade</span>
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {studentGrade}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Marks Obtained
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          min="0"
                          max={max}
                          placeholder={`Max ${max}`}
                          value={dataEntry.marksObtained}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          className={`w-full font-extrabold text-xs py-2 px-3 border rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-colors ${
                            isInvalid ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Max Marks / Score
                        </label>
                        <div className="font-bold text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                          {max} {showPercentage ? `(${pct}%)` : ""}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Teacher Remarks / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Add optional notes..."
                        value={dataEntry.remarks}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        className="w-full text-xs font-medium py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                  </div>
                );
              }
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400 italic">
              No students match selection criteria.
            </div>
          )}
        </div>

        {/* Action Button Desktop */}
        <div className="hidden md:flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={handleSaveAll}
            disabled={saving || hasValidationError || classStudents.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Roster..." : "Save Marks Roster"}
          </button>
        </div>

        {/* Sticky Mobile Save Button Bar */}
        <div className="sticky bottom-4 z-10 md:hidden pt-2">
          <button
            onClick={handleSaveAll}
            disabled={saving || hasValidationError || classStudents.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 active:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Roster..." : "Save Marks Roster"}
          </button>
        </div>
      </div>
    </div>
  );
}
