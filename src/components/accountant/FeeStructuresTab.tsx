"use client";

import React, { useState } from "react";
import { PlusCircle, CheckCircle } from "lucide-react";
import { formatP, toPaisa } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";

interface FeeStructuresTabProps {
  feeHeads: { name: string; frequency: string }[];
  feeStructures: {
    name: string;
    frequency: string;
    total: number;
    className: string;
    items?: { headName: string; amount: number }[];
  }[];
  classes: { id: string; name: string; section: string }[];
  addFeeHead: (name: string, frequency?: string) => Promise<void>;
  addFeeStructure: (
    name: string,
    frequency: string,
    total: number,
    className?: string,
    items?: { headName: string; amount: number }[]
  ) => Promise<void>;
}

export default function FeeStructuresTab({
  feeHeads,
  feeStructures,
  classes,
  addFeeHead,
  addFeeStructure,
}: FeeStructuresTabProps) {
  const { showToast } = useAuth();
  const [newHead, setNewHead] = useState("");
  const [newStructName, setNewStructName] = useState("");
  const [newStructFreq, setNewStructFreq] = useState("monthly");
  const [newStructClass, setNewStructClass] = useState("All");
  const [structFeeInputs, setStructFeeInputs] = useState<Record<string, string>>({});
  const [structSuccess, setStructSuccess] = useState(false);

  const handleAddHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHead.trim()) return;
    addFeeHead(newHead.trim());
    showToast("success", "Fee Head Created", `Fee category "${newHead.trim()}" added to ledger.`);
    setNewHead("");
  };

  const handleAddStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStructName.trim()) return;

    const itemsList: { headName: string; amount: number }[] = [];
    let total = 0;

    Object.keys(structFeeInputs).forEach((headName) => {
      const val = toPaisa(parseFloat(structFeeInputs[headName]) || 0);
      if (val > 0) {
        itemsList.push({ headName, amount: val });
        total += val;
      }
    });

    if (itemsList.length === 0) {
      showToast("warning", "Invalid Amount", "Please enter a value greater than 0 for at least one Fee Head.");
      return;
    }

    addFeeStructure(newStructName.trim(), newStructFreq, total, newStructClass, itemsList);
    setNewStructName("");
    setNewStructFreq("monthly");
    setNewStructClass("All");
    setStructFeeInputs({});
    showToast("success", "Fee Structure Created", `Fee structure "${newStructName.trim()}" added successfully.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configure Fee Heads */}
      <div className="space-y-4 border-r border-slate-200/80 pr-0 lg:pr-6">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Configure School Fee Heads
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Create base ledger fee categories (e.g. Library Fees, Sports Fees).
          </p>
        </div>

        <form onSubmit={handleAddHead} className="flex gap-2">
          <input
            type="text"
            required
            value={newHead}
            onChange={(e) => setNewHead(e.target.value)}
            placeholder="e.g. Annual Exams Fee..."
            className="flex-1 text-xs font-semibold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
          />
          <button
            type="submit"
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" /> Add Head
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {feeHeads.map((head, index) => (
            <span
              key={index}
              className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md"
            >
              {head.name}
            </span>
          ))}
        </div>
      </div>

      {/* Configure Fee Structures */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
          Create Fee Structure (Auto-Billing)
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
          Set fees for a specific class. Saving instantly updates the 12-month billing ledger for all active students in that class.
        </p>

        <form onSubmit={handleAddStructure} className="space-y-3 bg-slate-50/40 p-4 border border-slate-200/60 rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Structure Name</label>
              <input
                type="text"
                required
                value={newStructName}
                onChange={(e) => setNewStructName(e.target.value)}
                placeholder="e.g. Class 10 Standard..."
                className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Class</label>
              <select
                value={newStructClass}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewStructClass(val);
                  if (!newStructName || newStructName.startsWith("Class ")) {
                    setNewStructName(`Class ${val} Standard Fees`);
                  }
                }}
                className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 shadow-sm cursor-pointer"
              >
                <option value="All">All Classes (Fallback)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    Class {cls.name} &mdash; {cls.section}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Charge Frequency</label>
              <select
                value={newStructFreq}
                onChange={(e) => setNewStructFreq(e.target.value)}
                className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 shadow-sm cursor-pointer"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="exam">Exam</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Amount (Rs.)</label>
              <div className="w-full text-xs font-black py-2 px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-indigo-700 select-none">
                {formatP(Object.values(structFeeInputs).reduce((sum, val) => sum + toPaisa(parseFloat(val) || 0), 0))}
              </div>
            </div>
          </div>

          {/* Itemized Fee Heads Input Grid */}
          <div className="space-y-2 border-t border-slate-200/80 pt-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Itemized Fee Heads</span>
            {feeHeads.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold italic">Please create Fee Types on the left side first.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {feeHeads.map((head) => (
                  <div key={head.name} className="flex flex-col gap-1 p-2 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                    <label className="text-[9px] font-black text-slate-500 truncate uppercase">{head.name}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-bold text-slate-400">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={structFeeInputs[head.name] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStructFeeInputs((prev) => ({ ...prev, [head.name]: val }));
                        }}
                        className="w-full text-xs font-bold p-1 border border-slate-200/60 rounded focus:outline-none focus:border-indigo-650"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer">
            Save Structure Template
          </button>
        </form>

        {/* List of structures */}
        <div className="space-y-2 pt-3 border-t border-slate-200/80">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Available Structures</p>
          <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {feeStructures.map((struct, idx) => (
              <div key={idx} className="p-3 border border-slate-200/80 rounded-xl bg-slate-50/40 hover:bg-slate-50 transition-all text-xs font-semibold flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-800 font-bold text-xs">{struct.name}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      <span className="text-[8px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded leading-none">
                        {struct.frequency}
                      </span>
                      <span className="text-[8px] font-black uppercase bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded leading-none">
                        Class: {struct.className || "All"}
                      </span>
                    </div>
                  </div>
                  <span className="text-indigo-600 font-black text-xs">₹{struct.total.toLocaleString("en-IN")}</span>
                </div>
                
                {struct.items && struct.items.length > 0 && (
                  <div className="bg-white/80 border border-slate-100/50 rounded-lg p-2 divide-y divide-slate-100/80">
                    {struct.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex justify-between items-center py-1 text-[10px] text-slate-500 font-medium first:pt-0 last:pb-0">
                        <span>{item.headName}</span>
                        <span className="font-bold text-slate-700">₹{item.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}