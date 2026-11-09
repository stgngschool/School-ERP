"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
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
  classMarksheets, studentMarksheets, marksheetRosters, getMarksheetCacheRevision, subscribeToMarksheetChanges,
  type ClassMarksheetSnapshot, type MarksheetSnapshot,
} from "@/lib/cache/marksheetCache";
import { buildMarksheetSummary } from "@/lib/marksheetSummary";
import {
  Printer,
  Layers,
  BookOpen,
  Search,
  CheckCircle2,
  Loader2,
  RefreshCw
} from "lucide-react";

export default function PrintMarksheets() {
  const { user, activeRole, students: currentStudents, classes, schoolInfo, updateStudentClaimMarksheet, showToast } = useAuth();
  const [sessionRoster, setSessionRoster] = useState<{ session: string; classKey: string; students: typeof currentStudents } | null>(null);

  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    classes.forEach(c => { const key = getCleanClassKey(c.name, c.section); if (key) classSet.add(key); });
    if (currentStudents && currentStudents.length > 0) {
      currentStudents.forEach((s) => {
        const key = getCleanClassKey(s.class, s.section);
        if (key) classSet.add(key);
      });
    }
    return sortClasses(Array.from(classSet));
  }, [currentStudents, classes]);

  const availableExams = schoolInfo.exams && schoolInfo.exams.length > 0
    ? schoolInfo.exams
    : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];

  const [sessions, setSessions] = useState<{ id: string; name: string; isCurrent: boolean }[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [issueDateIso, setIssueDateIso] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [selectedClass, setSelectedClass] = useState("");
  const hasSelectedClass = Boolean(selectedClass);
  useEffect(() => {
    if (!hasSelectedClass) return;
    const controller = new AbortController();
    fetch("/api/sessions", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted && Array.isArray(data) && data.length > 0) {
          setSessions(data);
          const current = data.find((s) => s.isCurrent);
          if (current) setSelectedSession(current.name);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) showToast("error", "Sessions unavailable", err.message);
      });
    return () => controller.abort();
  }, [hasSelectedClass, showToast]);


  const classScope = JSON.stringify([user?.id, activeRole, selectedSession, selectedClass]);
  const students = sessionRoster?.session === selectedSession && sessionRoster?.classKey === selectedClass ? sessionRoster.students : [];
  const rosterRequest = useRef<AbortController | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const loadRoster = useCallback(async (force = false) => {
    const session = sessions.find(s => s.name === selectedSession);
    if (!session || !selectedClass || !user?.id) return;
    const cached = !force && marksheetRosters.get(classScope);
    if (cached) {
      setSessionRoster({ session: selectedSession, classKey: selectedClass, students: cached });
      return;
    }
    rosterRequest.current?.abort();
    const controller = new AbortController();
    rosterRequest.current = controller;
    setLoadingRoster(true);
      try {
        const name = normalizeClassName(selectedClass);
        const section = normalizeSectionName(undefined, selectedClass);
        let cursor: string | undefined;
        const all: typeof currentStudents = [];
        do {
          const query = new URLSearchParams({ sessionId: session.id, className: name, section, ...(cursor ? { cursor } : {}) });
          const res = await fetch(`/api/sessions/roster?${query}`, { signal: controller.signal, cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Unable to load session roster.");
          all.push(...data.students); cursor = data.nextCursor || undefined;
        } while (cursor);
        if (!controller.signal.aborted) {
          marksheetRosters.set(classScope, all);
          setSessionRoster({ session: selectedSession, classKey: selectedClass, students: all });
        }
      } catch (error) { if (!controller.signal.aborted) showToast("error", "Session roster unavailable", (error as Error).message); }
      finally { if (!controller.signal.aborted) setLoadingRoster(false); }
  }, [selectedClass, selectedSession, sessions, showToast, classScope, user?.id]);
  useEffect(() => {
    setLoadingRoster(false);
    void loadRoster();
    return () => rosterRequest.current?.abort();
  }, [loadRoster]);

  const [selectedReportCardStudentId, setSelectedReportCardStudentId] = useState("");
  const [selectedReportCardExam, setSelectedReportCardExam] = useState("All");
  const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showDistributionLog, setShowDistributionLog] = useState(false);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => matchStudentToClass(s, selectedClass));
  }, [students, selectedClass]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = classStudents;
    if (q) {
      list = classStudents.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.rollNo && s.rollNo.toString().toLowerCase().includes(q)) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      const rawA = a.rollNo !== undefined && a.rollNo !== null ? a.rollNo.toString().trim() : "";
      const rawB = b.rollNo !== undefined && b.rollNo !== null ? b.rollNo.toString().trim() : "";
      const numA = parseInt(rawA.replace(/\D/g, ""), 10);
      const numB = parseInt(rawB.replace(/\D/g, ""), 10);
      const hasA = !isNaN(numA);
      const hasB = !isNaN(numB);
      if (hasA && hasB) return numA - numB;
      if (hasA) return -1;
      if (hasB) return 1;
      return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });
    });
  }, [classStudents, searchQuery]);

  const selectedStudent = filteredStudents.find(student => student.id === selectedReportCardStudentId);
  const studentIndex = filteredStudents.findIndex(student => student.id === selectedStudent?.id);

  const scope = JSON.stringify([classScope, selectedStudent?.id]);
  const revision = useSyncExternalStore(subscribeToMarksheetChanges, getMarksheetCacheRevision, getMarksheetCacheRevision);
  const cachedClass = classMarksheets.get(classScope);
  const cachedStudent = selectedStudent && (studentMarksheets.get(scope) ?? (cachedClass && {
    marks: cachedClass.marks.filter(mark => mark.studentId === selectedStudent.id),
    version: cachedClass.studentVersions[selectedStudent.id] ?? cachedClass.emptyVersion,
  }));
  const [bulkMarks, setBulkMarks] = useState<MarksheetSnapshot["marks"]>([]);
  const isDataLoaded = Boolean(cachedStudent);

  const marksRequest = useRef<AbortController | null>(null);

  const formatDisplayDate = (isoStr: string) => {
    if (!isoStr) return "";
    const parts = isoStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoStr;
  };

  const loadMarks = async (action: "refresh" | "print-student" | "print-class") => {
    const targetSession = sessions.find(session => session.name === selectedSession);
    const bulk = action === "print-class";
    if (!user?.id || !selectedClass || !targetSession || (!bulk && !selectedStudent)) return;

    marksRequest.current?.abort();
    const controller = new AbortController();
    marksRequest.current = controller;
    const requestRevision = getMarksheetCacheRevision();
    const cached = bulk ? cachedClass : cachedStudent;
    setLoadingMarks(true);
    const query = new URLSearchParams({
      class: normalizeClassName(selectedClass),
      section: normalizeSectionName(undefined, selectedClass),
      sessionId: targetSession.id,
      versioned: "1",
      ...(!bulk && selectedStudent ? { studentId: selectedStudent.id } : {}),
    });
    try {
      const res = await fetch(`/api/marks/class?${query}`, {
        credentials: "include", cache: "no-store", signal: controller.signal,
        headers: cached && action !== "refresh" ? { "If-None-Match": cached.version } : undefined,
      });
      const unchanged = res.status === 304;
      const data: ClassMarksheetSnapshot = unchanged ? cached as ClassMarksheetSnapshot : await res.json();
      if (!unchanged && !res.ok) throw new Error((data as unknown as { error?: string }).error || "Unable to load marks.");
      if (!data || !Array.isArray(data.marks) || typeof data.version !== "string") {
        throw new Error("Academic data returned an invalid response.");
      }
      if (controller.signal.aborted || marksRequest.current !== controller) return;
      if (requestRevision !== getMarksheetCacheRevision()) {
        throw new Error("Marks changed while loading. Please try again.");
      }

      if (bulk) {
        if (!unchanged) {
          for (const student of classStudents) {
            studentMarksheets.delete(JSON.stringify([classScope, student.id]));
          }
          classMarksheets.set(classScope, data);
        }
      } else {
        studentMarksheets.set(scope, data);
      }

      if (action !== "refresh") {
        flushSync(() => {
          setBulkMarks(bulk ? data.marks : []);
          setIsBulkPrintMode(bulk);
          setLoadingMarks(false);
        });
        window.print();
      }
    } catch (error) {
      if (!controller.signal.aborted && marksRequest.current === controller) {
        showToast("error", "Unable to verify latest marks", (error as Error).message);
      }
    } finally {
      if (!controller.signal.aborted && marksRequest.current === controller) setLoadingMarks(false);
    }
  };

  useEffect(() => {
    setLoadingMarks(false);
    return () => marksRequest.current?.abort();
  }, [scope, selectedReportCardExam, showDistributionLog, revision]);

  useEffect(() => {
    const resetPrintMode = () => {
      setIsBulkPrintMode(false);
      setBulkMarks([]);
    };
    window.addEventListener("afterprint", resetPrintMode);
    return () => window.removeEventListener("afterprint", resetPrintMode);
  }, []);

  const canPrint = isDataLoaded && !loadingMarks && !showDistributionLog;

  const handleClaimToggle = async (student: any) => {
    try {
      setClaiming(true);
      const newClaimed = !student.isMarksheetClaimed;
      const res = await fetch(`/api/students/claim-marksheet`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, isMarksheetClaimed: newClaimed })
      });
      if (res.ok) {
        updateStudentClaimMarksheet(student.id, newClaimed);
        const cachedRoster = marksheetRosters.get(classScope);
        if (cachedRoster) {
          marksheetRosters.set(classScope, cachedRoster.map(entry => entry.id === student.id
            ? { ...entry, isMarksheetClaimed: newClaimed }
            : entry));
        }
        setSessionRoster(roster => roster && ({
          ...roster,
          students: roster.students.map(entry => entry.id === student.id
            ? { ...entry, isMarksheetClaimed: newClaimed }
            : entry),
        }));
        showToast("success", "Distribution Updated", `Marksheet for ${student.name} marked as ${newClaimed ? "Collected" : "Pending"}.`);
      } else {
        showToast("error", "Update Failed", "Could not update distribution status.");
      }
    } catch {
      showToast("error", "Network Error", "Failed to update distribution status.");
    } finally {
      setClaiming(false);
    }
  };

  const getCbseGrade = (pct: number) => {
    if (pct >= 91) return "A1";
    if (pct >= 81) return "A2";
    if (pct >= 71) return "B1";
    if (pct >= 61) return "B2";
    if (pct >= 51) return "C1";
    if (pct >= 41) return "C2";
    if (pct >= 33) return "D";
    return "E";
  };

  return (
    <div className="-mx-2 sm:mx-0 space-y-4 text-left">
      <div className="bg-white border-y sm:border border-slate-200/60 sm:rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-left no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/80 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                Print Official Marksheets
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Preview student marksheets and print or save them as PDFs.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSearchQuery("");
                setIsBulkPrintMode(false);
                setSelectedReportCardStudentId("");
              }}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
            >
              <option value="" disabled>Choose a class</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>{normalizeDisplayClassName(cls)}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1 lg:order-last">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Search & Select Student
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  aria-label="Find a student"
                  placeholder="Name, roll or admission no."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
                />
              </div>
              <select
                aria-label="Select student"
                value={selectedStudent?.id ?? ""}
                onChange={(e) => {
                  setSelectedReportCardStudentId(e.target.value);
                  setIsBulkPrintMode(false);
                }}
                className="w-full text-xs font-bold py-2.5 px-2 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs truncate"
              >
                <option value="" disabled>{!selectedClass ? "Choose a class first" : loadingRoster ? "Loading students..." : filteredStudents.length ? "Choose a student" : "No students available"}</option>
                {filteredStudents.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.rollNo ? std.rollNo + " · " : ""}{std.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Exam Scope
            </label>
            <select
              value={selectedReportCardExam}
              disabled={!selectedClass}
              onChange={(e) => setSelectedReportCardExam(e.target.value)}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
            >
              <option value="All">All Exams Summary</option>
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>{ex} Only</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Academic Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                setSearchQuery("");
                setSelectedReportCardStudentId("");
                setIsBulkPrintMode(false);
              }}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
            >
              <option value="" disabled>{hasSelectedClass ? "Choose a session" : "Choose a class first"}</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.name}>
                  {session.name}{session.isCurrent ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <p role="status" className="font-medium text-slate-600">
              {loadingMarks ? "Loading marks…" : loadingRoster ? "Loading students…" : isDataLoaded
                ? "Student marksheet loaded"
                : selectedStudent ? "Click Show Marksheet to preview the selected student." : "Choose a class and student."}
            </p>
            <button type="button" onClick={() => void loadRoster(true)} disabled={loadingRoster || loadingMarks || !selectedSession || !selectedClass}
              className="font-bold text-indigo-700 disabled:opacity-50">
              Reload student list
            </button>
            <details className="text-slate-600">
              <summary className="cursor-pointer font-bold">Print settings</summary>
              <label className="mt-2 flex items-center gap-2">
                Issue date
                <input type="date" value={issueDateIso} onChange={e => setIssueDateIso(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1" />
              </label>
            </details>
          </div>
          <div className="flex gap-3 flex-col md:flex-row">
            <button
              type="button"
              disabled={loadingMarks || !selectedStudent || showDistributionLog}
              onClick={() => void loadMarks("refresh")}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMarks ? <Loader2 className="h-4 w-4 animate-spin" /> : isDataLoaded ? <RefreshCw className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
              {loadingMarks ? "Loading marks..." : isDataLoaded ? "Refresh Marksheet" : "Show Marksheet"}
            </button>
            <button
              type="button"
              disabled={!canPrint || !selectedStudent}
              onClick={() => void loadMarks("print-student")}
              className="flex-1 py-3 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4" /> Print / Save Student PDF
            </button>
            
            <button
              type="button"
              disabled={loadingMarks || showDistributionLog || classStudents.length === 0}
              onClick={() => void loadMarks("print-class")}
              className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Layers className="h-4 w-4" /> 
              Print / Save Class PDF ({classStudents.length})
            </button>

            <button
              type="button"
              onClick={() => setShowDistributionLog(!showDistributionLog)}
              className={`px-4 py-3 border rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${showDistributionLog ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            >
              <BookOpen className="h-4 w-4" /> 
              {showDistributionLog ? "Hide Distribution Log" : "Distribution Log"}
            </button>
          </div>
        </div>
      </div>

      {showDistributionLog && (
        <div className="bg-white border-y sm:border border-slate-200/60 sm:rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-left mb-6 max-w-[210mm] mx-auto no-print">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">Distribution Log</h3>
              <p className="text-[10px] font-bold text-slate-400">{normalizeDisplayClassName(selectedClass)}</p>
            </div>
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-700">
              {classStudents.filter(s => s.isMarksheetClaimed).length} / {classStudents.length} Claimed
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3 w-32 text-center">Status</th>
                  <th className="py-3 px-3 w-40 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {classStudents.length > 0 ? (
                  classStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3">
                        <p className="font-extrabold text-slate-900">{student.name}</p>
                        <p className="text-[9px] text-slate-400">Roll: {student.rollNo || "--"} | Adm: {student.admissionNo}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${student.isMarksheetClaimed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {student.isMarksheetClaimed ? "Claimed ✅" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleClaimToggle(student)}
                          disabled={claiming}
                          className={`py-1.5 px-3 rounded-lg text-[10px] font-black transition-all shadow-sm w-full cursor-pointer ${student.isMarksheetClaimed ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                          {student.isMarksheetClaimed ? "Mark Unclaimed" : "Mark as Claimed"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[10px] text-slate-400 font-bold italic">No students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only-container {
            position: relative !important;
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 200mm !important;
            min-height: 282mm !important;
            margin: 0 auto !important;
            padding: 6mm 8mm !important;
            box-shadow: none !important;
            border: 2.5px solid #0f172a !important;
            background-color: #ffffff !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm;
          }
        }
      `}</style>

      {!showDistributionLog && selectedStudent && (
                <nav aria-label="Browse marksheets" className="mb-3 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 no-print">
                  <button type="button" disabled={studentIndex <= 0}
                    onClick={() => setSelectedReportCardStudentId(filteredStudents[studentIndex - 1].id)}
                    className="rounded-lg px-2 py-1 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40">Previous</button>
                  <span>{studentIndex + 1} of {filteredStudents.length}</span>
                  <button type="button" disabled={studentIndex >= filteredStudents.length - 1}
                    onClick={() => setSelectedReportCardStudentId(filteredStudents[studentIndex + 1].id)}
                    className="rounded-lg px-2 py-1 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40">Next</button>
                </nav>
      )}

      {!showDistributionLog && (
        <div className="mt-8 flex justify-center print:mt-0 print:block print-area">
          {loadingMarks ? (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-600 no-print">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p className="font-bold">Loading Academic Data...</p>
            </div>
          ) : !isDataLoaded && !isBulkPrintMode ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 no-print">
              <BookOpen className="h-12 w-12 mb-4 opacity-30" />
              <p className="font-bold text-sm">Select a student and click Show Marksheet.</p>
            </div>
          ) : isBulkPrintMode ? (
          <div className="space-y-8 w-full max-w-[210mm]">
            {[...classStudents].sort((a, b) => String(a.rollNo || "").localeCompare(String(b.rollNo || ""), undefined, { numeric: true })).map((std) => (
              <SingleMarksheetCard
                key={std.id}
                student={std}
                selectedReportCardExam={selectedReportCardExam}
                getCbseGrade={getCbseGrade}
                classMarks={bulkMarks}
                sessionYear={selectedSession}
                issueDate={formatDisplayDate(issueDateIso)}
              />
            ))}
          </div>
        ) : (
          (() => {
            const student = selectedStudent;
            if (!student) return <p className="text-slate-400 font-bold no-print">No matching student in this class.</p>;
            return (
              <div className="flex flex-col items-center">

                <div className="flex items-center gap-4 mb-4 no-print w-full justify-end max-w-[210mm]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${student.isMarksheetClaimed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {student.isMarksheetClaimed ? "Claimed ✅" : "Unclaimed ❌"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => handleClaimToggle(student)}
                    className={`py-2 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm ${student.isMarksheetClaimed ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                  >
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {student.isMarksheetClaimed ? "Mark Unclaimed" : "Mark as Claimed"}
                  </button>
                </div>
                <SingleMarksheetCard
                  student={student}
                    selectedReportCardExam={selectedReportCardExam}
                  getCbseGrade={getCbseGrade}
                  classMarks={cachedStudent?.marks ?? []}
                  sessionYear={selectedSession}
                  issueDate={formatDisplayDate(issueDateIso)}
                />
              </div>
            );
          })()
        )}
        </div>
      )}
    </div>
  );
}

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
  selectedReportCardExam,
  getCbseGrade,
  classMarks,
  sessionYear,
  issueDate,
}: {
  student: any;
  selectedReportCardExam: string;
  getCbseGrade: (pct: number) => string;
  classMarks: any[];
  sessionYear: string;
  issueDate: string;
}) {
  const sMarks: any[] = classMarks.filter(m => m.studentId === student.id);
  const sessionStartYear = (sessionYear || "2026").split("-")[0] || "2026";
  const shortSession = (sessionYear || "2026-2027").includes("-")
    ? `${(sessionYear || "").split("-")[0]}-${(sessionYear || "").split("-")[1]?.slice(-2)}`
    : sessionYear;
  
  const classKey = student.class || "";
  const normClass = classKey.toUpperCase().trim();
  let defaultSubjects = [
    "ENGLISH",
    "HINDI",
    "MATHEMATICS",
    "SCIENCE/EVS",
    "COMPUTER",
    "DRAWING",
    "G.K.",
    "SOCIAL SCIENCE",
    "SANSKRIT",
  ];

  if (
    normClass.includes("NURSERY") ||
    normClass.includes("LKG") ||
    normClass.includes("UKG") ||
    normClass.includes("PRE-KG") ||
    normClass.includes("PLAY") ||
    normClass.startsWith("KG") ||
    normClass.includes(" KG") ||
    normClass.includes("-KG")
  ) {
    defaultSubjects = ["ENGLISH", "HINDI", "MATHEMATICS", "DRAWING"];
  } else {
    const match = normClass.match(/\d+/);
    let classNum = match ? parseInt(match[0], 10) : NaN;
    if (isNaN(classNum)) {
      const romanMap: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
      const cleaned = normClass.replace(/CLASS/g, "").replace(/SEC(TION)?/g, "").replace(/-[A-Z]$/g, "").trim().toLowerCase();
      if (romanMap[cleaned]) classNum = romanMap[cleaned];
    }
    if (!isNaN(classNum) && classNum >= 1 && classNum <= 5) {
      defaultSubjects = ["ENGLISH", "HINDI", "MATHEMATICS", "SCIENCE/EVS", "COMPUTER", "DRAWING", "G.K.", "SANSKRIT"];
    }
  }

  const summary = buildMarksheetSummary(sMarks, defaultSubjects, selectedReportCardExam);
  const { rows: subjectRows, term1TotalObtained, term2TotalObtained, grandMaxTotal, grandObtTotal, hasData } = summary;
  const overallPercentage = grandMaxTotal > 0 ? (grandObtTotal / grandMaxTotal) * 100 : 0;
  const isIncomplete = selectedReportCardExam === "All" && hasData && !summary.isComplete;
  const canEvaluate = hasData && !isIncomplete;
  const finalGrade = canEvaluate ? getCbseGrade(overallPercentage) : "—";
  const percentageText = hasData ? `${overallPercentage.toFixed(2)}%` : "—";
  const division = !canEvaluate ? "—" : overallPercentage >= 60 ? "First Division" : overallPercentage >= 45 ? "Second Division" : "Third Division";

  return (
    <div
      id={`report-card-print-${student.id}`}
      className="bg-white p-5 w-full max-w-[200mm] border-[2.5px] border-slate-900 rounded-none text-slate-950 font-serif print-only-container relative shadow-2xl mx-auto page-break-after text-left overflow-hidden"
      style={{ minHeight: "280mm" }}
    >
      <div className="p-0 min-h-[268mm] flex flex-col justify-between relative z-10 bg-white">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <img src="/logo.png" alt="St. G.N.G. School Watermark" className="w-[380px] h-[380px] object-contain opacity-[0.06]" />
        </div>
        <div className="relative z-10 space-y-2.5">
          <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-3">
            {/* 3-Column Equal Grid to ensure EXACT Center Alignment */}
            <div className="grid grid-cols-3 items-center px-1">
              <div className="text-left text-[9px] font-sans font-extrabold text-slate-800 space-y-1.5 pt-1">
                <p>SCHOOL CODE: <span className="font-black text-slate-950">09670707502</span></p>
                <p>REPORT CARD NO: <span className="font-bold text-slate-700">GNG/{sessionStartYear}/{(student.admissionNo || student.id).toString().toUpperCase()}</span></p>
              </div>

              <div className="flex justify-center items-center">
                <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-20 w-auto object-contain block mx-auto" />
              </div>

              <div className="text-right text-[9px] font-sans font-extrabold text-slate-800 space-y-1.5 pt-1">
                <p>ESTD. - <span className="font-black text-slate-950">2003</span></p>
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
              ANNUAL ACADEMIC PROGRESS REPORT CARD (SESSION {sessionYear})
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
                <span className="font-black text-slate-950 text-xs">ROLL NO: {student.rollNo || "N/A"} | {normalizeDisplayClassName(getCleanClassKey(student.class, student.section)).toUpperCase()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x-2 divide-slate-900 p-2">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Father's Name</span>
                <span className="font-extrabold text-slate-900 text-xs uppercase">{student.parentName || student.fatherName || "--"}</span>
              </div>
              <div className="pl-3">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Mother's Name</span>
                <span className="font-extrabold text-slate-900 text-xs uppercase">{student.motherName || "--"}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x-2 divide-slate-900 p-2">
              <div>
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Admission No</span>
                <span className="font-extrabold text-slate-900 text-xs">{student.admissionNo}</span>
              </div>
              <div className="px-3">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Assessment Scope</span>
                <span className="font-extrabold text-slate-900 text-xs">{selectedReportCardExam === "All" ? "Full Academic Year" : selectedReportCardExam}</span>
              </div>
              <div className="pl-3">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Academic Session</span>
                <span className="font-extrabold text-slate-900 text-xs">{sessionYear.replace("-", " - ")}</span>
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
                  <tr key={idx} className={`border-b border-slate-900 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}`}>
                    <td className="py-1.5 px-2 border-r-2 border-slate-900 text-left font-black uppercase text-slate-950">{row.subName}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.internalAbsent1 ? "AB" : (row.prAct1 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.internalAbsent1 ? "AB" : (row.noteBook1 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.internalAbsent1 ? "AB" : (row.subEnri1 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-black text-slate-900">{row.writtenAbsent1 ? <span className="text-rose-700 font-black">AB</span> : (row.halfYearly1 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r-2 border-slate-900 font-black bg-indigo-50/60 text-indigo-950">{row.isAbsent1 ? <span className="text-rose-700 font-black">AB</span> : (row.obt1 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.internalAbsent2 ? "AB" : (row.prAct2 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.internalAbsent2 ? "AB" : (row.noteBook2 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-bold text-slate-700">{row.internalAbsent2 ? "AB" : (row.subEnri2 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-black text-slate-900">{row.writtenAbsent2 ? <span className="text-rose-700 font-black">AB</span> : (row.yearly2 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r-2 border-slate-900 font-black bg-emerald-50/60 text-emerald-950">{row.isAbsent2 ? <span className="text-rose-700 font-black">AB</span> : (row.obt2 ?? "—")}</td>
                    <td className="py-1.5 px-0.5 border-r border-slate-300 font-extrabold text-slate-700">{row.maxM || "—"}</td>
                    <td className="py-1.5 px-0.5 font-black text-indigo-950 text-xs bg-amber-50">
                      {(row.hasTerm1 || row.hasTerm2) && (!row.hasTerm1 || row.isAbsent1) && (!row.hasTerm2 || row.isAbsent2) ? <span className="text-rose-700 font-black">AB</span> : row.hasTerm1 || row.hasTerm2 ? row.totalTermObt : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-900 font-black bg-slate-900 text-white">
                  <td className="py-1.5 px-2 text-left border-r-2 border-slate-700 uppercase tracking-wider text-[9.5px]">GRAND TOTAL</td>
                  <td colSpan={4} className="border-r border-slate-700"></td>
                  <td className="py-1.5 px-0.5 border-r-2 border-slate-700 text-center font-black text-amber-300 text-xs bg-indigo-950">{summary.hasTerm1 ? term1TotalObtained : "—"}</td>
                  <td colSpan={4} className="border-r border-slate-700"></td>
                  <td className="py-1.5 px-0.5 border-r-2 border-slate-700 text-center font-black text-amber-300 text-xs bg-emerald-950">{summary.hasTerm2 ? term2TotalObtained : "—"}</td>
                  <td className="py-1.5 px-0.5 border-r border-slate-700 text-center font-black text-slate-200">{hasData ? grandMaxTotal : "—"}</td>
                  <td className="py-1.5 px-0.5 text-center font-black text-amber-300 text-xs bg-amber-950">{hasData ? grandObtTotal : "—"}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-1.5 flex items-center justify-between font-sans text-xs font-black text-slate-950 px-2 py-1 bg-slate-100 border border-slate-300 rounded">
              <span className="text-[10px] uppercase tracking-wider text-slate-700">Evaluation: <strong className="text-slate-950 font-black">{isIncomplete ? "Incomplete — recorded marks only" : selectedReportCardExam === "All" ? "Annual Aggregate Performance" : selectedReportCardExam}</strong></span>
              <div className="flex items-center gap-4">
                <span>Percentage (%): <span className="text-indigo-950 text-sm font-black">{percentageText}</span></span>
                <span>Division: <span className="text-slate-900 font-extrabold">{division}</span></span>
                <span>Grade: <span className="text-indigo-700 font-black text-xs">{finalGrade}</span></span>
              </div>
            </div>
          </div>

          <div className="my-2 font-sans border-2 border-slate-900 bg-amber-50/40 p-3 flex items-center justify-between gap-4">
            <div className="space-y-1 text-xs font-bold text-slate-900 text-left">
              <p>GRAND TOTAL OBTAINED: <span className="font-black text-sm text-slate-950">{hasData ? grandObtTotal : "—"} / {hasData ? grandMaxTotal : "—"}</span> {hasData ? `(${numberToWords(grandObtTotal)} MARKS)` : ""}</p>
              <p>AGGREGATE PERCENTAGE: <span className="font-black text-indigo-950 text-sm">{percentageText}</span> | OVERALL GRADE: <span className="font-black text-indigo-700">{finalGrade}</span></p>
              <p className="text-[9.5px] text-slate-600 italic">Class Teacher's Remarks: "{!hasData ? "No marks recorded for this scope." : isIncomplete ? "Assessment records are incomplete." : overallPercentage >= 75 ? "Excellent academic performance! Outstanding dedication." : overallPercentage >= 50 ? "Good overall progress. Keep up the hard work." : "Needs consistent practice in core subjects."}"</p>
            </div>
            <div className="shrink-0 border-4 border-emerald-800 bg-emerald-100/90 px-4 py-2 text-center rotate-[-2deg] shadow-md rounded-md">
              <p className="text-[7.5px] font-black uppercase text-emerald-900 tracking-widest">{selectedReportCardExam === "All" ? "RESULT STATUS" : "ASSESSMENT RESULT"}</p>
              <h3 className="text-sm font-black text-emerald-950 tracking-tight uppercase">
                {!hasData ? "NO MARKS RECORDED" : selectedReportCardExam !== "All" ? "PROVISIONAL" : isIncomplete ? "INCOMPLETE" : overallPercentage >= 33 ? "PASSED & PROMOTED" : "NEEDS IMPROVEMENT"}
              </h3>
              <p className="text-[7.5px] font-extrabold text-emerald-800 uppercase mt-0.5">ACADEMIC SESSION {shortSession}</p>
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
              <p className="font-extrabold text-slate-700 mt-0.5">{issueDate}</p>
            </div>
            <div className="text-center space-y-1">
              <div className="h-7"></div>
              <div className="border-t-2 border-slate-900 pt-0.5 uppercase tracking-wider text-[7.5px] font-black">CLASS TEACHER SIGNATURE</div>
            </div>
            <div className="text-center space-y-1 relative">
              <div className="h-7"></div>
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
