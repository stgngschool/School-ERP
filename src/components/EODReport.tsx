"use client";

import React from "react";
import { Calculator, Wallet, ArrowRightLeft, CheckCircle } from "lucide-react";
import { formatP } from "@/lib/currency";

interface EODReportProps {
  cashCollected: number;
  upiCollected: number;
}

export default function EODReport({ cashCollected, upiCollected }: EODReportProps) {
  const totalCollections = cashCollected + upiCollected;
  const netCashInHand = cashCollected;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
            End of Day (EOD) Settlement
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">
            Closing register for {today}
          </p>
        </div>
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> Close Register & Print
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Collections */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Collections</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
              {formatP(totalCollections)}
            </h3>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Cash Receipts:</span>
              <span className="text-slate-800">{formatP(cashCollected)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>UPI Receipts:</span>
              <span className="text-slate-800">{formatP(upiCollected)}</span>
            </div>
          </div>
        </div>

        {/* Net Settlement */}
        <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-600/20 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Net Cash in Drawer</span>
              <span className="p-2 bg-indigo-500 text-white rounded-lg">
                <Calculator className="w-4 h-4" />
              </span>
            </div>
            <h3 className="text-4xl font-black tracking-tight">
              {formatP(netCashInHand)}
            </h3>
          </div>
          <div className="mt-5 pt-4 border-t border-indigo-500/50">
            <p className="text-[10px] font-medium text-indigo-200 leading-relaxed">
              This amount reflects the physical cash that should be available in the drawer. UPI collections are settled directly to the bank.
            </p>
          </div>
        </div>

      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
        <ArrowRightLeft className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Settlement Instructions</h4>
          <p className="text-xs text-amber-700/80 font-medium leading-relaxed">
            Please verify that the physical cash in your drawer matches the <strong>Net Cash in Drawer</strong> amount above. Once verified, click "Close Register & Print" to generate the EOD slip for bank deposits. Any discrepancies must be reported to the administrator immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
