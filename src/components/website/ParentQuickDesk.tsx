"use client";

import React from "react";
import Link from "next/link";
import {
  CreditCard,
  FileSpreadsheet,
  Calendar,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  Building2,
  Receipt,
} from "lucide-react";

export default function ParentQuickDesk() {
  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Parent Services</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Parent Self-Service Quick Desk
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            Easy access to fee payment details, digital marksheets, attendance percentage, and school office contact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: School Fee Deposit */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Fee Deposit & Receipts</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal mb-4">
                Pay monthly school fees easily at the school collection counter or check pending dues online.
              </p>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Offline Collection Counter:</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Open Mon to Sat (8:00 AM – 1:30 PM)</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <Receipt className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Digital Fee Receipts:</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Instant printable receipts inside Parent Portal</p>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/login"
              className="mt-6 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Login to Check Fee Dues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Digital Marksheets & Report Cards */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Marksheet & Attendance</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal mb-4">
                Check your child's unit test marks, quarterly results, daily attendance percentage, and teacher remarks.
              </p>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <span>Unit Test 1 & 2 Results</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">Online</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <span>Half Yearly & Annual Progress Card</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">Download</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <span>Daily Attendance & Leaves</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Live</span>
                </div>
              </div>
            </div>

            <Link
              href="/login"
              className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Parent Portal Sign In</span>
            </Link>
          </div>

          {/* Card 3: School Helpdesk & Timings */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">School Office & Helpdesk</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal mb-4">
                For questions regarding admission forms, TC certificate, uniforms, or fee concessions, contact our office.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                <p>
                  <strong>Office Phone:</strong>{" "}
                  <a href="tel:9452824318" className="text-indigo-600 font-bold hover:underline">
                    +91 9452824318
                  </a>
                </p>
                <p>
                  <strong>Office Email:</strong>{" "}
                  <a href="mailto:stgng2005@gmail.com" className="text-indigo-600 font-bold hover:underline">
                    stgng2005@gmail.com
                  </a>
                </p>
                <p>
                  <strong>Visiting Hours:</strong> Mon - Sat (8:00 AM – 1:30 PM)
                </p>
              </div>
            </div>

            <a
              href="https://wa.me/919452824318?text=Hello%20St.%20GNG%20School%20Office,%20I%20have%20an%20inquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>WhatsApp Office Helpdesk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
