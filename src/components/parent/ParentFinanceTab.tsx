"use client";

import React, { useState, useRef } from "react";
import { formatP } from "@/lib/currency";
import { getISTDateString, getTodayIST } from "@/lib/dateUtils";
import {
  CreditCard,
  CheckCircle,
  FileText,
  Printer,
  QrCode,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { MockStudent, MockDueItem, MockReceipt, MockSchoolInfo } from "@/context/AuthContext";

interface ParentFinanceTabProps {
  child: MockStudent | undefined;
  dueItems: MockDueItem[];
  receipts: MockReceipt[];
  schoolInfo: MockSchoolInfo;
  recordItemizedPayment: (
    studentId: any,
    items: { ledgerEntryId: string; payAmount: number; discountAmount: number }[],
    paymentMethod: string,
    transactionRef?: string,
    parentProfileId?: string,
    manualReceiptNo?: string
  ) => Promise<any>;
  onOpenReceipt: (receipt: any) => void;
  billingLoaded?: boolean;
}

export default function ParentFinanceTab({
  child,
  dueItems,
  receipts,
  schoolInfo,
  recordItemizedPayment,
  onOpenReceipt,
  billingLoaded = true,
}: ParentFinanceTabProps) {
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState("UPI");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const isSubmittingPayment = useRef(false);

  // Filter dues for this child
  const childDues = child
    ? dueItems
        .filter((d) => d.studentId === child.id && d.status === "UNPAID")
        .slice()
        .sort((a, b) => {
          if (a.isCurrentSession === false && b.isCurrentSession !== false) return -1;
          if (b.isCurrentSession === false && a.isCurrentSession !== false) return 1;
          return (a.dueDate || "").localeCompare(b.dueDate || "");
        })
    : [];

  const childReceipts = child ? receipts.filter((r) => r.studentId === child.id) : [];

  const handleToggleDueSelection = (dueId: string) => {
    setSelectedDueIds((prev) =>
      prev.includes(dueId) ? prev.filter((id) => id !== dueId) : [...prev, dueId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDueIds.length === childDues.length) {
      setSelectedDueIds([]);
    } else {
      setSelectedDueIds(childDues.map((d) => d.id));
    }
  };

  const paymentSubtotal = childDues
    .filter((d) => selectedDueIds.includes(d.id))
    .reduce((sum, item) => sum + item.amount, 0);

  const childBalance = childDues.reduce((sum, item) => sum + item.amount, 0);

  const handleCheckoutClick = () => {
    if (selectedDueIds.length === 0) return;
    setShowPayModal(true);
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child) return;

    if (isSubmittingPayment.current) return;
    isSubmittingPayment.current = true;

    const unpaidItems = childDues.filter((d) => selectedDueIds.includes(d.id));
    const totalAmount = unpaidItems.reduce((sum, item) => sum + item.amount, 0);

    if (totalAmount <= 0) {
      isSubmittingPayment.current = false;
      return;
    }

    const items = unpaidItems.map((d) => ({
      ledgerEntryId: d.id,
      payAmount: d.amount,
      discountAmount: 0,
    }));

    setPayLoading(true);
    try {
      const payRes = await recordItemizedPayment(child.id, items, payMethod);
      if (payRes.success) {
        if (!payRes.receipt?.receiptNo) {
          alert("Payment recorded but server did not return a valid receipt number.");
          setSelectedDueIds([]);
          setShowPayModal(false);
          return;
        }
        const serverRec = payRes.receipt;
        const matchedReceipt = {
          receiptNo: serverRec.receiptNo,
          studentName: serverRec.studentName || child.name,
          classSection: serverRec.classSection || `${child.class}-${child.section}`,
          admissionNo: serverRec.admissionNo || child.admissionNo,
          fatherName: serverRec.fatherName || child.fatherName || "",
          subtotal: serverRec.subtotal !== undefined ? serverRec.subtotal : totalAmount,
          amount: serverRec.amount !== undefined ? serverRec.amount : totalAmount,
          discount: serverRec.discount !== undefined ? serverRec.discount : 0,
          arrears: serverRec.arrears !== undefined ? serverRec.arrears : 0,
          method: serverRec.paymentMethod || payMethod,
          transactionRef: serverRec.transactionRef || "",
          details: serverRec.details || unpaidItems.map((i) => `${i.name} (${formatP(i.amount)})`).join(" + "),
          items: serverRec.items || unpaidItems.map((i) => ({ name: i.name, amount: i.amount, originalAmount: i.amount, discount: 0, balance: 0 })),
          createdAt: serverRec.createdAt ? getISTDateString(serverRec.createdAt) : getTodayIST(),
        };

        setSelectedDueIds([]);
        setShowPayModal(false);
        onOpenReceipt(matchedReceipt);
      } else {
        alert(payRes.error || "Payment failed. Please try again.");
      }
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setPayLoading(false);
      isSubmittingPayment.current = false;
    }
  };

  const hasValidUpi = Boolean(schoolInfo?.upiId && schoolInfo.upiId.trim() !== "" && schoolInfo.upiId !== "school@upi");
  const upiId = hasValidUpi ? schoolInfo!.upiId!.trim() : "";
  const upiAmountRupees = (paymentSubtotal / 100).toFixed(2);
  const upiString = hasValidUpi
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(schoolInfo?.name || "School")}&am=${upiAmountRupees}&cu=INR&tn=${encodeURIComponent(`Fee payment for ${child?.name || "Student"}`)}`
    : "";
  const qrCodeUrl = hasValidUpi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiString)}`
    : "";

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in text-left pb-12 font-sans">
      {/* Outstanding Invoices Section */}
      <div className="bg-white border border-slate-200/80 p-3.5 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-4 contain-paint">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Outstanding Invoices & Dues
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                Select fee heads to pay securely online via UPI QR or card.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-xl">
            Total Dues: {formatP(childBalance)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* List of Due Items */}
          <div className="lg:col-span-2 space-y-2">
            {childDues.length > 0 && (
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 pb-1">
                <span>Fee Heads Checklist</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  {selectedDueIds.length === childDues.length ? "Deselect All" : "Select All"}
                </button>
              </div>
            )}

            {childDues.length > 0 ? (
              childDues.map((item) => {
                const isSelected = selectedDueIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleDueSelection(item.id)}
                    className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all cv-auto-card ${
                      isSelected
                        ? "bg-indigo-50/60 border-indigo-400 shadow-2xs"
                        : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 pointer-events-none"
                      />
                      <div>
                        <p className="text-xs font-black text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Due Date: {item.dueDate || "N/A"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-slate-900">{formatP(item.amount)}</p>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-black text-slate-800">All Fees Cleared!</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Great! No outstanding fee dues for {child?.name}.
                </p>
              </div>
            )}
          </div>

          {/* Checkout Breakdown Box */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col justify-between h-full min-h-[180px]">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                Checkout Summary
              </span>
              <div className="flex justify-between text-xs py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Selected Invoices</span>
                <span className="font-bold text-slate-800">{selectedDueIds.length} item(s)</span>
              </div>
              <div className="flex justify-between text-xs py-2">
                <span className="text-slate-800 font-bold">Subtotal Amount</span>
                <span className="font-black text-indigo-700 text-sm">{formatP(paymentSubtotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckoutClick}
              disabled={selectedDueIds.length === 0}
              className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              Pay Now ({formatP(paymentSubtotal)})
            </button>
          </div>
        </div>
      </div>

      {/* Paid Receipts Ledger Log */}
      <div className="bg-white border border-slate-200/80 p-3.5 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-3 contain-paint">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="h-4.5 w-4.5 text-indigo-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Payment Receipts Ledger ({childReceipts.length})
          </h3>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {childReceipts.length > 0 ? (
            childReceipts.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 border border-slate-200/80 bg-slate-50/50 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 cv-auto-card"
              >
                <div>
                  <p className="font-black text-slate-800">
                    Receipt #{rec.receiptNo} {rec.manualReceiptNo ? `(Book #: ${rec.manualReceiptNo})` : ""}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Date: {rec.createdAt} • Mode: {rec.method}
                  </p>
                  <p className="text-[9px] text-indigo-600 font-bold max-w-xs truncate">{rec.details}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-black text-slate-900 text-sm">{formatP(rec.amount)}</p>
                  <button
                    onClick={() => onOpenReceipt(rec)}
                    className="p-2 text-slate-500 hover:text-indigo-600 border border-slate-200 bg-white rounded-lg hover:border-indigo-300 transition-colors cursor-pointer"
                    title="View / Print Official Receipt"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 font-medium text-center py-6">No previous fee receipts found.</p>
          )}
        </div>
      </div>

      {/* ── UPI Payment Checkout Modal ── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-optimized">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-scale-up text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">
                  Online Fee Desk
                </span>
                <h3 className="text-base font-black text-slate-900">Confirm Payment</h3>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Total Display */}
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100/80 text-center">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Total Payable Amount</span>
              <h2 className="text-2xl font-black text-indigo-900 mt-0.5">{formatP(paymentSubtotal)}</h2>
              <p className="text-[10px] text-indigo-600/80 font-bold mt-0.5">
                {selectedDueIds.length} invoice items for {child?.name}
              </p>
            </div>

            {/* UPI QR Code or Warning */}
            {hasValidUpi ? (
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="w-40 h-40 rounded-xl bg-white p-2 border border-slate-200 shadow-2xs"
                />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Scan with any UPI App (GPay, PhonePe, Paytm)
                </span>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-amber-800">Online UPI Payment Not Active</p>
                <p className="text-[10px] text-amber-700 font-medium">
                  The school has not linked their official UPI VPA yet. Please submit your fee payment directly at the school accounts counter.
                </p>
              </div>
            )}

            {/* Simulated Checkout Button */}
            <form onSubmit={handleSimulatePayment} className="space-y-3">
              {hasValidUpi && (
                <div className="flex items-center gap-2">
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={payLoading || !hasValidUpi}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {payLoading ? "Processing Payment..." : hasValidUpi ? `Confirm Payment (${formatP(paymentSubtotal)})` : "Payment Unavailable"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}