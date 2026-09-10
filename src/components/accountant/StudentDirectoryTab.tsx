"use client";

import React, { useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  X,
  RotateCcw,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  ArrowUpRight,
  UserMinus,
  Check,
  Trash2,
  ChevronDown,
  CreditCard,
  Users,
} from "lucide-react";
import { sortClasses, normalizeClassName, normalizeSectionName } from "@/lib/classUtils";
import StudentProfileModal from "@/components/StudentProfileModal";
import EditStudentModal from "@/components/modals/EditStudentModal";

interface StudentDirectoryTabProps {
  onCollectFee?: (studentId: string) => void;
}

export default function StudentDirectoryTab({ onCollectFee }: StudentDirectoryTabProps) {
  const {
    students,
    classes,
    dueItems,
    updateStudentStatus,
    promoteStudent,
    showToast,
  } = useAuth();

  // Search and debounce states
  const [dirSearch, setDirSearch] = useState("");
  const [debouncedDirSearch, setDebouncedDirSearch] = useState("");
  const dirSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Multi-factor filter states
  const [dirClassFilter, setDirClassFilter] = useState("");
  const [dirSectionFilter, setDirSectionFilter] = useState("");
  const [dirFamilyFilter, setDirFamilyFilter] = useState("");
  const [dirStatusFilter, setDirStatusFilter] = useState("ALL");
  const [dirRteFilter, setDirRteFilter] = useState("ALL");
  const [dirCategoryFilter, setDirCategoryFilter] = useState("ALL");
  const [dirDuesFilter, setDirDuesFilter] = useState("ALL");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Selection & menu states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modals
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);

  // Promote form state
  const [promoteClass, setPromoteClass] = useState("");
  const [promoteSection, setPromoteSection] = useState("A");

  // Cache unpaid student IDs for fast lookup
  const unpaidStudentIdsSet = useMemo(
    () => new Set(dueItems.filter((d) => d.status === "UNPAID").map((d) => d.studentId)),
    [dueItems]
  );

  // Filtered students computation
  const filteredStudents = useMemo(() => {
    const q = debouncedDirSearch.trim().toLowerCase();
    return students.filter((s: any) => {
      const rollStr = s.rollNo
        ? String(s.rollNo).toLowerCase()
        : s.rollNumber
        ? String(s.rollNumber).toLowerCase()
        : "";
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.admissionNo?.toLowerCase().includes(q) ||
        rollStr.includes(q) ||
        (s.familyCode && s.familyCode.toLowerCase().includes(q)) ||
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
        (s.fatherMobile && s.fatherMobile.toLowerCase().includes(q)) ||
        (s.parentPhone && s.parentPhone.toLowerCase().includes(q)) ||
        (s.aadhaar && s.aadhaar.includes(q));

      const matchesClass =
        !dirClassFilter ||
        normalizeClassName(s.class).toLowerCase() === normalizeClassName(dirClassFilter).toLowerCase();
      const matchesSection =
        !dirSectionFilter ||
        normalizeSectionName(s.section, s.class).toLowerCase() ===
          normalizeSectionName(dirSectionFilter).toLowerCase();
      const matchesFamily =
        !dirFamilyFilter ||
        (s.familyCode && s.familyCode.toLowerCase().trim() === dirFamilyFilter.toLowerCase().trim());
      const matchesStatus = dirStatusFilter === "ALL" || (s.status || "ACTIVE") === dirStatusFilter;

      const matchesRte =
        dirRteFilter === "ALL"
          ? true
          : dirRteFilter === "RTE"
          ? !!s.isRte
          : dirRteFilter === "NON_RTE"
          ? !s.isRte
          : dirRteFilter === "TRANSPORT"
          ? s.transportMode && s.transportMode !== "Self"
          : true;

      const matchesCategory =
        dirCategoryFilter === "ALL" || (s.category || "General") === dirCategoryFilter;

      let matchesDues = true;
      if (dirDuesFilter !== "ALL") {
        const hasDues = unpaidStudentIdsSet.has(s.id);
        matchesDues = dirDuesFilter === "HAS_DUES" ? hasDues : !hasDues;
      }

      return (
        matchesSearch &&
        matchesClass &&
        matchesSection &&
        matchesFamily &&
        matchesStatus &&
        matchesRte &&
        matchesCategory &&
        matchesDues
      );
    });
  }, [
    students,
    debouncedDirSearch,
    dirClassFilter,
    dirSectionFilter,
    dirFamilyFilter,
    dirStatusFilter,
    dirRteFilter,
    dirCategoryFilter,
    dirDuesFilter,
    unpaidStudentIdsSet,
  ]);

  // Options derivation
  const classOptions = useMemo(() => {
    const classSet = new Set<string>();
    classes.forEach((c: any) => {
      const norm = normalizeClassName(c.name);
      if (norm) classSet.add(norm);
    });
    students.forEach((s: any) => {
      const norm = normalizeClassName(s.class);
      if (norm) classSet.add(norm);
    });
    return sortClasses(Array.from(classSet));
  }, [classes, students]);

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set([...classes.map((c: any) => c.section), ...students.map((s: any) => s.section)])
      )
        .filter(Boolean)
        .sort(),
    [classes, students]
  );

  const familyOptions = useMemo(
    () => Array.from(new Set(students.map((s: any) => s.familyCode).filter(Boolean))).sort(),
    [students]
  );

  const activeFilterCount = [
    dirClassFilter,
    dirSectionFilter,
    dirFamilyFilter,
    dirStatusFilter !== "ALL" ? "1" : "",
    dirRteFilter !== "ALL" ? "1" : "",
    dirCategoryFilter !== "ALL" ? "1" : "",
    dirDuesFilter !== "ALL" ? "1" : "",
  ].filter(Boolean).length;

  // Pagination calculations
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const clearAllFilters = () => {
    setDirSearch("");
    setDebouncedDirSearch("");
    setDirClassFilter("");
    setDirSectionFilter("");
    setDirFamilyFilter("");
    setDirStatusFilter("ALL");
    setDirRteFilter("ALL");
    setDirCategoryFilter("ALL");
    setDirDuesFilter("ALL");
    setCurrentPage(1);
  };

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200/80",
    LEFT: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-left">
      {/* ── HEADER / INTRO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Student Directory
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Search, filter, view full ledgers, update student lifecycle status, or collect fees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs">
            {totalItems} Students Found
          </span>
        </div>
      </div>

      {/* ── MULTI-FACTOR FILTERS TOOLBAR ── */}
      <div className="bg-white border border-slate-200/70 p-4 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
        {/* Top Row: Search Input + Clear Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, ADM No, roll, phone, family..."
              value={dirSearch}
              onChange={(e) => {
                const val = e.target.value;
                setDirSearch(val);
                setCurrentPage(1);
                if (dirSearchTimerRef.current) clearTimeout(dirSearchTimerRef.current);
                dirSearchTimerRef.current = setTimeout(() => setDebouncedDirSearch(val), 200);
              }}
              className="w-full text-xs font-extrabold py-2.5 pl-10 pr-9 border border-slate-200/80 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-2xs text-slate-800 placeholder-slate-400"
            />
            {dirSearch && (
              <button
                type="button"
                onClick={() => {
                  setDirSearch("");
                  setDebouncedDirSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {(dirSearch || activeFilterCount > 0) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200/60 shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Mobile: Filter Toggle */}
        <div className="flex sm:hidden items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-2xl text-xs font-black transition-all cursor-pointer flex-1 justify-center ${
              showMobileFilters
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-slate-50 border-slate-200/70 text-slate-600"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {showMobileFilters ? "Hide Filters" : "Show Filters"}
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters Grid */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-3 border-t border-slate-100 ${
            showMobileFilters ? "" : "hidden sm:grid"
          }`}
        >
          {/* 1. Class */}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Class</label>
            <select
              value={dirClassFilter}
              onChange={(e) => {
                setDirClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[11px] font-extrabold py-2 px-2.5 border border-slate-200/70 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="">All Classes</option>
              {classOptions.map((className: any) => (
                <option key={className} value={className}>
                  Class {className}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Section */}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Section</label>
            <select
              value={dirSectionFilter}
              onChange={(e) => {
                setDirSectionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[11px] font-extrabold py-2 px-2.5 border border-slate-200/70 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="">All Sections</option>
              {sectionOptions.map((sec: any) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Family ID */}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Family ID</label>
            <select
              value={dirFamilyFilter}
              onChange={(e) => {
                setDirFamilyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[11px] font-extrabold py-2 px-2.5 border border-slate-200/70 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="">All Families</option>
              {familyOptions.map((fCode: any) => (
                <option key={fCode} value={fCode}>
                  {fCode}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status */}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Status</label>
            <select
              value={dirStatusFilter}
              onChange={(e) => {
                setDirStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[11px] font-extrabold py-2 px-2.5 border border-slate-200/70 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="LEFT">Left (TC Issued)</option>
            </select>
          </div>

          {/* 5. Billing Type / RTE */}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Billing Type</label>
            <select
              value={dirRteFilter}
              onChange={(e) => {
                setDirRteFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[11px] font-extrabold py-2 px-2.5 border border-slate-200/70 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Billing</option>
              <option value="RTE">RTE Waiver (100%)</option>
              <option value="NON_RTE">Standard Billing</option>
              <option value="TRANSPORT">Bus Transport</option>
            </select>
          </div>

          {/* 6. Category */}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Category</label>
            <select
              value={dirCategoryFilter}
              onChange={(e) => {
                setDirCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[11px] font-extrabold py-2 px-2.5 border border-slate-200/70 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
            </select>
          </div>

          {/* 7. Fee Dues */}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Fee Dues</label>
            <select
              value={dirDuesFilter}
              onChange={(e) => {
                setDirDuesFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[11px] font-extrabold py-2 px-2.5 border border-slate-200/70 rounded-xl outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Fee Status</option>
              <option value="HAS_DUES">Pending Dues</option>
              <option value="FULLY_PAID">Fully Paid</option>
            </select>
          </div>
        </div>

        {/* Active Filters Strip */}
        {(dirSearch || activeFilterCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold">
            <span className="text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">Active:</span>
            {dirSearch && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                "{dirSearch}"
                <button onClick={() => { setDirSearch(""); setDebouncedDirSearch(""); }} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dirClassFilter && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                Class {dirClassFilter}
                <button onClick={() => setDirClassFilter("")} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dirSectionFilter && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                Sec {dirSectionFilter}
                <button onClick={() => setDirSectionFilter("")} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dirFamilyFilter && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                Fam: {dirFamilyFilter}
                <button onClick={() => setDirFamilyFilter("")} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dirStatusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                Status: {dirStatusFilter}
                <button onClick={() => setDirStatusFilter("ALL")} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dirRteFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                Billing: {dirRteFilter}
                <button onClick={() => setDirRteFilter("ALL")} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dirCategoryFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                Category: {dirCategoryFilter}
                <button onClick={() => setDirCategoryFilter("ALL")} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dirDuesFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                Dues: {dirDuesFilter}
                <button onClick={() => setDirDuesFilter("ALL")} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── BULK ACTIONS FLOATING BAR ── */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-indigo-50/95 border border-indigo-200/90 p-3 rounded-2xl flex items-center justify-between text-xs font-black text-indigo-950 animate-fade-in gap-2 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white rounded-full h-5 w-5 flex items-center justify-center font-extrabold text-[10px]">
              {selectedStudentIds.length}
            </span>
            <span className="hidden sm:inline">Students Selected</span>
            <span className="inline sm:hidden">Selected</span>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => {
                setPromoteClass("");
                setPromoteSection("A");
                setShowBulkPromoteModal(true);
              }}
              className="py-1.5 px-2.5 sm:px-3 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs text-xs"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bulk Promote</span>
              <span className="inline sm:hidden">Promote</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Suspend ${selectedStudentIds.length} selected students?`)) {
                  await updateStudentStatus(selectedStudentIds, "SUSPENDED");
                  showToast("warning", "Status Updated", `${selectedStudentIds.length} students marked as SUSPENDED.`);
                  setSelectedStudentIds([]);
                }
              }}
              className="py-1.5 px-2.5 sm:px-3 bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs text-xs"
            >
              <UserMinus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bulk Suspend</span>
              <span className="inline sm:hidden">Suspend</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Mark ${selectedStudentIds.length} selected students as LEFT (TC Issued)?`)) {
                  await updateStudentStatus(selectedStudentIds, "LEFT");
                  showToast("info", "Status Updated", `${selectedStudentIds.length} students marked as LEFT.`);
                  setSelectedStudentIds([]);
                }
              }}
              className="py-1.5 px-2.5 sm:px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bulk Left (TC)</span>
              <span className="inline sm:hidden">Left</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="py-1.5 px-2 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STUDENT DIRECTORY TABLE & MOBILE CARDS ── */}
      <div className="bg-white border border-slate-200/70 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        {/* Mobile: Select All Bar */}
        <div className="flex sm:hidden items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={
                paginatedStudents.length > 0 &&
                paginatedStudents.every((s) => selectedStudentIds.includes(s.id))
              }
              onChange={(e) => {
                if (e.target.checked) {
                  const currentIds = paginatedStudents.map((s) => s.id);
                  setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...currentIds])));
                } else {
                  const currentIds = paginatedStudents.map((s) => s.id);
                  setSelectedStudentIds((prev) => prev.filter((id) => !currentIds.includes(id)));
                }
              }}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer accent-indigo-600"
            />
            <span>Select All ({paginatedStudents.length})</span>
          </label>
          {selectedStudentIds.length > 0 && (
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {selectedStudentIds.length} Selected
            </span>
          )}
        </div>

        {/* Mobile: Cards List */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {paginatedStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-semibold text-xs">
              No students found matching filters.
            </div>
          ) : (
            paginatedStudents.map((std: any) => {
              const status = std.status || "ACTIVE";
              const isChecked = selectedStudentIds.includes(std.id);
              return (
                <div
                  key={std.id}
                  className={`p-3 flex items-center gap-3 transition-colors ${
                    isChecked ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <label className="flex items-center justify-center shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedStudentIds((prev) =>
                          checked ? [...prev, std.id] : prev.filter((id) => id !== std.id)
                        );
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer accent-indigo-600"
                    />
                  </label>

                  <div
                    className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer group"
                    onClick={() => {
                      setSelectedStudent(std);
                      setShowDetailModal(true);
                    }}
                  >
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 overflow-hidden">
                      {std.photoUrl ? (
                        <img src={std.photoUrl} alt={std.name} className="h-full w-full object-cover" />
                      ) : (
                        std.name.substring(0, 2)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-xs text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {std.name}
                        </span>
                        {std.isRte && (
                          <span className="text-[8px] font-black uppercase bg-purple-100 text-purple-700 px-1 rounded border border-purple-200 shrink-0">
                            RTE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[10px] text-slate-500 font-medium">
                          Cl {std.class}-{std.section} • {std.admissionNo}
                        </p>
                        <span
                          className={`text-[8px] font-black uppercase px-1 py-0.5 rounded border ${
                            statusColors[status] || statusColors.ACTIVE
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(std);
                      setShowDetailModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg shrink-0 cursor-pointer"
                  >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedStudents.length > 0 &&
                      paginatedStudents.every((s) => selectedStudentIds.includes(s.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const currentIds = paginatedStudents.map((s) => s.id);
                        setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...currentIds])));
                      } else {
                        const currentIds = paginatedStudents.map((s) => s.id);
                        setSelectedStudentIds((prev) => prev.filter((id) => !currentIds.includes(id)));
                      }
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                  />
                </th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Family ID</th>
                <th className="py-3 px-4">ADM Number</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Father / Parent Name</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 font-bold italic">
                    No students found matching the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((std: any) => {
                  const status = std.status || "ACTIVE";
                  return (
                    <tr
                      key={std.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100/80"
                    >
                      <td className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(std.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds((prev) => [...prev, std.id]);
                            } else {
                              setSelectedStudentIds((prev) => prev.filter((id) => id !== std.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => {
                            setSelectedStudent(std);
                            setShowDetailModal(true);
                          }}
                        >
                          {std.photoUrl ? (
                            <img
                              src={std.photoUrl}
                              alt={std.name}
                              className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-xl bg-indigo-50/90 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
                              {std.name.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                {std.name}
                              </span>
                              {std.isRte && (
                                <span className="bg-purple-50 text-purple-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-purple-200/80">
                                  RTE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600">
                        {std.class}-{std.section}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100/80 text-slate-700 font-extrabold px-2 py-0.5 rounded-md text-[10px] border border-slate-200/80">
                          {std.familyCode || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {std.admissionNo}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {std.rollNo || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {std.fatherName || std.parentName || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            statusColors[status] || statusColors.ACTIVE
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuStudentId(activeMenuStudentId === std.id ? null : std.id)
                          }
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuStudentId === std.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30 cursor-default"
                              onClick={() => setActiveMenuStudentId(null)}
                            />
                            <div className="absolute right-4 mt-1 w-44 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-40 py-1 divide-y divide-slate-100 animate-fade-in text-left">
                              {onCollectFee && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuStudentId(null);
                                    onCollectFee(std.id);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-emerald-50 text-[11px] font-extrabold text-emerald-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <CreditCard className="h-3.5 w-3.5" /> Collect Fees
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(std);
                                  setShowDetailModal(true);
                                  setActiveMenuStudentId(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-indigo-50/50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Details
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(std);
                                  setShowEditModal(true);
                                  setActiveMenuStudentId(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-indigo-50/50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" /> Edit Profile
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(std);
                                  setPromoteClass(std.class);
                                  setPromoteSection(std.section);
                                  setShowPromoteModal(true);
                                  setActiveMenuStudentId(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-indigo-50/50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" /> Promote Class
                              </button>

                              {status !== "SUSPENDED" ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to suspend ${std.name}?`)) {
                                      await updateStudentStatus(std.id, "SUSPENDED");
                                      showToast("warning", "Student Suspended", `${std.name} has been suspended.`);
                                    }
                                    setActiveMenuStudentId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-amber-50 text-[11px] font-bold text-amber-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <UserMinus className="h-3.5 w-3.5" /> Suspend Student
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateStudentStatus(std.id, "ACTIVE");
                                    showToast("success", "Student Activated", `${std.name} is now ACTIVE.`);
                                    setActiveMenuStudentId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-emerald-50 text-[11px] font-bold text-emerald-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5" /> Activate Student
                                </button>
                              )}

                              {status !== "LEFT" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        `Mark ${std.name} as LEFT (TC Issued)? This student will not generate future billing charges.`
                                      )
                                    ) {
                                      await updateStudentStatus(std.id, "LEFT");
                                      showToast("info", "Student Marked Left", `${std.name} status set to LEFT (TC Issued).`);
                                    }
                                    setActiveMenuStudentId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-rose-50 text-[11px] font-bold text-rose-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Mark as LEFT (TC)
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION BAR ── */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold bg-slate-50/50">
            {/* Mobile Prev / Next */}
            <div className="flex sm:hidden items-center justify-between w-full">
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-[11px] font-bold">
                Page {activePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            </div>

            {/* Desktop Info */}
            <div className="hidden sm:block">
              Showing <span className="text-slate-800 font-extrabold">{startIndex + 1}</span> to{" "}
              <span className="text-slate-800 font-extrabold">
                {Math.min(startIndex + itemsPerPage, totalItems)}
              </span>{" "}
              of <span className="text-slate-900 font-black">{totalItems}</span> students
            </div>

            {/* Desktop Page Buttons */}
            <div className="hidden sm:flex gap-1 flex-wrap">
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 cursor-pointer transition-colors text-xs"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (
                  totalPages > 10 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - activePage) > 2
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
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer text-xs ${
                      activePage === pageNum
                        ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 cursor-pointer transition-colors text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* 1. Student Profile Modal */}
      {showDetailModal && selectedStudent && (
        <StudentProfileModal
          studentId={selectedStudent.id}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* 2. Edit Profile Modal */}
      {showEditModal && selectedStudent && (
        <EditStudentModal
          isOpen={showEditModal}
          student={selectedStudent}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* 3. Promote Student Modal */}
      {showPromoteModal && selectedStudent && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/60 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Promote Student
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Move pupil to next Academic Class</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedStudent(null);
                }}
                className="h-8 w-8 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <p className="text-xs font-extrabold text-slate-800">Student: {selectedStudent.name}</p>
              <p className="text-[10px] text-slate-500 font-bold">
                Current Class: Class {selectedStudent.class}-{selectedStudent.section}
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await promoteStudent(selectedStudent.id, promoteClass, promoteSection);
                setShowPromoteModal(false);
                setSelectedStudent(null);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Class Name
                </label>
                <select
                  required
                  value={promoteClass}
                  onChange={(e) => setPromoteClass(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">Select Class</option>
                  {(classOptions.length > 0
                    ? classOptions
                    : ["KG", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"]
                  ).map((clsName: string) => (
                    <option key={clsName} value={clsName}>
                      Class {clsName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Section
                </label>
                <select
                  required
                  value={promoteSection}
                  onChange={(e) => setPromoteSection(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedStudent(null);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!promoteClass}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  Promote Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Bulk Promote Students Modal */}
      {showBulkPromoteModal && selectedStudentIds.length > 0 && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/60 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Bulk Promote Class</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Promote selected {selectedStudentIds.length} pupils in bulk
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkPromoteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await promoteStudent(selectedStudentIds, promoteClass, promoteSection);
                setShowBulkPromoteModal(false);
                setSelectedStudentIds([]);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Class Name
                </label>
                <select
                  required
                  value={promoteClass}
                  onChange={(e) => setPromoteClass(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">Select Class</option>
                  {(classOptions.length > 0
                    ? classOptions
                    : ["KG", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"]
                  ).map((clsName: string) => (
                    <option key={clsName} value={clsName}>
                      Class {clsName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Section
                </label>
                <select
                  required
                  value={promoteSection}
                  onChange={(e) => setPromoteSection(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkPromoteModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!promoteClass}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer transition-all disabled:opacity-50"
                >
                  Promote All {selectedStudentIds.length}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
