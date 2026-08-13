"use client";

import React, { useState } from "react";
import { PlusCircle, Receipt, Trash2, Calendar } from "lucide-react";
import { formatP } from "@/lib/currency";

export type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  addedBy: string;
};

interface ExpenseRegisterProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

export default function ExpenseRegister({ expenses, setExpenses }: ExpenseRegisterProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Utility");
  const [description, setDescription] = useState("");

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().slice(0, 10),
      category,
      description,
      // store internally as paisa/cents for consistency with formatP
      amount: parseFloat(amount) * 100, 
      addedBy: "Accountant"
    };

    setExpenses([newExpense, ...expenses]);
    setAmount("");
    setDescription("");
  };

  const handleDelete = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
            Daily Expense Register
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">
            Record day-to-day school expenses from petty cash.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm md:col-span-1 h-fit">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" /> Add New Expense
          </h4>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Amount (₹)</label>
              <input 
                type="number" 
                required 
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full text-sm font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white"
              >
                <option value="Utility">Utility (Electricity/Water)</option>
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Transport">Transport / Fuel</option>
                <option value="Stationery">Office Stationery</option>
                <option value="Misc">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Plumber for fixing tap"
                rows={2}
                className="w-full text-sm font-medium py-2 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 resize-none"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20"
            >
              Record Expense
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm md:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Receipt className="w-4 h-4" /> Recent Expenses
            </h4>
          </div>
          <div className="p-0 overflow-x-auto">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-sm">
                No expenses recorded yet.
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {exp.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 truncate max-w-[200px]">
                        {exp.description}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-amber-600">
                        {formatP(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
