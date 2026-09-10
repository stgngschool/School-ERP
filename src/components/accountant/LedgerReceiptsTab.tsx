"use client";

import React, { useState, useDeferredValue, useMemo } from "react";
import { Printer, User, Users } from "lucide-react";
import { formatP, numberToIndianWords } from "@/lib/currency";
import ModernDatePicker from "@/components/ModernDatePicker";
import { MockReceipt, MockLedgerEntry, MockStudent, MockUser } from "@/context/AuthContext";

interface LedgerReceiptsTabProps {
  receipts: MockReceipt[];
  ledgerEntries: MockLedgerEntry[];
  students: MockStudent[];
  user: MockUser | null;
  billingLoaded: boolean;
  onOpenReceipt: (receipt: any) => void;
}

export default function LedgerReceiptsTab({
  receipts,
  ledgerEntries,
  students,
  user,
  billingLoaded,
  onOpenReceipt,
}: LedgerReceiptsTabProps) {
  const [ledgerSubTab, setLedgerSubTab] = useState<"receipts" | "raw">("receipts");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const deferredLedgerSearch = useDeferredValue(ledgerSearch);
  const [ledgerDate, setLedgerDate] = useState("");
  const [ledgerStaffFilter, setLedgerStaffFilter] = useState(user?.role === "ADMIN" ? "All" : "ME");
  const [visibleReceiptsCount, setVisibleReceiptsCount] = useState(25);
  const [visibleLedgerCount, setVisibleLedgerCount] = useState(30);

  // Reset pagination when filters change
  React.useEffect(() => {
    setVisibleReceiptsCount(25);
    setVisibleLedgerCount(30);
  }, [ledgerSearch, ledgerDate, ledgerSubTab, ledgerStaffFilter]);

  if (!billingLoaded) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 w-48 rounded" />
            <div className="h-3 bg-slate-100 w-96 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 border border-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Receipts & Audit Ledger Book
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Track and reprint all invoices, or audit raw double-entry transactions ledger.
          </p>
        </div>

        {/* Sub-tab toggle buttons */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl self-start sm:self-auto select-none shrink-0 border border-slate-200/40">
          <button
            type="button"
            onClick={() => setLedgerSubTab("receipts")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              ledgerSubTab === "receipts"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Receipt Vouchers
          </button>
          <button
            type="button"
            onClick={() => setLedgerSubTab("raw")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              ledgerSubTab === "raw"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Double-Entry Ledger
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search Name, Receipt #, or Desc..."
            value={ledgerSearch}
            onChange={(e) => setLedgerSearch(e.target.value)}
            className="w-full text-xs font-semibold py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all placeholder-slate-400 text-slate-800"
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <ModernDatePicker
            value={ledgerDate}
            onChange={(val) => setLedgerDate(val)}
            placeholder="Filter by date"
            className="w-full"
          />
        </div>

        {/* Cashier / Staff Filter */}
        <div>
          {user?.role === "ADMIN" ? (
            <select
              value={ledgerStaffFilter}
              onChange={(e) => setLedgerStaffFilter(e.target.value)}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all text-slate-700 cursor-pointer"
            >
              <option value="All">All Cashiers & Staff</option>
              <option value="ME">My Receipts ({user?.name || "Accountant"})</option>
              {Array.from(new Set(receipts.map((r) => r.collectedBy).filter(Boolean))).map((cName) => (
                <option key={cName} value={cName as string}>
                  Cashier: {cName}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-between">
              <span>My Receipts ({user?.name || "Accountant"})</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">Counter</span>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {ledgerSearch || ledgerDate || (user?.role === "ADMIN" && ledgerStaffFilter !== "All") ? (
          <button
            type="button"
            onClick={() => {
              setLedgerSearch("");
              setLedgerDate("");
              if (user?.role === "ADMIN") setLedgerStaffFilter("All");
            }}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all self-stretch cursor-pointer border border-slate-200/50"
          >
            Clear Filters
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      {/* Receipts Book Sub-Tab */}
      {ledgerSubTab === "receipts" && (
        <div className="space-y-4">
          {/* Day-End Cashier Shift Closing & Reconciliation Summary */}
          {(() => {
            const filtered = receipts.filter((r) => {
              const matchesStaff =
                ledgerStaffFilter === "All"
                  ? true
                  : ledgerStaffFilter === "ME"
                  ? r.createdById === user?.id
                  : r.collectedBy === ledgerStaffFilter;
              const matchesSearch =
                !ledgerSearch.trim() ||
                r.receiptNo?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                r.manualReceiptNo?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                r.studentName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                r.details?.toLowerCase().includes(ledgerSearch.toLowerCase());
              const matchesDate = !ledgerDate || r.createdAt === ledgerDate;
              return matchesStaff && matchesSearch && matchesDate;
            });

            const totalAmt = filtered.reduce((sum, r) => sum + r.amount, 0);
            const cashAmt = filtered.filter((r) => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
            const upiAmt = filtered.filter((r) => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);
            const bankAmt = filtered
              .filter((r) => r.method === "ONLINE" || r.method === "CHEQUE" || r.method === "BANK_TRANSFER")
              .reduce((sum, r) => sum + r.amount, 0);

            // Cashier-wise grouping for Day-End Shift Closing
            const cashierMap: {
              [key: string]: { name: string; role: string; count: number; cash: number; upi: number; bank: number; total: number };
            } = {};
            filtered.forEach((r) => {
              const cName = r.collectedBy || "Finance Desk";
              const cRole = r.collectedByRole || "ACCOUNTANT";
              if (!cashierMap[cName]) {
                cashierMap[cName] = { name: cName, role: cRole, count: 0, cash: 0, upi: 0, bank: 0, total: 0 };
              }
              cashierMap[cName].count += 1;
              cashierMap[cName].total += r.amount;
              if (r.method === "CASH") cashierMap[cName].cash += r.amount;
              else if (r.method === "UPI") cashierMap[cName].upi += r.amount;
              else cashierMap[cName].bank += r.amount;
            });

            const cashierList = Object.values(cashierMap);

            return (
              <div className="space-y-3">
                {/* Overall Totals */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Total Receipts
                    </span>
                    <span className="text-sm font-black text-slate-850 mt-1 block">{filtered.length} Vouchers</span>
                  </div>
                  {user?.role === "ADMIN" ? (
                    <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">
                        Total Collection
                      </span>
                      <span className="text-sm font-black text-slate-900 mt-1 block">{formatP(totalAmt)}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">
                        Shift Status
                      </span>
                      <span className="text-sm font-black text-emerald-600 mt-1 block">Counter Active</span>
                    </div>
                  )}
                  <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block">
                      Cash in Drawer
                    </span>
                    <span className="text-sm font-black text-emerald-700 mt-1 block">{formatP(cashAmt)}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block">
                      UPI & Bank Transfer
                    </span>
                    <span className="text-sm font-black text-blue-700 mt-1 block">{formatP(upiAmt + bankAmt)}</span>
                  </div>
                </div>

                {/* Cashier-wise Shift Breakdown Card (Admin Only) */}
                {user?.role === "ADMIN" && cashierList.length > 1 && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-600" /> Cashier-wise Shift Handover & Reconciliation
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">
                        {cashierList.length} Active Staff Counters
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {cashierList.map((c) => (
                        <div
                          key={c.name}
                          className="bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-2xs space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-black uppercase">
                                {c.name.substring(0, 2)}
                              </div>
                              <span className="font-extrabold text-slate-900 text-[11px] truncate">{c.name}</span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {c.count} Vouchers
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[9px] font-bold text-slate-500">
                            <span>
                              Cash: <strong className="text-emerald-700 font-extrabold">{formatP(c.cash)}</strong>
                            </span>
                            <span>
                              UPI/Bank: <strong className="text-blue-700 font-extrabold">{formatP(c.upi + c.bank)}</strong>
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-black text-slate-900">
                            <span>Total Collected:</span>
                            <span className="text-indigo-600">{formatP(c.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Receipts Vouchers Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.015)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Student & Class</th>
                    <th className="py-3 px-4">Collected By</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {(() => {
                    const filtered = receipts.filter((r) => {
                      const matchesStaff =
                        ledgerStaffFilter === "All"
                          ? true
                          : ledgerStaffFilter === "ME"
                          ? r.createdById === user?.id
                          : r.collectedBy === ledgerStaffFilter;
                      const matchesSearch =
                        !ledgerSearch.trim() ||
                        r.receiptNo?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        r.manualReceiptNo?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        r.studentName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        r.details?.toLowerCase().includes(ledgerSearch.toLowerCase());
                      const matchesDate = !ledgerDate || r.createdAt === ledgerDate;
                      return matchesStaff && matchesSearch && matchesDate;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-8 text-center text-[11px] text-slate-400 font-semibold italic bg-slate-50/30"
                          >
                            No receipts found matching filters.
                          </td>
                        </tr>
                      );
                    }

                    const visibleReceipts = filtered.slice(0, visibleReceiptsCount);

                    return (
                      <>
                        {visibleReceipts.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors cv-auto-row">
                            <td className="py-3.5 px-4 font-black text-indigo-700">
                              <div className="space-y-0.5">
                                <span>{rec.receiptNo}</span>
                                {rec.manualReceiptNo && (
                                  <span className="block text-[8px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 w-fit">
                                    📖 Book: {rec.manualReceiptNo}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-extrabold text-slate-900">{rec.studentName}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{rec.classSection}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                                <User className="h-3 w-3 text-indigo-500" />
                                {rec.collectedBy || "Finance Desk"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate text-[10px] text-slate-500 font-medium">
                              {rec.details}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-[10px] font-bold">{rec.createdAt}</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                  rec.method === "CASH"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-blue-50 text-blue-700 border-blue-100"
                                }`}
                              >
                                {rec.method}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-slate-950">
                              {formatP(rec.amount)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const std = students.find((s) => s.id === rec.studentId);
                                  onOpenReceipt({
                                    ...rec,
                                    admissionNo: rec.admissionNo || (std ? std.admissionNo : "Unified/Family"),
                                    fatherName: rec.fatherName || std?.fatherName || std?.parentName || "",
                                    subtotal: rec.subtotal || rec.amount,
                                    discount: rec.discount || 0,
                                    arrears: rec.arrears || 0,
                                    amountInWords: rec.amountInWords || numberToIndianWords(rec.amount),
                                  });
                                }}
                                className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filtered.length > visibleReceiptsCount && (
                          <tr>
                            <td colSpan={8} className="py-4 text-center bg-slate-50/60 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setVisibleReceiptsCount((prev) => prev + 30)}
                                className="py-2 px-5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-600 text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                Load More Receipts (Showing {visibleReceipts.length} of {filtered.length})
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Double-Entry Ledger Sub-Tab */}
      {ledgerSubTab === "raw" && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Double-Entry Records Logs</span>
            <span>Total {ledgerEntries.length} items logged</span>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {(() => {
              const filtered = ledgerEntries.filter((log) => {
                const student = students.find((s) => s.id === log.studentId);
                const matchesSearch =
                  !ledgerSearch.trim() ||
                  student?.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                  log.description.toLowerCase().includes(ledgerSearch.toLowerCase());
                const matchesDate = !ledgerDate || log.createdAt.startsWith(ledgerDate);
                return matchesSearch && matchesDate;
              });

              if (filtered.length === 0) {
                return (
                  <p className="text-[10px] text-slate-400 font-semibold italic text-center py-6 bg-slate-50/50 rounded-lg">
                    No ledger items found matching filters.
                  </p>
                );
              }

              const visibleLedger = filtered.slice(0, visibleLedgerCount);

              return (
                <>
                  {visibleLedger.map((log) => {
                    const isCharge = log.type === "CHARGE" || log.type === "FINE";
                    const student = students.find((s) => s.id === log.studentId);
                    return (
                      <div
                        key={log.id}
                        className="p-3 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs font-semibold hover:bg-slate-50/50 transition-colors cv-auto-card"
                      >
                        <div>
                          <p className="font-black text-slate-800">
                            {student?.name || "Student"} ({student?.class}-{student?.section})
                          </p>
                          <p className="text-slate-500 font-semibold text-[10px] mt-0.5">{log.description}</p>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{log.createdAt}</span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-black ${isCharge ? "text-rose-600" : "text-emerald-600"}`}
                          >
                            {isCharge ? "+" : "-"} {formatP(log.amount)}
                          </span>
                          <span
                            className={`block text-[7px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded border self-end ${
                              isCharge
                                ? "bg-rose-50 border-rose-100 text-rose-800"
                                : "bg-green-50 border-green-100 text-green-800"
                            }`}
                          >
                            {log.type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length > visibleLedgerCount && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleLedgerCount((prev) => prev + 30)}
                        className="w-full py-2 px-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-600 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Load More Ledger Records (Showing {visibleLedger.length} of {filtered.length})
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}