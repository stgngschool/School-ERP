"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Download,
  Info,
  Award,
  Sparkles,
  FileCheck,
  ChevronDown,
} from "lucide-react";

interface SubjectMark {
  id: string;
  subject: string;
  examName: string;
  marksObtained: number;
  maxMarks: number;
  notebook?: number | null;
  subjectEnrichment?: number | null;
  practical?: number | null;
  breakdown?: Record<string, any> | null;
  remarks?: string | null;
}

interface ResultData {
  student: {
    name: string;
    admissionNumber: string;
    rollNumber: string;
    className: string;
    fatherName: string;
    motherName: string;
  };
  academicSession: string;
  examName: string;
  allowedExams?: string[];
  marksCount: number;
  subjects: SubjectMark[];
  summary: {
    totalObtained: number;
    totalMax: number;
    percentage: string;
  };
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
  };
}

const AVAILABLE_EXAMS = [
  { key: "Unit-1", label: "Unit Test 1 (मासिक जांच 1)" },
  { key: "Unit-2", label: "Unit Test 2 (मासिक जांच 2)" },
  { key: "Half Yearly", label: "Half Yearly Examination (अर्धवार्षिक परीक्षा)" },
  { key: "Annual", label: "Annual Examination (वार्षिक परीक्षा)" },
];

export default function PublicResultSection() {
  const [allowedExams, setAllowedExams] = useState<string[]>(["Unit-1"]);
  const [selectedExam, setSelectedExam] = useState<string>("Unit-1");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [portalEnabled, setPortalEnabled] = useState<boolean>(true);

  // Fetch currently unlocked exam list from backend
  useEffect(() => {
    fetch("/api/public/results/unit-1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.isEnabled !== undefined) setPortalEnabled(data.isEnabled);
          if (data.allowedExams && Array.isArray(data.allowedExams) && data.allowedExams.length > 0) {
            setAllowedExams(data.allowedExams);
            setSelectedExam(data.allowedExams[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionNumber.trim() || !dob.trim()) {
      setError("Please fill both Admission Number and Date of Birth.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public/results/unit-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber: admissionNumber.trim(),
          dob: dob.trim(),
          examName: selectedExam,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to find marksheet for the provided details.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (!portalEnabled) {
    return (
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 border border-slate-200 text-slate-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Result Portal Currently Closed
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed font-medium">
            Online examination evaluation desk is currently offline. For grade statements or report cards, please contact the school administrative desk.
          </p>
          <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-700 inline-block shadow-sm">
            <p className="font-bold text-slate-900">School Office Helpdesk:</p>
            <p className="text-indigo-600 font-bold mt-0.5">+91 9452824318 / 9415812975</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 sm:py-12 bg-slate-50/60 border-b border-slate-200/80 font-sans">
      {/* ─── ISOLATED HIGH-RES PRINT STYLESHEET FOR CLEAN MARKSHEET SLIP ─── */}
      <style jsx global>{`
        @media print {
          /* Hide EVERYTHING else on page: Navbar, Headers, Footers, Admin Controls, Buttons */
          body * {
            visibility: hidden !important;
          }
          header, footer, nav, .print\\:hidden, #nprogress {
            display: none !important;
          }

          /* Show ONLY the designated printable marksheet slip */
          #marksheet-printable-slip, #marksheet-printable-slip * {
            visibility: visible !important;
          }

          #marksheet-printable-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 190mm !important;
            margin: 0 auto !important;
            padding: 8mm 10mm !important;
            border: 2px solid #0f172a !important;
            border-radius: 8px !important;
            background-color: #ffffff !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        {!result ? (
          /* Search / Student Verification Box */
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-md sm:shadow-xl overflow-hidden">
              <div className="p-5 sm:p-8">
                {/* Header Title */}
                <div className="text-center mb-5 sm:mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Parent Verification Desk</span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Online Examination Results
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Enter student Admission Number and Date of Birth to securely access academic performance.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-semibold leading-relaxed">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                  {/* Exam Term Selection Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Select Examination Term <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        className="w-full px-3.5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition outline-none appearance-none cursor-pointer"
                      >
                        {AVAILABLE_EXAMS.map((ex) => {
                          const isUnlocked = allowedExams.some(
                            (a) => a.toLowerCase() === ex.key.toLowerCase()
                          );
                          return (
                            <option key={ex.key} value={ex.key} disabled={!isUnlocked}>
                              {ex.label} {!isUnlocked ? "🔒 (Locked)" : "✓ (Published)"}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Admission Number Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admission Number / Scholar No. <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={admissionNumber}
                        onChange={(e) => setAdmissionNumber(e.target.value)}
                        placeholder="e.g. 1602 or SCH-104"
                        className="w-full px-3.5 py-3 sm:py-3.5 pl-10 sm:pl-11 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition outline-none"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      (Printed on school fee receipt or student ID card)
                    </p>
                  </div>

                  {/* Date of Birth Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Student Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3.5 py-3 sm:py-3.5 pl-10 sm:pl-11 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition outline-none cursor-pointer"
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Required to verify parent identity and protect privacy.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 sm:mt-3 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Records...
                      </span>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>View Marksheet</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Help Note */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] sm:text-xs text-slate-500">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    If you need assistance regarding admission records, contact the school office:{" "}
                    <strong className="text-slate-800 font-bold">+91 9452824318</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Marksheet Detailed View */
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {/* Top Toolbar - Hidden during Print */}
            <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center justify-between gap-2.5 print:hidden">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white sm:bg-transparent rounded-xl border border-slate-200 sm:border-transparent hover:text-indigo-600 transition cursor-pointer shadow-xs sm:shadow-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Search Another Student</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF Slip</span>
              </button>
            </div>

            {/* ─── ISOLATED PRINTABLE SLIP CONTAINER ─── */}
            <div
              id="marksheet-printable-slip"
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-md sm:shadow-xl overflow-hidden relative"
            >
              {/* Institutional Header */}
              <div className="p-4 sm:p-6 bg-gradient-to-b from-indigo-50/70 via-white to-white border-b-2 border-slate-800 text-center">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="text-left">
                    <h2 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight leading-tight uppercase font-serif">
                      {result.schoolInfo.name || "St. G.N.G. School"}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">
                      Govt. Recognized • Salarpur, Varanasi
                    </p>
                  </div>
                </div>

                <div className="mt-2 inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-slate-900 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm">
                  <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{result.examName} Examination Report Card — Session {result.academicSession}</span>
                </div>
              </div>

              {/* Student Metadata Box */}
              <div className="p-4 sm:p-6 border-b-2 border-slate-800 bg-slate-50/80">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-xs font-sans">
                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Student Name
                    </span>
                    <strong className="text-slate-950 text-xs sm:text-sm font-black truncate block">{result.student.name}</strong>
                  </div>

                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Class & Section
                    </span>
                    <strong className="text-slate-900 font-extrabold truncate block">{result.student.className}</strong>
                  </div>

                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Admission No.
                    </span>
                    <strong className="text-slate-900 font-extrabold truncate block">{result.student.admissionNumber}</strong>
                  </div>

                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Roll Number
                    </span>
                    <strong className="text-slate-900 font-extrabold truncate block">{result.student.rollNumber}</strong>
                  </div>

                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Father&apos;s Name
                    </span>
                    <strong className="text-slate-900 font-medium truncate block">{result.student.fatherName}</strong>
                  </div>

                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Mother&apos;s Name
                    </span>
                    <strong className="text-slate-900 font-medium truncate block">{result.student.motherName}</strong>
                  </div>

                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Evaluation Term
                    </span>
                    <strong className="text-indigo-700 font-black truncate block">{result.examName}</strong>
                  </div>

                  <div className="p-2 sm:p-0 rounded-xl bg-white sm:bg-transparent border sm:border-none border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[9px] sm:text-[10px]">
                      Status
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-black text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Marks Table */}
              <div className="p-4 sm:p-6">
                {result.subjects.length === 0 ? (
                  <div className="text-center py-8 sm:py-10 text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs sm:text-sm font-bold text-slate-700">Marks Being Compiled</p>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                      Subject evaluation entry for this exam is in progress. Please check back shortly.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Mobile Hint - Hidden during print */}
                    <div className="sm:hidden mb-2 flex items-center justify-between text-[10px] font-semibold text-slate-400 px-1 print:hidden">
                      <span>Subject Performance</span>
                      <span>👈 Scroll table horizontally 👉</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 sm:border-none print:overflow-visible print:border-none">
                      <table className="w-full text-left border-collapse min-w-[480px] sm:min-w-full print:min-w-full">
                        <thead>
                          <tr className="border-b-2 border-slate-800 bg-slate-50 sm:bg-transparent text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700">
                            <th className="py-2.5 px-2">#</th>
                            <th className="py-2.5 px-3">Subject</th>
                            {result.subjects.some((s) => s.notebook !== null) && (
                              <th className="py-2.5 px-2 text-center">Notebook (/5)</th>
                            )}
                            {result.subjects.some((s) => s.subjectEnrichment !== null) && (
                              <th className="py-2.5 px-2 text-center">Sub. Enrich (/5)</th>
                            )}
                            {result.subjects.some((s) => s.practical !== null) && (
                              <th className="py-2.5 px-2 text-center">Practical (/10)</th>
                            )}
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Marks Obtained</th>
                            <th className="py-2.5 px-3 text-right">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs font-semibold">
                          {result.subjects.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-2 text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 text-slate-950 font-bold">{s.subject}</td>
                              {result.subjects.some((sub) => sub.notebook !== null) && (
                                <td className="py-2.5 px-2 text-center text-slate-700">
                                  {s.notebook !== null ? s.notebook : "-"}
                                </td>
                              )}
                              {result.subjects.some((sub) => sub.subjectEnrichment !== null) && (
                                <td className="py-2.5 px-2 text-center text-slate-700">
                                  {s.subjectEnrichment !== null ? s.subjectEnrichment : "-"}
                                </td>
                              )}
                              {result.subjects.some((sub) => sub.practical !== null) && (
                                <td className="py-2.5 px-2 text-center text-slate-700">
                                  {s.practical !== null ? s.practical : "-"}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 whitespace-nowrap text-xs min-w-[64px]">
                                  {s.marksObtained} / {s.maxMarks}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-[11px] text-slate-600 font-normal">
                                {s.remarks || "Good"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Aggregate Summary Box */}
                    <div className="mt-4 sm:mt-6 p-3.5 sm:p-4 rounded-xl bg-slate-900 text-white flex flex-row items-center justify-between gap-3 border border-slate-800">
                      <div>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                          Total Marks Obtained
                        </span>
                        <div className="text-base sm:text-xl font-black text-white mt-0.5">
                          {result.summary.totalObtained}{" "}
                          <span className="text-xs sm:text-sm font-normal text-slate-300">
                            / {result.summary.totalMax}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                          Aggregate Percentage
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-emerald-400">
                          {result.summary.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Institution Seal & Signature Footer */}
              <div className="p-4 sm:p-6 border-t-2 border-slate-800 bg-slate-50 text-xs text-slate-600 flex flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900 text-[10px] sm:text-xs">Official School Slip:</p>
                  <p className="mt-0.5 text-[9px] sm:text-[10px] leading-relaxed max-w-xs text-slate-500">
                    Digitally generated academic performance card for parent records.
                  </p>
                </div>

                <div className="text-center shrink-0">
                  <div className="h-8 border-b border-dashed border-slate-400 w-28 sm:w-36 mb-1" />
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-slate-600">
                    Principal Signature / Seal
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
