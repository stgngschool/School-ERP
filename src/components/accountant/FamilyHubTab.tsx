"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatP } from "@/lib/currency";
import { cleanPhoneNumber } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  Users,
  Home,
  Split,
  ArrowRightLeft,
  Search,
  Check,
  AlertTriangle,
  X,
  Phone,
  MapPin,
  RefreshCw,
  Copy,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  GraduationCap,
  Layers,
  RotateCcw,
} from "lucide-react";

interface StudentInfo {
  id: string;
  name: string;
  admissionNo: string;
  rollNo: string;
  class: string;
  fatherName: string;
  motherName: string;
  fatherMobile: string;
  motherMobile: string;
  status: string;
  duePaisa: number;
}

interface FamilyRecord {
  id: string;
  familyCode: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  studentCount: number;
  isFlagged: boolean;
  totalDuePaisa: number;
  students: StudentInfo[];
}

interface FlaggedFamily {
  parentProfileId: string;
  familyCode: string;
  address: string;
  user: any;
  studentCount: number;
  reason: string;
  students: StudentInfo[];
}

export default function FamilyHubTab() {
  const { splitStudentFamily, transferStudentFamily, mergeFamilies, showToast } = useAuth();

  // Data state
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [flaggedFamilies, setFlaggedFamilies] = useState<FlaggedFamily[]>([]);
  const [stats, setStats] = useState({
    totalFamilies: 0,
    multiChildFamilies: 0,
    singleChildFamilies: 0,
    conflictCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "siblings" | "single" | "conflicts">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals state
  const [separateStudent, setSeparateStudent] = useState<{ student: StudentInfo; currentFamilyCode: string } | null>(null);
  const [isSeparating, setIsSeparating] = useState(false);

  // Transfer Student Modal
  const [transferStudent, setTransferStudent] = useState<{ student: StudentInfo; currentFamilyCode: string } | null>(null);
  const [transferTargetCode, setTransferTargetCode] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [transferResults, setTransferResults] = useState<FamilyRecord[]>([]);
  const [isSearchingTransfer, setIsSearchingTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Merge Families Modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceCode, setMergeSourceCode] = useState("");
  const [mergeTargetCode, setMergeTargetCode] = useState("");
  const [sourcePreview, setSourcePreview] = useState<FamilyRecord | null>(null);
  const [targetPreview, setTargetPreview] = useState<FamilyRecord | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Fetch families data
  const loadFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        pageSize: "25",
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/families?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFamilies(data.families || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total ?? 0);
        }
        if (data.flaggedFamilies) setFlaggedFamilies(data.flaggedFamilies);
      } else {
        showToast("error", "Error", "Failed to load family data.");
      }
    } catch (err) {
      console.error("loadFamilies error:", err);
      showToast("error", "Network Error", "Could not fetch family directory.");
    } finally {
      setLoading(false);
    }
  }, [filter, page, search, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFamilies();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadFamilies]);

  // Copy Family Code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Search target families for transfer autocomplete
  useEffect(() => {
    if (!transferSearch.trim() || transferSearch.length < 2) {
      setTransferResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTransfer(true);
      try {
        const res = await fetch(`/api/families?search=${encodeURIComponent(transferSearch.trim())}&pageSize=8`);
        if (res.ok) {
          const data = await res.json();
          // Exclude the current family
          const filtered = (data.families || []).filter(
            (f: FamilyRecord) => f.familyCode !== transferStudent?.currentFamilyCode
          );
          setTransferResults(filtered);
        }
      } catch (e) {
        console.error("Transfer search error:", e);
      } finally {
        setIsSearchingTransfer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [transferSearch, transferStudent?.currentFamilyCode]);

  // Merge family previews
  const handleLookupMergeFamily = async (code: string, type: "source" | "target") => {
    if (!code.trim()) {
      if (type === "source") setSourcePreview(null);
      else setTargetPreview(null);
      return;
    }
    try {
      const res = await fetch(`/api/families?search=${encodeURIComponent(code.trim())}&pageSize=1`);
      if (res.ok) {
        const data = await res.json();
        const found = (data.families || []).find((f: FamilyRecord) => f.familyCode.toUpperCase() === code.trim().toUpperCase());
        if (type === "source") setSourcePreview(found || null);
        else setTargetPreview(found || null);
      }
    } catch (e) {
      console.error("Merge lookup error:", e);
    }
  };

  // Execute Separate / Split
  const handleConfirmSeparate = async () => {
    if (!separateStudent) return;
    setIsSeparating(true);
    try {
      const res = await splitStudentFamily(separateStudent.student.id);
      if (res.success) {
        setSeparateStudent(null);
        await loadFamilies();
      }
    } finally {
      setIsSeparating(false);
    }
  };

  // Execute Transfer
  const handleConfirmTransfer = async () => {
    if (!transferStudent || !transferTargetCode.trim()) return;
    setIsTransferring(true);
    try {
      const res = await transferStudentFamily(transferStudent.student.id, transferTargetCode.trim());
      if (res.success) {
        setTransferStudent(null);
        setTransferTargetCode("");
        setTransferSearch("");
        await loadFamilies();
      }
    } finally {
      setIsTransferring(false);
    }
  };

  // Execute Merge Families
  const handleConfirmMerge = async () => {
    if (!mergeSourceCode.trim() || !mergeTargetCode.trim()) return;
    setIsMerging(true);
    try {
      const res = await mergeFamilies(mergeSourceCode.trim(), mergeTargetCode.trim());
      if (res.success) {
        setShowMergeModal(false);
        setMergeSourceCode("");
        setMergeTargetCode("");
        setSourcePreview(null);
        setTargetPreview(null);
        await loadFamilies();
      }
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-left">
      {/* ── 1. HEADER / INTRO (Matched with StudentDirectoryTab) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Family Management Hub
            <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full ml-1">
              परिवार प्रबंधन
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            View all registered families, separate mislinked siblings, link students, or merge duplicate family records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMergeSourceCode("");
              setMergeTargetCode("");
              setSourcePreview(null);
              setTargetPreview(null);
              setShowMergeModal(true);
            }}
            className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
          >
            <Layers className="h-4 w-4" />
            <span>Merge 2 Families</span>
          </button>

          <button
            type="button"
            onClick={loadFamilies}
            disabled={loading}
            className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/70 shadow-2xs active:scale-95"
            title="Refresh family directory"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Sync</span>
          </button>

          <span className="text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs">
            {stats.totalFamilies} Families
          </span>
        </div>
      </div>

      {/* ── 2. KPI STATS CARDS (Matched with Overview & Directory) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Families */}
        <div
          onClick={() => { setFilter("all"); setPage(1); }}
          className={`bg-white border p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all cursor-pointer hover:shadow-xs ${
            filter === "all"
              ? "border-indigo-300 ring-2 ring-indigo-500/20 bg-indigo-50/20"
              : "border-slate-200/70 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Families</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Home className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.totalFamilies}</p>
          <span className="text-[10px] font-bold text-slate-400">Registered Family Codes</span>
        </div>

        {/* Multi-Child Families */}
        <div
          onClick={() => { setFilter("siblings"); setPage(1); }}
          className={`bg-white border p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all cursor-pointer hover:shadow-xs ${
            filter === "siblings"
              ? "border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20"
              : "border-slate-200/70 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Multi-Child Families</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 tracking-tight mt-2">{stats.multiChildFamilies}</p>
          <span className="text-[10px] font-bold text-emerald-600/80">Families with 2+ siblings</span>
        </div>

        {/* Single Child */}
        <div
          onClick={() => { setFilter("single"); setPage(1); }}
          className={`bg-white border p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all cursor-pointer hover:shadow-xs ${
            filter === "single"
              ? "border-slate-400 ring-2 ring-slate-400/20 bg-slate-50/50"
              : "border-slate-200/70 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Single Child</span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <GraduationCap className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-800 tracking-tight mt-2">{stats.singleChildFamilies}</p>
          <span className="text-[10px] font-bold text-slate-400">Standalone student accounts</span>
        </div>

        {/* Discrepancy Flags */}
        <div
          onClick={() => { setFilter("conflicts"); setPage(1); }}
          className={`bg-white border p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all cursor-pointer hover:shadow-xs ${
            filter === "conflicts"
              ? "border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20"
              : "border-slate-200/70 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Discrepancy Flags</span>
            <span className={`p-2 rounded-xl ${stats.conflictCount > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-400"}`}>
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <p className={`text-2xl font-black tracking-tight mt-2 ${stats.conflictCount > 0 ? "text-rose-600" : "text-slate-800"}`}>
            {stats.conflictCount}
          </p>
          <span className={`text-[10px] font-bold ${stats.conflictCount > 0 ? "text-rose-500" : "text-slate-400"}`}>
            {stats.conflictCount > 0 ? "Different phones / names detected" : "No conflicts detected"}
          </span>
        </div>
      </div>

      {/* ── 3. CONFLICT REVIEW ALERT BANNER ── */}
      {stats.conflictCount > 0 && filter !== "conflicts" && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-900">
                {stats.conflictCount} Family Accounts Have Potential Auto-Merge Mismatches
              </h4>
              <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                The system detected sibling groups where children have different father mobile numbers or different mother names recorded on their admission forms.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setFilter("conflicts"); setPage(1); }}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-2xs shrink-0 cursor-pointer transition-all active:scale-95"
          >
            Review Issues
          </button>
        </div>
      )}

      {/* ── 4. SEARCH & FILTER CONTROLS TOOLBAR ── */}
      <div className="bg-white border border-slate-200/70 p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Family ID (FAM-2026-XXXX), student name, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-extrabold py-2.5 pl-10 pr-9 border border-slate-200/80 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-2xs text-slate-800 placeholder-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Families" },
              { id: "siblings", label: "Siblings (2+)" },
              { id: "single", label: "Single Child" },
              { id: "conflicts", label: `Flags (${stats.conflictCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                  filter === tab.id
                    ? "bg-indigo-600 text-white font-black shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border border-slate-200/60"
                }`}
              >
                {tab.label}
              </button>
            ))}

            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPage(1); }}
                className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-rose-200/60 shadow-2xs shrink-0"
              >
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. FAMILY DIRECTORY CARDS LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-200/70 min-h-[300px] shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-bold text-slate-500 mt-3">Loading family directory...</span>
        </div>
      ) : families.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Home className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-black text-slate-700">No Family Records Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search ? `No families match "${search}". Try searching by student name, roll number, or phone.` : "No families match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {families.map((fam) => (
            <div
              key={fam.id}
              className={`bg-white border rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden transition-all ${
                fam.isFlagged ? "border-amber-300 ring-2 ring-amber-500/10" : "border-slate-200/70 hover:border-slate-300/90"
              }`}
            >
              {/* Family Card Header */}
              <div className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  {/* Family Code Badge */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs">
                    <span className="text-xs font-black text-indigo-700 tracking-wide font-mono">{fam.familyCode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(fam.familyCode)}
                      title="Copy Family ID"
                      className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                    >
                      {copiedCode === fam.familyCode ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Sibling Count Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 ${
                      fam.studentCount > 1
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                        : "bg-slate-100 text-slate-600 border border-slate-200/70"
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    {fam.studentCount} {fam.studentCount > 1 ? "Siblings" : "Child"}
                  </span>

                  {/* Flagged Alert Pill */}
                  {fam.isFlagged && (
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                      Suspected Conflict
                    </span>
                  )}

                  {/* Total Family Dues Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                      fam.totalDuePaisa > 0
                        ? "bg-rose-50 text-rose-700 border-rose-200/80"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    }`}
                  >
                    {fam.totalDuePaisa > 0 ? `Total Dues: ${formatP(fam.totalDuePaisa)}` : "All Fees Cleared"}
                  </span>
                </div>

                {/* Right side: Merge trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setMergeSourceCode(fam.familyCode);
                    setMergeTargetCode("");
                    setSourcePreview(fam);
                    setTargetPreview(null);
                    setShowMergeModal(true);
                  }}
                  className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
                  title="Merge all children of this family into another family"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Merge Family</span>
                </button>
              </div>

              {/* Parent & Contact Details Bar */}
              <div className="px-4 sm:px-5 py-3 bg-white border-b border-slate-100/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-slate-400 font-bold">Guardian / Parent: </span>
                  <span className="text-slate-800 font-black">{fam.parentName}</span>
                </div>

                {fam.parentPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-800 font-bold">{fam.parentPhone}</span>
                    {cleanPhoneNumber(fam.parentPhone) && (
                      <a
                        href={`https://wa.me/${cleanPhoneNumber(fam.parentPhone)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {fam.address && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-xs">{fam.address}</span>
                  </div>
                )}
              </div>

              {/* Linked Children / Siblings List */}
              <div className="p-4 sm:p-5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                  Children in this Family ({fam.students.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fam.students.map((child) => {
                    const phoneDiffers =
                      child.fatherMobile &&
                      fam.parentPhone &&
                      cleanPhoneNumber(child.fatherMobile) !== cleanPhoneNumber(fam.parentPhone);

                    return (
                      <div
                        key={child.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between gap-3 hover:bg-slate-50 transition-all"
                      >
                        <div>
                          {/* Student Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {child.name.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-slate-900 truncate">{child.name}</h5>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-bold text-slate-500 flex-wrap">
                                  <span className="bg-white border border-slate-200/80 px-2 py-0.5 rounded-md text-indigo-700 font-extrabold text-[10px]">
                                    {child.class}
                                  </span>
                                  <span>Adm: {child.admissionNo}</span>
                                  {child.rollNo && <span>• Roll: {child.rollNo}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Dues Pill */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 border ${
                                child.duePaisa > 0 ? "bg-rose-50 text-rose-700 border-rose-200/80" : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              }`}
                            >
                              {child.duePaisa > 0 ? formatP(child.duePaisa) : "Paid"}
                            </span>
                          </div>

                          {/* Student Father / Mother / Mobile as registered */}
                          <div className="mt-2.5 pt-2 border-t border-slate-200/50 text-[11px] space-y-1">
                            {child.fatherName && (
                              <div className="text-slate-600">
                                <span className="text-slate-400 font-semibold">Father:</span> {child.fatherName}
                              </div>
                            )}
                            {child.fatherMobile && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-400 font-semibold">Phone:</span>
                                <span className={`font-bold ${phoneDiffers ? "text-rose-600 font-black" : "text-slate-700"}`}>
                                  {child.fatherMobile}
                                </span>
                                {phoneDiffers && (
                                  <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black">
                                    Differs from family phone
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Child Actions Toolbar */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
                          {/* Separate Button (Only visible if 2+ siblings) */}
                          {fam.studentCount > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSeparateStudent({
                                  student: child,
                                  currentFamilyCode: fam.familyCode,
                                })
                              }
                              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                              title="Detach this child into their own independent Family ID"
                            >
                              <Split className="h-3 w-3" />
                              <span>Separate</span>
                            </button>
                          )}

                          {/* Move to another family */}
                          <button
                            type="button"
                            onClick={() => {
                              setTransferStudent({
                                student: child,
                                currentFamilyCode: fam.familyCode,
                              });
                              setTransferTargetCode("");
                              setTransferSearch("");
                              setTransferResults([]);
                            }}
                            className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="Move this child to an existing family"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            <span>Move to Family</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* ── 6. PAGINATION BAR (Matched with StudentDirectoryTab) ── */}
          {totalPages > 1 && (
            <div className="p-4 border border-slate-200/70 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              {/* Mobile Prev / Next */}
              <div className="flex sm:hidden items-center justify-between w-full">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
                >
                  ← Prev
                </button>
                <span className="text-[11px] font-bold">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next →
                </button>
              </div>

              {/* Desktop Info */}
              <div className="hidden sm:block">
                Showing <span className="text-slate-800 font-extrabold">{totalCount > 0 ? (page - 1) * 25 + 1 : 0}</span> to{" "}
                <span className="text-slate-800 font-extrabold">
                  {Math.min(page * 25, totalCount)}
                </span>{" "}
                of <span className="text-slate-900 font-black">{totalCount}</span> families
              </div>

              {/* Desktop Page Buttons */}
              <div className="hidden sm:flex gap-1 flex-wrap items-center">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 cursor-pointer transition-colors text-xs"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    totalPages > 8 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - page) > 2
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1)
                      return (
                        <span key={pageNum} className="px-1 py-1 text-slate-400">
                          ...
                        </span>
                      );
                    return null;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`h-8 w-8 flex items-center justify-center rounded-xl border font-bold cursor-pointer transition-colors text-xs ${
                        page === pageNum
                          ? "bg-indigo-600 text-white border-indigo-600 font-black shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 cursor-pointer transition-colors text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: SEPARATE / SPLIT CONFIRMATION (Matched with App Modals) ── */}
      {separateStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:rounded-3xl sm:max-w-md rounded-t-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-scale-in text-left font-sans">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                  <Split className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Separate Student from Family</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Generate Independent Family ID</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSeparateStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-xs space-y-2 text-rose-900">
                <p className="font-bold">
                  Are you sure you want to detach <span className="underline font-black">{separateStudent.student.name}</span> from Family <span className="font-mono font-black">{separateStudent.currentFamilyCode}</span>?
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 font-semibold">
                  <li>A brand-new sequential Family ID will be assigned to this student.</li>
                  <li>All dues, receipts, attendance, and marks stay completely intact.</li>
                  <li>On the fee collection counter, their fees will now be billed independently.</li>
                </ul>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSeparating}
                onClick={() => setSeparateStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSeparating}
                onClick={handleConfirmSeparate}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {isSeparating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Split className="h-3.5 w-3.5" />}
                <span>Confirm & Separate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MOVE / TRANSFER STUDENT TO FAMILY ── */}
      {transferStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:rounded-3xl sm:max-w-md rounded-t-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-scale-in text-left font-sans">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Move Student to Another Family</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Transfer {transferStudent.student.name} to target Family Code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              {/* Target Code Input */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Target Family Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. FAM-2026-0012"
                  value={transferTargetCode}
                  onChange={(e) => setTransferTargetCode(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold py-2.5 px-3 border border-slate-200/80 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all text-indigo-700 uppercase"
                />
              </div>

              {/* Or Search Target Family by Name / Phone */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Or Search Target Family by Name / Phone
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search parent name, phone, or sibling..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 pl-10 pr-4 border border-slate-200/80 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                  />
                  {isSearchingTransfer && <Loader2 className="absolute right-3 top-3 h-3.5 w-3.5 text-indigo-600 animate-spin" />}
                </div>

                {/* Autocomplete Results */}
                {transferResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white shadow-xs">
                    {transferResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setTransferTargetCode(r.familyCode);
                          setTransferSearch("");
                          setTransferResults([]);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-indigo-50/50 flex items-center justify-between text-xs transition-all cursor-pointer"
                      >
                        <div>
                          <span className="font-mono font-bold text-indigo-600">{r.familyCode}</span>
                          <span className="text-slate-600 ml-2 font-semibold">• {r.parentName}</span>
                          {r.parentPhone && <span className="text-slate-400 ml-1">({r.parentPhone})</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{r.studentCount} child</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1">
                <span className="font-black text-slate-700 block">Data Safety Confirmation:</span>
                <p>
                  Moving <span className="font-black text-slate-800">{transferStudent.student.name}</span> will link them as a sibling to the target family. Their historical receipts and financial ledger will automatically carry over.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isTransferring}
                onClick={() => setTransferStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTransferring || !transferTargetCode.trim()}
                onClick={handleConfirmTransfer}
                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                {isTransferring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Confirm & Move Student</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MERGE TWO FAMILIES ── */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:rounded-3xl sm:max-w-lg rounded-t-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-scale-in text-left font-sans">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Merge Two Separate Families</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Combine all siblings from Family A into Family B</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Family A (Source) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  1. Source Family Code (Will be merged & absorbed):
                </label>
                <input
                  type="text"
                  placeholder="e.g. FAM-2026-0005"
                  value={mergeSourceCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setMergeSourceCode(val);
                    handleLookupMergeFamily(val, "source");
                  }}
                  className="w-full text-xs font-mono font-bold py-2.5 px-3 border border-slate-200/80 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all text-indigo-700 uppercase"
                />
                {sourcePreview && (
                  <div className="mt-1.5 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px]">
                    <span className="font-bold text-slate-700">{sourcePreview.parentName}</span>
                    {sourcePreview.parentPhone && <span className="text-slate-500"> ({sourcePreview.parentPhone})</span>}
                    <div className="text-indigo-700 font-semibold mt-0.5">
                      Children: {sourcePreview.students.map((s) => s.name).join(", ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Family B (Target) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  2. Target Family Code (Primary family to keep):
                </label>
                <input
                  type="text"
                  placeholder="e.g. FAM-2026-0012"
                  value={mergeTargetCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setMergeTargetCode(val);
                    handleLookupMergeFamily(val, "target");
                  }}
                  className="w-full text-xs font-mono font-bold py-2.5 px-3 border border-slate-200/80 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/5 transition-all text-emerald-700 uppercase"
                />
                {targetPreview && (
                  <div className="mt-1.5 p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[11px]">
                    <span className="font-bold text-slate-700">{targetPreview.parentName}</span>
                    {targetPreview.parentPhone && <span className="text-slate-500"> ({targetPreview.parentPhone})</span>}
                    <div className="text-emerald-700 font-semibold mt-0.5">
                      Current Children: {targetPreview.students.map((s) => s.name).join(", ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Preview */}
              {sourcePreview && targetPreview && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-[11px]">
                  <span className="font-black text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Merge Preview:
                  </span>
                  <p className="text-slate-600 font-medium">
                    All students from <span className="font-bold text-indigo-700 font-mono">{mergeSourceCode}</span> will now be united under <span className="font-bold text-emerald-700 font-mono">{mergeTargetCode}</span>.
                  </p>
                  <p className="text-slate-600 font-medium">
                    Total children in Family {mergeTargetCode} after merge: <span className="font-black text-slate-900">{sourcePreview.studentCount + targetPreview.studentCount}</span>.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isMerging}
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMerging || !mergeSourceCode.trim() || !mergeTargetCode.trim() || mergeSourceCode.trim() === mergeTargetCode.trim()}
                onClick={handleConfirmMerge}
                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                {isMerging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                <span>Merge Both Families</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
