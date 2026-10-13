"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Printer, X, CheckCircle2, AlertCircle, ShieldCheck, Share2, Loader2, Sparkles, Award } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { formatP, numberToIndianWords } from "@/lib/currency";
import { getGroupedReceiptItems, getReceiptStudents, formatCompactParticulars, generateReceiptSecurityToken } from "@/lib/receipts";

interface PrintReceiptModalProps {
  show: boolean;
  onClose: () => void;
  activeReceipt: any;
  schoolInfo: any;
  user?: any;
  onSendWhatsApp: (receipt: any) => void;
}

export default function PrintReceiptModal({
  show,
  onClose,
  activeReceipt,
  schoolInfo,
  user,
  onSendWhatsApp,
}: PrintReceiptModalProps) {
  const [mounted, setMounted] = useState(false);
  const [receiptPageSize, setReceiptPageSize] = useState<"A4" | "A5">("A5");
  const [verifyQrUrl, setVerifyQrUrl] = useState<string>("");
  const [upiQrUrl, setUpiQrUrl] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!activeReceipt) return;

    // 1. Verification QR: Encodes URL to public web verification page with cryptographic token
    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
    const token = generateReceiptSecurityToken(activeReceipt.receiptNo);
    const verifyPayload = `${origin}/verify?id=${encodeURIComponent(activeReceipt.receiptNo)}&t=${token}`;

    QRCode.toDataURL(verifyPayload, {
      width: 320,
      margin: 1.5,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setVerifyQrUrl(url))
      .catch((err) => console.error("Error generating verify QR:", err));

    // 2. Fixed-Amount UPI QR Code
    const isUpiPayment = Boolean(
      activeReceipt.method?.toUpperCase() === "UPI" ||
      activeReceipt.paymentMethod?.toUpperCase() === "UPI" ||
      (activeReceipt.transactionRef && /upi|gpay|phonepe|paytm|bhim/i.test(activeReceipt.transactionRef)) ||
      (activeReceipt.remarks && /upi/i.test(activeReceipt.remarks))
    );

    if (isUpiPayment) {
      const upiId = activeReceipt.upiId || schoolInfo?.upiId || "8423926608@upi";
      const merchant = activeReceipt.upiMerchantName || schoolInfo?.upiMerchantName || schoolInfo?.name || "St. GNG School";
      const rupeeAmount = (Number(activeReceipt.amount || 0) / 100).toFixed(2);
      const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        merchant
      )}&am=${rupeeAmount}&cu=INR&tn=${encodeURIComponent(
        "Fee Payment " + (activeReceipt.receiptNo || "")
      )}`;

      QRCode.toDataURL(upiPayload, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: "M",
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setUpiQrUrl(url))
        .catch((err) => console.error("Error generating UPI QR:", err));
    } else {
      setUpiQrUrl("");
    }
  }, [activeReceipt, user, schoolInfo]);

  if (!show || !activeReceipt || !mounted) return null;

  const students = getReceiptStudents(activeReceipt);
  const isMultiChild = students.length > 1;
  const isCompactSiblings = students.length >= 2;
  const groupedItems = getGroupedReceiptItems(activeReceipt.items || []);
  const isCompactFeeTable = groupedItems.length >= 3 || students.length >= 2;
  const hasDiscounts = (activeReceipt.discount || 0) > 0 || groupedItems.some((i: any) => (i.discount || 0) > 0);

  // Premium Receipt Detection:
  // Qualifying condition: Touches March (academic session end) AND covers > 3 months (e.g. 4+ months like Dec to March, May to March)
  let isPremiumReceipt = false;
  if (activeReceipt) {
    const allTexts: string[] = [
      activeReceipt.details || "",
      activeReceipt.remarks || "",
      ...groupedItems.map((i: any) => `${i.name || ""} ${i.baseParticular || ""} ${i.description || ""}`),
    ];
    const combined = allTexts.join(" ").toLowerCase();

    // 1. Must touch March (academic year end)
    const touchesMarch = /\b(to\s+march|to\s+mar|thru\s+march|-mar|-march|upto\s+march|\bmarch\b|\bmar\b)/i.test(combined);
    if (touchesMarch) {
      // 2. Check explicit month count in brackets e.g. [11 Months] or (11 Months)
      const monthMatch = combined.match(/\[(\d+)\s*months?\]/) || combined.match(/\((\d+)\s*months?\)/);
      if (monthMatch && monthMatch[1]) {
        isPremiumReceipt = parseInt(monthMatch[1], 10) > 3;
      } else {
        // 3. Check starting month to March:
        // Qualifying start months (> 3 months ending in March):
        // April to March (12), May to March (11), June to March (10), July to March (9),
        // Aug to March (8), Sept to March (7), Oct to March (6), Nov to March (5), Dec to March (4)
        // Non-qualifying: Jan to March (3), Feb to March (2)
        const qualifyingStartPattern = /\b(april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s*(to|-|\/)\s*(march|mar)\b/i;
        if (qualifyingStartPattern.test(combined)) {
          isPremiumReceipt = true;
        } else if (Array.isArray(activeReceipt.months)) {
          const hasMarch = activeReceipt.months.some((m: string) => /mar/i.test(m));
          if (hasMarch && activeReceipt.months.length > 3) {
            isPremiumReceipt = true;
          }
        }
      }
    }
  }

  // Build the receipt as a PDF file. On mobile it opens the native share sheet
  // (WhatsApp / contacts / anywhere); on desktop (or if share is unavailable) it
  // falls back to a direct download named "Receipt-<no>-<student>.pdf".
  const handleGeneratePdf = async (shareOnMobile: boolean = false) => {
    const receiptElement = document.getElementById("receipt-print-area");
    if (!receiptElement) return;

    setIsGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas-pro");

      const canvas = await (html2canvas as any)(receiptElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      const isA5 = receiptPageSize === "A5";
      const pdf = new jsPDF({
        orientation: isA5 ? "landscape" : "portrait",
        unit: "mm",
        format: isA5 ? "a5" : "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = isA5 ? 5 : 8;
      const maxPdfWidth = pageWidth - margin * 2;
      const maxPdfHeight = pageHeight - margin * 2;

      const ratio = canvas.width / canvas.height;

      let imgWidth = maxPdfWidth;
      let imgHeight = maxPdfWidth / ratio;

      if (imgHeight > maxPdfHeight) {
        imgHeight = maxPdfHeight;
        imgWidth = maxPdfHeight * ratio;
      }

      const xOffset = margin + (maxPdfWidth - imgWidth) / 2;
      const yOffset = margin + (maxPdfHeight - imgHeight) / 2;

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST");

      const studentNameClean = (students[0]?.name || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `Receipt-${activeReceipt.receiptNo}-${studentNameClean}.pdf`;

      if (shareOnMobile && typeof navigator !== "undefined" && typeof navigator.share === "function") {
        const pdfBlob = pdf.output("blob");
        const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Fee Receipt ${activeReceipt.receiptNo}`,
            text: `Official Fee Receipt for ${students[0]?.name || "Student"} - ${schoolInfo.name || "St. GNG School"}`,
          });
          return;
        }
      }

      // Fallback to direct download (desktop or no share support)
      pdf.save(fileName);
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error("PDF generation error:", error);
        alert("Unable to generate PDF. Please use Print to save as PDF.");
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const modalContent = (
    <div id="gng-receipt-print-portal">
      <div className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 modal-backdrop-optimized animate-in fade-in duration-200">
        <div className="receipt-modal-dialog flex max-h-[94vh] w-full max-w-4xl flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:p-4">
          {/* Modal Header & Page Size Switcher */}
          <div className="receipt-modal-header no-print flex flex-col justify-between gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
              <div>
                <h3 className="text-[13px] font-black uppercase tracking-wide text-slate-800">
                  Official Payment Voucher
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Instant voucher preview & print layout
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setReceiptPageSize("A5")}
                className={`py-1 px-2.5 sm:px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${receiptPageSize === "A5"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
              >
                📄 A5 <span className="hidden sm:inline">Compact</span> (Half Page)
              </button>
              <button
                type="button"
                onClick={() => setReceiptPageSize("A4")}
                className={`py-1 px-2.5 sm:px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${receiptPageSize === "A4"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
              >
                📄 A4 <span className="hidden sm:inline">Standard</span> (Full Page)
              </button>
            </div>
          </div>

          {/* Single-Page Clean Print Styling Override */}
          <style>{`
            @media print {
              @page {
                size: ${receiptPageSize === "A5" ? "A5 landscape" : "A4 portrait"};
                margin: ${receiptPageSize === "A5" ? "2.5mm" : "8mm 10mm"};
              }

              /* Clean printable root document */
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }

              /* HIDE ENTIRE APP FRAME: Collapses background dashboard so only receipt voucher prints */
              body > *:not(#gng-receipt-print-portal) {
                display: none !important;
                visibility: hidden !important;
              }

              /* Reveal ONLY the voucher portal */
              #gng-receipt-print-portal {
                display: block !important;
                position: static !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: transparent !important;
                visibility: visible !important;
              }

              /* Strip ALL modal backdrop and dialog isolation constraints */
              .receipt-modal-backdrop,
              .receipt-modal-dialog {
                all: unset !important;
                display: block !important;
                position: static !important;
                contain: none !important;
                transform: none !important;
                filter: none !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                opacity: 1 !important;
                background: transparent !important;
                overflow: hidden !important;
                max-height: none !important;
                max-width: 100% !important;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }

              .no-print,
              .receipt-modal-actions {
                display: none !important;
                visibility: hidden !important;
              }

              /* Strictly display receipt voucher canvas on 1 single page */
              #receipt-print-area,
              #receipt-print-area * {
                visibility: visible !important;
                color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              #receipt-print-area {
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: ${receiptPageSize === "A5" ? "138mm" : "none"} !important;
                margin: 0 auto !important;
                padding: ${receiptPageSize === "A5" ? "4.5mm 5.5mm" : "18px 22px"} !important;
                border: ${isPremiumReceipt ? "1.5px solid #d97706" : "1px solid #cbd5e1"} !important;
                border-radius: 8px !important;
                box-shadow: none !important;
                background: #ffffff !important;
                box-sizing: border-box !important;
                gap: ${receiptPageSize === "A5" ? "2.2mm" : "8px"} !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-before: avoid !important;
                break-before: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                overflow: hidden !important;
              }

              /* Kill Tailwind space-y-* margin-top so gap controls spacing */
              #receipt-print-area > * + * {
                margin-top: 0 !important;
              }

              /* Natural table sizing without artificial stretching */
              .receipt-fee-table-container {
                flex: none !important;
                display: block !important;
                width: 100% !important;
                min-height: auto !important;
                overflow: hidden !important;
                border-radius: 8px !important;
              }

              .receipt-fee-table-container table {
                width: 100% !important;
                border-collapse: separate !important;
                border-spacing: 0 !important;
                transform: none !important;
              }

              .receipt-scroll-container {
                overflow: visible !important;
                width: 100% !important;
                padding: 0 !important;
                border: none !important;
                background: transparent !important;
              }
            }
          `}</style>

          {/* Mobile Horizontal Scroll Helper Banner */}
          <div className="no-print sm:hidden flex items-center justify-between px-3 py-1.5 bg-slate-100/90 rounded-xl text-[10px] text-slate-500 font-semibold border border-slate-200/60">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              ↔ Swipe to view complete voucher
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Official Layout</span>
          </div>

          {/* Printable Receipt Canvas with Mobile Pan Container */}
          <div className="receipt-scroll-container w-full overflow-x-auto pb-2 pt-0.5 rounded-2xl border border-slate-200/80 sm:border-0 bg-slate-50/50 sm:bg-transparent p-1 sm:p-0">
            <div
              id="receipt-print-area"
              className={`border rounded-xl bg-white text-slate-900 shadow-sm relative flex flex-col min-w-[550px] sm:min-w-0 transition-all ${
                isPremiumReceipt
                  ? "border-amber-500/90 shadow-amber-500/10 ring-1 ring-amber-400/40"
                  : "border-slate-300"
              } ${
                receiptPageSize === "A5"
                  ? "p-3.5 sm:p-4 gap-2.5 text-[10.5px]"
                  : "p-4 sm:p-5 gap-3.5 text-xs"
              }`}
            >
              {/* 1. Header: School Info, Verification QR & Official Badges (Thin Elegant Divider) */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="School Logo"
                    className="object-contain shrink-0 h-11 w-11"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 uppercase tracking-tight leading-none text-lg">
                        {schoolInfo.name || "ST. GNG SCHOOL"}
                      </h4>
                      {isPremiumReceipt && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[7px] font-black uppercase rounded tracking-wider shrink-0">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          Honor Seal
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 font-semibold leading-tight text-[9.5px] max-w-[420px]">
                      {schoolInfo.address || "Salarpur, Rasulgarh, Varanasi - 221007"}
                    </p>
                    <p className="text-slate-500 font-bold text-[8px] leading-tight">
                      Phone: {schoolInfo.phone || "9452824318"} | Email: {schoolInfo.email || "stgng2005@gmail.com"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Verification Online QR Code (Optimized Size for Rapid Mobile Scanning) */}
                  <div className="flex flex-col items-center">
                    {verifyQrUrl ? (
                      <img
                        src={verifyQrUrl}
                        alt="Scan to Verify Online"
                        className={`object-contain ${
                          receiptPageSize === "A5" ? "w-[68px] h-[68px]" : "w-[78px] h-[78px]"
                        }`}
                      />
                    ) : (
                      <div
                        className={`bg-slate-100 animate-pulse rounded ${
                          receiptPageSize === "A5" ? "w-[68px] h-[68px]" : "w-[78px] h-[78px]"
                        }`}
                      />
                    )}
                    <span className="font-black uppercase text-slate-500 tracking-wider block text-[7.5px] mt-0.5 leading-none">
                      Scan to Verify
                    </span>
                  </div>

                  {/* Receipt Metadata Header Block */}
                  <div className="text-right space-y-0.5">
                    {isPremiumReceipt ? (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-700 via-amber-800 to-indigo-950 text-amber-200 border border-amber-400/60 font-black uppercase rounded tracking-wider text-[8px] px-2 py-0.5 shadow-xs">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        PREMIUM FEE VOUCHER
                      </span>
                    ) : (
                      <span className="bg-slate-900 text-white font-black uppercase rounded tracking-wider text-[8.5px] px-2 py-0.5 inline-block">
                        OFFICIAL FEE RECEIPT
                      </span>
                    )}
                    <p className="text-slate-600 font-bold text-[9px] mt-0.5">
                      Receipt No: <span className="font-black text-slate-950 font-mono">{activeReceipt.receiptNo}</span>
                    </p>
                    {activeReceipt.manualReceiptNo && (
                      <p className="text-indigo-700 font-bold text-[8.5px] bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded inline-block">
                        Book Rec #: <span className="font-black text-indigo-950 font-mono">{activeReceipt.manualReceiptNo}</span>
                      </p>
                    )}
                    <p className="text-slate-400 font-bold text-[8.5px] block">
                      Date: <span className="font-extrabold text-slate-800">{activeReceipt.createdAt}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Adaptive Student Information Section */}
              {isMultiChild ? (
                /* Compact Multi-Child Sibling Strip */
                <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50/70">
                  <div className="bg-slate-100/90 px-3 py-1 border-b border-slate-200 flex flex-wrap items-center justify-between text-[8.5px] sm:text-[9px] gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></span>
                      <span className="font-black uppercase tracking-wider text-slate-800">
                        Registered Wards / Siblings ({students.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-bold">
                      <div>
                        Father: <span className="font-black text-slate-900">{activeReceipt.fatherName || "—"}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div>
                        Payment: <span className="font-black text-slate-900 uppercase">
                          {activeReceipt.method || activeReceipt.paymentMethod}{" "}
                          {activeReceipt.transactionRef ? `(${activeReceipt.transactionRef})` : "Counter"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sibling Columns Grid (Clean Numbers Without Box) */}
                  <div className={`grid ${students.length === 2 ? "grid-cols-2" : students.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"} divide-x divide-slate-200/70 bg-white`}>
                    {students.map((s, idx) => (
                      <div key={idx} className="p-1.5 px-3 text-[9px] flex items-center justify-between gap-1.5 min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-black text-indigo-700 text-[10.5px] shrink-0">
                            {idx + 1}.
                          </span>
                          <div className="truncate">
                            <p className="font-black text-slate-900 leading-tight truncate text-[10.5px]">{s.name}</p>
                            <p className="text-slate-500 font-semibold text-[8px] leading-none mt-0.5">
                              Class: <span className="text-indigo-950 font-black">{s.classSection || "—"}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 text-[7.5px] sm:text-[8px] font-bold text-slate-500 leading-tight">
                          <div>Roll: <span className="text-slate-800 font-black">{s.rollNo || "—"}</span></div>
                          <div>Adm: <span className="text-slate-800 font-black">{s.admissionNo || "—"}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Single Student Executive Strip */
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl py-1.5 px-3 text-[9.5px] flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Student:</span>
                    <span className="font-black text-slate-950 text-[11px]">{students[0]?.name || activeReceipt.studentName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Class:</span>
                    <span className="font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[9px]">
                      {students[0]?.classSection || activeReceipt.classSection || "—"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Roll:</span>
                    <span className="font-black text-slate-800">{students[0]?.rollNo || activeReceipt.rollNumber || activeReceipt.rollNo || "—"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 font-bold uppercase text-[8px]">Adm ID:</span>
                    <span className="font-black text-slate-800">{students[0]?.admissionNo || activeReceipt.admissionNo || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px]">Father:</span>{" "}
                      <span className="font-extrabold text-slate-900">{activeReceipt.fatherName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px]">Payment:</span>{" "}
                      <span className="font-extrabold text-slate-900 uppercase">
                        {activeReceipt.method || activeReceipt.paymentMethod}{" "}
                        {activeReceipt.transactionRef ? `(${activeReceipt.transactionRef})` : "Counter"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Itemized Fee Table (Perfect Rounded Curves & No Stuck Border Line) */}
              <div className="receipt-fee-table-container border border-slate-200/90 rounded-xl overflow-hidden bg-white isolate">
                <table className="w-full text-left border-separate border-spacing-0 [transform:none]">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-black uppercase tracking-wider text-[8.5px] sm:text-[9px]">
                      <th className="py-1.5 px-3 w-7 text-slate-400 border-b border-slate-200 rounded-tl-xl">#</th>
                      <th className="py-1.5 px-3 border-b border-slate-200">Fee Particulars</th>
                      <th className="py-1.5 px-3 text-right border-b border-slate-200">Billed Due</th>
                      {hasDiscounts && (
                        <th className="py-1.5 px-3 text-right text-indigo-700 border-b border-slate-200">RBT</th>
                      )}
                      <th className="py-1.5 px-3.5 text-right text-slate-900 border-b border-slate-200 rounded-tr-xl">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-800 text-[9.5px] sm:text-[10px]">
                    {groupedItems.length > 0 ? (
                      groupedItems.map((item: any, idx: number) => {
                        const rawParticular = (item.baseParticular || item.name || "")
                          .replace(new RegExp(`^${item.studentPrefix}[:\\s-]*`, "i"), "")
                          .replace(/^[A-Za-z\s]+:\s*/, "")
                          .trim() || item.baseParticular || item.name;
                        const cleanParticular = formatCompactParticulars(rawParticular);
                        const isLast = idx === groupedItems.length - 1;
                        const rowBorderCls = isLast ? "" : "border-b border-slate-100";

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className={`py-2 px-3 text-slate-400 font-bold w-7 ${rowBorderCls} ${isLast ? "rounded-bl-xl" : ""}`}>
                              {idx + 1}
                            </td>
                            <td className={`py-2 px-3 break-words ${rowBorderCls}`}>
                              {isMultiChild && item.studentPrefix ? (
                                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-tight shrink-0">
                                    {item.studentPrefix}
                                  </span>
                                  <span className="font-bold text-slate-900 leading-tight">
                                    {cleanParticular}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-slate-900 leading-tight">
                                  {cleanParticular || formatCompactParticulars(item.name || item.description || "")}
                                </span>
                              )}
                            </td>
                            <td className={`py-2 px-3 text-right text-slate-500 font-medium font-mono ${rowBorderCls}`}>
                              {formatP(item.originalAmount !== undefined ? item.originalAmount : item.amount)}
                            </td>
                            {hasDiscounts && (
                              <td className={`py-2 px-3 text-right text-indigo-600 font-bold font-mono ${rowBorderCls}`}>
                                {(item.discount || 0) > 0 ? formatP(item.discount) : "-"}
                              </td>
                            )}
                            <td className={`py-2 px-3.5 text-right text-slate-900 font-black font-mono ${rowBorderCls} ${isLast ? "rounded-br-xl" : ""}`}>
                              {formatP(item.amount)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-2.5 px-3 text-slate-400 font-bold rounded-bl-xl">1</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {activeReceipt.details || "Fee Payment"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-medium font-mono">
                          {formatP(activeReceipt.amount)}
                        </td>
                        {hasDiscounts && <td className="py-2.5 px-3 text-right text-indigo-600 font-mono">-</td>}
                        <td className="py-2.5 px-3.5 text-right text-slate-900 font-black font-mono rounded-br-xl">
                          {formatP(activeReceipt.amount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 4. Clean Unboxed Footer with Separated Arithmetic, UPI Settlement & Verification */}
              {(() => {
                const billedTarget = (activeReceipt.subtotal || activeReceipt.amount) - (activeReceipt.discount || 0);
                const isVoucherFullyPaid = activeReceipt.amount >= billedTarget;
                const isUpiPayment = Boolean(
                  activeReceipt.method?.toUpperCase() === "UPI" ||
                  activeReceipt.paymentMethod?.toUpperCase() === "UPI" ||
                  (activeReceipt.transactionRef && /upi|gpay|phonepe|paytm|bhim/i.test(activeReceipt.transactionRef)) ||
                  (activeReceipt.remarks && /upi/i.test(activeReceipt.remarks))
                );

                return (
                  <div className="grid grid-cols-12 gap-3 items-end pt-1.5">
                    {/* Left: Unboxed Words & Voucher Status */}
                    <div className={`${isUpiPayment ? "col-span-5" : "col-span-7"} flex flex-col justify-between py-1 space-y-2.5`}>
                      <div>
                        <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block">
                          Amount in Words:
                        </span>
                        <p className="font-black text-slate-900 italic text-[11.5px] sm:text-[12.5px] leading-snug mt-0.5">
                          {activeReceipt.amountInWords || numberToIndianWords(activeReceipt.amount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                          Voucher Status:
                        </span>
                        {isPremiumReceipt ? (
                          <span className="text-amber-900 font-extrabold text-[8.5px] flex items-center gap-1 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md">
                            <Award className="w-3 h-3 text-amber-600 shrink-0" /> Full Session Cleared (Up to March)
                          </span>
                        ) : activeReceipt.arrears === 0 ? (
                          <span className="text-emerald-700 font-extrabold text-[8.5px] flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> All Session Dues Settled (Nil)
                          </span>
                        ) : isVoucherFullyPaid ? (
                          <span className="text-emerald-700 font-extrabold text-[8.5px] flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Current Bill Cleared in Full
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold text-[8.5px] flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" /> Partial Payment Received
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Dynamic Fixed-Amount UPI QR Code */}
                    {isUpiPayment && (
                      <div className="col-span-3 flex flex-col items-center justify-center text-center self-center py-0.5 space-y-0.5">
                        <span className="font-black uppercase text-slate-500 tracking-wider leading-none block text-[7px]">
                          Scan to Pay via UPI
                        </span>
                        {upiQrUrl ? (
                          <img
                            src={upiQrUrl}
                            alt="Fixed Amount UPI QR"
                            className={`object-contain ${
                              receiptPageSize === "A5" ? "w-[68px] h-[68px]" : "w-[76px] h-[76px]"
                            }`}
                          />
                        ) : (
                          <div
                            className={`bg-slate-100 animate-pulse rounded ${
                              receiptPageSize === "A5" ? "w-[68px] h-[68px]" : "w-[76px] h-[76px]"
                            }`}
                          />
                        )}
                        <div className="leading-tight text-center">
                          <span className="font-mono font-black text-emerald-800 text-[10px] block">
                            {formatP(activeReceipt.amount)}
                          </span>
                          {activeReceipt.transactionRef && (
                            <p className="text-slate-600 font-bold text-[7px] leading-tight truncate max-w-[125px] mt-0.5">
                              Ref: {activeReceipt.transactionRef.replace(/^UPI\s*/i, "")}
                            </p>
                          )}
                          <p className="text-slate-400 font-semibold text-[6.5px] tracking-tight mt-0.5">
                            PhonePe • GPay • Paytm
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Right: Totals Card + Cashier Verification Block */}
                    <div className={`${isUpiPayment ? "col-span-4" : "col-span-5"} space-y-1.5`}>
                      {/* Totals Arithmetic Card */}
                      <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-2.5 sm:p-3 space-y-1 text-right text-[9.5px]">
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>Invoice Total:</span>
                          <span className="text-slate-800 font-mono font-bold">
                            {formatP(activeReceipt.subtotal || activeReceipt.amount)}
                          </span>
                        </div>
                        {activeReceipt.discount > 0 && (
                          <div className="flex justify-between items-center text-indigo-600 font-bold">
                            <span>Total RBT:</span>
                            <span className="font-mono">-{formatP(activeReceipt.discount)}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-300/80 pt-1 flex justify-between items-center text-emerald-850 font-black">
                          <span className="text-[9.5px] font-black">Total Paid:</span>
                          <span className="text-[13px] font-black text-emerald-700 font-mono">
                            {formatP(activeReceipt.amount)}
                          </span>
                        </div>
                        {activeReceipt.arrears > 0 ? (
                          <div className="flex justify-between items-center text-rose-700 font-black border-t border-rose-200/80 pt-0.5 text-[9px]">
                            <span>Total Remaining Dues:</span>
                            <span className="font-mono">{formatP(activeReceipt.arrears)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-emerald-700 font-bold border-t border-emerald-200/70 pt-0.5 text-[8.5px]">
                            <span>Remaining Balance:</span>
                            <span className="font-mono font-black">Nil (Cleared)</span>
                          </div>
                        )}
                      </div>

                      {/* Cashier / Verification Badge (Neatly placed under totals card) */}
                      <div className="flex items-center justify-between px-2 py-1 border border-slate-200/80 rounded-lg bg-slate-50/60">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[8px] font-black uppercase tracking-wider">System Verified</span>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-[10px] leading-tight">
                            {activeReceipt.collectedBy || user?.name || "Authorized Cashier"}
                          </p>
                          <p className="text-slate-400 font-bold uppercase text-[7px] tracking-wider leading-none mt-0.5">
                            {activeReceipt.collectedByRole || user?.role || "Finance Desk"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Modal Action Buttons — sticky bottom bar for easy reach on mobile */}
          <div className="receipt-modal-actions no-print sticky bottom-0 z-30 flex flex-col gap-2.5 border-t border-slate-200 bg-white/95 pt-3 pb-1 backdrop-blur-md sm:flex-row sm:items-center">
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-1">
              {/* 1. WhatsApp Share — direct text message redirect to parent's phone */}
              <button
                type="button"
                onClick={() => onSendWhatsApp(activeReceipt)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer hover:bg-emerald-700 sm:flex-1"
              >
                <WhatsAppIcon className="w-5 h-5 text-white shrink-0" />
                <span>WhatsApp Share</span>
              </button>

              {/* 2. Share Receipt — generates a PDF ("Receipt-...pdf") and opens the
                native share sheet (WhatsApp / anywhere); downloads it on desktop */}
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleGeneratePdf(true)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-indigo-600/20 transition-colors cursor-pointer hover:bg-indigo-700 disabled:opacity-50 sm:flex-1"
                title="Share the receipt PDF via WhatsApp or any app (downloads on desktop)"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                ) : (
                  <Share2 className="w-5 h-5 text-white shrink-0" />
                )}
                <span>Share Receipt</span>
              </button>

              {/* 3. Print Voucher */}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors cursor-pointer hover:bg-slate-50"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print</span>
              </button>
            </div>

            {/* 4. Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}
