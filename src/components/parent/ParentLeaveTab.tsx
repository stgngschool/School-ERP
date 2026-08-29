"use client";

import React, { useState } from "react";
import { Clock, CheckCircle, XCircle, AlertCircle, Paperclip, Loader2 } from "lucide-react";
import ModernDatePicker from "@/components/ModernDatePicker";
import { MockStudent, MockLeaveRequest } from "@/context/AuthContext";

interface ParentLeaveTabProps {
  child: MockStudent | undefined;
  leaveRequests: MockLeaveRequest[];
  applyLeave: (
    studentId: string,
    startDate: string,
    endDate: string,
    reason: string,
    file?: File | null
  ) => Promise<void> | void;
}

export default function ParentLeaveTab({ child, leaveRequests, applyLeave }: ParentLeaveTabProps) {
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveSuccess, setShowLeaveSuccess] = useState(false);

  const childLeaves = child ? leaveRequests.filter((l) => l.studentId === child.id) : [];

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || !leaveStart || !leaveEnd || !leaveReason) return;
    setLeaveLoading(true);

    try {
      applyLeave(child.id, leaveStart, leaveEnd, leaveReason);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      setShowLeaveSuccess(true);
      setTimeout(() => setShowLeaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to submit leave request:", err);
    } finally {
      setLeaveLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in text-left pb-12 font-sans">
      <div className="bg-white border border-slate-200/80 p-4 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-4 contain-paint">
        <div>
          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
            Official Absence Request
          </span>
          <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
            Apply Leave for {child?.name}
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            Submit leave request directly to the class teacher and principal.
          </p>
        </div>

        {showLeaveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            Leave application submitted successfully! Teacher will review.
          </div>
        )}

        <form onSubmit={handleApplyLeave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Start Date *
              </label>
              <ModernDatePicker
                value={leaveStart}
                onChange={(val) => setLeaveStart(val)}
                placeholder="Select start date"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                End Date *
              </label>
              <ModernDatePicker
                value={leaveEnd}
                onChange={(val) => setLeaveEnd(val)}
                placeholder="Select end date"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Reason for Absence *
            </label>
            <textarea
              required
              rows={3}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Medical illness, family emergency..."
              className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 resize-none text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={leaveLoading || !leaveStart || !leaveEnd || !leaveReason}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
          >
            {leaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {leaveLoading ? "Submitting Request..." : "Submit Leave Application"}
          </button>
        </form>
      </div>

      {/* Leave Application History */}
      <div className="bg-white border border-slate-200/80 p-4 sm:p-6 sm:rounded-2xl rounded-xl shadow-sm space-y-3 contain-paint">
        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
          Leave History ({childLeaves.length} Requests)
        </h3>

        {childLeaves.length > 0 ? (
          <div className="divide-y divide-slate-100 space-y-2">
            {childLeaves.map((leave) => (
              <div key={leave.id} className="pt-2 flex items-center justify-between text-xs cv-auto-card">
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {leave.startDate} ➔ {leave.endDate}
                  </span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{leave.reason}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    leave.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : leave.status === "REJECTED"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {leave.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-400 py-6 text-center italic">
            No previous leave applications recorded.
          </p>
        )}
      </div>
    </div>
  );
}