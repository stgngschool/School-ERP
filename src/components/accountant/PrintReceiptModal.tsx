"use client";

import { receiptSettlement } from "@/lib/receiptSettlement";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import QRCode from "qrcode";
import { Printer, X, CheckCircle2, AlertCircle, ShieldCheck, Share2, Loader2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { formatP, numberToIndianWords } from "@/lib/currency";
import { getGroupedReceiptItems, getReceiptStudents, formatCompactParticulars } from "@/lib/receipts";

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
  const { refreshBilling } = useAuth();
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelledHere, setCancelledHere] = useState(false);
  const [cancellationError, setCancellationError] = useState("");
  const [cancellationNotice, setCancellationNotice] = useState("");
  const isCancelled = cancelledHere || activeReceipt?.status === "REVERSED";
  const canCancel = ["ADMIN", "ACCOUNTANT"].includes(user?.role);

  useEffect(() => {
    setConfirmCancellation(false);
    setReason("");
    setConfirmationNumber("");
    setCancelledHere(false);
    setCancellationError("");
    setCancellationNotice("");
  }, [activeReceipt?.id]);

  const cancelReceipt = async () => {
    if (!reason.trim() || confirmationNumber !== activeReceipt.receiptNo || cancelling || isGeneratingPdf) return;
    setCancelling(true);
    setCancellationError("");
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVERSE_RECEIPT", receiptId: activeReceipt.id, reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to cancel receipt. Please try again.");
      setCancelledHere(true);
      setConfirmCancellation(false);
      setCancellationNotice("Receipt cancelled. Its number is retained in Cancelled history.");
      window.dispatchEvent(new Event("receipt-cancelled"));
      try {
        await refreshBilling(true, true);
      }
      catch { setCancellationNotice("Receipt cancelled. Refresh the ledger to load the updated balances."); }
    } catch (error) {
      setCancellationError(error instanceof Error ? error.message : "Unable to cancel receipt. Please try again.");
    } finally { setCancelling(false); }
  };

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
    let cancelled = false;
    setVerifyQrUrl("");
    const generateVerificationQr = async () => {
      let token = activeReceipt.verificationToken;
      if (!token) {
        // Old locally cached receipts must obtain a signature through the existing scoped API.
        const response = await fetch(`/api/billing?receiptNo=${encodeURIComponent(activeReceipt.receiptNo)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load receipt verification");
        const data = await response.json();
        token = data.receipts?.find((r: { receiptNo: string }) => r.receiptNo === activeReceipt.receiptNo)?.verificationToken;
      }
      if (!token) throw new Error("Receipt verification is unavailable");
      const payload = `${origin}/verify?id=${encodeURIComponent(activeReceipt.receiptNo)}&t=${token}`;
      const url = await QRCode.toDataURL(payload, { width: 320, margin: 1.5, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });
      if (!cancelled) setVerifyQrUrl(url);
    };
    generateVerificationQr().catch((err) => console.error("Error generating verify QR:", err));

    return () => { cancelled = true; };
  }, [activeReceipt, user, schoolInfo]);

  if (!show || !activeReceipt || !mounted) return null;

  const students = getReceiptStudents(activeReceipt);
  const isMultiChild = students.length > 1;
  const groupedItems = getGroupedReceiptItems(activeReceipt.items || []);
  const hasDiscounts = (activeReceipt.discount || 0) > 0 || groupedItems.some((i: any) => (i.discount || 0) > 0);

  const settlement = receiptSettlement(activeReceipt.arrears);

  // Build the receipt as a PDF file. On mobile it opens the native share sheet
  // (WhatsApp / contacts / anywhere); on desktop (or if share is unavailable) it
  // falls back to a direct download named "Receipt-<no>-<student>.pdf".
  const handleGeneratePdf = async (shareOnMobile: boolean = false) => {
    const receiptElement = document.getElementById("receipt-print-area");
    if (!receiptElement || isCancelled) return;

    if (!verifyQrUrl) return;
    await document.fonts.ready;
    setIsGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas-pro");

      const canvas = await (html2canvas as any)(receiptElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: window.innerWidth,
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

      const pixelsPerMm = canvas.width / maxPdfWidth;
      const maxSliceHeight = Math.floor(maxPdfHeight * pixelsPerMm);
      const bounds = receiptElement.getBoundingClientRect();
      const scaleY = canvas.height / bounds.height;
      const boundaries = Array.from(receiptElement.querySelectorAll("tr, [data-receipt-block]"))
        .map(el => Math.floor((el.getBoundingClientRect().bottom - bounds.top) * scaleY))
        .filter(y => y > 0).sort((a, b) => a - b);
      let top = 0;
      while (top < canvas.height) {
        const limit = Math.min(top + maxSliceHeight, canvas.height);
        const candidates = boundaries.filter(y => y > top && y <= limit);
        const bottom = limit === canvas.height ? limit : (candidates.at(-1) || limit);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = bottom - top;
        const context = slice.getContext("2d");
        if (!context) throw new Error("PDF canvas unavailable");
        context.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        if (top > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, maxPdfWidth, slice.height / pixelsPerMm, undefined, "FAST");
        top = bottom;
      }

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
          {cancellationNotice && <p role="status" className="no-print rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{cancellationNotice}</p>}
          {canCancel && !isCancelled && (
            <div className="no-print border-b border-slate-200 pb-3">
              {!confirmCancellation ? (
                <button type="button" disabled={isGeneratingPdf} onClick={() => { setConfirmationNumber(""); setConfirmCancellation(true); }} className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">Cancel Receipt</button>
              ) : (
                <form onSubmit={(event) => { event.preventDefault(); void cancelReceipt(); }} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                  <h3 className="text-sm font-extrabold text-slate-900">Cancel receipt <span className="font-mono text-indigo-600">{activeReceipt.receiptNo}</span>?</h3>
                  <p className="text-xs leading-relaxed text-slate-600">This reverses every payment and discount on this receipt{isMultiChild ? ` for all ${students.length} siblings: ${students.map((student: any) => student.name).join(", ")}` : ""}, and restores the affected dues. The receipt number stays in the audit history. This does not refund money.</p>
                  <label htmlFor="receipt-cancellation-reason" className="block text-xs font-bold text-slate-700">Reason for cancellation (required)</label>
                  <textarea id="receipt-cancellation-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} disabled={cancelling} rows={2} placeholder="Explain why this receipt needs to be cancelled…" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  <div className="space-y-2">
                    <label htmlFor="receipt-cancellation-confirmation" className="block text-xs font-bold text-slate-700">Type {activeReceipt.receiptNo} to verify cancellation</label>
                    <input id="receipt-cancellation-confirmation" value={confirmationNumber} onChange={(event) => setConfirmationNumber(event.target.value)} disabled={cancelling} autoComplete="off" spellCheck={false} placeholder="Enter the full receipt number" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    <p className="text-[11px] leading-relaxed text-slate-500">All payments and discounts on this receipt will be reversed. Check the student and amount before confirming.</p>
                  </div>
                  {cancellationError && <p role="alert" className="text-sm font-semibold text-rose-800">{cancellationError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={cancelling || isGeneratingPdf || !reason.trim() || confirmationNumber !== activeReceipt.receiptNo} className="min-h-11 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{cancelling ? "Cancelling…" : "Confirm cancellation"}</button>
                    <button type="button" disabled={cancelling} onClick={() => setConfirmCancellation(false)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50">Keep receipt</button>
                  </div>
                </form>
              )}
            </div>
          )}
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

          <style>{`
            @media screen {
              .receipt-modal-dialog {
                width: min(calc(${receiptPageSize === "A5" ? "200mm" : "194mm"} + 34px), calc(100vw - 20px));
              }
              #receipt-print-area { margin-inline: auto; }
            }
            #receipt-print-area {
              width: ${receiptPageSize === "A5" ? "200mm" : "194mm"};
              min-width: ${receiptPageSize === "A5" ? "200mm" : "194mm"};
              max-width: none; box-sizing: border-box;
              padding: 3mm; gap: 2mm; font-size: 12px; line-height: 1.35;
              border: 0; border-radius: 0 !important; box-shadow: none !important; color: #172033;
            }
            #receipt-print-area div, #receipt-print-area span { border-radius: 0 !important; box-shadow: none !important; }
            #receipt-print-area [class*="text-["] { font-size: 11px; }
            #receipt-print-area [class*="font-black"] { font-weight: 700; }
            #receipt-print-area .truncate { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; }
            #receipt-print-area .receipt-students { border: 0; border-bottom: 1px solid #cbd5e1; background: white; padding: 2mm 0; }
            #receipt-print-area .receipt-students > div { background: white; flex-wrap: wrap; }
            #receipt-print-area .receipt-sibling-grid { display: grid; grid-template-columns: repeat(${Math.min(students.length, 4)}, minmax(0, 1fr)); align-items: start; }
            #receipt-print-area .receipt-fee-table-container { border: 0; border-radius: 0; overflow: visible; }
            #receipt-print-area table { border-collapse: collapse; table-layout: auto; }
            #receipt-print-area th { background: #f1f5f9; color: #334155; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; }
            #receipt-print-area th, #receipt-print-area td { border-radius: 0; padding: 2mm; }
            #receipt-print-area td:not(:nth-child(2)) { white-space: nowrap; font-variant-numeric: tabular-nums; }
            #receipt-print-area td span { border: 0; background: transparent; padding-left: 0; }
            #receipt-print-area .receipt-totals { border: 0; border-top: 1px solid #64748b; background: white; padding: 2mm 0; }
            #receipt-print-area .receipt-totals + div { border: 0; background: white; padding: 2mm 0; }
            #receipt-print-area .receipt-footer { align-items: start; }
            @media print {
              @page { size: ${receiptPageSize === "A5" ? "A5 landscape" : "A4 portrait"}; margin: ${receiptPageSize === "A5" ? "5mm" : "8mm"}; }
              html, body { margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; background: white !important; }
              body > *:not(#gng-receipt-print-portal) { display: none !important; }
              #gng-receipt-print-portal { display: block !important; position: static !important; }
              .receipt-modal-backdrop, .receipt-modal-dialog { all: unset !important; display: block !important; overflow: visible !important; }
              .no-print, .receipt-modal-actions { display: none !important; }
              .receipt-scroll-container { overflow: visible !important; padding: 0 !important; border: 0 !important; background: white !important; }
              #receipt-print-area { display: block !important; height: auto !important; max-height: none !important; overflow: visible !important; margin: 0 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              #receipt-print-area > * + * { margin-top: 2mm; }
              #receipt-print-area thead { display: table-header-group; }
              #receipt-print-area tr, #receipt-print-area [data-receipt-block] { break-inside: avoid; }
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
                "border-slate-300"
              } ${
                receiptPageSize === "A5"
                  ? "p-3.5 sm:p-4 gap-2.5 text-[10.5px]"
                  : "p-4 sm:p-5 gap-3.5 text-xs"
              }`}
            >
              {isCancelled && <div data-receipt-block className="border-2 border-rose-700 p-4 text-center text-rose-800"><strong className="text-2xl">CANCELLED</strong><p>This receipt is no longer valid as proof of payment.</p></div>}
              {/* 1. Header: School Info, Verification QR & Official Badges (Thin Elegant Divider) */}
              <div data-receipt-block className="flex justify-between items-start border-b border-slate-200 pb-2.5">
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

                      <span className="bg-slate-900 text-white font-black uppercase rounded tracking-wider text-[8.5px] px-2 py-0.5 inline-block">
                        OFFICIAL FEE RECEIPT
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
                /* Compact Multi-Child Sibling Strip */
                <div data-receipt-block className="receipt-students border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50/70">
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

                  {/* Keep up to four sibling identities on one paper-width row. */}
                  <div className="receipt-sibling-grid divide-x divide-slate-200/70 bg-white">
                    {students.map((student, index) => (
                      <div key={student.id || index} className="flex min-w-0 items-start justify-between gap-1 px-2 py-1.5 text-[9px]">
                        <div className="flex min-w-0 flex-1 items-start gap-1">
                          <span className="shrink-0 font-bold text-indigo-700">{index + 1}.</span>
                          <div className="min-w-0 leading-tight">
                            <p className="font-bold text-slate-900 break-words">{student.name}</p>
                            <p className="text-slate-600">Class: <span className="font-semibold text-slate-900">{student.classSection || "—"}</span></p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right leading-tight text-slate-600">
                          <p>Roll: <span className="font-semibold text-slate-900">{student.rollNo || "—"}</span></p>
                          <p>Adm: <span className="font-semibold text-slate-900">{student.admissionNo || "—"}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Single Student Executive Strip */
                <div data-receipt-block className="receipt-students bg-slate-50/80 border border-slate-200/90 rounded-xl py-1.5 px-3 text-[9.5px] flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
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
                      <th className="py-1.5 px-3 text-right border-b border-slate-200">Fee Amount</th>
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
                return (
                  <div data-receipt-block className="receipt-footer grid grid-cols-12 gap-3 items-end pt-1.5">
                    {/* Left: Unboxed Words & Voucher Status */}
                    <div className={`col-span-7 flex flex-col justify-between py-1 space-y-2.5`}>
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
                        {settlement === "cleared" ? (
                          <span className="text-emerald-700 font-extrabold text-[8.5px] flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> No Outstanding at Issue
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
                    {/* Right: Totals Card + Cashier Verification Block */}
                    <div className={`col-span-5 space-y-1.5`}>
                      {/* Totals Arithmetic Card */}
                      <div className="receipt-totals bg-slate-50/80 border border-slate-200/90 rounded-xl p-2.5 sm:p-3 space-y-1 text-right text-[9.5px]">
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>Receipt Fee Total:</span>
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
                            <span>Family Outstanding:</span>
                            <span className="font-mono">{formatP(activeReceipt.arrears)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-emerald-700 font-bold border-t border-emerald-200/70 pt-0.5 text-[8.5px]">
                            <span>Remaining Balance:</span>
                            <span className="font-mono font-black">{settlement === "cleared" ? "Nil (Cleared)" : "Not available"}</span>
                          </div>
                        )}
                      </div>

                      {/* Cashier / Verification Badge (Neatly placed under totals card) */}
                      <div className="flex items-center justify-between px-2 py-1 border border-slate-200/80 rounded-lg bg-slate-50/60">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[8px] font-black uppercase tracking-wider">Collected by</span>
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
                disabled={isCancelled || cancelling}
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
                disabled={isGeneratingPdf || isCancelled || cancelling}
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
              onClick={() => handleGeneratePdf(false)}
              disabled={isGeneratingPdf || !verifyQrUrl || isCancelled || cancelling}
              className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer"
            >
              Download PDF
            </button>
            <button
                type="button"
                disabled={isCancelled || cancelling}
                onClick={() => { if (!isCancelled) window.print(); }}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors cursor-pointer hover:bg-slate-50"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print</span>
              </button>
            </div>

            {/* 4. Close Button */}
            <button
              type="button"
              disabled={cancelling}
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
