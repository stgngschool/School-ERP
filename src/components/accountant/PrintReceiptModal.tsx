"use client";

import React, { useState } from "react";
import { Printer, Send, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { formatP, numberToIndianWords } from "@/lib/currency";
import { getGroupedReceiptItems } from "@/lib/receipts";

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
  const [receiptPageSize, setReceiptPageSize] = useState<"A4" | "A5">("A5");

  if (!show || !activeReceipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 modal-backdrop-optimized animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Modal Header & Page Size Switcher */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
              Official Payment Voucher
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Select paper print size (A5 half-page or A4 full-page)
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setReceiptPageSize("A5")}
              className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                receiptPageSize === "A5"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-650"
              }`}
            >
              📄 A5 Compact
            </button>
            <button
              type="button"
              onClick={() => setReceiptPageSize("A4")}
              className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                receiptPageSize === "A4"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-650"
              }`}
            >
              📄 A4 Standard
            </button>
          </div>
        </div>

        {/* Print Styling Override */}
        <style>{`
          @media print {
            @page {
              size: ${receiptPageSize === "A5" ? "A5 landscape" : "A4 portrait"};
              margin: 6mm;
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
            #receipt-print-area, #receipt-print-area *,
            .student-statement-print-area, .student-statement-print-area * {
              visibility: visible !important;
            }
            #receipt-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 14px !important;
              border: 1.5px solid #0f172a !important;
              border-radius: 8px !important;
              box-shadow: none !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .student-statement-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 10mm !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Printable Receipt Canvas */}
        <div
          id="receipt-print-area"
          className={`border rounded-2xl bg-white text-slate-900 shadow-sm relative space-y-3 ${
            receiptPageSize === "A5"
              ? "border-slate-800 p-4 text-[10px]"
              : "border-slate-300 p-6 space-y-4 text-xs"
          }`}
        >
          {/* Receipt Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="School Logo"
                className={`object-contain ${
                  receiptPageSize === "A5" ? "h-10 w-10" : "h-12 w-12"
                }`}
              />
              <div className="space-y-0.5">
                <h4
                  className={`font-black text-slate-900 uppercase tracking-tight leading-tight ${
                    receiptPageSize === "A5" ? "text-base font-black" : "text-xl font-black"
                  }`}
                >
                  {schoolInfo.name || "ST. GNG SCHOOL"}
                </h4>
                <p
                  className={`text-slate-600 font-semibold leading-tight ${
                    receiptPageSize === "A5" ? "text-[8px] max-w-[320px]" : "text-xs max-w-[450px]"
                  }`}
                >
                  {schoolInfo.address || "Salarpur, Rasulgarh, Varanasi - 221007"}
                </p>
                <p
                  className={`text-slate-500 font-bold ${
                    receiptPageSize === "A5" ? "text-[8px]" : "text-[10px]"
                  }`}
                >
                  Phone: {schoolInfo.phone || "9452824318"} | Email: {schoolInfo.email || "stgng2005@gmail.com"}
                </p>
              </div>
            </div>
            <div className="text-right space-y-0.5 shrink-0">
              <span className="bg-slate-900 text-white font-black uppercase rounded-md tracking-wider text-[9px] px-2.5 py-1 block">
                Official Fee Receipt
              </span>
              <p className="text-slate-500 font-bold text-[9px] mt-0.5">
                Receipt No: <span className="font-black text-slate-900">{activeReceipt.receiptNo}</span>
              </p>
              {activeReceipt.manualReceiptNo && (
                <p className="text-indigo-700 font-bold text-[9px] bg-indigo-50 border border-indigo-100/80 px-1.5 py-0.5 rounded">
                  Book Rec No: <span className="font-black text-indigo-950">{activeReceipt.manualReceiptNo}</span>
                </p>
              )}
              <p className="text-slate-400 font-bold text-[9px]">
                Date: <span className="font-extrabold text-slate-800">{activeReceipt.createdAt}</span>
              </p>
            </div>
          </div>

          {/* Student & Parent Metadata Card */}
          <div
            className={`grid grid-cols-2 bg-slate-50 border border-slate-200 rounded-xl gap-x-4 ${
              receiptPageSize === "A5" ? "p-2.5 gap-y-1.5 text-[9px]" : "p-3.5 gap-y-2 text-xs"
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-slate-400 font-bold uppercase text-[8px] block">
                Student / Family Name:
              </span>
              <p className="font-black text-slate-900 truncate leading-tight">
                {activeReceipt.studentName}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-slate-400 font-bold uppercase text-[8px] block">
                Class & Section:
              </span>
              <p className="font-black text-slate-900 truncate leading-tight">
                {activeReceipt.classSection}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 font-bold uppercase text-[8px] block">
                Admission / Family ID:
              </span>
              <p className="font-extrabold text-slate-800 leading-tight">
                {activeReceipt.admissionNo || activeReceipt.admissionId || "Multi-Child / Family"}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-slate-400 font-bold uppercase text-[8px] block">
                Payment Method & Reference:
              </span>
              <p className="font-extrabold text-slate-800 uppercase leading-tight">
                {activeReceipt.method}{" "}
                {activeReceipt.transactionRef ? `(${activeReceipt.transactionRef})` : "Counter"}
                {activeReceipt.manualReceiptNo ? ` | Book #: ${activeReceipt.manualReceiptNo}` : ""}
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          {(() => {
            const groupedItems = getGroupedReceiptItems(activeReceipt.items || []);
            const hasDiscounts = groupedItems.some((i: any) => (i.discount || 0) > 0);

            return (
              <div className="space-y-1">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className={`bg-slate-100 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200 ${
                          receiptPageSize === "A5" ? "text-[8px]" : "text-[10px]"
                        }`}
                      >
                        <th className="py-1.5 px-3 w-8">#</th>
                        <th className="py-1.5 px-3">Fee Particulars</th>
                        <th className="py-1.5 px-3 text-right">Billed Due</th>
                        {hasDiscounts && (
                          <th className="py-1.5 px-3 text-right text-indigo-700">Concession</th>
                        )}
                        <th className="py-1.5 px-3 text-right text-slate-900">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y divide-slate-100 font-semibold text-slate-700 ${
                        receiptPageSize === "A5" ? "text-[9px]" : "text-xs"
                      }`}
                    >
                      {groupedItems.length > 0 ? (
                        groupedItems.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="py-1.5 px-3 text-slate-400 font-bold w-8">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-850 truncate max-w-[220px]">
                              {item.name || item.description}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-500 font-semibold">
                              {formatP(item.originalAmount || item.amount)}
                            </td>
                            {hasDiscounts && (
                              <td className="py-1.5 px-3 text-right text-indigo-600 font-bold">
                                {(item.discount || 0) > 0 ? formatP(item.discount) : "-"}
                              </td>
                            )}
                            <td className="py-1.5 px-3 text-right text-slate-900 font-black">
                              {formatP(item.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-1.5 px-3 text-slate-400 font-bold">1</td>
                          <td className="py-1.5 px-3 font-bold text-slate-850">
                            {activeReceipt.details || "Fee Payment"}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-500 font-semibold">
                            {formatP(activeReceipt.amount)}
                          </td>
                          {hasDiscounts && <td className="py-1.5 px-3 text-right text-indigo-600">-</td>}
                          <td className="py-1.5 px-3 text-right text-slate-900 font-black">
                            {formatP(activeReceipt.amount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Summary & Amount in Words Grid */}
          <div className="grid grid-cols-12 gap-3 pt-1 items-start">
            {/* Left Side: Amount in Words & Dues Clearance Note */}
            <div
              className={`col-span-7 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 ${
                receiptPageSize === "A5" ? "text-[8px]" : "text-[10px]"
              }`}
            >
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[7px]">
                  Amount in Words:
                </span>
                <p className="font-black text-slate-900 italic">
                  {activeReceipt.amountInWords || numberToIndianWords(activeReceipt.amount)}
                </p>
              </div>
              <div className="border-t border-slate-200/60 pt-1">
                {activeReceipt.arrears === 0 ? (
                  <span className="text-emerald-700 font-black flex items-center gap-1">
                    ✅ All selected invoice dues are fully settled.
                  </span>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-amber-700 font-bold block">
                      ⚠️ Balance remaining on this invoice:{" "}
                      <strong className="font-black text-slate-900">{formatP(activeReceipt.arrears)}</strong>
                    </span>
                    {activeReceipt.otherArrears > 0 && (
                      <span className="text-slate-400 font-semibold block text-[7px]">
                        (Other session dues pending: {formatP(activeReceipt.otherArrears)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Totals Card */}
            <div
              className={`col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1 text-right ${
                receiptPageSize === "A5" ? "text-[9px]" : "text-xs"
              }`}
            >
              <div className="flex justify-between items-center text-slate-500 font-bold">
                <span>Invoice Total:</span>
                <span className="text-slate-800">
                  {formatP(activeReceipt.subtotal || activeReceipt.amount)}
                </span>
              </div>
              {activeReceipt.discount > 0 && (
                <div className="flex justify-between items-center text-indigo-600 font-bold">
                  <span>Total Concession:</span>
                  <span className="font-black">-{formatP(activeReceipt.discount)}</span>
                </div>
              )}
              <div className="border-t border-slate-300 pt-1 flex justify-between items-center text-emerald-800 font-black text-xs">
                <span>Total Paid:</span>
                <span className="text-sm font-black">{formatP(activeReceipt.amount)}</span>
              </div>
              {activeReceipt.arrears > 0 && (
                <div className="flex justify-between items-center text-amber-700 font-bold border-t border-slate-200/60 pt-1 text-[8px]">
                  <span>Balance on Invoice:</span>
                  <span className="font-black text-rose-600">{formatP(activeReceipt.arrears)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures & Verification Seal */}
          <div className="flex justify-between items-end pt-2 border-t border-slate-200">
            <div
              className={`text-slate-400 leading-tight italic ${
                receiptPageSize === "A5" ? "text-[7px] max-w-[240px]" : "text-[9px] max-w-[340px]"
              }`}
            >
              * Computer-generated official receipt. Verified electronically by School Finance OS.
            </div>
            <div className="text-center w-36 shrink-0">
              <div className="flex items-center justify-center">
                <span
                  className={`font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded ${
                    receiptPageSize === "A5" ? "text-[7px]" : "text-[9px]"
                  }`}
                >
                  SYSTEM VERIFIED
                </span>
              </div>
              <div className="border-t border-slate-300 pt-0.5 mt-1 space-y-0.5">
                <p
                  className={`font-black text-slate-900 leading-tight ${
                    receiptPageSize === "A5" ? "text-[8px]" : "text-[10px]"
                  }`}
                >
                  {activeReceipt.collectedBy || user?.name || "Authorized Cashier"}
                </p>
                <p
                  className={`text-slate-400 font-bold uppercase tracking-wider ${
                    receiptPageSize === "A5" ? "text-[7px]" : "text-[8px]"
                  }`}
                >
                  {activeReceipt.collectedByRole || user?.role || "Finance Desk"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSendWhatsApp(activeReceipt)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/15"
          >
            <WhatsAppIcon className="w-4 h-4 text-white shrink-0" /> WhatsApp Receipt
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="h-4 w-4" /> Print Voucher
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}