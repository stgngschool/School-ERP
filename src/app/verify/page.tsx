"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Printer,
  User,
  ArrowLeft,
  QrCode,
  Lock,
  Check,
} from "lucide-react";
import { formatP, formatCompactParticulars, getGroupedReceiptItems } from "@/lib/receipts";

function VerifyContent() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id") || "";
  const tokenFromUrl = searchParams.get("t") || searchParams.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [isSecurityBlocked, setIsSecurityBlocked] = useState<boolean>(false);

  const fetchReceipt = async (id: string, token: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError("");
    setIsSecurityBlocked(false);
    setData(null);

    try {
      const res = await fetch(
        `/api/verify-receipt?id=${encodeURIComponent(id.trim())}&t=${encodeURIComponent(token.trim())}`
      );
      const json = await res.json();
      if (!res.ok || !json.verified) {
        setError(json.error || "Receipt could not be verified. Please scan a valid receipt QR code.");
        if (json.securityBlocked) {
          setIsSecurityBlocked(true);
        }
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to verification server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idFromUrl) {
      fetchReceipt(idFromUrl, tokenFromUrl);
    }
  }, [idFromUrl, tokenFromUrl]);

  const receipt = data?.receipt;
  const school = data?.school;
  const groupedItems = receipt?.items ? getGroupedReceiptItems(receipt.items) : [];
  const students = receipt?.students || [];
  const isMultiChild = students.length > 1;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 py-3 sm:py-8 px-2.5 sm:px-6">
      {/* Dedicated Print Override */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-verified-voucher, #printable-verified-voucher * {
            visibility: visible !important;
          }
          #printable-verified-voucher {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            border: 2px solid #059669 !important;
            border-radius: 10px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
        {/* Navigation & Header Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to School
          </Link>
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-xl">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Official Verification Portal
          </div>
        </div>

        {/* Secure Privacy Banner / Prompt when no receipt ID is passed */}
        {!idFromUrl && !loading && (
          <div className="no-print bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-2xs">
              <QrCode className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                Scan Voucher QR to Verify
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                To protect student privacy and prevent unauthorized access to financial records, manual receipt searches are disabled.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold text-slate-600">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Scan the verification QR code printed on the physical fee voucher
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3 animate-pulse shadow-sm">
            <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
              <ShieldCheck className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="text-sm font-black text-slate-800">Verifying Digital Ledger Records...</h4>
            <p className="text-xs text-slate-400">Authenticating tamper-proof cryptographic audit stamp...</p>
          </div>
        )}

        {/* Security Access Blocked State (URL Tampering / Missing Token) */}
        {!loading && error && isSecurityBlocked && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-rose-300 text-center space-y-4 shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="inline-block bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Security Access Blocked • सुरक्षा अवरोध
              </span>
              <h4 className="text-base sm:text-lg font-black text-slate-900">
                Unauthorized Access / URL Modification Blocked
              </h4>
              <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                {error}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 max-w-md mx-auto text-left text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Student Privacy & Data Protection Policy</span>
              </div>
              <p className="text-slate-500 text-[10.5px] leading-relaxed">
                Receipt numbers cannot be modified or browsed manually in the web browser address bar. Each receipt is cryptographically locked and can only be opened by scanning its authentic physical QR code.
              </p>
            </div>
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to School Portal
              </Link>
            </div>
          </div>
        )}

        {/* Standard Error State (e.g. Receipt Not Found) */}
        {!loading && error && !isSecurityBlocked && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 sm:p-6 text-center space-y-2.5 shadow-sm">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600 mx-auto" />
            <h4 className="text-sm font-black text-rose-900">Verification Failed</h4>
            <p className="text-xs font-semibold text-rose-700 max-w-md mx-auto">{error}</p>
            <p className="text-[10.5px] sm:text-[11px] text-rose-500 font-medium">
              Please ensure the receipt number or QR code scanned is accurate and issued by the institution.
            </p>
          </div>
        )}

        {/* Mobile / Screen Authenticated Hero Card (Hidden when printed) */}
        {!loading && data?.verified && receipt && (
          <div className="no-print bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-3 sm:p-4 shadow-lg shadow-emerald-700/15 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                  <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase leading-tight">
                    QR Scan Verified • Official Record
                  </h3>
                </div>
                <p className="text-[10px] sm:text-xs text-emerald-100 font-medium leading-tight line-clamp-1 sm:line-clamp-none mt-0.5">
                  Receipt <span className="font-mono font-black text-white">{receipt.receiptNo}</span> is verified against St. GNG School ledger.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 border border-emerald-200/60"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <span className="text-emerald-950 font-black text-xs">Print Copy</span>
            </button>
          </div>
        )}

        {/* Verified Receipt Record (Printed / Audited Document) */}
        {!loading && data?.verified && receipt && (
          <div
            id="printable-verified-voucher"
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden space-y-3 sm:space-y-4 p-3.5 sm:p-7 relative"
          >
            {/* Security Background Watermark (Distinguishes from physical counter receipt) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03] select-none">
              <div className="transform -rotate-45 text-center font-black text-emerald-950 uppercase tracking-widest leading-tight text-4xl sm:text-6xl">
                QR SCAN VERIFIED RECORD<br />ST. GNG SCHOOL<br />OFFICIAL LEDGER
              </div>
            </div>

            {/* 1. Official Digital Audit Record Header Ribbon (Visible in Print & Screen) */}
            <div className="bg-emerald-50/90 border-2 border-emerald-500/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs relative z-10">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                      Official QR-Scanned Verification Record
                    </span>
                    <span className="bg-emerald-600 text-white text-[7.5px] sm:text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      स्कैन-सत्यापित प्रति
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-emerald-800 font-semibold leading-tight mt-0.5">
                    Authenticated via St. GNG School QR Security System • Reconciled in Institutional Ledger
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 hidden xs:block">
                <div className="inline-flex items-center gap-1 bg-white border border-emerald-300 px-2 py-0.5 rounded-lg text-[8.5px] font-black text-emerald-800 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE VERIFIED
                </div>
              </div>
            </div>

            {/* 2. School Header with Official Logo & Digital Audit Badge */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 sm:pb-3 gap-2 relative z-10">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <img
                  src="/logo.png"
                  alt="School Logo"
                  className="w-11 h-11 sm:w-14 sm:h-14 object-contain shrink-0"
                />
                <div className="space-y-0.5 min-w-0">
                  <h2 className="text-sm sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-tight truncate sm:whitespace-normal">
                    {school?.name || "ST. GNG SCHOOL"}
                  </h2>
                  <p className="text-[9px] sm:text-xs text-slate-600 font-semibold leading-tight line-clamp-1 sm:line-clamp-none">
                    {school?.address || "Salarpur, Rasulgarh, Varanasi - 221007"}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-bold leading-tight">
                    Phone: {school?.phone || "9452824318"} <span className="hidden xs:inline">| Email: {school?.email || "stgng2005@gmail.com"}</span>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block bg-emerald-800 text-white font-black uppercase rounded-md tracking-wider text-[7.5px] sm:text-[8.5px] px-2 sm:px-2.5 py-0.5 sm:py-1 shadow-2xs border border-emerald-700">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    <span>Digital Audit Copy</span>
                  </div>
                </div>
                <p className="text-slate-600 font-bold text-[8.5px] sm:text-[9px] mt-0.5 sm:mt-1">
                  Verified Receipt: <span className="font-black text-slate-950 font-mono text-[9px] sm:text-[9.5px]">{receipt.receiptNo}</span>
                </p>
                {receipt.manualReceiptNo && (
                  <p className="text-indigo-700 font-bold text-[8px] sm:text-[8.5px] bg-indigo-50 border border-indigo-100 px-1 sm:px-1.5 py-0.5 rounded inline-block">
                    Book Rec #: <span className="font-black text-indigo-950 font-mono">{receipt.manualReceiptNo}</span>
                  </p>
                )}
                <p className="text-slate-500 font-bold text-[8px] sm:text-[8.5px] block">
                  Issue Date: <span className="font-extrabold text-slate-800">{receipt.date}</span>
                </p>
              </div>
            </div>

            {/* 3. Student(s) Information (UI Matched to Official Voucher) */}
            {isMultiChild ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[9px]">
                  <span className="font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    Registered Wards / Siblings ({students.length})
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    Unified Family Voucher
                  </span>
                </div>
                <div className="overflow-x-auto scrollbar-none">
                  <table className="w-full text-left border-collapse min-w-[320px] sm:min-w-0">
                    <thead>
                      <tr className="bg-white/90 text-slate-500 font-extrabold uppercase border-b border-slate-200/70 text-[8px] sm:text-[8.5px]">
                        <th className="py-1 px-2.5 sm:px-3 w-6 text-slate-400">#</th>
                        <th className="py-1 px-2.5 sm:px-3">Student Name</th>
                        <th className="py-1 px-2 sm:px-3">Class & Sec</th>
                        <th className="py-1 px-2 sm:px-3">Roll No</th>
                        <th className="py-1 px-2.5 sm:px-3.5 text-right">Admission ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 font-semibold text-slate-800 text-[9.5px] sm:text-[10px]">
                      {students.map((s: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100/40">
                          <td className="py-1 px-2.5 sm:px-3 text-slate-400 font-bold w-6">{idx + 1}</td>
                          <td className="py-1 px-2.5 sm:px-3 font-black text-slate-900">{s.name}</td>
                          <td className="py-1 px-2 sm:px-3 font-bold text-indigo-900">{s.classSection || "—"}</td>
                          <td className="py-1 px-2 sm:px-3 font-bold text-slate-700">{s.rollNo || "—"}</td>
                          <td className="py-1 px-2.5 sm:px-3.5 text-right font-extrabold text-slate-900 font-mono">{s.admissionNo || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-100/70 px-3 py-1.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-1.5 text-[8.5px] sm:text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Father / Guardian:</span>
                    <span className="font-extrabold text-slate-900">{receipt.fatherName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Payment Mode:</span>
                    <span className="font-extrabold text-slate-900 uppercase">
                      {receipt.paymentMethod} {receipt.transactionRef ? `(${receipt.transactionRef})` : "Counter"}
                    </span>
                  </div>
                </div>
              </div>
            ) : students.length === 1 ? (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 text-xs">
                <div>
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Student Name</span>
                  <span className="font-black text-slate-900 text-xs sm:text-sm">{students[0].name}</span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Class & Section</span>
                  <span className="font-extrabold text-indigo-900 text-xs sm:text-sm">{students[0].classSection || "—"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Roll Number</span>
                  <span className="font-bold text-slate-800 text-xs">{students[0].rollNo || "—"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Admission ID</span>
                  <span className="font-black text-slate-900 font-mono text-xs">{students[0].admissionNo || "—"}</span>
                </div>
                {receipt.fatherName && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-600 font-bold">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Father / Guardian:</span>
                    <span className="text-slate-900 font-black">{receipt.fatherName}</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* 4. Itemized Fee Breakdown (UI Matched to Official Voucher) */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-600 font-black uppercase tracking-wider border-b border-slate-200 text-[8.5px] sm:text-[9px]">
                    <th className="py-1.5 px-2.5 sm:px-3 w-6 text-slate-400">#</th>
                    <th className="py-1.5 px-2.5 sm:px-3">Fee Particulars</th>
                    <th className="py-1.5 px-2.5 sm:px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 text-xs">
                  {groupedItems.length > 0 ? (
                    groupedItems.map((item: any, idx: number) => {
                      const rawParticular = (item.baseParticular || item.name || "")
                        .replace(new RegExp(`^${item.studentPrefix}[:\\s-]*`, "i"), "")
                        .replace(/^[A-Za-z\s]+:\s*/, "")
                        .trim() || item.baseParticular || item.name;
                      const cleanParticular = formatCompactParticulars(rawParticular);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2.5 sm:px-3 text-slate-400 font-bold w-6">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 sm:px-3">
                            {item.studentPrefix ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] sm:text-[8.5px] font-black uppercase tracking-tight shrink-0">
                                  {item.studentPrefix}
                                </span>
                                <span className="font-bold text-slate-900 leading-tight text-[11px] sm:text-xs">
                                  {cleanParticular}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-900 text-[11px] sm:text-xs">{formatCompactParticulars(item.name || "")}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 sm:px-3 text-right text-slate-900 font-black font-mono text-xs sm:text-sm whitespace-nowrap">
                            {formatP(item.amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="py-1.5 px-2.5 sm:px-3 text-slate-400 font-bold w-6">1</td>
                      <td className="py-1.5 px-2.5 sm:px-3 font-bold text-slate-800 text-[11px] sm:text-xs">Fee Payment</td>
                      <td className="py-1.5 px-2.5 sm:px-3 text-right text-slate-900 font-black font-mono text-xs sm:text-sm whitespace-nowrap">
                        {formatP(receipt.amount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Totals & Payment Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 items-start">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 space-y-1.5">
                <span className="text-[8.5px] sm:text-[9px] font-black uppercase text-slate-400 block">Amount in Words</span>
                <p className="text-[11px] sm:text-xs font-black text-slate-900 italic leading-snug">
                  {receipt.amountInWords}
                </p>
                <div className="border-t border-slate-200/80 pt-1 text-[9.5px] sm:text-[10px] text-slate-500 font-bold space-y-0.5">
                  <p>
                    Payment Mode: <span className="font-black text-slate-900 uppercase">{receipt.paymentMethod}</span>
                  </p>
                  {receipt.transactionRef && (
                    <p className="break-all font-mono text-[8.5px] sm:text-[9px] text-slate-700">
                      Ref / UTR: <span className="font-bold">{receipt.transactionRef}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 space-y-1 text-xs text-right">
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-800">{formatP(receipt.subtotal)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between text-indigo-600 font-bold">
                    <span>Total Concession:</span>
                    <span className="font-mono font-black">-{formatP(receipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-800 font-black border-t border-slate-300 pt-1 text-xs sm:text-sm">
                  <span>Total Paid:</span>
                  <span className="font-mono text-sm sm:text-base font-black text-emerald-700">{formatP(receipt.amount)}</span>
                </div>
                {receipt.arrears > 0 ? (
                  <div className="flex justify-between items-center text-rose-700 font-black border-t border-rose-200 pt-1 text-[10.5px] sm:text-[11px]">
                    <span>Total Remaining Dues:</span>
                    <span className="font-mono font-black">{formatP(receipt.arrears)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-emerald-700 font-bold border-t border-emerald-200 pt-1 text-[10px]">
                    <span>Remaining Balance:</span>
                    <span className="font-mono font-black">Nil (Settled)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Official Digital Audit & Verification Stamp (Visible in Print & Screen) */}
            <div className="border-2 border-emerald-300/80 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50/80 rounded-2xl p-3 sm:p-4 space-y-2.5 shadow-2xs relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Official Circular Stamp Badge */}
                  <div className="w-11 h-11 rounded-full border-2 border-dashed border-emerald-600 bg-white flex flex-col items-center justify-center text-emerald-700 shrink-0 shadow-sm p-1">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span className="text-[6px] font-black uppercase text-emerald-800 tracking-tighter leading-none mt-0.5">VERIFIED</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-tight">
                        Digitally Certified & Sealed by {school?.name || "St. GNG School"}
                      </h4>
                      <span className="bg-emerald-600 text-white text-[7px] sm:text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Online Proof
                      </span>
                    </div>
                    <p className="text-[9px] sm:text-[9.5px] text-slate-600 font-semibold">
                      Certified True Record retrieved from Institutional Financial Ledger
                    </p>
                    <p className="text-[8.5px] sm:text-[9px] text-slate-500 font-medium">
                      Authorized Cashier: <span className="font-bold text-slate-800">{receipt.collectedBy} ({receipt.collectedByRole})</span>
                    </p>
                  </div>
                </div>

                {/* Live Verification Stamp Metadata */}
                <div className="bg-white border border-emerald-200/90 rounded-xl px-3 py-1.5 text-left sm:text-right shrink-0 shadow-2xs space-y-0.5">
                  <div className="text-[8px] font-black uppercase tracking-wider text-emerald-700 flex items-center sm:justify-end gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Scan Verification Time</span>
                  </div>
                  <p className="font-mono text-[9.5px] sm:text-[10px] font-black text-slate-900">
                    {data.verifiedAt}
                  </p>
                  <p className="text-[7.5px] sm:text-[8px] text-emerald-600 font-bold">
                    Ledger State: VALID & RECONCILED
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap items-center justify-between gap-1 text-[8px] sm:text-[8.5px] text-slate-500 font-medium">
                <span>🔒 Scan-Authenticated Digital Document • Valid for official verification and record-keeping</span>
                <span className="font-mono text-slate-400">Ledger UID: {receipt.receiptNo}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-indigo-600 animate-pulse mx-auto" />
            <p className="text-xs font-black text-slate-700">Loading Official Verification Portal...</p>
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
