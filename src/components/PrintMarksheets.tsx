"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Printer,
  Layers,
  BookOpen,
  Search,
  CheckCircle2,
  Loader2
} from "lucide-react";

export default function PrintMarksheets() {
  const { students, schoolInfo, refreshStudents } = useAuth();

  const availableClasses = Array.from(
    new Set(students.map((s) => `${s.class}-${s.section}`))
  ).sort();

  const availableExams = schoolInfo.exams && schoolInfo.exams.length > 0
    ? schoolInfo.exams
    : ["Unit-1", "Half Yearly", "Unit-2", "Annual"];

  const [selectedClass, setSelectedClass] = useState(availableClasses[0] || "");
  const [selectedReportCardStudentId, setSelectedReportCardStudentId] = useState("");
  const [selectedReportCardExam, setSelectedReportCardExam] = useState("All");
  const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classMarks, setClassMarks] = useState<any[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showDistributionLog, setShowDistributionLog] = useState(false);

  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  const classStudents = students.filter(
    (s) => `${s.class}-${s.section}` === selectedClass
  );

  const filteredStudents = classStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.rollNo && s.rollNo.includes(searchQuery)) ||
    (s.admissionNo && s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (filteredStudents.length > 0 && !selectedReportCardStudentId) {
      setSelectedReportCardStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedReportCardStudentId]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // When class changes, reset the data loaded state so they have to fetch again
  useEffect(() => {
    setIsDataLoaded(false);
    setClassMarks([]);
  }, [selectedClass]);

  const loadClassData = () => {
    if (!selectedClass) return;
    const lastDashIdx = selectedClass.lastIndexOf("-");
    const cName = selectedClass.substring(0, lastDashIdx);
    const cSec = selectedClass.substring(lastDashIdx + 1);
    setLoadingMarks(true);
    fetch(`/api/marks/class?class=${encodeURIComponent(cName)}&section=${encodeURIComponent(cSec)}`)
      .then(res => res.json())
      .then(data => {
        setClassMarks(Array.isArray(data) ? data : []);
        setIsDataLoaded(true);
        setLoadingMarks(false);
      })
      .catch(err => {
        console.error("Failed to fetch marks", err);
        setLoadingMarks(false);
      });
  };

  const handleClaimToggle = async (student: any) => {
    try {
      setClaiming(true);
      const res = await fetch(`/api/students/claim-marksheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, isMarksheetClaimed: !student.isMarksheetClaimed })
      });
      if (res.ok) {
        await refreshStudents(); // Refresh students to get the new claim status
      }
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
                Generate and print student report cards at the end of the session.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setIsBulkPrintMode(false);
                setSelectedReportCardStudentId("");
              }}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Search & Select Student
            </label>
            <div className="flex gap-2">
              <div className="relative w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
                />
              </div>
              <select
                value={selectedReportCardStudentId}
                onChange={(e) => {
                  setSelectedReportCardStudentId(e.target.value);
                  setIsBulkPrintMode(false);
                }}
                className="w-1/2 text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
              >
                {filteredStudents.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} (Roll: {std.rollNo || "--"})
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
              onChange={(e) => setSelectedReportCardExam(e.target.value)}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
            >
              <option value="All">All Exams Summary</option>
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>{ex} Only</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-5">
          <button
            type="button"
            disabled={loadingMarks || isDataLoaded}
            onClick={loadClassData}
            className={`w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${isDataLoaded ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default' : 'bg-slate-800 hover:bg-slate-900 text-white shadow-md shadow-slate-800/20 cursor-pointer'}`}
          >
            {loadingMarks ? <Loader2 className="h-4 w-4 animate-spin" /> : isDataLoaded ? <CheckCircle2 className="h-4 w-4" /> : <Layers className="h-4 w-4" />} 
            {isDataLoaded ? "Academic Data Loaded" : "Load Academic Data"}
          </button>

          <div className="flex gap-3 flex-col md:flex-row">
            <button
              type="button"
              disabled={loadingMarks || !isDataLoaded}
              onClick={() => {
                setIsBulkPrintMode(false);
                setTimeout(() => window.print(), 100);
              }}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4" /> Print Selected
            </button>
            
            <button
              type="button"
              disabled={loadingMarks || !isDataLoaded}
              onClick={() => {
                setIsBulkPrintMode(true);
                setTimeout(() => window.print(), 1000); // extra delay for 500+
              }}
              className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Layers className="h-4 w-4" /> 
              Bulk Print ({classStudents.length})
            </button>

            <button
              type="button"
              onClick={() => setShowDistributionLog(!showDistributionLog)}
              className={`flex-1 py-3 border rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${showDistributionLog ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
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
              <p className="text-[10px] font-bold text-slate-400">Class {selectedClass}</p>
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

      <style dangerouslySetInnerHTML={{
        __html: `
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
            }
            .no-print {
              display: none !important;
            }
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

      {!showDistributionLog && (
        <div className="mt-8 flex justify-center print:mt-0 print:block print-area">
          {!isDataLoaded ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 no-print">
              <BookOpen className="h-12 w-12 mb-4 opacity-30" />
              <p className="font-bold text-sm">Please click "Load Academic Data" to view marksheets.</p>
            </div>
          ) : loadingMarks ? (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-600 no-print">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p className="font-bold">Loading Academic Data...</p>
            </div>
          ) : isBulkPrintMode ? (
          <div className="space-y-8 w-full max-w-[210mm]">
            {classStudents.map((std) => (
              <SingleMarksheetCard
                key={std.id}
                student={std}
                availableExams={availableExams}
                selectedReportCardExam={selectedReportCardExam}
                getCbseGrade={getCbseGrade}
                classMarks={classMarks}
              />
            ))}
          </div>
        ) : (
          (() => {
            const student = classStudents.find((s) => s.id === selectedReportCardStudentId) || classStudents[0];
            if (!student) return <p className="text-slate-400 font-bold no-print">No student found.</p>;
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
                  availableExams={availableExams}
                  selectedReportCardExam={selectedReportCardExam}
                  getCbseGrade={getCbseGrade}
                  classMarks={classMarks}
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
  availableExams,
  selectedReportCardExam,
  getCbseGrade,
  classMarks,
}: {
  student: any;
  availableExams: string[];
  selectedReportCardExam: string;
  getCbseGrade: (pct: number) => string;
  classMarks: any[];
}) {
  const sMarks: any[] = classMarks.filter(m => m.studentId === student.id);
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

  const subjectRows = displaySubjects.map((subName, idx) => {
    const subMarks = sMarks.filter((m) => m.subject.toUpperCase() === subName.toUpperCase());
    const t1Match = subMarks.find((m) => {
      const e = m.examName.toLowerCase();
      return e.includes("half") || e.includes("term 1") || e.includes("term-1") || e.includes("unit 1") || e.includes("unit-1");
    });
    let prAct1 = 0, noteBook1 = 0, subEnri1 = 0, halfYearly1 = 0, obt1 = 0;
    if (t1Match) {
      const b1 = t1Match.breakdown || {};
      prAct1 = b1["Practical / Activity"] !== undefined ? parseFloat(b1["Practical / Activity"]) : (t1Match.practical ?? 0);
      noteBook1 = b1["Notebook"] !== undefined ? parseFloat(b1["Notebook"]) : (t1Match.notebook ?? 0);
      subEnri1 = b1["Subject Enrichment"] !== undefined ? parseFloat(b1["Subject Enrichment"]) : (t1Match.subjectEnrichment ?? 0);
      halfYearly1 = b1["Written Exam"] !== undefined ? parseFloat(b1["Written Exam"]) : (t1Match.writtenExam ?? Math.max(0, t1Match.marksObtained - prAct1 - noteBook1 - subEnri1));
      obt1 = prAct1 + noteBook1 + subEnri1 + halfYearly1;
    } else if (subMarks.length > 0) {
       // fallback if they just entered some exam
       const m = subMarks[0];
       obt1 = m.marksObtained;
       halfYearly1 = m.marksObtained;
    }

    const t2Match = subMarks.find((m) => {
      const e = m.examName.toLowerCase();
      return e.includes("annual") || e.includes("yearly") || e.includes("term 2") || e.includes("term-2") || e.includes("final");
    });
    let prAct2 = 0, noteBook2 = 0, subEnri2 = 0, yearly2 = 0, obt2 = 0;
    if (t2Match) {
      const b2 = t2Match.breakdown || {};
      prAct2 = b2["Practical / Activity"] !== undefined ? parseFloat(b2["Practical / Activity"]) : (t2Match.practical ?? 0);
      noteBook2 = b2["Notebook"] !== undefined ? parseFloat(b2["Notebook"]) : (t2Match.notebook ?? 0);
      subEnri2 = b2["Subject Enrichment"] !== undefined ? parseFloat(b2["Subject Enrichment"]) : (t2Match.subjectEnrichment ?? 0);
      yearly2 = b2["Written Exam"] !== undefined ? parseFloat(b2["Written Exam"]) : (t2Match.writtenExam ?? Math.max(0, t2Match.marksObtained - prAct2 - noteBook2 - subEnri2));
      obt2 = prAct2 + noteBook2 + subEnri2 + yearly2;
    } else if (subMarks.length > 1) {
       // fallback to second exam if t2 not found
       const m = subMarks[1];
       obt2 = m.marksObtained;
       yearly2 = m.marksObtained;
    } else if (subMarks.length === 1 && !t1Match) {
       // if only one exam was found and it didn't match t1, put it in t2? 
       // Or just leave it in t1 as we did above.
    }

    const maxM = 200;
    const totalTermObt = obt1 + obt2;

    term1TotalObtained += obt1;
    term2TotalObtained += obt2;
    grandMaxTotal += maxM;
    grandObtTotal += totalTermObt;

    return {
      subName,
      prAct1, noteBook1, subEnri1, halfYearly1, obt1,
      prAct2, noteBook2, subEnri2, yearly2, obt2,
      maxM, totalTermObt,
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
          <img src="/logo.png" alt="St. G.N.G. School Watermark" className="w-[380px] h-[380px] object-contain opacity-[0.06]" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center justify-between px-1">
              <div className="text-left text-[9px] font-sans font-extrabold text-slate-800 space-y-1.5 pt-1">
                <p>SCHOOL CODE: <span className="font-black text-slate-950">09670707502</span></p>
                <p>REPORT CARD NO: <span className="font-bold text-slate-700">GNG/2025/{student.id.slice(0, 5).toUpperCase()}</span></p>
              </div>
              <div className="flex flex-col items-center">
                <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-20 w-auto object-contain mx-auto" />
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
                  <tr key={idx} className={`border-b border-slate-900 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}`}>
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

          <div className="my-2 font-sans border-2 border-slate-900 bg-amber-50/40 p-3 flex items-center justify-between gap-4">
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
