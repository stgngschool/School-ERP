"use client";

import React, { useState } from "react";
import { formatP } from "@/lib/currency";
import {
  CreditCard,
  CheckCircle,
  FileText,
  Printer,
  ShieldCheck,
  Info,
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
    manualReceiptNo?: string,
    idempotencyKey?: string
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

          {/* Fee Balance Summary & Payment Desk Info */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col justify-between h-full min-h-[180px]">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                Fee Balance Summary
              </span>
              <div className="flex justify-between text-xs py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Selected Invoices</span>
                <span className="font-bold text-slate-800">{selectedDueIds.length} item(s)</span>
              </div>
              <div className="flex justify-between text-xs py-2">
                <span className="text-slate-800 font-bold">Selected Dues</span>
                <span className="font-black text-indigo-700 text-sm">{formatP(paymentSubtotal)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
                <span>School Accounts Desk</span>
              </div>
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                Direct online self-checkout is disabled pending gateway integration. Please settle dues directly at the school fee counter or via official school bank transfer.
              </p>
            </div>
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
    </div>
  );
}