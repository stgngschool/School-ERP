"use client";

import React, { useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  PlusCircle,
  UploadCloud,
  Home,
  UserPlus,
  Search,
  X,
  FileSpreadsheet,
  ChevronDown,
  Filter,
  Download,
  RotateCcw,
  MoreVertical,
  Eye,
  Edit,
  ArrowUpRight,
  UserMinus,
  Check,
  Trash2,
  Clock,
  TrendingUp,
  Loader2,
  AlertOctagon,
  CheckCircle,
} from "lucide-react";
import {
  exportStudentDirectoryXLS,
  exportStudentDirectoryCSV,
} from "@/lib/exportStudentXLS";
import { formatCanonicalDOB } from "@/lib/dateUtils";

const StudentRegistrationForm = dynamic(
  () => import("@/components/StudentRegistrationForm"),
  {
    loading: () => (
      <div className="p-8 text-center text-xs font-bold text-slate-400">
        Loading form...
      </div>
    ),
    ssr: false,
  }
);

const EditStudentModal = dynamic(
  () => import("@/components/modals/EditStudentModal"),
  { ssr: false }
);

const StudentProfileModal = dynamic(
  () => import("@/components/StudentProfileModal"),
  { ssr: false }
);

interface StudentDirectoryTabProps {
  students: any[];
  dueItems: any[];
  classes: any[];
  filteredSortedClasses: any[];
  schoolInfo: any;
  admissionApplications?: any[];
  setActiveTab: (tab: string) => void;
  updateStudentStatus: (id: string, status: "ACTIVE" | "SUSPENDED" | "LEFT") => Promise<any> | any;
  promoteStudent: (idOrIds: string | string[], targetClass: string, targetSection: string) => Promise<any> | any;
  bulkImportStudents: (
    records: any[],
    onProgress: (processed: number, total: number, batch: number, totalBatches: number) => void
  ) => Promise<{ success: boolean; totalImported?: number; error?: string }>;
  showToast: (type: any, title: string, message: string) => void;
  setSelectedStudentId: (id: string) => void;
}

export default function StudentDirectoryTab({
  students,
  dueItems,
  classes,
  filteredSortedClasses,
  schoolInfo,
  admissionApplications = [],
  setActiveTab,
  updateStudentStatus,
  promoteStudent,
  bulkImportStudents,
  showToast,
  setSelectedStudentId,
}: StudentDirectoryTabProps) {
  const [importMode, setImportMode] = useState<"directory" | "single" | "bulk">("directory");

  // Multi-factor Filter States
  const [dirSearch, setDirSearch] = useState("");
  const [debouncedDirSearch, setDebouncedDirSearch] = useState("");
  const dirSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dirClassFilter, setDirClassFilter] = useState("");
  const [dirSectionFilter, setDirSectionFilter] = useState("");
  const [dirFamilyFilter, setDirFamilyFilter] = useState("");
  const [dirStatusFilter, setDirStatusFilter] = useState("ALL");
  const [dirRteFilter, setDirRteFilter] = useState("ALL");
  const [dirCategoryFilter, setDirCategoryFilter] = useState("ALL");
  const [dirDuesFilter, setDirDuesFilter] = useState("ALL");
  const [dirSortBy, setDirSortBy] = useState<"name_asc" | "name_desc" | "roll_asc" | "roll_desc" | "adm_asc" | "adm_desc">("name_asc");

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showStudentExportMenu, setShowStudentExportMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Selected students for bulk operations
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);
  const [promoteClass, setPromoteClass] = useState("");
  const [promoteSection, setPromoteSection] = useState("A");

  // Bulk CSV Import states
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState<{
    isImporting: boolean;
    processed: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
    speed: number | null;
    etaSeconds: number | null;
    success: boolean;
    error: string | null;
    timeTaken: number | null;
  }>({
    isImporting: false,
    processed: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0,
    speed: null,
    etaSeconds: null,
    success: false,
    error: null,
    timeTaken: null,
  });

  // Fast set of unpaid student IDs
  const unpaidStudentIdsSet = useMemo(
    () => new Set(dueItems.filter((d) => d.status === "UNPAID").map((d) => d.studentId)),
    [dueItems]
  );

  // Distinct Filter Options
  const classOptions = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.class).filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
  }, [students]);

  const sectionOptions = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort();
  }, [students]);

  const familyOptions = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.familyCode).filter(Boolean))).sort();
  }, [students]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dirClassFilter) count++;
    if (dirSectionFilter) count++;
    if (dirFamilyFilter) count++;
    if (dirStatusFilter !== "ALL") count++;
    if (dirRteFilter !== "ALL") count++;
    if (dirCategoryFilter !== "ALL") count++;
    if (dirDuesFilter !== "ALL") count++;
    return count;
  }, [
    dirClassFilter,
    dirSectionFilter,
    dirFamilyFilter,
    dirStatusFilter,
    dirRteFilter,
    dirCategoryFilter,
    dirDuesFilter,
  ]);

  // Filtered Students Memo
  const filteredStudentsMemo = useMemo(() => {
    const q = debouncedDirSearch.trim().toLowerCase();
    return students.filter((s: any) => {
      const rollStr = s.rollNo ? String(s.rollNo).toLowerCase() : (s.rollNumber ? String(s.rollNumber).toLowerCase() : "");
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.admissionNo?.toLowerCase().includes(q) ||
        rollStr.includes(q) ||
        (s.familyCode && s.familyCode.toLowerCase().includes(q)) ||
        (s.fatherMobile && s.fatherMobile.includes(q)) ||
        (s.parentPhone && s.parentPhone.includes(q));

      if (!matchesSearch) return false;
      if (dirClassFilter && s.class !== dirClassFilter) return false;
      if (dirSectionFilter && s.section !== dirSectionFilter) return false;
      if (dirFamilyFilter && s.familyCode !== dirFamilyFilter) return false;

      if (dirStatusFilter !== "ALL") {
        const currentStatus = s.status || "ACTIVE";
        if (currentStatus !== dirStatusFilter) return false;
      }

      if (dirRteFilter !== "ALL") {
        if (dirRteFilter === "RTE" && !s.isRte) return false;
        if (dirRteFilter === "NON_RTE" && s.isRte) return false;
        if (dirRteFilter === "TRANSPORT" && (!s.transportMode || s.transportMode === "Self")) return false;
      }

      if (dirCategoryFilter !== "ALL" && s.category !== dirCategoryFilter) return false;

      if (dirDuesFilter !== "ALL") {
        const hasDues = unpaidStudentIdsSet.has(s.id);
        if (dirDuesFilter === "HAS_DUES" && !hasDues) return false;
        if (dirDuesFilter === "FULLY_PAID" && hasDues) return false;
      }

      return true;
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

  // Sorted Students Memo
  const sortedStudentsMemo = useMemo(() => {
    const list = [...filteredStudentsMemo];
    list.sort((a, b) => {
      if (dirSortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (dirSortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (dirSortBy === "roll_asc") {
        const rA = parseInt(String(a.rollNo || a.rollNumber || "0"), 10) || 0;
        const rB = parseInt(String(b.rollNo || b.rollNumber || "0"), 10) || 0;
        return rA - rB;
      }
      if (dirSortBy === "roll_desc") {
        const rA = parseInt(String(a.rollNo || a.rollNumber || "0"), 10) || 0;
        const rB = parseInt(String(b.rollNo || b.rollNumber || "0"), 10) || 0;
        return rB - rA;
      }
      if (dirSortBy === "adm_asc") return (a.admissionNo || "").localeCompare(b.admissionNo || "", undefined, { numeric: true });
      if (dirSortBy === "adm_desc") return (b.admissionNo || "").localeCompare(a.admissionNo || "", undefined, { numeric: true });
      return 0;
    });
    return list;
  }, [filteredStudentsMemo, dirSortBy]);

  // CSV Import Handlers
  const handleDownloadCSVTemplate = () => {
    const headers = [
      "Student Name",
      "Admission Number",
      "Roll Number",
      "Gender",
      "DOB",
      "Aadhaar number",
      "Disability",
      "Father Name",
      "Mother Name",
      "Email Address",
      "Father Mobile",
      "Mother Mobile",
      "Father Aadhaar",
      "Address",
      "Class",
      "Section",
      "Category",
      "Religion",
      "Mother Tongue",
      "Nationality",
      "Admission Date",
      "Board Registration Number",
      "Previous School Name",
      "Previous Class Passed",
      "TC Number",
      "Parent Occupation",
      "Family Annual Income",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "Mother Aadhaar",
      "Transport Mode",
      "Bus Route",
      "Bus Stop",
      "RTE Student"
    ];
    const sampleRow = [
      "Aarav Sharma",
      "ADM-2024-001",
      "12",
      "Male",
      "2012-05-15",
      "123456789012",
      "No",
      "Ramesh Sharma",
      "Sunita Sharma",
      "ramesh@example.com",
      "9876543210",
      "9876543211",
      "123456789013",
      "House 42, Civil Lines",
      "5",
      "A",
      "General",
      "Hinduism",
      "Hindi",
      "Indian",
      "2024-04-01",
      "BRN-9988",
      "DAV Public School",
      "4th",
      "TC-445",
      "Business",
      "450000",
      "Ramesh Sharma",
      "9876543222",
      "123456789088",
      "School Bus",
      "Route-A",
      "Sector 12 crossing",
      "No"
    ];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "school_students_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvPreview(null);
    setImportCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
        if (lines.length <= 1) {
          setCsvError("The CSV file is empty or only contains headers.");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const studentsList: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ""));
          if (cols.length < headers.length) {
            continue;
          }

          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = cols[index];
          });

          const mappedRecord = {
            name: record["Student Name"],
            admissionNo: record["Admission Number"] || "",
            rollNo: record["Roll Number"] || "",
            gender: record["Gender"] || "",
            dob: record["DOB"],
            aadhaar: record["Aadhaar number"],
            disability: record["Disability"] || "No",
            fatherName: record["Father Name"],
            motherName: record["Mother Name"],
            parentEmail: record["Email Address"],
            fatherMobile: record["Father Mobile"],
            motherMobile: record["Mother Mobile"],
            fatherAadhaar: record["Father Aadhaar"],
            address: record["Address"],
            classVal: record["Class"] || "10",
            section: record["Section"] || "A",
            category: record["Category"] || "General",
            religion: record["Religion"] || "Hinduism",
            motherTongue: record["Mother Tongue"] || "Hindi",
            nationality: record["Nationality"] || "Indian",
            admissionDate: record["Admission Date"] || "",
            boardRegNo: record["Board Registration Number"] || "",
            prevSchoolName: record["Previous School Name"] || "",
            prevClassPassed: record["Previous Class Passed"] || "",
            tcNumber: record["TC Number"] || "",
            parentOccupation: record["Parent Occupation"] || "",
            familyIncome: record["Family Annual Income"] || "",
            emergencyName: record["Emergency Contact Name"] || "",
            emergencyPhone: record["Emergency Contact Phone"] || "",
            motherAadhaar: record["Mother Aadhaar"] || "",
            transportMode: record["Transport Mode"] || "Self",
            busRoute: record["Bus Route"] || "",
            busStop: record["Bus Stop"] || "",
            isRte: record["RTE Student"] ? record["RTE Student"].trim().toLowerCase() === "yes" : false,
          };

          studentsList.push(mappedRecord);
        }

        if (studentsList.length === 0) {
          setCsvError("No valid rows were found in the CSV.");
        } else {
          setCsvPreview(studentsList);
        }
      } catch (err: any) {
        setCsvError("Failed to parse CSV. Please check formatting.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportStudents = async () => {
    if (!csvPreview || csvPreview.length === 0) return;

    const total = csvPreview.length;
    const startTime = Date.now();

    setCsvError(null);
    setImportProgress({
      isImporting: true,
      processed: 0,
      total,
      currentBatch: 1,
      totalBatches: Math.ceil(total / 50),
      speed: null,
      etaSeconds: null,
      success: false,
      error: null,
      timeTaken: null,
    });

    const result = await bulkImportStudents(csvPreview, (processed, totalCount, currentBatch, totalBatches) => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speed = elapsedSec > 0 ? Math.round((processed / elapsedSec) * 10) / 10 : 0;
      const remaining = totalCount - processed;
      const etaSeconds = speed > 0 ? Math.ceil(remaining / speed) : 0;

      setImportProgress((prev) => ({
        ...prev,
        processed,
        total: totalCount,
        currentBatch,
        totalBatches,
        speed,
        etaSeconds,
      }));
    });

    const timeTakenSec = Math.round((Date.now() - startTime) / 1000);

    if (result.success) {
      setImportProgress({
        isImporting: false,
        processed: result.totalImported || total,
        total,
        currentBatch: Math.ceil(total / 50),
        totalBatches: Math.ceil(total / 50),
        speed: null,
        etaSeconds: null,
        success: true,
        error: null,
        timeTaken: timeTakenSec,
      });
      setImportCount(result.totalImported || total);
      setCsvPreview(null);
      setTimeout(() => setImportCount(null), 10000);
    } else {
      setImportProgress((prev) => ({
        ...prev,
        isImporting: false,
        success: false,
        error: result.error || "Server failed to import students.",
      }));
      setCsvError(result.error || "Server failed to import students. Check database fields.");
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Selector: Directory vs Single vs Bulk */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-3 no-print">
        {[
          { id: "directory", label: "Student Directory", icon: Users, activeClass: "bg-indigo-50 border-indigo-150 text-indigo-700 shadow-2xs" },
          { id: "single", label: "Single Registration", icon: PlusCircle, activeClass: "bg-emerald-50 border-emerald-150 text-emerald-700 shadow-2xs" },
          { id: "bulk", label: "Bulk CSV Import", icon: UploadCloud, activeClass: "bg-amber-50 border-amber-150 text-amber-700 shadow-2xs" },
        ].map((subTab) => {
          const Icon = subTab.icon;
          const isActive = importMode === subTab.id;
          return (
            <button
              key={subTab.id}
              type="button"
              onClick={() => setImportMode(subTab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 border rounded-2xl text-xs font-black transition-all cursor-pointer ${
                isActive ? subTab.activeClass : "bg-white border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {subTab.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setActiveTab("families")}
          className="flex items-center gap-1.5 px-4 py-2 border border-indigo-200/80 bg-white hover:bg-indigo-50/70 rounded-2xl text-xs font-black text-slate-700 hover:text-indigo-700 transition-all cursor-pointer shadow-2xs ml-auto"
        >
          <Home className="h-3.5 w-3.5 text-indigo-600" />
          <span>Family Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("enquiries")}
          className="flex items-center gap-1.5 px-4 py-2 border border-indigo-200/80 bg-indigo-50/70 hover:bg-indigo-100/80 rounded-2xl text-xs font-black text-indigo-700 transition-all cursor-pointer shadow-2xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Online Admissions Review Desk</span>
          {admissionApplications.filter((a) => a.status === "PENDING").length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white animate-pulse">
              {admissionApplications.filter((a) => a.status === "PENDING").length} New
            </span>
          )}
        </button>
      </div>

      {importMode === "directory" ? (
        showDetailModal && selectedStudent ? (
          <StudentProfileModal
            studentId={selectedStudent.id}
            isOpen={true}
            isInline={true}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedStudent(null);
            }}
          />
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* ENHANCED MULTI-FACTOR FILTERS TOOLBAR */}
            <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5">
              {/* Top Row: Search Input + Clear All Button */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, ADM No, roll, phone..."
                    value={dirSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDirSearch(val);
                      setCurrentPage(1);
                      if (dirSearchTimerRef.current) clearTimeout(dirSearchTimerRef.current);
                      dirSearchTimerRef.current = setTimeout(() => setDebouncedDirSearch(val), 250);
                    }}
                    className="w-full text-xs font-extrabold py-3 pl-11 pr-9 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-2xs text-slate-800 placeholder-slate-400"
                  />
                  {dirSearch && (
                    <button
                      onClick={() => {
                        setDirSearch("");
                        setDebouncedDirSearch("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap relative">
                  {/* Export to Excel Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStudentExportMenu((prev) => !prev)}
                      className="py-2.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200/80 shadow-2xs hover:shadow-xs active:scale-95"
                      title="Download Student Directory as Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <span>Download Excel</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-emerald-600 transition-transform ${showStudentExportMenu ? "rotate-180" : ""}`} />
                    </button>

                    {showStudentExportMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowStudentExportMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans">
                          <div className="px-3 py-1.5 border-b border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Export Student Directory</p>
                          </div>

                          {/* Option 1: Download All Students */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowStudentExportMenu(false);
                              exportStudentDirectoryXLS({
                                students,
                                allStudents: students,
                                dueItems,
                                schoolInfo,
                                fileNamePrefix: "Student_Directory_All",
                                filterDescription: "All_Students",
                                useServerFirst: true,
                              });
                            }}
                            className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-[11px] text-slate-900">Download All Students (.xlsx)</p>
                              <p className="text-[10px] text-slate-500 font-semibold">Master directory ({students.length} students)</p>
                            </div>
                          </button>

                          {/* Option 2: Download Filtered Students (if filters active) */}
                          {(dirSearch || dirClassFilter || dirSectionFilter || dirFamilyFilter || dirStatusFilter !== "ALL" || dirRteFilter !== "ALL" || dirCategoryFilter !== "ALL" || dirDuesFilter !== "ALL") && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowStudentExportMenu(false);
                                const desc = dirClassFilter ? `Class_${dirClassFilter}` : "Filtered";
                                exportStudentDirectoryXLS({
                                  students: filteredStudentsMemo,
                                  allStudents: students,
                                  dueItems,
                                  schoolInfo,
                                  fileNamePrefix: `Student_Directory_${desc}`,
                                  filterDescription: desc,
                                  useServerFirst: false,
                                });
                              }}
                              className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                            >
                              <Filter className="h-4 w-4 text-indigo-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-[11px] text-slate-900">Download Filtered List (.xlsx)</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{filteredStudentsMemo.length} students matching filters</p>
                              </div>
                            </button>
                          )}

                          {/* Option 3: Download CSV */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowStudentExportMenu(false);
                              const exportList = (dirSearch || dirClassFilter || dirSectionFilter || dirFamilyFilter || dirStatusFilter !== "ALL" || dirRteFilter !== "ALL" || dirCategoryFilter !== "ALL" || dirDuesFilter !== "ALL")
                                ? filteredStudentsMemo
                                : students;
                              exportStudentDirectoryCSV({
                                students: exportList,
                                dueItems,
                                schoolInfo,
                                filterDescription: "Directory",
                              });
                            }}
                            className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                          >
                            <Download className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-[11px] text-slate-900">Download CSV Format</p>
                              <p className="text-[10px] text-slate-500 font-semibold">Universal comma-separated format</p>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {(dirSearch || dirClassFilter || dirSectionFilter || dirFamilyFilter || dirStatusFilter !== "ALL" || dirRteFilter !== "ALL" || dirCategoryFilter !== "ALL" || dirDuesFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
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
                      }}
                      className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200/60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Clear All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile: Filter toggle button */}
              <div className="flex sm:hidden items-center gap-2 border-t border-slate-200/60 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters((prev) => !prev)}
                  className={"flex items-center gap-2 px-4 py-2.5 border rounded-2xl text-xs font-black transition-all cursor-pointer flex-1 justify-center " + (showMobileFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200/60 text-slate-600")}
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

              {/* Filter Grid (Class, Section, Family ID, Status, Billing Type, Caste Category, Dues Status) */}
              <div className={"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-4 border-t border-slate-200/60 " + (showMobileFilters ? "" : "hidden sm:grid")}>
                {/* 1. Class Filter */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Class</label>
                  <select
                    value={dirClassFilter}
                    onChange={(e) => {
                      setDirClassFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">All Classes</option>
                    {classOptions.map((className: any) => (
                      <option key={className} value={className}>Class {className}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Section Filter */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Section</label>
                  <select
                    value={dirSectionFilter}
                    onChange={(e) => {
                      setDirSectionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">All Sections</option>
                    {sectionOptions.map((sec: any) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Family ID Filter */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Family ID</label>
                  <select
                    value={dirFamilyFilter}
                    onChange={(e) => {
                      setDirFamilyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">All Family IDs</option>
                    {familyOptions.map((fCode: any) => (
                      <option key={fCode} value={fCode}>{fCode}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Account Status */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Status</label>
                  <select
                    value={dirStatusFilter}
                    onChange={(e) => {
                      setDirStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="LEFT">Left (TC Issued)</option>
                  </select>
                </div>

                {/* 5. Billing / RTE Filter */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Billing Type</label>
                  <select
                    value={dirRteFilter}
                    onChange={(e) => {
                      setDirRteFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">All Billing Types</option>
                    <option value="RTE">RTE Waiver (100%)</option>
                    <option value="NON_RTE">Standard Billing</option>
                    <option value="TRANSPORT">Bus Transport</option>
                  </select>
                </div>

                {/* 6. Caste Category */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Category</label>
                  <select
                    value={dirCategoryFilter}
                    onChange={(e) => {
                      setDirCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>

                {/* 7. Fee Dues Status */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">Fee Dues</label>
                  <select
                    value={dirDuesFilter}
                    onChange={(e) => {
                      setDirDuesFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">All Fee Status</option>
                    <option value="HAS_DUES">Pending Dues</option>
                    <option value="FULLY_PAID">Fully Paid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ROSTER TABLE CONTAINER */}
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              {/* Bulk Actions Header Bar if students selected */}
              {selectedStudentIds.length > 0 && (
                <div className="bg-indigo-50/80 px-4 py-3 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-2 animate-fade-in">
                  <span className="text-xs font-black text-indigo-900">
                    {selectedStudentIds.length} pupil{selectedStudentIds.length === 1 ? "" : "s"} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkPromoteModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" /> Bulk Promote
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            sortedStudentsMemo.length > 0 &&
                            sortedStudentsMemo.every((s) => selectedStudentIds.includes(s.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(sortedStudentsMemo.map((s) => s.id));
                            } else {
                              setSelectedStudentIds([]);
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Class-Sec</th>
                      <th className="py-3 px-4">Family ID</th>
                      <th className="py-3 px-4">Adm No</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Parent Name</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedStudentsMemo.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400 font-bold italic">
                          No students found matching filters.
                        </td>
                      </tr>
                    ) : (
                      sortedStudentsMemo
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((std: any) => {
                          const status = std.status || "ACTIVE";
                          return (
                            <tr key={std.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80">
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
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  {std.photoUrl ? (
                                    <img src={std.photoUrl} alt={std.name} className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-indigo-50/90 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
                                      {std.name.substring(0, 2)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="font-extrabold text-slate-800 hover:text-indigo-600 transition-colors">{std.name}</div>
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
                              <td className="py-3 px-4 text-slate-600 font-medium">{std.parentName || std.fatherName || "N/A"}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" :
                                  status === "SUSPENDED" ? "bg-amber-50 text-amber-700 border border-amber-200/80" :
                                  "bg-rose-50 text-rose-700 border border-rose-200/80"
                                }`}>
                                  {status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveMenuStudentId(activeMenuStudentId === std.id ? null : std.id)}
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
                                    <div className="absolute right-4 mt-1 w-44 bg-white border border-slate-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] z-40 py-1 divide-y divide-slate-100 animate-fade-in text-left">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedStudent(std);
                                          setShowDetailModal(true);
                                          setActiveMenuStudentId(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-indigo-50/50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer text-left"
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
                                        className="w-full px-4 py-2 hover:bg-indigo-50/50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer text-left"
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
                                        className="w-full px-4 py-2 hover:bg-indigo-50/50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer text-left"
                                      >
                                        <ArrowUpRight className="h-3.5 w-3.5" /> Promote Class
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedStudentId(std.id);
                                          setActiveTab("collect");
                                          setActiveMenuStudentId(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-indigo-50/50 text-[11px] font-bold text-indigo-700 flex items-center gap-1.5 cursor-pointer text-left"
                                      >
                                        ⚡ Collect Fee
                                      </button>
                                      
                                      {status !== "SUSPENDED" ? (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to suspend ${std.name}?`)) {
                                              await updateStudentStatus(std.id, "SUSPENDED");
                                            }
                                            setActiveMenuStudentId(null);
                                          }}
                                          className="w-full px-4 py-2 hover:bg-amber-50 text-[11px] font-bold text-amber-700 flex items-center gap-1.5 cursor-pointer text-left"
                                        >
                                          <UserMinus className="h-3.5 w-3.5" /> Suspend Student
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await updateStudentStatus(std.id, "ACTIVE");
                                            setActiveMenuStudentId(null);
                                          }}
                                          className="w-full px-4 py-2 hover:bg-emerald-50 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 cursor-pointer text-left"
                                        >
                                          <Check className="h-3.5 w-3.5" /> Activate Student
                                        </button>
                                      )}
                                      
                                      {status !== "LEFT" && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (confirm(`Mark ${std.name} as LEFT (TC Issued)? This student will not generate future billing charges.`)) {
                                              await updateStudentStatus(std.id, "LEFT");
                                            }
                                            setActiveMenuStudentId(null);
                                          }}
                                          className="w-full px-4 py-2 hover:bg-rose-50 text-[11px] font-bold text-rose-700 flex items-center gap-1.5 cursor-pointer text-left"
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
            </div>

            {/* PAGINATION CONTROLS */}
            {sortedStudentsMemo.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] mt-4 text-xs font-bold text-slate-500 gap-4">
                <div className="flex items-center gap-2">
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, sortedStudentsMemo.length)} of{" "}
                    <strong className="text-slate-900">{sortedStudentsMemo.length}</strong> students
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 font-black text-slate-800">
                    Page {currentPage} of {Math.ceil(sortedStudentsMemo.length / itemsPerPage)}
                  </span>
                  <button
                    disabled={currentPage >= Math.ceil(sortedStudentsMemo.length / itemsPerPage)}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      ) : importMode === "single" ? (
        <StudentRegistrationForm onSuccess={() => setImportMode("directory")} />
      ) : (
        /* Bulk CSV Import Panel */
        <div className="space-y-6 max-w-2xl bg-white border border-slate-200/60 p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] animate-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase text-amber-700 bg-amber-50 border border-amber-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                <UploadCloud className="h-3.5 w-3.5" /> Bulk Import Students via CSV
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Download the standardized CSV template, fill the details, and upload them in bulk.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCSVTemplate}
              className="py-2 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-slate-50 active:scale-95 transition-all shrink-0"
            >
              <Download className="h-4 w-4 text-slate-500" /> Download CSV Template
            </button>
          </div>

          {/* LIVE IMPORT PROGRESS MODAL OVERLAY */}
          {importProgress.isImporting && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-scale-in text-left">
                <div className="flex items-center space-x-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-inner">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      Importing Students ({importProgress.processed} / {importProgress.total})
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Processing Batch {importProgress.currentBatch} of {importProgress.totalBatches}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                      {Math.round((importProgress.processed / importProgress.total) * 100)}% Completed
                    </span>
                    <span className="text-slate-500 font-bold">
                      {importProgress.processed} / {importProgress.total} Pupils
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{
                        width: `${Math.min(100, Math.round((importProgress.processed / importProgress.total) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Live Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Estimated Time Left</span>
                    </div>
                    <p className="text-sm font-black text-slate-800">
                      {importProgress.etaSeconds !== null ? `~${importProgress.etaSeconds} sec` : "Calculating..."}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Import Speed</span>
                    </div>
                    <p className="text-sm font-black text-slate-800">
                      {importProgress.speed ? `${importProgress.speed} std/s` : "Calculating..."}
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl text-center">
                  <p className="text-[11px] text-indigo-700 font-semibold flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping inline-block" />
                    Importing in safe batches to prevent server timeouts. Please keep window open.
                  </p>
                </div>
              </div>
            </div>
          )}

          {importProgress.success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide text-emerald-800">
                    Bulk Import Completed Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Successfully imported <strong>{importProgress.processed} students</strong> in {importProgress.timeTaken || 0} seconds. All billing ledgers &amp; parent profiles auto-generated.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportProgress((prev) => ({ ...prev, success: false }))}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {importCount && !importProgress.success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-xl border border-green-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle className="h-5 w-5" /> Successfully imported {importCount} student records!
            </div>
          )}

          {csvError && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <AlertOctagon className="h-5 w-5" /> {csvError}
            </div>
          )}

          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center bg-slate-50/50 transition-all flex flex-col items-center justify-center space-y-3 group">
            <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Choose CSV File to upload</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">UTF-8 Encoded CSV template matches exact format</p>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer block mx-auto pt-2"
            />
          </div>

          {csvPreview && (
            <div className="space-y-4 animate-fade-in pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-slate-800">
                  CSV Rows Preview ({csvPreview.length} Students)
                </h4>
                <button
                  onClick={handleImportStudents}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  <Check className="h-4 w-4" /> Start Importing {csvPreview.length} Pupils
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase">
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">DOB</th>
                      <th className="py-2 px-3">Father Name</th>
                      <th className="py-2 px-3">Father Mobile</th>
                      <th className="py-2 px-3">Class-Sec</th>
                      <th className="py-2 px-3">Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-slate-800">{row.name}</td>
                        <td className="py-2 px-3">{formatCanonicalDOB(row.dob) || row.dob || "—"}</td>
                        <td className="py-2 px-3 font-bold">{row.fatherName}</td>
                        <td className="py-2 px-3">{row.fatherMobile}</td>
                        <td className="py-2 px-3">{row.classVal}-{row.section}</td>
                        <td className="py-2 px-3 max-w-xs truncate">{row.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvPreview.length > 10 && (
                <p className="text-[10px] text-slate-400 italic text-right font-medium">
                  Showing first 10 rows. Total {csvPreview.length - 10} more rows will be imported.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={showEditModal}
        student={selectedStudent}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStudent(null);
        }}
      />

      {/* Promote Student Modal */}
      {showPromoteModal && selectedStudent && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/60 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative space-y-5 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Promote Student
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Move pupil to next Academic Class/Section</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedStudent(null);
                }}
                className="h-8 w-8 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center justify-center shrink-0 shadow-2xs active:scale-90 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
              <p className="text-xs font-extrabold text-slate-800">Student: {selectedStudent.name}</p>
              <p className="text-[10px] text-slate-500 font-bold">Current Class: Class {selectedStudent.class}-{selectedStudent.section}</p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await promoteStudent(selectedStudent.id, promoteClass, promoteSection);
                setShowPromoteModal(false);
                setSelectedStudent(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Class Name</label>
                <select
                  required
                  value={promoteClass}
                  onChange={(e) => setPromoteClass(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">Select Class</option>
                  {["KG", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((clsName) => (
                    <option key={clsName} value={clsName}>Class {clsName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Section</label>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedStudent(null);
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer text-center"
                >
                  Promote Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Promote Students Modal */}
      {showBulkPromoteModal && selectedStudentIds.length > 0 && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/60 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative space-y-5 text-left animate-scale-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Bulk Promote Class</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Promote selected {selectedStudentIds.length} pupils in bulk</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkPromoteModal(false);
                }}
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
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Class Name</label>
                <select
                  required
                  value={promoteClass}
                  onChange={(e) => setPromoteClass(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">Select Class</option>
                  {["KG", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((clsName) => (
                    <option key={clsName} value={clsName}>Class {clsName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Section</label>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkPromoteModal(false);
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer text-center"
                >
                  Promote Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
