"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Printer, X, CheckCircle2, AlertCircle, ShieldCheck, Share2, Loader2 } from "lucide-react";
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

    // A1: A printed receipt is an ALREADY-SETTLED payment, so we must NOT build a
    // payable NPCI `upi://pay` QR here — parents were re-scanning paid receipts and
    // getting prompted to pay the same amount again. The only machine-readable code
    // on a paid receipt is the (non-payable) Verification QR generated above. A
    // payable QR would belong only on an explicit pending demand / proforma challan.
  }, [activeReceipt, user, schoolInfo]);

  if (!show || !activeReceipt || !mounted) return null;

  const students = getReceiptStudents(activeReceipt);
  const isMultiChild = students.length > 1;
  const isCompactSiblings = students.length >= 3;
  const groupedItems = getGroupedReceiptItems(activeReceipt.items || []);
  const isCompactFeeTable = groupedItems.length >= 4 || students.length >= 3;
  const hasDiscounts = (activeReceipt.discount || 0) > 0 || groupedItems.some((i: any) => (i.discount || 0) > 0);

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
        <div className="receipt-modal-dialog bg-white rounded-3xl max-w-3xl w-full p-3.5 sm:p-5 shadow-2xl border border-slate-100 max-h-[94vh] overflow-y-auto space-y-3">
          {/* Modal Header & Page Size Switcher */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Official Payment Voucher
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Instant voucher preview & print layout
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setReceiptPageSize("A5")}
                className={`py-1 px-2.5 sm:px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                  receiptPageSize === "A5"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                📄 A5 <span className="hidden sm:inline">Compact</span> (Half Page)
              </button>
              <button
                type="button"
                onClick={() => setReceiptPageSize("A4")}
                className={`py-1 px-2.5 sm:px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                  receiptPageSize === "A4"
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
                margin: ${receiptPageSize === "A5" ? "4mm 5mm" : "8mm 10mm"};
              }

              /* Clean printable root document */
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
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
                height: auto !important;
                background: transparent !important;
                visibility: visible !important;
              }

              /* Strip ALL modal backdrop and dialog isolation constraints (fixes Chrome white preview bug) */
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
                overflow: visible !important;
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
              }

              #receipt-print-area {
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                max-height: none !important;
                margin: 0 auto !important;
                padding: ${receiptPageSize === "A5" ? "6px 10px" : "16px 20px"} !important;
                border: 1.5px solid #0f172a !important;
                border-radius: 8px !important;
                box-shadow: none !important;
                background: #ffffff !important;
                box-sizing: border-box !important;
                gap: ${receiptPageSize === "A5" ? "4px" : "8px"} !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-before: avoid !important;
                break-before: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Kill Tailwind space-y-* margin-top so gap controls spacing */
              #receipt-print-area > * + * {
                margin-top: 0 !important;
              }

              /* Keep every section intact on the single page (no mid-section splits) */
              #receipt-print-area > * {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              .receipt-fee-table-container table {
                width: 100% !important;
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
        <div className="sm:hidden flex items-center justify-between px-3 py-1.5 bg-slate-100/90 rounded-xl text-[10px] text-slate-500 font-semibold border border-slate-200/60">
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
            className={`border rounded-xl sm:rounded-2xl bg-white text-slate-900 shadow-sm relative flex flex-col min-w-[550px] sm:min-w-0 ${
              receiptPageSize === "A5"
                ? "border-slate-800 p-4 gap-3 text-[10.5px] min-h-[520px]"
                : "border-slate-300 p-5 gap-3.5 text-xs"
            }`}
          >
          {/* 1. Header: School Info & Voucher Badges */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="School Logo"
                className={`object-contain shrink-0 ${
                  receiptPageSize === "A5" ? "h-12 w-12" : "h-12 w-12"
                }`}
              />
              <div className="space-y-0.5">
                <h4
                  className={`font-black text-slate-900 uppercase tracking-tight leading-none ${
                    receiptPageSize === "A5" ? "text-lg font-black" : "text-xl font-black"
                  }`}
                >
                  {schoolInfo.name || "ST. GNG SCHOOL"}
                </h4>
                <p
                  className={`text-slate-600 font-semibold leading-tight break-words ${
                    receiptPageSize === "A5" ? "text-[9.5px] max-w-[420px]" : "text-[10px] max-w-[500px]"
                  }`}
                >
                  {schoolInfo.address || "Salarpur, Rasulgarh, Varanasi - 221007"}
                </p>
                <p
                  className={`text-slate-500 font-bold ${
                    receiptPageSize === "A5" ? "text-[7.5px]" : "text-[9.5px]"
                  }`}
                >
                  Phone: {schoolInfo.phone || "9452824318"} | Email: {schoolInfo.email || "stgng2005@gmail.com"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Top-Right Verification QR Code (Clean, Unboxed, Optimized Size for Mobile Scanning) */}
              <div className="flex flex-col items-center">
                {verifyQrUrl ? (
                  <img
                    src={verifyQrUrl}
                    alt="Scan to Verify Online"
                    className={`object-contain ${
                      receiptPageSize === "A5" ? "w-[68px] h-[68px]" : "w-[80px] h-[80px]"
                    }`}
                  />
                ) : (
                  <div
                    className={`bg-slate-100 animate-pulse rounded ${
                      receiptPageSize === "A5" ? "w-[68px] h-[68px]" : "w-[80px] h-[80px]"
                    }`}
                  />
                )}
                <span
                  className={`font-black uppercase text-slate-500 tracking-wider block mt-0.5 ${
                    receiptPageSize === "A5" ? "text-[7px]" : "text-[8px]"
                  }`}
                >
                  Scan to Verify Online
                </span>
              </div>

              {/* Receipt Metadata */}
              <div className="text-right space-y-0.5">
                <span className="bg-slate-900 text-white font-black uppercase rounded-md tracking-wider text-[8.5px] px-2 py-0.5 inline-block">
                  Official Fee Receipt
                </span>
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
            /* Multi-Child / Sibling Table View */
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div className={`bg-slate-100/90 px-3.5 border-b border-slate-200 flex items-center justify-between text-[9.5px] ${
                isCompactSiblings ? "py-1" : "py-1.5"
              }`}>
                <span className="font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  Registered Wards / Siblings ({students.length})
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  Unified Family Voucher
                </span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/90 text-slate-500 font-extrabold uppercase border-b border-slate-200/70 text-[9px]">
                    <th className={`${isCompactSiblings ? "py-1 px-2.5" : "py-1.5 px-3"} w-6 text-slate-400`}>#</th>
                    <th className={`${isCompactSiblings ? "py-1 px-2" : "py-1.5 px-2.5"}`}>Student Name</th>
                    <th className={`${isCompactSiblings ? "py-1 px-2" : "py-1.5 px-2.5"}`}>Class & Sec</th>
                    <th className={`${isCompactSiblings ? "py-1 px-2" : "py-1.5 px-2.5"}`}>Roll No</th>
                    <th className={`${isCompactSiblings ? "py-1 px-2.5" : "py-1.5 px-3"} text-right`}>Admission ID</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-200/50 font-semibold text-slate-800 ${
                  isCompactSiblings ? "text-[9px]" : "text-[10px]"
                }`}>
                  {students.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-100/40">
                      <td className={`${isCompactSiblings ? "py-0.5 px-2.5" : "py-1.5 px-3"} text-slate-400 font-bold w-6`}>{idx + 1}</td>
                      <td className={`${isCompactSiblings ? "py-0.5 px-2" : "py-1.5 px-2.5"} font-black text-slate-900 break-words`}>{s.name}</td>
                      <td className={`${isCompactSiblings ? "py-0.5 px-2" : "py-1.5 px-2.5"} font-bold text-indigo-950 break-words`}>{s.classSection || "—"}</td>
                      <td className={`${isCompactSiblings ? "py-0.5 px-2" : "py-1.5 px-2.5"} font-bold text-slate-700`}>{s.rollNo || "—"}</td>
                      <td className={`${isCompactSiblings ? "py-0.5 px-2.5" : "py-1.5 px-3"} text-right font-extrabold text-slate-800`}>{s.admissionNo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={`bg-slate-100/70 px-3.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[9.5px] ${
                isCompactSiblings ? "py-1" : "py-1.5"
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[8px]">Father / Guardian:</span>
                  <span className="font-extrabold text-slate-900">{activeReceipt.fatherName || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[8px]">Payment Mode & Ref:</span>
                  <span className="font-extrabold text-slate-900 uppercase">
                    {activeReceipt.method || activeReceipt.paymentMethod}{" "}
                    {activeReceipt.transactionRef ? `(${activeReceipt.transactionRef})` : "Counter"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Single Student Grid View */
            <div
              className={`grid grid-cols-3 bg-slate-50 border border-slate-200/90 rounded-xl gap-x-5 gap-y-2 ${
                receiptPageSize === "A5" ? "p-3 text-[10px]" : "p-3.5 text-xs"
              }`}
            >
              <div className="space-y-1.5 min-w-0">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[8px] block">Student Name:</span>
                  <p className="font-black text-slate-900 break-words leading-tight text-xs">
                    {students[0]?.name || activeReceipt.studentName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[8px] block">Father / Guardian:</span>
                  <p className="font-extrabold text-slate-800 break-words leading-tight text-[10px]">
                    {activeReceipt.fatherName || "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[8px] block">Class & Section:</span>
                  <p className="font-black text-slate-900 break-words leading-tight text-xs">
                    {students[0]?.classSection || activeReceipt.classSection || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[8px] block">Roll Number:</span>
                  <p className="font-black text-slate-900 break-words leading-tight text-[10px]">
                    {students[0]?.rollNo || activeReceipt.rollNumber || activeReceipt.rollNo || "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0 text-right">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[8px] block">Admission ID:</span>
                  <p className="font-extrabold text-slate-800 break-words leading-tight text-[11px]">
                    {students[0]?.admissionNo || activeReceipt.admissionNo || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[8px] block">Payment Mode & Ref:</span>
                  <p className="font-extrabold text-slate-800 uppercase break-words leading-tight text-[9.5px]">
                    {activeReceipt.method || activeReceipt.paymentMethod}{" "}
                    {activeReceipt.transactionRef ? `(${activeReceipt.transactionRef})` : "Counter"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Itemized Fee Table */}
          <div className="receipt-fee-table-container border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`bg-slate-100/90 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200 ${
                    receiptPageSize === "A5" ? "text-[9px]" : "text-[9.5px]"
                  }`}
                >
                  <th className="py-1.5 px-3.5 w-8 text-slate-400">#</th>
                  <th className="py-1.5 px-3.5">Fee Particulars</th>
                  <th className="py-1.5 px-3.5 text-right">Billed Due</th>
                  {hasDiscounts && (
                    <th className="py-1.5 px-3.5 text-right text-indigo-700">Concession</th>
                  )}
                  <th className="py-1.5 px-3.5 text-right text-slate-900">Amount Paid</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 font-semibold text-slate-700 ${
                  receiptPageSize === "A5" ? "text-[10px]" : "text-xs"
                }`}
              >
                {groupedItems.length > 0 ? (
                  groupedItems.map((item: any, idx: number) => {
                    const rawParticular = (item.baseParticular || item.name || "")
                      .replace(new RegExp(`^${item.studentPrefix}[:\\s-]*`, "i"), "")
                      .replace(/^[A-Za-z\s]+:\s*/, "")
                      .trim() || item.baseParticular || item.name;
                    const cleanParticular = formatCompactParticulars(rawParticular);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className={`${isCompactFeeTable ? "py-1 px-3" : "py-2 px-3.5"} text-slate-400 font-bold w-8`}>{idx + 1}</td>
                        <td className={`${isCompactFeeTable ? "py-1 px-3" : "py-2 px-3.5"} break-words`}>
                          {item.studentPrefix ? (
                            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8.5px] font-black uppercase tracking-tight shrink-0">
                                {item.studentPrefix}
                              </span>
                              <span className="font-bold text-slate-900 leading-tight">
                                {cleanParticular}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-900">{formatCompactParticulars(item.name || item.description || "")}</span>
                          )}
                        </td>
                        <td className={`${isCompactFeeTable ? "py-1 px-3" : "py-2 px-3.5"} text-right text-slate-500 font-medium font-mono`}>
                          {formatP(item.originalAmount !== undefined ? item.originalAmount : item.amount)}
                        </td>
                        {hasDiscounts && (
                          <td className={`${isCompactFeeTable ? "py-1 px-3" : "py-2 px-3.5"} text-right text-indigo-600 font-bold font-mono`}>
                            {(item.discount || 0) > 0 ? formatP(item.discount) : "-"}
                          </td>
                        )}
                        <td className={`${isCompactFeeTable ? "py-1 px-3" : "py-2 px-3.5"} text-right text-slate-900 font-black font-mono`}>
                          {formatP(item.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-3 px-3.5 text-slate-400 font-bold">1</td>
                    <td className="py-3 px-3.5 font-bold text-slate-850">
                      {activeReceipt.details || "Fee Payment"}
                    </td>
                    <td className="py-3 px-3.5 text-right text-slate-500 font-medium font-mono">
                      {formatP(activeReceipt.amount)}
                    </td>
                    {hasDiscounts && <td className="py-3 px-3.5 text-right text-indigo-600 font-mono">-</td>}
                    <td className="py-3 px-3.5 text-right text-slate-900 font-black font-mono">
                      {formatP(activeReceipt.amount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Summary & Totals Grid */}
          {(() => {
            const billedTarget = (activeReceipt.subtotal || activeReceipt.amount) - (activeReceipt.discount || 0);
            const isVoucherFullyPaid = activeReceipt.amount >= billedTarget;
            const isUpiPayment = activeReceipt.method === "UPI" || activeReceipt.paymentMethod === "UPI";

            return (
              <div className="grid grid-cols-12 gap-3 items-stretch">
                {/* Left: Amount in Words & Qualitative Settlement Status */}
                <div
                  className={`${
                    isUpiPayment ? "col-span-5" : "col-span-7"
                  } bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between space-y-2 ${
                    receiptPageSize === "A5" ? "text-[9.5px]" : "text-[10px]"
                  }`}
                >
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[7.5px]">
                      Amount in Words:
                    </span>
                    <p className="font-black text-slate-900 italic break-words leading-tight mt-0.5">
                      {activeReceipt.amountInWords || numberToIndianWords(activeReceipt.amount)}
                    </p>
                  </div>
                  <div className="border-t border-slate-200/70 pt-1.5 flex items-center justify-between">
                    <span className="text-[8px] font-bold uppercase text-slate-400">Voucher Status:</span>
                    {activeReceipt.arrears === 0 ? (
                      <span className="text-emerald-700 font-black text-[9px] flex items-center gap-1 leading-tight">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> All Session Dues Settled (Nil)
                      </span>
                    ) : isVoucherFullyPaid ? (
                      <span className="text-emerald-700 font-black text-[9px] flex items-center gap-1 leading-tight">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Current Bill Cleared in Full
                      </span>
                    ) : (
                      <span className="text-amber-800 font-bold text-[9px] flex items-center gap-1 leading-tight">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Partial Payment Received
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle (Only if UPI Payment): PAID confirmation — NOT a payable QR.
                    A1: the scannable Verification QR lives in the receipt header; a
                    payable upi://pay QR is never shown on an already-settled receipt. */}
                {isUpiPayment && (
                  <div className="col-span-3 flex flex-col items-center justify-center text-center self-center py-1 space-y-1">
                    <span className="font-black uppercase text-emerald-600 tracking-wider leading-none block text-[7.5px]">
                      Paid via UPI
                    </span>
                    <div
                      className={`flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 ${
                        receiptPageSize === "A5" ? "w-[72px] h-[72px]" : "w-[84px] h-[84px]"
                      }`}
                    >
                      <CheckCircle2
                        className={`text-emerald-600 ${
                          receiptPageSize === "A5" ? "w-9 h-9" : "w-10 h-10"
                        }`}
                      />
                    </div>
                    <div className="leading-tight">
                      <span
                        className={`font-mono font-black text-emerald-700 block ${
                          receiptPageSize === "A5" ? "text-[9.5px]" : "text-[10px]"
                        }`}
                      >
                        {formatP(activeReceipt.amount)}
                      </span>
                      <p className="text-emerald-600 font-black tracking-widest text-[7.5px]">
                        PAID
                      </p>
                    </div>
                  </div>
                )}

                {/* Right: Totals Arithmetic Card (Sole Source of Truth for Numbers) */}
                <div
                  className={`${
                    isUpiPayment ? "col-span-4" : "col-span-5"
                  } bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 text-right ${
                    receiptPageSize === "A5" ? "text-[9.5px]" : "text-xs"
                  }`}
                >
                  <div className="flex justify-between items-center text-slate-500 font-bold">
                    <span>Invoice Total:</span>
                    <span className="text-slate-800 font-mono font-bold">
                      {formatP(activeReceipt.subtotal || activeReceipt.amount)}
                    </span>
                  </div>
                  {activeReceipt.discount > 0 && (
                    <div className="flex justify-between items-center text-indigo-600 font-bold">
                      <span>Total Concession:</span>
                      <span className="font-black font-mono">-{formatP(activeReceipt.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300/80 pt-1.5 flex justify-between items-center text-emerald-850 font-black">
                    <span className="text-[10px]">Total Paid:</span>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      {formatP(activeReceipt.amount)}
                    </span>
                  </div>
                  {activeReceipt.arrears > 0 ? (
                    <div className="flex justify-between items-center text-rose-700 font-black border-t border-rose-200/80 pt-1 text-[9px]">
                      <span>Total Remaining Dues:</span>
                      <span className="font-black font-mono">
                        {formatP(activeReceipt.arrears)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-emerald-700 font-bold border-t border-emerald-200/70 pt-1 text-[8.5px]">
                      <span>Remaining Balance:</span>
                      <span className="font-black font-mono">Nil (Cleared)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 5. Signatures & Electronic Verification Seal */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2.5 border-t border-slate-200">
            {/* Left: Official Generation Notice */}
            <div
              className={`text-slate-400 leading-tight italic break-words ${
                receiptPageSize === "A5" ? "text-[8px] max-w-[380px]" : "text-[8.5px] max-w-[460px]"
              }`}
            >
              * Computer-generated official fee voucher. Verified electronically by {schoolInfo.name || "St. GNG School"}. Tamper-proof digital audit record.
            </div>

            {/* Right: Cashier Sign & Verified Seal */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-xl p-2 px-3.5 shrink-0 self-end sm:self-auto">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span
                  className={`font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded ${
                    receiptPageSize === "A5" ? "text-[7.5px]" : "text-[8px]"
                  }`}
                >
                  SYSTEM VERIFIED
                </span>
              </div>
              <div className="border-l border-slate-200 pl-3 text-right min-w-[100px]">
                <p
                  className={`font-black text-slate-900 leading-tight ${
                    receiptPageSize === "A5" ? "text-[9px]" : "text-[9.5px]"
                  }`}
                >
                  {activeReceipt.collectedBy || user?.name || "Authorized Cashier"}
                </p>
                <p
                  className={`text-slate-400 font-bold uppercase tracking-wider mt-0.5 ${
                    receiptPageSize === "A5" ? "text-[7.5px]" : "text-[7.5px]"
                  }`}
                >
                  {activeReceipt.collectedByRole || user?.role || "Finance Desk"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Modal Action Buttons — sticky bottom bar for easy reach on mobile */}
        <div className="receipt-modal-actions no-print sticky bottom-0 bg-white/95 backdrop-blur-md pt-2 pb-1 border-t border-slate-100 z-30 flex flex-col sm:flex-row gap-2">
          <div className="grid grid-cols-1 sm:flex sm:flex-1 gap-2">
            {/* 1. WhatsApp Share — direct text message redirect to parent's phone */}
            <button
              type="button"
              onClick={() => onSendWhatsApp(activeReceipt)}
              className="flex items-center justify-center gap-2 py-3 px-4 sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
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
              className="flex items-center justify-center gap-2 py-3 px-4 sm:flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-black transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
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
              className="flex items-center justify-center gap-1.5 py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>Print</span>
            </button>
          </div>

          {/* 4. Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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