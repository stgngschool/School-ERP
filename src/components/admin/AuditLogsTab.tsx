"use client";

import React, { useState } from "react";

interface AuditLog {
  id: string;
  userName: string;
  role: string;
  action: string;
  createdAt: string;
}

interface AuditLogsTabProps {
  auditLogs: AuditLog[];
}

export default function AuditLogsTab({ auditLogs }: AuditLogsTabProps) {
  // ── M-12: Pagination limit for System Security Audit Logs
  const [auditLogLimit, setAuditLogLimit] = useState(50);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
          System Security Audit Logs
        </h3>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
          Relational activity tracker showing all transactions, approvals, and credentials blocks.
        </p>
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {auditLogs.slice(0, auditLogLimit).map((log) => (
          <div
            key={log.id}
            className="p-3 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs font-semibold"
          >
            <div>
              <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 mr-2">
                {log.role}
              </span>
              <span className="font-bold text-slate-800">{log.userName}</span>
              <p className="text-slate-500 text-[10px] mt-1 font-semibold pl-1 border-l-2 border-slate-200">
                {log.action}
              </p>
            </div>
            <span className="text-[9px] font-bold text-slate-400 shrink-0">{log.createdAt}</span>
          </div>
        ))}

        {auditLogs.length > auditLogLimit && (
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">
              Showing {Math.min(auditLogLimit, auditLogs.length)} of {auditLogs.length} audit logs
            </span>
            <button
              type="button"
              onClick={() => setAuditLogLimit((prev) => Math.min(prev + 50, auditLogs.length))}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            >
              Load 50 More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
