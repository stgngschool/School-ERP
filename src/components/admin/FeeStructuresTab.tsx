"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  Trash2,
  Settings,
  Check,
  Loader2,
} from "lucide-react";
import { toPaisa } from "@/lib/currency";

interface FeeStructuresTabProps {
  feeHeads: any[];
  feeStructures: any[];
  classes: any[];
  filteredSortedClasses: any[];
  students: any[];
  schoolInfo: any;
  updateSchoolInfo: (updates: any) => Promise<any>;
  addFeeHead: (name: string, frequency: string) => Promise<any> | any;
  removeFeeHead: (name: string) => Promise<any> | any;
  addFeeStructure: (name: string, frequency: string, total: number, className: string, items: any[]) => Promise<any> | any;
  addClass: (name: string, section: string) => Promise<any> | any;
  removeClass: (id: string) => Promise<any> | any;
  refreshBilling: () => Promise<any> | any;
  showToast: (type: any, title: string, message: string) => void;
}

export default function FeeStructuresTab({
  feeHeads,
  feeStructures,
  classes,
  filteredSortedClasses,
  students,
  schoolInfo,
  updateSchoolInfo,
  addFeeHead,
  removeFeeHead,
  addFeeStructure,
  addClass,
  removeClass,
  refreshBilling,
  showToast,
}: FeeStructuresTabProps) {
  // Late Fee Rules & Configure Sub-tabs
  const [feeSubTab, setFeeSubTab] = useState<"matrix" | "late_fine" | "billing_engine">("matrix");
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(10);
  const [lateFeeAmount, setLateFeeAmount] = useState(50);
  const [lateFeeType, setLateFeeType] = useState<"FLAT" | "PER_DAY">("FLAT");
  const [lateFeeSaving, setLateFeeSaving] = useState(false);

  useEffect(() => {
    if (schoolInfo) {
      setLateFeeEnabled(schoolInfo.enableLateFee ?? false);
      setLateFeeGraceDays(schoolInfo.lateFeeGraceDays ?? 10);
      setLateFeeAmount(schoolInfo.lateFeeAmount ?? 50);
      setLateFeeType((schoolInfo.lateFeeType as "FLAT" | "PER_DAY") || "FLAT");
    }
  }, [schoolInfo]);

  const handleSaveLateFeeRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setLateFeeSaving(true);
    try {
      // ── SCH-02: Merge late-fee fields into the already-loaded schoolInfo state
      // instead of doing a GET→merge→POST which can cause concurrent-update races.
      await updateSchoolInfo({
        enableLateFee: lateFeeEnabled,
        lateFeeGraceDays,
        lateFeeAmount,
        lateFeeType,
      });
      showToast("success", "Late Fee Rules Saved", "Automatic fine calculation rules updated successfully.");
    } catch (err: any) {
      showToast("error", "Save Failed", err?.message || "Failed to save late fee rules.");
    } finally {
      setLateFeeSaving(false);
    }
  };

  // Single Student / Class Ledger Generator in Configure Fees
  const [ledgerGenTarget, setLedgerGenTarget] = useState<"single" | "class" | "all">("single");
  const [ledgerGenStudentSearch, setLedgerGenStudentSearch] = useState("");
  const [ledgerGenSelectedStudentId, setLedgerGenSelectedStudentId] = useState("");
  const [ledgerGenClass, setLedgerGenClass] = useState("All");
  const [ledgerGenStartMonth, setLedgerGenStartMonth] = useState("April");
  const [ledgerGenFeeHead, setLedgerGenFeeHead] = useState("ALL");
  const [ledgerGenLoading, setLedgerGenLoading] = useState(false);
  const [ledgerGenResult, setLedgerGenResult] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Fee Config States
  const [newHead, setNewHead] = useState("");
  const [newHeadFreq, setNewHeadFreq] = useState("monthly");
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("A");

  const [gridInputs, setGridInputs] = useState<Record<string, Record<string, string>>>({});
  const [gridFrequencies, setGridFrequencies] = useState<Record<string, string>>({});

  const cleanFeeHeads = useMemo(() => {
    return feeHeads.filter(
      (h) =>
        !h.name.toLowerCase().startsWith("tuition_") &&
        !h.name.toLowerCase().startsWith("fee_")
    );
  }, [feeHeads]);

  useEffect(() => {
    const inputs: Record<string, Record<string, string>> = {};
    const freqs: Record<string, string> = {};

    // 1. Initialize General Fallback row (All Classes)
    inputs["All"] = {};
    freqs["All"] = "monthly";
    const generalStruct = feeStructures.find(fs => fs.className === "All");
    cleanFeeHeads.forEach((head) => {
      inputs["All"][head.name] = "";
    });
    if (generalStruct) {
      freqs["All"] = generalStruct.frequency;
      if (generalStruct.items) {
        generalStruct.items.forEach((item: any) => {
          inputs["All"][item.headName] = String(item.amount);
        });
      }
    }

    // 2. Initialize dynamic classes rows
    classes.forEach((cls) => {
      inputs[cls.id] = {};
      freqs[cls.id] = "monthly";

      const templateName = `Class ${cls.name} Fees Template`;
      const struct = feeStructures.find(
        (fs) => fs.className === cls.name || fs.name === templateName
      );

      cleanFeeHeads.forEach((head) => {
        inputs[cls.id][head.name] = "";
      });

      if (struct) {
        freqs[cls.id] = struct.frequency;
        if (struct.items) {
          struct.items.forEach((item: any) => {
            inputs[cls.id][item.headName] = String(item.amount);
          });
        }
      }
    });

    setGridInputs(inputs);
    setGridFrequencies(freqs);
  }, [classes, cleanFeeHeads, feeStructures]);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newClassSection) return;
    addClass(newClassName, newClassSection);
    showToast("success", "Class Added", `Class ${newClassName}-${newClassSection} created successfully.`);
    setNewClassName("");
    setNewClassSection("A");
  };

  const handleAddHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHead) return;
    addFeeHead(newHead, newHeadFreq);
    showToast("success", "Fee Head Created", `Fee category "${newHead}" created successfully.`);
    setNewHead("");
    setNewHeadFreq("monthly");
  };

  const handleSaveClassGrid = (clsId: string, className: string) => {
    const freq = gridFrequencies[clsId] || "monthly";
    const inputs = gridInputs[clsId] || {};
    const templateName = `Class ${className} Fees Template`;
    const itemsList: { headName: string; amount: number }[] = [];
    let total = 0;

    Object.keys(inputs).forEach(headName => {
      const val = toPaisa(parseFloat(inputs[headName]) || 0);
      if (val > 0) {
        itemsList.push({ headName, amount: val });
        total += val;
      }
    });

    addFeeStructure(templateName, freq, total, className, itemsList);
    showToast("success", "Fee Schedule Saved", `Class ${className} fee schedule updated successfully.`);
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* Configure Fees Sub-Navigation Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFeeSubTab("matrix")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              feeSubTab === "matrix" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>📋 Class Fee Structure Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setFeeSubTab("late_fine")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              feeSubTab === "late_fine" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>⏰ Optional Late Fine Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setFeeSubTab("billing_engine")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              feeSubTab === "billing_engine" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>⚡ Billing Operations Hub</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-bold px-2 hidden sm:inline">
          Enterprise Fee Rules &amp; Batch Management
        </span>
      </div>

      {/* VIEW 1: OPTIONAL LATE FINE RULES PANEL */}
      {feeSubTab === "late_fine" && (
        <div className="stripe-card p-6 bg-white border border-slate-200/80 space-y-6 animate-fade-in rounded-2xl shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Optional Late Fee &amp; Fine Automation Rules
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set automated late fees or keep them completely disabled for local school flexibility.
                </p>
              </div>
            </div>

            {/* Enable / Disable Toggle Switch */}
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <span className="text-xs font-extrabold text-slate-700">
                {lateFeeEnabled ? "Late Fine ENABLED" : "Late Fine DISABLED"}
              </span>
              <button
                type="button"
                onClick={() => setLateFeeEnabled(!lateFeeEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  lateFeeEnabled ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    lateFeeEnabled ? "left-6" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveLateFeeRules} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Grace Period Days */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                  Due Date Grace Period (Day of Month)
                </label>
                <select
                  disabled={!lateFeeEnabled}
                  value={lateFeeGraceDays}
                  onChange={(e) => setLateFeeGraceDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 disabled:opacity-50 cursor-pointer"
                >
                  {[5, 10, 15, 20, 25].map((d) => (
                    <option key={d} value={d}>
                      Due by {d}th of every month
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Fees paid after this day are flagged late.</p>
              </div>

              {/* Fine Calculation Type */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                  Fine Calculation Mode
                </label>
                <select
                  disabled={!lateFeeEnabled}
                  value={lateFeeType}
                  onChange={(e) => setLateFeeType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 disabled:opacity-50 cursor-pointer"
                >
                  <option value="FLAT">Flat One-Time Fine (e.g. ₹50)</option>
                  <option value="PER_DAY">Per-Day Rate (e.g. ₹5 per day)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Choose flat charge or progressive daily rate.</p>
              </div>

              {/* Fine Amount */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                  Fine Amount (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={!lateFeeEnabled}
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 disabled:opacity-50"
                  placeholder="e.g. 50"
                />
                <p className="text-[10px] text-slate-400 mt-1">Amount applied when fine triggers.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="submit"
                disabled={lateFeeSaving}
                className="inline-flex items-center gap-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 cursor-pointer transition-all disabled:opacity-60"
              >
                {lateFeeSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Rules...</span>
                  </>
                ) : (
                  <span>Save Late Fee Rules</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: BILLING OPERATIONS ENGINE HUB */}
      {feeSubTab === "billing_engine" && (
        <div className="stripe-card p-6 bg-gradient-to-r from-indigo-50/90 via-white to-emerald-50/90 border border-indigo-100 shadow-sm space-y-4 animate-fade-in rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  ⚡ Generate / Sync Student Dues Ledger
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Generate or update monthly fee ledger charges for a single student, a specific class, or all active students.
                  <span className="block mt-1 text-amber-600 font-bold">⚠️ Note: This is a fallback utility. Regular monthly bills are auto-generated when you save the Fee Structure Matrix!</span>
                </p>
              </div>
            </div>

            {/* Duplicate Cleanup Button */}
            <button
              type="button"
              disabled={cleanupLoading}
              onClick={async () => {
                setCleanupLoading(true);
                try {
                  const res = await fetch("/api/fee-config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "CLEANUP_DUPLICATES" }),
                  });
                  const json = await res.json();
                  setLedgerGenResult(`✓ Cleaned up ${json.cleanedCount || 0} duplicate unpaid entries.`);
                  await refreshBilling();
                } catch (err) {
                  setLedgerGenResult("Failed to cleanup duplicates.");
                } finally {
                  setCleanupLoading(false);
                  setTimeout(() => setLedgerGenResult(null), 5000);
                }
              }}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 transition-all"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {cleanupLoading ? "Cleaning..." : "🧹 Clean Up Duplicates"}
            </button>
          </div>

          {/* DYNAMIC 2-ROW CONTROL LAYOUT */}
          <div className="space-y-4 pt-1">
            {/* Row 1: Target & Category Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end relative z-30">
              {/* Target Selector */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">1. Select Target</label>
                <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setLedgerGenTarget("single")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${ledgerGenTarget === "single" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500"}`}
                  >
                    Single Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerGenTarget("class")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${ledgerGenTarget === "class" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500"}`}
                  >
                    Class-wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerGenTarget("all")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${ledgerGenTarget === "all" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500"}`}
                  >
                    All Students
                  </button>
                </div>
              </div>

              {/* Target Field Input */}
              {ledgerGenTarget === "single" && (
                <div className="relative z-50">
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">2. Search Student</label>
                  <input
                    type="text"
                    placeholder="Type student name or admission no..."
                    value={ledgerGenStudentSearch}
                    onChange={(e) => {
                      setLedgerGenStudentSearch(e.target.value);
                      setLedgerGenSelectedStudentId("");
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {ledgerGenStudentSearch && !ledgerGenSelectedStudentId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200/90 rounded-2xl shadow-2xl max-h-44 overflow-y-auto z-[99999] p-1.5 divide-y divide-slate-100 animate-scale-in">
                      {students.filter((s: any) => 
                        s.name.toLowerCase().includes(ledgerGenStudentSearch.toLowerCase()) ||
                        s.admissionNo?.toLowerCase().includes(ledgerGenStudentSearch.toLowerCase())
                      ).slice(0, 6).map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setLedgerGenSelectedStudentId(s.id);
                            setLedgerGenStudentSearch(`${s.name} (${s.admissionNo} • Cl ${s.class})`);
                          }}
                          className="w-full text-left p-2 hover:bg-indigo-50/80 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all cursor-pointer"
                        >
                          <div>
                            <p className="font-extrabold text-slate-800">{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-normal">Class: {s.class}</p>
                          </div>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-mono font-bold">
                            ADM: {s.admissionNo}
                          </span>
                        </button>
                      ))}
                      {students.filter((s: any) => 
                        s.name.toLowerCase().includes(ledgerGenStudentSearch.toLowerCase()) ||
                        s.admissionNo?.toLowerCase().includes(ledgerGenStudentSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="p-3 text-[10px] text-slate-400 text-center">No student found matching query.</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {ledgerGenTarget === "class" && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">2. Select Class</label>
                  <select
                    value={ledgerGenClass}
                    onChange={(e) => setLedgerGenClass(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="All">All Classes</option>
                    {["KG", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"].map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>
              )}

              {ledgerGenTarget === "all" && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">2. Target Scope</label>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                    Entire Active Cohort ({students.length} Students)
                  </div>
                </div>
              )}

              {/* Fee Type Category Selection */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">3. Fee Category / Type</label>
                <select
                  value={ledgerGenFeeHead}
                  onChange={(e) => setLedgerGenFeeHead(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="ALL">ALL Fee Types (Full Session Dues)</option>
                  {cleanFeeHeads.map((h: any) => (
                    <option key={h.name} value={h.name}>
                      {h.name} ({h.frequency === "monthly" ? "Monthly" : h.frequency === "one_time" ? "One-Time" : h.frequency === "annual" ? "Annual" : "Exam"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Dynamic Context Parameter & Action Button */}
            {(() => {
              const selectedHeadObj = cleanFeeHeads.find((h: any) => h.name === ledgerGenFeeHead);
              const headFreq = ledgerGenFeeHead === "ALL" ? "monthly" : selectedHeadObj?.frequency || "monthly";
              const isMonthlyOrAll = headFreq === "monthly" || ledgerGenFeeHead === "ALL";

              return (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in relative z-10">
                  {/* Dynamic Parameter Control */}
                  <div className="flex-1">
                    {isMonthlyOrAll ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="text-xs font-black uppercase text-slate-700 shrink-0">
                          Fee Applicable From Month:
                        </label>
                        <select
                          value={ledgerGenStartMonth}
                          onChange={(e) => setLedgerGenStartMonth(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                        >
                          {["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"].map(m => (
                            <option key={m} value={m}>{m} (Billing through March)</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 w-fit">
                        <CheckCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>
                          {headFreq === "one_time" && "One-Time Admission / Registration Fee (Fixed Charge)"}
                          {headFreq === "annual" && "Annual Session Charge (Fixed Annual Fee)"}
                          {headFreq === "exam" && "Exam Cycle Charges (October, March & May Exams)"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={ledgerGenLoading || (ledgerGenTarget === "single" && !ledgerGenSelectedStudentId)}
                      onClick={async () => {
                        setLedgerGenLoading(true);
                        setLedgerGenResult(null);
                        try {
                          const res = await fetch("/api/fee-config", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "GENERATE_STUDENT_LEDGER",
                              studentId: ledgerGenTarget === "single" ? ledgerGenSelectedStudentId : undefined,
                              className: ledgerGenTarget === "class" ? ledgerGenClass : ledgerGenTarget === "all" ? "All" : undefined,
                              startingFeeMonth: ledgerGenStartMonth,
                              targetFeeHeadName: ledgerGenFeeHead,
                            }),
                          });
                          if (!res.ok) {
                            const text = await res.text();
                            try { const json = JSON.parse(text); throw new Error(json.error || "Failed"); }
                            catch { throw new Error(`HTTP Error: ${res.status}`); }
                          }
                          const json = await res.json();
                          setLedgerGenResult(`✓ Generated: ${json.generated || 0} | Skipped: ${json.skipped || 0}`);
                          await refreshBilling();
                        } catch (err: any) {
                          setLedgerGenResult(`Error: ${err.message || "Failed"}`);
                        } finally {
                          setLedgerGenLoading(false);
                          setTimeout(() => setLedgerGenResult(null), 6000);
                        }
                      }}
                      className="w-full md:w-auto py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20"
                    >
                      {ledgerGenLoading ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      ) : (
                        <CheckCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>⚡ Generate Dues Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {ledgerGenResult && (
            <div className="text-xs font-extrabold text-indigo-900 bg-indigo-50/90 border border-indigo-200 p-2.5 rounded-xl animate-fade-in flex items-center gap-2">
              <span>{ledgerGenResult}</span>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CLASS FEE STRUCTURE MATRIX */}
      {feeSubTab === "matrix" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
          {/* Left Panel: Matrix */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 sm:rounded-2xl rounded-xl p-3 sm:p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Fee Structure Matrix (Auto-Billing)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  1. First set the &quot;Global Default&quot; fees and click Save. <br/>
                  2. Then override amounts for specific classes if they differ, and save their rows.
                </p>
                <div className="mt-2 bg-indigo-50/80 border border-indigo-200/60 p-2.5 rounded-lg text-[10px] text-indigo-700 font-bold flex items-start gap-1.5 animate-fade-in shadow-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Saving a row instantly updates the 12-month billing ledger for all active students in that class. Existing unpaid amounts are adjusted automatically.</p>
                </div>
              </div>
            </div>

            {cleanFeeHeads.length === 0 ? (
              <div className="border-2 border-dashed border-indigo-200 rounded-xl py-10 text-center">
                <div className="text-3xl mb-2">&#128073;</div>
                <p className="text-xs font-bold text-slate-500">Please create Fee Types in the right-hand panel first</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">e.g. Tuition Fee (Monthly), Transport Fee (Monthly), Admission Fee (One-Time)</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80">
                      <th className="py-3 px-4 text-[9px] font-black uppercase text-slate-400 tracking-wider">Class &amp; Section</th>
                      {cleanFeeHeads.map((head) => {
                        const freqColor: Record<string,string> = {
                          monthly: "text-blue-600 bg-blue-50 border-blue-200",
                          annual: "text-amber-600 bg-amber-50 border-amber-200",
                          one_time: "text-green-600 bg-green-50 border-green-200",
                          exam: "text-purple-600 bg-purple-50 border-purple-200",
                          ad_hoc: "text-slate-500 bg-slate-50 border-slate-200",
                        };
                        const freqLabel: Record<string,string> = {
                          monthly: "12×/yr",
                          annual: "1×/yr",
                          one_time: "Once",
                          exam: "Exam",
                          ad_hoc: "Manual",
                        };
                        return (
                          <th key={head.name} className="py-3 px-4 text-right min-w-[130px]">
                            <div className="text-[9px] font-black uppercase text-slate-600">{head.name}</div>
                            <span className={`text-[7px] border px-1.5 py-0.5 rounded-full font-black uppercase mt-0.5 inline-block ${freqColor[head.frequency] || "text-slate-500 bg-slate-50 border-slate-200"}`}>
                              {freqLabel[head.frequency] || head.frequency}
                            </span>
                          </th>
                        );
                      })}
                      <th className="py-3 px-4 text-center text-[9px] font-black uppercase text-slate-400 tracking-wider min-w-[110px]">Save Row</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {/* Fallback Row */}
                    <tr className="hover:bg-slate-50/50 bg-indigo-50/40 border-b-2 border-indigo-200 shadow-sm relative z-10">
                      <td className="py-4 px-4 bg-indigo-100/30">
                        <div className="font-black text-indigo-800 text-xs flex items-center gap-1.5">
                          <Settings className="h-3.5 w-3.5" /> Global Default
                        </div>
                        <div className="text-[9px] text-indigo-600 font-bold mt-1 leading-tight">Applied to all classes unless overridden below</div>
                      </td>
                      {cleanFeeHeads.map((head) => (
                        <td key={head.name} className="py-2 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-400 font-bold">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={gridInputs["All"]?.[head.name] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGridInputs(prev => ({
                                  ...prev,
                                  All: { ...(prev.All || {}), [head.name]: val }
                                }));
                              }}
                              className="w-full text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 text-right min-w-[80px]"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveClassGrid("All", "All")}
                          className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer w-full shadow-sm hover:shadow"
                        >
                          <Check className="h-3.5 w-3.5" /> Save
                        </button>
                      </td>
                    </tr>

                    {/* Dynamic Class Rows */}
                    {filteredSortedClasses.length > 0 ? (
                      filteredSortedClasses.map((cls) => {
                        const annualTotal = cleanFeeHeads.reduce((sum, head) => {
                          const amt = parseFloat(gridInputs[cls.id]?.[head.name] || "0") || 0;
                          if (head.frequency === "monthly") return sum + amt * 12;
                          if (head.frequency === "annual") return sum + amt;
                          if (head.frequency === "one_time") return sum + amt;
                          if (head.frequency === "exam") return sum + amt;
                          return sum + amt;
                        }, 0);
                        return (
                          <tr key={cls.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 text-xs">Class {cls.name} &mdash; {cls.section}</div>
                              {annualTotal > 0 && (
                                <div className="text-[9px] text-emerald-600 font-bold mt-0.5">
                                  &asymp; ₹{annualTotal.toLocaleString("en-IN")}/year
                                </div>
                              )}
                            </td>
                            {cleanFeeHeads.map((head) => (
                              <td key={head.name} className="py-2.5 px-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-slate-400 font-bold">Rs.</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={gridInputs[cls.id]?.[head.name] ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGridInputs(prev => ({
                                        ...prev,
                                        [cls.id]: { ...(prev[cls.id] || {}), [head.name]: val }
                                      }));
                                    }}
                                    className="w-full text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-right min-w-[80px]"
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleSaveClassGrid(cls.id, cls.name)}
                                className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer w-full shadow-sm hover:shadow"
                              >
                                <Check className="h-3.5 w-3.5" /> Save
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={2 + cleanFeeHeads.length} className="text-center py-8 text-slate-400 italic text-xs">
                          Please create classes in Right Panel &rarr; Card 1 first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Auto-billing calendar preview */}
            {cleanFeeHeads.some(h => h.frequency === "monthly") && (
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Auto-Generated Monthly Bills (April &rarr; March)</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map((m) => (
                    <span key={m} className="text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 font-bold mt-2 flex items-start gap-1 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 
                  <span>The system automatically generates and updates these 12 monthly bills in the background upon saving the matrix &mdash; no manual generation required!</span>
                </p>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1 space-y-5">
            {/* Card 1: Manage Classes */}
            <div className="bg-white border border-slate-200/80 sm:rounded-2xl rounded-xl p-3 sm:p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">1. Classes &amp; Sections</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Create classes and sections for your school (KG to 12th).</p>
              </div>

              <form onSubmit={handleAddClass} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Class</label>
                    <input
                      type="text"
                      required
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g. 1, 10, KG"
                      className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</label>
                    <input
                      type="text"
                      required
                      value={newClassSection}
                      onChange={(e) => setNewClassSection(e.target.value)}
                      placeholder="e.g. A, B"
                      className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" /> Add Class
                </button>
              </form>

              <div className="space-y-1.5 pt-3 border-t border-slate-200/80">
                <p className="text-[9px] font-black uppercase text-slate-400">Active Classes ({filteredSortedClasses.length})</p>
                <div className="space-y-1 max-h-[130px] overflow-y-auto pr-1">
                  {filteredSortedClasses.length > 0 ? (
                    filteredSortedClasses.map((cls) => (
                      <div key={cls.id} className="flex justify-between items-center p-2 border border-slate-200/80 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all">
                        <span>Class {cls.name} &mdash; {cls.section}</span>
                        <button
                          type="button"
                          onClick={() => removeClass(cls.id)}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-all cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic py-3 text-center">No classes created yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Manage Fee Types */}
            <div className="bg-white border border-slate-200/80 sm:rounded-2xl rounded-xl p-3 sm:p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">2. Fee Types (Heads)</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define fee name and billing cycle. Select billing frequency rather than writing specific months.</p>
              </div>

              {/* Frequency selector cards */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { freq: "monthly", label: "Monthly", desc: "Apr–Mar (12 auto)", color: "border-blue-200 text-blue-700", bg: "bg-blue-50", active: "ring-2 ring-blue-400" },
                  { freq: "annual", label: "Annual", desc: "1 bill/year", color: "border-amber-200 text-amber-700", bg: "bg-amber-50", active: "ring-2 ring-amber-400" },
                  { freq: "one_time", label: "One-Time", desc: "Only once", color: "border-green-200 text-green-700", bg: "bg-green-50", active: "ring-2 ring-green-400" },
                  { freq: "exam", label: "Exam Cycle", desc: "During exams", color: "border-purple-200 text-purple-700", bg: "bg-purple-50", active: "ring-2 ring-purple-400" },
                ].map(({ freq, label, desc, color, bg, active }) => (
                  <div
                    key={freq}
                    onClick={() => setNewHeadFreq(freq)}
                    className={`${bg} border ${color} rounded-lg p-2 text-center cursor-pointer transition-all hover:scale-[1.02] ${newHeadFreq === freq ? active : ""}`}
                  >
                    <div className={`text-[10px] font-black uppercase ${color.split(" ")[1]}`}>{label}</div>
                    <div className="text-[8px] font-semibold text-slate-500 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddHead} className="space-y-2.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fee Type Name</label>
                  <input
                    type="text"
                    required
                    value={newHead}
                    onChange={(e) => setNewHead(e.target.value)}
                    placeholder="e.g. Tuition Fee, Transport Fee..."
                    className="w-full text-xs font-semibold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Billing Cycle (Selected above)</label>
                  <select
                    value={newHeadFreq}
                    onChange={(e) => setNewHeadFreq(e.target.value)}
                    className="w-full text-xs font-black py-1.5 px-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  >
                    <option value="monthly">Monthly — April to March (12 auto-bills)</option>
                    <option value="annual">Annual — Once a year (April)</option>
                    <option value="one_time">One-Time — Admission / Registration</option>
                    <option value="exam">Exam Cycle — Charged during exams</option>
                    <option value="ad_hoc">Ad-hoc — Fine / Manual fee</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" /> Add Fee Type
                </button>
              </form>

              {cleanFeeHeads.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-slate-200/80">
                  <p className="text-[9px] font-black uppercase text-slate-400">Configured Fee Types ({cleanFeeHeads.length})</p>
                  <div className="space-y-1 max-h-[170px] overflow-y-auto pr-1">
                    {cleanFeeHeads.map((head, index) => {
                      const freqMeta: Record<string,{label:string; color:string}> = {
                        monthly:  { label: "Monthly — 12×/yr",  color: "bg-blue-50 border-blue-200 text-blue-700" },
                        annual:   { label: "Annual — 1×/yr",    color: "bg-amber-50 border-amber-200 text-amber-700" },
                        one_time: { label: "One-Time",         color: "bg-green-50 border-green-200 text-green-700" },
                        exam:     { label: "Exam Cycle",       color: "bg-purple-50 border-purple-200 text-purple-700" },
                        ad_hoc:   { label: "Ad-hoc",           color: "bg-slate-100 border-slate-200 text-slate-600" },
                      };
                      const meta = freqMeta[head.frequency] || { label: head.frequency, color: "bg-slate-100 border-slate-200 text-slate-600" };
                      return (
                        <div key={index} className="flex items-center justify-between p-2 border border-slate-200/80 rounded-lg bg-slate-50/50 hover:bg-slate-50 group transition-all">
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-slate-700 truncate">{head.name}</div>
                            <span className={`text-[8px] border px-1.5 py-0.5 rounded-full font-bold mt-0.5 inline-block ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFeeHead(head.name)}
                            className="ml-2 text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 flex-shrink-0"
                            title="Delete Fee Type"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
