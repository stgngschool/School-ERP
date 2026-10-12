"use client";

import React, { useState, useEffect, useDeferredValue, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  UserSearch,
  CreditCard,
  Lock,
  User,
  Users,
  RefreshCw,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Activity,
  FileText,
  UserCheck,
  GraduationCap,
  Key,
  Calendar,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  userId?: string | null;
  userName: string;
  role: string;
  action: string;
  createdAt: string;
  rawCreatedAt?: string;
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

interface AuditLogsTabProps {
  auditLogs?: AuditLogItem[];
}

export default function AuditLogsTab({ auditLogs: initialLogs = [] }: AuditLogsTabProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(initialLogs.length);

  // Filter states
  const [activeCategory, setActiveCategory] = useState<"ALL" | "LOOKUP" | "PAYMENT" | "SECURITY" | "STUDENT">("ALL");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);

  // Metrics summary
  const [summary, setSummary] = useState({
    totalAll: initialLogs.length,
    todayTotal: 0,
    todayLookups: 0,
    todayPayments: 0,
  });

  const [staffList, setStaffList] = useState<StaffUser[]>([]);

  // ─── Fetch Paginated Logs from Server (Egress Protected) ───
  const fetchAudits = useCallback(
    async (targetPage = 1, forceRefresh = false) => {
      try {
        if (forceRefresh) setIsSyncing(true);
        else setLoading(true);

        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("limit", String(pageSize));
        params.set("paginated", "true");

        if (activeCategory !== "ALL") params.set("category", activeCategory);
        if (selectedStaffId !== "ALL") params.set("userId", selectedStaffId);
        if (selectedDate) params.set("date", selectedDate);
        if (deferredSearch.trim()) params.set("search", deferredSearch.trim());

        const res = await fetch(`/api/audits?${params.toString()}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            setLogs(data.logs);
            setPage(data.pagination.page);
            setTotalPages(data.pagination.totalPages);
            setTotalCount(data.pagination.totalCount);
            if (data.summary) setSummary(data.summary);
            if (data.staffList && data.staffList.length > 0) setStaffList(data.staffList);
          } else if (Array.isArray(data)) {
            setLogs(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch audits:", err);
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    },
    [pageSize, activeCategory, selectedStaffId, selectedDate, deferredSearch]
  );

  // Reset to page 1 and fetch when filters change
  useEffect(() => {
    setPage(1);
    fetchAudits(1);
  }, [activeCategory, selectedStaffId, selectedDate, deferredSearch, pageSize, fetchAudits]);

  // Helper to extract clean action tags & student info
  const parseActionDetails = (action: string) => {
    if (action.startsWith("PARENT_RECEIPT_LOOKUP:")) {
      const details = action.replace("PARENT_RECEIPT_LOOKUP:", "").trim();
      return {
        type: "LOOKUP",
        badgeText: "Duplicate Receipt Lookup",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
        icon: UserSearch,
        iconColor: "text-indigo-600",
        details,
        isLookup: true,
      };
    }

    if (
      action.includes("PAYMENT") ||
      action.includes("FEE") ||
      action.includes("CHARGE") ||
      action.includes("BILLING") ||
      action.includes("CONCESSION")
    ) {
      return {
        type: "PAYMENT",
        badgeText: "Fee Transaction",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        icon: CreditCard,
        iconColor: "text-emerald-600",
        details: action,
        isLookup: false,
      };
    }

    if (action.includes("USER") || action.includes("PASSWORD") || action.includes("STATUS") || action.includes("LOGIN")) {
      return {
        type: "SECURITY",
        badgeText: "Access & Credentials",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200/80",
        icon: Lock,
        iconColor: "text-amber-600",
        details: action,
        isLookup: false,
      };
    }

    if (
      action.includes("STUDENT") ||
      action.includes("ADMISSION") ||
      action.includes("PROMOTE") ||
      action.includes("FAMILY")
    ) {
      return {
        type: "STUDENT",
        badgeText: "Student Record",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200/80",
        icon: GraduationCap,
        iconColor: "text-sky-600",
        details: action,
        isLookup: false,
      };
    }

    return {
      type: "SYSTEM",
      badgeText: "System Activity",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200/80",
      icon: Activity,
      iconColor: "text-slate-500",
      details: action,
      isLookup: false,
    };
  };

  return (
    <div className="space-y-5 font-sans">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              System Security Audit Black Box
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Security Auditing Active
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Relational compliance trail tracking staff duplicate receipt lookups, fee collections, user security, and administrative approvals.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Sync Button */}
          <button
            type="button"
            onClick={() => fetchAudits(page, true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 border border-indigo-200/80 rounded-xl py-1.5 px-3 text-[10px] font-bold text-indigo-800 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
            title="Refresh latest audit trails"
          >
            <RefreshCw className={`h-3 w-3 text-indigo-600 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Logs"}</span>
          </button>
        </div>
      </div>

      {/* ─── Top Security Analytics KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Logs */}
        <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
            Total Audit Records
          </span>
          <span className="text-sm font-black text-slate-850 mt-1 block">
            {summary.totalAll} Events
          </span>
        </div>

        {/* Metric 2: Today's Volume */}
        <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">
            Today&apos;s Activity Volume
          </span>
          <span className="text-sm font-black text-slate-900 mt-1 block">
            {summary.todayTotal} Actions Today
          </span>
        </div>

        {/* Metric 3: Today's Duplicate Receipt Lookups (Key Feature!) */}
        <div className="p-3 bg-indigo-50/50 border border-indigo-200/70 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block">
              Staff Receipt Lookups Today
            </span>
            <UserSearch className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-sm font-black text-indigo-900 mt-1 block">
            {summary.todayLookups} Students Checked
          </span>
        </div>

        {/* Metric 4: Financial Transactions Today */}
        <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">
            Financial Events Today
          </span>
          <span className="text-sm font-black text-emerald-800 mt-1 block">
            {summary.todayPayments} Transactions
          </span>
        </div>
      </div>

      {/* ─── Category Filter Pills & Search Controls ─── */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Category Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl select-none shrink-0 border border-slate-200/60 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer shrink-0 ${
                activeCategory === "ALL"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Activities
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("LOOKUP")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer shrink-0 ${
                activeCategory === "LOOKUP"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserSearch className="w-3 h-3" />
              <span>Receipt Lookups</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("PAYMENT")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer shrink-0 ${
                activeCategory === "PAYMENT"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-3 h-3" />
              <span>Fee Payments</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("SECURITY")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer shrink-0 ${
                activeCategory === "SECURITY"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>User & Security</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("STUDENT")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer shrink-0 ${
                activeCategory === "STUDENT"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Student Records</span>
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold self-end sm:self-auto">
            <span className="text-[10px] uppercase text-slate-400 tracking-wider">Per Page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="text-[10px] font-black bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700 cursor-pointer"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Search, Staff & Date Filter Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Input */}
          <div className="relative sm:col-span-5">
            <input
              type="text"
              placeholder="Search by Student Name (e.g. Anurag), Admission No, or staff action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-semibold py-2.5 pl-8 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all placeholder-slate-400 text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Staff Member Selector */}
          <div className="sm:col-span-4">
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Staff Members</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.role})
                </option>
              ))}
            </select>
          </div>

          {/* Specific Date Filter */}
          <div className="sm:col-span-3 flex items-center gap-1.5">
            <div className="relative w-full">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs font-bold py-2 px-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer"
                title="Filter by specific calendar date"
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer transition-all shrink-0"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Active Filter Feedback Banner ─── */}
      {(searchQuery || selectedStaffId !== "ALL" || activeCategory !== "ALL" || selectedDate) && (
        <div className="bg-slate-100 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtered By:</span>
            {activeCategory !== "ALL" && (
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold text-[10px]">
                {activeCategory}
              </span>
            )}
            {selectedStaffId !== "ALL" && (
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold text-[10px]">
                Staff: {staffList.find((s) => s.id === selectedStaffId)?.name || selectedStaffId}
              </span>
            )}
            {selectedDate && (
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold text-[10px]">
                Date: {selectedDate}
              </span>
            )}
            {searchQuery && (
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono text-[10px]">
                &quot;{searchQuery}&quot;
              </span>
            )}
            <span className="text-slate-400">({totalCount} records match)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedStaffId("ALL");
              setActiveCategory("ALL");
              setSelectedDate("");
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ─── Activity Stream List ─── */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2 animate-pulse py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl border border-slate-200/60" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50/50 border border-slate-200/60 rounded-2xl space-y-2">
            <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No audit activity records found.</p>
            <p className="text-[11px] text-slate-400 font-medium">
              No events matched the selected filters or search terms.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const parsed = parseActionDetails(log.action);
            const Icon = parsed.icon;

            return (
              <div
                key={log.id}
                className={`p-3 bg-white border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-indigo-200/80 transition-all shadow-2xs ${
                  parsed.isLookup ? "bg-indigo-50/20" : ""
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  {/* Staff Avatar Icon */}
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      parsed.isLookup
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${parsed.iconColor}`} />
                  </div>

                  {/* Log Body Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-xs">{log.userName}</span>
                      <span
                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border tracking-wider ${
                          log.role === "ADMIN"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : log.role === "ACCOUNTANT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {log.role}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${parsed.badgeColor}`}>
                        {parsed.badgeText}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-700 pl-1 border-l-2 border-indigo-300/80">
                      {parsed.isLookup ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-500 font-medium">Looked up student receipts:</span>
                          <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 break-words">
                            {parsed.details}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 break-words">{parsed.details}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 self-end sm:self-center shrink-0 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/50">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{log.createdAt}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Server Pagination Bar (Egress Protected) ─── */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
        <span className="text-[11px] text-slate-400 font-semibold">
          Showing <strong>{logs.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{" "}
          <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> audit records
        </span>

        {/* Page navigation controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (page > 1) {
                setPage(page - 1);
                fetchAudits(page - 1);
              }
            }}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => {
              if (page < totalPages) {
                setPage(page + 1);
                fetchAudits(page + 1);
              }
            }}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
