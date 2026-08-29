"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Award, CheckCircle, Clock, Calendar as CalendarIcon, FileText } from "lucide-react";
import { MockStudent, MockHomework, MockSchoolInfo } from "@/context/AuthContext";

interface ParentAcademicsTabProps {
  child: MockStudent | undefined;
  homeworks: MockHomework[];
  schoolInfo: MockSchoolInfo;
}

export default function ParentAcademicsTab({ child, homeworks, schoolInfo }: ParentAcademicsTabProps) {
  const [subTab, setSubTab] = useState<"homework" | "reportcard">("homework");
  const [selectedExamTab, setSelectedExamTab] = useState("");
  const [childMarks, setChildMarks] = useState<any[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);

  const availableExams = schoolInfo.exams && schoolInfo.exams.length > 0
    ? schoolInfo.exams
    : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];

  const currentExamTab = selectedExamTab || availableExams[0] || "Unit-1";

  // Fetch child marks from API
  useEffect(() => {
    if (!child?.id) return;
    setLoadingMarks(true);
    fetch(`/api/students/${child.id}/marks`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setChildMarks(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error fetching child marks:", err);
      })
      .finally(() => {
        setLoadingMarks(false);
      });
  }, [child?.id]);

  // Filter homework matching child's class and section
  const childHomework = child ? homeworks.filter((h) => {
    const childClassNorm = (child.class || "").toLowerCase().replace(/^class\s*/i, "").replace(/\s+/g, "");
    const childSecNorm = (child.section || "").toLowerCase().trim();

    const rawHwCS = (h.classSection || "").toLowerCase().trim();
    if (!rawHwCS) return false;

    const parts = rawHwCS.split("-").map((p: string) => p.replace(/^class\s*/i, "").trim());
    const hwClass = parts[0];
    const hwSec = parts[1] || "";

    if (hwClass !== childClassNorm) return false;
    if (!hwSec || hwSec === "all") return true;
    return hwSec === childSecNorm;
  }) : [];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in text-left pb-12 font-sans">
      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
            Academic Center
          </span>
          <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
            {child?.name}&apos;s Studies & Grades
          </h2>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold">
          <button
            onClick={() => setSubTab("homework")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              subTab === "homework"
                ? "bg-white text-indigo-700 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Homework ({childHomework.length})
          </button>
          <button
            onClick={() => setSubTab("reportcard")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              subTab === "reportcard"
                ? "bg-white text-indigo-700 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Report Card / Marksheets
          </button>
        </div>
      </div>

      {/* ── Sub-Tab 1: Homework Timeline ── */}
      {subTab === "homework" && (
        <div className="space-y-3">
          {childHomework.length > 0 ? (
            childHomework.map((hw) => (
              <div
                key={hw.id}
                className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2 hover:border-indigo-200 transition-colors cv-auto-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase">
                      {hw.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Class {hw.classSection}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    Due: {hw.dueDate}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900">{hw.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/80">
                  {hw.description}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-slate-400">No active homework assignments for {child?.name}.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Sub-Tab 2: Report Card & Marksheets ── */}
      {subTab === "reportcard" && (
        <div className="space-y-4">
          {/* Exam Selector Buttons */}
          <div className="flex flex-wrap gap-2">
            {availableExams.map((exam) => {
              const isActive = currentExamTab.toLowerCase() === exam.toLowerCase();
              return (
                <button
                  key={exam}
                  onClick={() => setSelectedExamTab(exam)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {exam}
                </button>
              );
            })}
          </div>

          {(() => {
            const examMarks = childMarks.filter(
              (m: any) => m.examName && m.examName.toLowerCase() === currentExamTab.toLowerCase()
            );

            if (loadingMarks) {
              return (
                <div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                  Loading examination grades...
                </div>
              );
            }

            if (examMarks.length === 0) {
              return (
                <div className="bg-white border border-slate-200/85 p-12 rounded-2xl shadow-sm text-center text-slate-400 font-semibold italic">
                  No academic grades recorded for {child?.name} in {currentExamTab} Examination.
                </div>
              );
            }

            const totalObtained = examMarks.reduce((sum: number, m: any) => sum + m.marksObtained, 0);
            const totalMax = examMarks.reduce((sum: number, m: any) => sum + m.maxMarks, 0);
            const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
            const isPassed = percentage >= 33;

            const getGrade = (pct: number) => {
              if (pct >= 90) return "A+";
              if (pct >= 80) return "A";
              if (pct >= 70) return "B";
              if (pct >= 60) return "C";
              if (pct >= 50) return "D";
              if (pct >= 33) return "E";
              return "F";
            };

            return (
              <div className="space-y-4">
                {/* Aggregate Scorecard Panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Total Marks</span>
                    <h3 className="text-base font-black text-slate-800 mt-1">
                      {totalObtained} <span className="text-xs text-slate-400 font-bold">/ {totalMax}</span>
                    </h3>
                  </div>
                  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Percentage</span>
                    <h3 className="text-base font-black text-slate-800 mt-1">{percentage}%</h3>
                  </div>
                  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Grade</span>
                    <h3 className={`text-base font-black mt-1 ${isPassed ? "text-indigo-600" : "text-rose-600"}`}>
                      {getGrade(percentage)}
                    </h3>
                  </div>
                  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex items-center justify-center">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        isPassed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isPassed ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                </div>

                {/* Subject-Wise Table / Card List */}
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="divide-y divide-slate-100">
                    {examMarks.map((mark: any) => {
                      const scorePct = mark.maxMarks > 0 ? Math.round((mark.marksObtained / mark.maxMarks) * 100) : 0;
                      return (
                        <div key={mark.id} className="p-3.5 flex items-center justify-between text-xs cv-auto-card">
                          <div>
                            <h4 className="font-extrabold text-slate-900">{mark.subject}</h4>
                            <p className="text-[10px] text-slate-400 italic mt-0.5">{mark.remarks || "No teacher remarks."}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-indigo-700 text-sm">
                              {mark.marksObtained} <span className="text-[10px] text-slate-400 font-bold">/ {mark.maxMarks}</span>
                            </span>
                            <span className="block text-[9px] font-black text-slate-500">
                              Grade {getGrade(scorePct)} ({scorePct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}