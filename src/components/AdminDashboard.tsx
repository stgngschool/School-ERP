"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import StudentProfileModal from "@/components/StudentProfileModal";
import MarksFeedingConsole from "@/components/MarksFeedingConsole";
import {
  Users,
  Bell,
  CheckCircle,
  AlertOctagon,
  UserCheck,
  PlusCircle,
  ArrowRight,
  Shield,
  Layers,
  Settings,
  ListCollapse,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  CreditCard,
  ArrowRightLeft,
  AlertTriangle,
  Calendar as CalendarIcon,
  BookOpen,
  Printer,
  Download,
  UploadCloud,
  FileText,
  Check,
  Trash2,
  ChevronDown,
  MoreVertical,
  Edit,
  UserMinus,
  ArrowUpRight,
  Eye,
  Search,
  ArrowLeft,
  FileSpreadsheet,
  MessageSquare,
  Phone,
  Hash,
  Home,
  Send,
  AlertCircle,
  Loader2,
  Database,
} from "lucide-react";

// Groups multiple months or siblings into a single row if the list grows too long (> 4 items)
const getGroupedReceiptItems = (items: any[]) => {
  if (!items || items.length === 0) return [];
  if (items.length <= 4) return items;

  const groups: { [key: string]: { name: string; studentPrefix: string; baseFeeHead: string; months: string[]; amount: number; discount: number } } = {};

  items.forEach((item) => {
    const rawName = item.name || item.description || "";
    let studentPrefix = "";
    let rest = rawName;

    if (rawName.includes(":")) {
      const parts = rawName.split(":");
      studentPrefix = parts[0].trim();
      rest = parts.slice(1).join(":").trim();
    }

    let baseFeeHead = rest;
    let month = "";
    const monthsList = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    if (rest.includes("-")) {
      const parts = rest.split("-");
      let monthPartIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const partLower = parts[i].toLowerCase();
        const hasMonth = monthsList.some((m) => partLower.includes(m));
        if (hasMonth) {
          monthPartIndex = i;
          break;
        }
      }

      if (monthPartIndex !== -1) {
        month = parts.slice(monthPartIndex).join("-").trim();
        baseFeeHead = parts.slice(0, monthPartIndex).join("-").trim();
      }
    }

    const key = `${studentPrefix}||${baseFeeHead}`;

    if (!groups[key]) {
      groups[key] = {
        name: baseFeeHead,
        studentPrefix,
        baseFeeHead,
        months: [],
        amount: 0,
        discount: 0,
      };
    }

    if (month) {
      const monthLower = month.toLowerCase();
      const matchedMonth = monthsList.find((m) => monthLower.includes(m));
      if (matchedMonth) {
        const capMonth = matchedMonth.charAt(0).toUpperCase() + matchedMonth.slice(1);
        groups[key].months.push(capMonth);
      }
    }
    groups[key].amount += item.amount;
    groups[key].discount += item.discount || 0;
  });

  return Object.values(groups).map((g) => {
    let finalName = "";
    if (g.studentPrefix) {
      finalName += `${g.studentPrefix}: `;
    }
    finalName += g.baseFeeHead;
    if (g.months.length > 0) {
      if (g.months.length >= 3) {
        finalName += ` (${g.months[0]} to ${g.months[g.months.length - 1]})`;
      } else {
        finalName += ` (${g.months.join(", ")})`;
      }
    }
    return {
      name: finalName,
      amount: g.amount,
      discount: g.discount,
    };
  });
};

export default function AdminDashboard() {
  const {
    user,
    usersList,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    updateAdminProfile,
    registerNewStaff,
    addNotice,
    addStudent,
    bulkImportStudents,
    students,
    schoolInfo,
    updateSchoolInfo,
    auditLogs,
    activeTab,
    setActiveTab,
    dueItems,
    receipts,
    recordItemizedPayment,
    addFeeHead,
    addFeeStructure,
    feeHeads,
    feeStructures,
    classes,
    addClass,
    removeClass,
    removeFeeHead,
    generateBills,
    updateStudentStatus,
    promoteStudent,
    editStudentDetails,
    eventsList,
    addEvent,
    ledgerEntries,
    attendances,
    refreshData,
  } = useAuth();

  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [noticeTarget, setNoticeTarget] = useState<"ALL" | "TEACHERS" | "PARENTS">("ALL");
  const [noticeSuccess, setNoticeSuccess] = useState(false);

  // Student Registration Form State
  const [stdName, setStdName] = useState("");
  const [stdClass, setStdClass] = useState("");
  const [stdSection, setStdSection] = useState("");
  
  // Expanded fields
  const [stdDob, setStdDob] = useState("");
  const [stdAadhaar, setStdAadhaar] = useState("");
  const [stdDisability, setStdDisability] = useState("No");
  const [stdFatherName, setStdFatherName] = useState("");
  const [stdMotherName, setStdMotherName] = useState("");
  const [stdFatherMobile, setStdFatherMobile] = useState("");
  const [stdMotherMobile, setStdMotherMobile] = useState("");
  const [stdFatherAadhaar, setStdFatherAadhaar] = useState("");
  const [stdAddress, setStdAddress] = useState("");
  const [stdParentEmail, setStdParentEmail] = useState("");
  
  // Phase 2 ERP fields
  const [stdCategory, setStdCategory] = useState("General");
  const [stdReligion, setStdReligion] = useState("Hinduism");
  const [stdMotherTongue, setStdMotherTongue] = useState("Hindi");
  const [stdNationality, setStdNationality] = useState("Indian");
  const [stdAdmissionDate, setStdAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [stdBoardRegNo, setStdBoardRegNo] = useState("");
  const [stdPrevSchoolName, setStdPrevSchoolName] = useState("");
  const [stdPrevClassPassed, setStdPrevClassPassed] = useState("");
  const [stdTcNumber, setStdTcNumber] = useState("");
  const [stdParentOccupation, setStdParentOccupation] = useState("");
  const [stdFamilyIncome, setStdFamilyIncome] = useState("");
  const [stdEmergencyName, setStdEmergencyName] = useState("");
  const [stdEmergencyPhone, setStdEmergencyPhone] = useState("");
  const [stdMotherAadhaar, setStdMotherAadhaar] = useState("");
  const [stdTransportMode, setStdTransportMode] = useState("Self");
  const [stdBusRoute, setStdBusRoute] = useState("");
  const [stdBusStop, setStdBusStop] = useState("");
  
  // Sibling Family Linkage Setup State
  const [stdFamilyIdMode, setStdFamilyIdMode] = useState<"auto" | "existing">("auto");
  const [stdSelectedFamilyCode, setStdSelectedFamilyCode] = useState("");
  
  // Custom checklist items for registering student initial billing dues
  const [checkedDues, setCheckedDues] = useState<Record<string, boolean>>({});
  const [stdSuccess, setStdSuccess] = useState(false);
  const [stdIsRte, setStdIsRte] = useState(false);

  // Student Directory & Modals States
  const [importMode, setImportMode] = useState<"directory" | "single" | "bulk">("directory");
  const [dirSearch, setDirSearch] = useState("");
  const [dirClassFilter, setDirClassFilter] = useState("");
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);

  // ID Cards & Photos State
  const [idClassFilter, setIdClassFilter] = useState("");
  const [selectedIdCardStudentIds, setSelectedIdCardStudentIds] = useState<string[]>([]);
  const [isPrintingIdCards, setIsPrintingIdCards] = useState(false);
  
  // User Security Tab States
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [securityTabMode, setSecurityTabMode] = useState<"staff" | "parents">("staff");
  const [parentsCurrentPage, setParentsCurrentPage] = useState(1);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUserName, setResetUserName] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetModalError, setResetModalError] = useState("");
  const [resetModalSuccess, setResetModalSuccess] = useState("");
  // Admin Profile and Add Staff Modal States
  const [adminFormName, setAdminFormName] = useState("");
  const [adminFormUsername, setAdminFormUsername] = useState("");
  const [adminFormEmail, setAdminFormEmail] = useState("");
  const [adminFormPhone, setAdminFormPhone] = useState("");
  const [adminProfileError, setAdminProfileError] = useState("");
  const [adminProfileSuccess, setAdminProfileSuccess] = useState("");

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"ADMIN" | "TEACHER" | "ACCOUNTANT">("TEACHER");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffEmployeeId, setNewStaffEmployeeId] = useState("");
  const [addStaffError, setAddStaffError] = useState("");
  const [addStaffSuccess, setAddStaffSuccess] = useState("");

  const itemsPerPage = 50;
  
  const [receiptPageSize, setReceiptPageSize] = useState<"A4" | "A5">("A5");

  // Google Cloud Integration states
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState("");
  const [googleFolderId, setGoogleFolderId] = useState("");
  const [syncingStudents, setSyncingStudents] = useState(false);
  const [syncingLedger, setSyncingLedger] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setGoogleSpreadsheetId(localStorage.getItem("g_sheet_id") || "");
      setGoogleFolderId(localStorage.getItem("g_drive_folder_id") || "");
    }
  }, []);

  const handleSpreadsheetIdChange = (val: string) => {
    setGoogleSpreadsheetId(val);
    localStorage.setItem("g_sheet_id", val);
  };

  const handleFolderIdChange = (val: string) => {
    setGoogleFolderId(val);
    localStorage.setItem("g_drive_folder_id", val);
  };

  const triggerSyncStudents = async () => {
    if (!googleSpreadsheetId.trim()) {
      setGoogleStatus({ type: "error", msg: "Please enter a valid Google Spreadsheet ID first." });
      return;
    }
    setSyncingStudents(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_STUDENTS", spreadsheetId: googleSpreadsheetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({ type: "success", msg: `Successfully synced ${data.count} students to Sheet1!` });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to sync student list." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to sync." });
    } finally {
      setSyncingStudents(false);
    }
  };

  const triggerSyncLedger = async () => {
    if (!googleSpreadsheetId.trim()) {
      setGoogleStatus({ type: "error", msg: "Please enter a valid Google Spreadsheet ID first." });
      return;
    }
    setSyncingLedger(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_LEDGER", spreadsheetId: googleSpreadsheetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({ type: "success", msg: `Successfully synced ${data.count} ledger entries to Sheet1!` });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to sync transaction ledger." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to sync." });
    } finally {
      setSyncingLedger(false);
    }
  };

  const triggerBackupDrive = async () => {
    if (!googleFolderId.trim()) {
      setGoogleStatus({ type: "error", msg: "Please enter a valid Google Drive Folder ID first." });
      return;
    }
    setBackingUp(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BACKUP_DB", folderId: googleFolderId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({ 
          type: "success", 
          msg: `Backup created: "${data.fileName}". Verified ${data.stats.students} students and ${data.stats.ledgerEntries} transactions successfully uploaded!` 
        });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to upload backup to Google Drive." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to backup." });
    } finally {
      setBackingUp(false);
    }
  };

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  // Edit Form Fields
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editAadhaar, setEditAadhaar] = useState("");
  const [editDisability, setEditDisability] = useState("No");
  const [editFatherName, setEditFatherName] = useState("");
  const [editMotherName, setEditMotherName] = useState("");
  const [editFatherMobile, setEditFatherMobile] = useState("");
  const [editMotherMobile, setEditMotherMobile] = useState("");
  const [editFatherAadhaar, setEditFatherAadhaar] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [editReligion, setEditReligion] = useState("Hinduism");
  const [editMotherTongue, setEditMotherTongue] = useState("Hindi");
  const [editNationality, setEditNationality] = useState("Indian");
  const [editParentOccupation, setEditParentOccupation] = useState("");
  const [editFamilyIncome, setEditFamilyIncome] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editMotherAadhaar, setEditMotherAadhaar] = useState("");
  const [editTransportMode, setEditTransportMode] = useState("Self");
  const [editBusRoute, setEditBusRoute] = useState("");
  const [editBusStop, setEditBusStop] = useState("");
  const [editIsRte, setEditIsRte] = useState(false);
  
  // Promotion Fields
  const [promoteClass, setPromoteClass] = useState("");
  const [promoteSection, setPromoteSection] = useState("");

  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Fee Collection States (ported from Accountant)
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [discountsState, setDiscountsState] = useState<Record<string, number>>({});
  const [payingState, setPayingState] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [activeSiblingTabId, setActiveSiblingTabId] = useState("");
  const [fifoAmount, setFifoAmount] = useState("");

  // Fee Config States (ported from Accountant)
  const [newHead, setNewHead] = useState("");
  const [newHeadFreq, setNewHeadFreq] = useState("monthly");
  const [newStructName, setNewStructName] = useState("");
  const [newStructFreq, setNewStructFreq] = useState("monthly");
  const [newStructAmount, setNewStructAmount] = useState("");
  const [newStructClass, setNewStructClass] = useState("All");
  const [classFeeInputs, setClassFeeInputs] = useState<Record<string, string>>({});
  const [gridInputs, setGridInputs] = useState<Record<string, Record<string, string>>>({});
  const [gridFrequencies, setGridFrequencies] = useState<Record<string, string>>({});
  const [structSuccess, setStructSuccess] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("A");
  const [classSuccess, setClassSuccess] = useState(false);

  // Generate Bills State
  const currentMonthName = ["January","February","March","April","May","June","July","August","September","October","November","December"][new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  const defaultAcYear = new Date().getMonth() >= 3 ? `${currentYear}-${currentYear+1}` : `${currentYear-1}-${currentYear}`;
  const [billMonth, setBillMonth] = useState(currentMonthName);
  const [billYear, setBillYear] = useState(defaultAcYear);
  const [billLoading, setBillLoading] = useState(false);
  const [billResult, setBillResult] = useState<{success:boolean; totalGenerated:number; totalSkipped:number; message:string} | null>(null);

  // Interactive Dashboard States
  const [showStudentCurve, setShowStudentCurve] = useState(true);
  const [showTeacherCurve, setShowTeacherCurve] = useState(true);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [financeInterval, setFinanceInterval] = useState<"weekly" | "monthly">("weekly");
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("9");

  // Receipts/Ledger sub-tab and filter states
  const [ledgerSubTab, setLedgerSubTab] = useState<"receipts" | "raw">("receipts");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerDate, setLedgerDate] = useState("");

  // Defaulter / Dues Report filters
  const [defaulterSearch, setDefaulterSearch] = useState("");
  const [defaulterClass, setDefaulterClass] = useState("All");
  const [alertSuccessMsg, setAlertSuccessMsg] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [defaulterPage, setDefaulterPage] = useState(1);
  
  // School Customizer Settings Form State

  // School Customizer Settings Form State
  const [schoolName, setSchoolName] = useState(schoolInfo.name);
  const [schoolAddress, setSchoolAddress] = useState(schoolInfo.address);
  const [schoolPhone, setSchoolPhone] = useState(schoolInfo.phone);
  const [schoolEmail, setSchoolEmail] = useState(schoolInfo.email);
  const [schoolUpiId, setSchoolUpiId] = useState(schoolInfo.upiId || "");
  const [schoolUpiMerchantName, setSchoolUpiMerchantName] = useState(schoolInfo.upiMerchantName || "");
  const [schoolSuccess, setSchoolSuccess] = useState(false);
  const [schoolExams, setSchoolExams] = useState<string[]>([]);
  const [newExamInput, setNewExamInput] = useState("");
  const [savingExams, setSavingExams] = useState(false);
  const [schoolExamConfig, setSchoolExamConfig] = useState<any>({});
  const [selectedConfigExam, setSelectedConfigExam] = useState<string>("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompMax, setNewCompMax] = useState("");

  // Sync settings form states when schoolInfo loads
  React.useEffect(() => {
    if (schoolInfo && schoolInfo.name !== "Loading School Profile...") {
      setSchoolName(schoolInfo.name);
      setSchoolAddress(schoolInfo.address);
      setSchoolPhone(schoolInfo.phone);
      setSchoolEmail(schoolInfo.email);
      setSchoolUpiId(schoolInfo.upiId || "");
      setSchoolUpiMerchantName(schoolInfo.upiMerchantName || "");
      const defaultExams = schoolInfo.exams || ["Unit-1", "Half Yearly", "Unit-2", "Annual"];
      setSchoolExams(defaultExams);
      if (defaultExams.length > 0) {
        setSelectedConfigExam(defaultExams[0]);
      }
      setSchoolExamConfig(schoolInfo.examConfig || {
        "Unit-1": { "isSplit": false, "maxMarks": 20 },
        "Unit-2": { "isSplit": false, "maxMarks": 20 },
        "Half Yearly": {
          "isSplit": true,
          "maxMarks": 100,
          "components": [
            { "name": "Written Exam", "max": 80 },
            { "name": "Note Book", "max": 5 },
            { "name": "Sub. Enrich.", "max": 5 },
            { "name": "Pr. Act.", "max": 10 }
          ]
        },
        "Annual": {
          "isSplit": true,
          "maxMarks": 100,
          "components": [
            { "name": "Written Exam", "max": 80 },
            { "name": "Note Book", "max": 5 },
            { "name": "Sub. Enrich.", "max": 5 },
            { "name": "Pr. Act.", "max": 10 }
          ]
        }
      });
    }
  }, [schoolInfo]);

  // Sync admin profile states when user info loads
  React.useEffect(() => {
    if (user) {
      setAdminFormName(user.name || "");
      setAdminFormUsername(user.username || "");
      setAdminFormEmail(user.email || "");
      setAdminFormPhone(user.phone || "");
    }
  }, [user]);

  // Memos for Fee Collection (ported from Accountant Dashboard)
  const suggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    return students.filter((s) => {
      return (
        s.name.toLowerCase().includes(query) ||
        s.admissionNo.toLowerCase().includes(query) ||
        (s.familyCode && s.familyCode.toLowerCase().includes(query))
      );
    }).slice(0, 10);
  }, [searchQuery, students]);

  const selectedStudentObj = students.find((s) => s.id === selectedStudentId);

  const siblingStudents = React.useMemo(() => {
    if (!selectedStudentObj) return [];
    if (!selectedStudentObj.familyCode) return [selectedStudentObj];
    return students.filter(s => s.familyCode === selectedStudentObj.familyCode);
  }, [selectedStudentObj, students]);

  const siblingStudentIds = React.useMemo(() => {
    return siblingStudents.map(s => s.id);
  }, [siblingStudents]);

  const selectedStudentDues = React.useMemo(() => {
    return dueItems.filter(d => siblingStudentIds.includes(d.studentId) && d.status === "UNPAID");
  }, [siblingStudentIds, dueItems]);

  React.useEffect(() => {
    if (selectedStudentId) {
      setActiveSiblingTabId(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Initialize classFeeInputs based on selected class structures
  React.useEffect(() => {
    const templateName = `Class ${newStructClass} Fees Template`;
    const struct = feeStructures.find(fs => fs.name === templateName && fs.className === newStructClass);
    const inputs: Record<string, string> = {};
    
    feeHeads.forEach(head => {
      inputs[head.name] = "";
    });

    if (struct && struct.items) {
      struct.items.forEach(item => {
        inputs[item.headName] = String(item.amount);
      });
      setNewStructFreq(struct.frequency);
    }
    
    setClassFeeInputs(inputs);
  }, [newStructClass, feeStructures, feeHeads]);

  React.useEffect(() => {
    if (classes && classes.length > 0 && !stdClass) {
      setStdClass(classes[0].name);
      setStdSection(classes[0].section);
    }
  }, [classes, stdClass]);

  React.useEffect(() => {
    const inputs: Record<string, Record<string, string>> = {};
    const freqs: Record<string, string> = {};

    // 1. Initialize General Fallback row (All Classes)
    inputs["All"] = {};
    freqs["All"] = "monthly";
    const generalStruct = feeStructures.find(fs => fs.className === "All");
    feeHeads.forEach((head) => {
      inputs["All"][head.name] = "";
    });
    if (generalStruct) {
      freqs["All"] = generalStruct.frequency;
      if (generalStruct.items) {
        generalStruct.items.forEach((item) => {
          inputs["All"][item.headName] = String(item.amount);
        });
      }
    }

    // 2. Initialize dynamic classes rows
    classes.forEach((cls) => {
      inputs[cls.id] = {};
      freqs[cls.id] = "monthly";

      const templateName = `Class ${cls.name} Fees Template`;
      const struct = feeStructures.find(
        (fs) => fs.className === cls.name || fs.name === templateName
      );

      feeHeads.forEach((head) => {
        inputs[cls.id][head.name] = "";
      });

      if (struct) {
        freqs[cls.id] = struct.frequency;
        if (struct.items) {
          struct.items.forEach((item) => {
            inputs[cls.id][item.headName] = String(item.amount);
          });
        }
      }
    });

    setGridInputs(inputs);
    setGridFrequencies(freqs);
  }, [classes, feeHeads, feeStructures]);

  // Extract unique families from students list to display in Sibling Link selector
  const parentFamilies = React.useMemo(() => {
    const familiesMap = new Map<string, {
      familyCode: string;
      parentName: string;
      parentPhone: string;
      parentEmail: string;
      address: string;
      parentOccupation: string;
      familyIncome: string;
      emergencyName: string;
      emergencyPhone: string;
      motherName: string;
      motherMobile: string;
      fatherAadhaar: string;
      motherAadhaar: string;
    }>();
    
    students.forEach((s) => {
      if (s.familyCode) {
        familiesMap.set(s.familyCode, {
          familyCode: s.familyCode,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          parentEmail: s.parentEmail || "",
          address: s.address || "",
          parentOccupation: s.parentOccupation || "",
          familyIncome: s.familyIncome || "",
          emergencyName: s.emergencyName || "",
          emergencyPhone: s.emergencyPhone || "",
          motherName: s.motherName || "",
          motherMobile: s.motherMobile || "",
          fatherAadhaar: s.fatherAadhaar || "",
          motherAadhaar: s.motherAadhaar || "",
        });
      }
    });

    return Array.from(familiesMap.values());
  }, [students]);

  // Prefill parent fields when an existing sibling's family code is chosen
  React.useEffect(() => {
    if (stdFamilyIdMode === "existing" && stdSelectedFamilyCode) {
      const fam = parentFamilies.find(f => f.familyCode === stdSelectedFamilyCode);
      if (fam) {
        setStdFatherName(fam.parentName);
        setStdFatherMobile(fam.parentPhone);
        setStdParentEmail(fam.parentEmail);
        setStdAddress(fam.address);
        setStdParentOccupation(fam.parentOccupation);
        setStdFamilyIncome(fam.familyIncome);
        setStdEmergencyName(fam.emergencyName);
        setStdEmergencyPhone(fam.emergencyPhone);
        setStdMotherName(fam.motherName);
        setStdMotherMobile(fam.motherMobile);
        setStdFatherAadhaar(fam.fatherAadhaar);
        setStdMotherAadhaar(fam.motherAadhaar);
      }
    }
  }, [stdFamilyIdMode, stdSelectedFamilyCode, parentFamilies]);

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeContent) return;

    addNotice(noticeTitle, noticeContent, noticeTarget);
    setNoticeTitle("");
    setNoticeContent("");
    setNoticeSuccess(true);
    setTimeout(() => setNoticeSuccess(false), 3000);
  };

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stdName || !stdFatherName || !stdFatherMobile || !stdAddress) return;

    const initialDues: { name: string; amount: number }[] = [];
    Object.keys(checkedDues).forEach((h) => {
      if (checkedDues[h]) {
        const struct = feeStructures.find((s) => s.name === h);
        const amount = struct ? struct.total : 700;
        initialDues.push({ name: h, amount });
      }
    });

    const studentData = {
      name: stdName,
      classVal: stdClass,
      section: stdSection,
      dob: stdDob,
      aadhaar: stdAadhaar,
      disability: stdDisability,
      fatherName: stdFatherName,
      motherName: stdMotherName,
      fatherMobile: stdFatherMobile,
      motherMobile: stdMotherMobile,
      fatherAadhaar: stdFatherAadhaar,
      address: stdAddress,
      parentEmail: stdParentEmail,
      category: stdCategory,
      religion: stdReligion,
      motherTongue: stdMotherTongue,
      nationality: stdNationality,
      admissionDate: stdAdmissionDate,
      boardRegNo: stdBoardRegNo,
      prevSchoolName: stdPrevSchoolName,
      prevClassPassed: stdPrevClassPassed,
      tcNumber: stdTcNumber,
      parentOccupation: stdParentOccupation,
      familyIncome: stdFamilyIncome,
      emergencyName: stdEmergencyName,
      emergencyPhone: stdEmergencyPhone,
      motherAadhaar: stdMotherAadhaar,
      transportMode: stdTransportMode,
      busRoute: stdBusRoute,
      busStop: stdBusStop,
      familyCode: stdFamilyIdMode === "existing" ? stdSelectedFamilyCode : undefined,
      isRte: stdIsRte,
    };

    addStudent(studentData, initialDues);

    setStdName("");
    setStdDob("");
    setStdAadhaar("");
    setStdDisability("No");
    setStdFatherName("");
    setStdMotherName("");
    setStdFatherMobile("");
    setStdMotherMobile("");
    setStdFatherAadhaar("");
    setStdAddress("");
    setStdParentEmail("");
    setStdIsRte(false);
    
    // Reset sibling linkage
    setStdFamilyIdMode("auto");
    setStdSelectedFamilyCode("");
    
    // Reset new Phase 2 fields
    setStdCategory("General");
    setStdReligion("Hinduism");
    setStdMotherTongue("Hindi");
    setStdNationality("Indian");
    setStdAdmissionDate(new Date().toISOString().split("T")[0]);
    setStdBoardRegNo("");
    setStdPrevSchoolName("");
    setStdPrevClassPassed("");
    setStdTcNumber("");
    setStdParentOccupation("");
    setStdFamilyIncome("");
    setStdEmergencyName("");
    setStdEmergencyPhone("");
    setStdMotherAadhaar("");
    setStdTransportMode("Self");
    setStdBusRoute("");
    setStdBusStop("");

    setStdSuccess(true);
    setTimeout(() => setStdSuccess(false), 3000);
  };

  const handleUpdateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolInfo({
      name: schoolName,
      address: schoolAddress,
      phone: schoolPhone,
      email: schoolEmail,
      upiId: schoolUpiId,
      upiMerchantName: schoolUpiMerchantName,
    });
    setSchoolSuccess(true);
    setTimeout(() => setSchoolSuccess(false), 3000);
  };

  // Fee Collection Handlers (ported from Accountant)
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedDueIds([]);
    setDiscountsState({});
    setPayingState({});
    setAmountReceived("");
    setShowSuggestions(false);
  };

  const handleToggleDueSelection = (dueId: string) => {
    const due = dueItems.find((d) => d.id === dueId);
    if (!due) return;

    setSelectedDueIds((prev) => {
      const isChecked = prev.includes(dueId);
      if (isChecked) {
        setDiscountsState((d) => {
          const copy = { ...d };
          delete copy[dueId];
          return copy;
        });
        setPayingState((p) => {
          const copy = { ...p };
          delete copy[dueId];
          return copy;
        });
        return prev.filter((id) => id !== dueId);
      } else {
        setDiscountsState((d) => ({ ...d, [dueId]: 0 }));
        setPayingState((p) => ({ ...p, [dueId]: due.amount }));
        return [...prev, dueId];
      }
    });
  };

  const handleFIFOAllocate = (amountStr: string) => {
    const totalAmountToAllocate = Number(amountStr) || 0;
    if (totalAmountToAllocate <= 0) {
      setSelectedDueIds([]);
      setPayingState({});
      setDiscountsState({});
      return;
    }

    // Sort all dues across siblings by due date (oldest first)
    const sortedDues = [...selectedStudentDues].sort((a, b) => {
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
    });

    let remaining = totalAmountToAllocate;
    const newSelectedIds: string[] = [];
    const newPayingState: Record<string, number> = {};
    const newDiscountsState: Record<string, number> = {};

    for (const due of sortedDues) {
      if (remaining <= 0) break;

      newSelectedIds.push(due.id);
      newDiscountsState[due.id] = 0; // Default discount is 0

      if (remaining >= due.amount) {
        newPayingState[due.id] = due.amount;
        remaining -= due.amount;
      } else {
        newPayingState[due.id] = remaining;
        remaining = 0;
      }
    }

    setSelectedDueIds(newSelectedIds);
    setPayingState(newPayingState);
    setDiscountsState(newDiscountsState);
  };

  const handleOfflinePayment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student || selectedDueIds.length === 0) return;

    const unpaidItems = dueItems.filter((d) => selectedDueIds.includes(d.id));
    const items = selectedDueIds.map((dueId) => ({
      ledgerEntryId: dueId,
      payAmount: payingState[dueId] ?? 0,
      discountAmount: discountsState[dueId] ?? 0,
      studentId: dueItems.find(d => d.id === dueId)?.studentId
    }));

    const totalPaid = items.reduce((sum, item) => sum + item.payAmount, 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const originalDueSum = unpaidItems.reduce((sum, item) => sum + item.amount, 0);
    const remainingArrears = originalDueSum - totalPaid - totalDiscount;

    if (totalPaid <= 0 && totalDiscount <= 0) return;

    // Send null for studentId to trigger unified family checkout
    const success = await recordItemizedPayment(null, items, payMethod, transactionRef);
    if (!success) {
      alert("Payment failed. Please check backend logs or try again.");
      return;
    }

    // Calculate remaining arrears for the family
    const familyOtherDuesSum = dueItems
      .filter((d) => siblingStudentIds.includes(d.studentId) && d.status === "UNPAID" && !selectedDueIds.includes(d.id))
      .reduce((sum, item) => sum + item.amount, 0);

    const totalRemainingArrears = familyOtherDuesSum + remainingArrears;
    const isSingleSibling = siblingStudents.length === 1;

    // Receipt Details for modal
    const matchedReceipt = {
      receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: isSingleSibling ? student.name : `Family (Siblings: ${siblingStudents.map(s => s.name).join(", ")})`,
      classSection: isSingleSibling ? `${student.class}-${student.section}` : "Unified Family",
      admissionNo: isSingleSibling ? student.admissionNo : student.familyCode || "Multi",
      amount: totalPaid,
      method: payMethod,
      discount: totalDiscount,
      arrears: totalRemainingArrears,
      details: items
        .map((i) => {
          const itemObj = unpaidItems.find((ui) => ui.id === i.ledgerEntryId);
          const itemDesc = itemObj?.name || "";
          const child = students.find(s => s.id === itemObj?.studentId);
          const prefix = child ? `${child.name}: ` : "";
          return `${prefix}${itemDesc} (Paid: Rs. ${i.payAmount}${i.discountAmount > 0 ? `, Disc: Rs. ${i.discountAmount}` : ""})`;
        })
        .join(" + "),
      items: items.map((i) => {
        const itemObj = unpaidItems.find((ui) => ui.id === i.ledgerEntryId);
        const itemDesc = itemObj?.name || "";
        const child = students.find(s => s.id === itemObj?.studentId);
        return {
          name: child ? `${child.name}: ${itemDesc}` : itemDesc,
          amount: i.payAmount,
          discount: i.discountAmount
        };
      }),
      createdAt: new Date().toISOString().split("T")[0],
    };

    setActiveReceipt(matchedReceipt);
    setSelectedDueIds([]);
    setDiscountsState({});
    setPayingState({});
    setAmountReceived("");
    setTransactionRef("");
    setSelectedStudentId("");
    setSearchQuery("");
    setShowReceiptModal(true);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newClassSection) return;
    addClass(newClassName, newClassSection);
    setNewClassName("");
    setNewClassSection("A");
    setClassSuccess(true);
    setTimeout(() => setClassSuccess(false), 3000);
  };

  // Fee Head & Structure Handlers
  const handleAddHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHead) return;
    addFeeHead(newHead, newHeadFreq);
    setNewHead("");
    setNewHeadFreq("monthly");
  };

  const handleAddStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStructClass) return;

    const templateName = `Class ${newStructClass} Fees Template`;
    const itemsList: { headName: string; amount: number }[] = [];
    let total = 0;
    
    Object.keys(classFeeInputs).forEach(headName => {
      const val = parseFloat(classFeeInputs[headName]) || 0;
      if (val > 0) {
        itemsList.push({ headName, amount: val });
        total += val;
      }
    });

    addFeeStructure(templateName, newStructFreq, total, newStructClass, itemsList);
    setNewStructName("");
    setNewStructAmount("");
    setStructSuccess(true);
    setTimeout(() => setStructSuccess(false), 3000);
  };

  const handleSaveClassGrid = (clsId: string, className: string) => {
    const freq = gridFrequencies[clsId] || "monthly";
    const inputs = gridInputs[clsId] || {};
    const templateName = `Class ${className} Fees Template`;
    const itemsList: { headName: string; amount: number }[] = [];
    let total = 0;

    Object.keys(inputs).forEach(headName => {
      const val = parseFloat(inputs[headName]) || 0;
      if (val > 0) {
        itemsList.push({ headName, amount: val });
        total += val;
      }
    });

    addFeeStructure(templateName, freq, total, className, itemsList);
    setStructSuccess(true);
    setTimeout(() => setStructSuccess(false), 3000);
  };

  // Bulk Import CSV Logic
  const handleDownloadCSVTemplate = () => {
    const headers = [
      "Student Name",
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
      "Rajesh Sharma",
      "2015-08-14",
      "123456789012",
      "No",
      "Amit Sharma",
      "Suman Sharma",
      "amit.sharma@email.com",
      "9876543210",
      "9876543219",
      "123456789099",
      "123 Sector 4 Noida",
      "10",
      "A",
      "General",
      "Hinduism",
      "Hindi",
      "Indian",
      "2026-04-01",
      "CBSE-10-998877",
      "DPS Noida",
      "9",
      "TC-992288",
      "Business",
      "600000",
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
            console.warn(`Line ${i+1} has fewer columns than headers. Skipping.`);
            continue;
          }

          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = cols[index];
          });

          const mappedRecord = {
            name: record["Student Name"],
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
    const ok = await bulkImportStudents(csvPreview);
    if (ok) {
      setImportCount(csvPreview.length);
      setCsvPreview(null);
      setTimeout(() => setImportCount(null), 5000);
    } else {
      setCsvError("Server failed to import students. Check database fields.");
    }
  };

  // 1. Daily Income
  const todayStr = new Date().toISOString().split("T")[0];
  const dailyIncome = receipts
    .filter((r) => r.createdAt === todayStr)
    .reduce((sum, r) => sum + r.amount, 0);

  // 2. Monthly Income
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthlyIncome = receipts
    .filter((r) => r.createdAt.startsWith(currentMonthPrefix))
    .reduce((sum, r) => sum + r.amount, 0);

  // 3. Yearly Income
  const yearlyIncome = receipts.reduce((sum, r) => sum + r.amount, 0);

  // 4. Collection Trend (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  const trendData = last7Days.map((date) => {
    const dailySum = receipts
      .filter((r) => r.createdAt === date)
      .reduce((sum, r) => sum + r.amount, 0);
    return { date, amount: dailySum };
  });

  const weeklyIncome = trendData.reduce((sum, item) => sum + item.amount, 0);

  const maxTrendAmount = Math.max(...trendData.map((t) => t.amount), 1000);

  // 5. Class-wise Pending Dues
  const classDuesMap: Record<string, number> = {};
  dueItems.forEach((d) => {
    if (d.status === "UNPAID") {
      const std = students.find((s) => s.id === d.studentId);
      if (std) {
        const className = `Class ${std.class}-${std.section}`;
        classDuesMap[className] = (classDuesMap[className] || 0) + d.amount;
      }
    }
  });

  // 6. Payment Mode Summary
  const modeSummary: Record<string, number> = { CASH: 0, UPI: 0, CHEQUE: 0, ONLINE: 0 };
  receipts.forEach((r) => {
    const method = r.paymentMethod || "CASH";
    const mappedMethod = method === "CASH" ? "CASH" : method === "UPI" ? "UPI" : method === "ONLINE" ? "ONLINE" : "CHEQUE";
    modeSummary[mappedMethod] = (modeSummary[mappedMethod] || 0) + r.amount;
  });

  // 7. Staff Collection (Cashier Breakdown)
  const staffCollection = {
    cashierOffline: receipts
      .filter((r) => r.paymentMethod === "CASH" || r.paymentMethod === "CHEQUE")
      .reduce((sum, r) => sum + r.amount, 0),
    onlinePortal: receipts
      .filter((r) => r.paymentMethod === "UPI" || r.paymentMethod === "ONLINE")
      .reduce((sum, r) => sum + r.amount, 0),
  };

  // 8. Recent Receipts
  const recentReceipts = [...receipts].reverse().slice(0, 5);

  // --- Graph and Chart Dynamic calculations ---
  // School Performance
  const maxPerformanceVal = Math.max(students.length, 50);
  const studentYPoints = Array.from({ length: 10 }, (_, i) => {
    const val = Math.round(students.length * (0.8 + (i * 0.2) / 9));
    return 150 - (val / maxPerformanceVal) * 110;
  });
  const teacherCountVal = usersList.filter((u) => u.role === "TEACHER").length || 8;
  const teacherYPoints = Array.from({ length: 10 }, (_, i) => {
    const offset = i === 2 || i === 5 ? -1 : 0;
    const val = Math.max(0, teacherCountVal + offset);
    return 150 - (val / maxPerformanceVal) * 110;
  });
  const buildPerformancePath = (yPoints: number[]) => {
    return yPoints.map((y, idx) => {
      const x = 50 + (idx * 400) / 9;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  };
  const studentPath = buildPerformancePath(studentYPoints);
  const teacherPath = buildPerformancePath(teacherYPoints);
  const studentAreaPath = `${studentPath} L 450 150 L 50 150 Z`;
  const teacherAreaPath = `${teacherPath} L 450 150 L 50 150 Z`;

  // School Finance
  const last7Months = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (6 - i));
    return d.toISOString().slice(0, 7);
  });
  const monthlyTrendData = last7Months.map((month) => {
    const monthlySum = receipts
      .filter((r) => r.createdAt.startsWith(month))
      .reduce((sum, r) => sum + r.amount, 0);
    return { month, amount: monthlySum };
  });
  const maxWeeklyAmount = Math.max(...trendData.map(t => t.amount), 1000);
  const weeklyYPoints = trendData.map((t) => 140 - (t.amount / maxWeeklyAmount) * 100);
  const weeklyExpenseYPoints = trendData.map((t) => 140 - ((t.amount * 0.08) / maxWeeklyAmount) * 100);
  const maxMonthlyAmount = Math.max(...monthlyTrendData.map(t => t.amount), 1000);
  const monthlyYPoints = monthlyTrendData.map((t) => 140 - (t.amount / maxMonthlyAmount) * 100);
  const monthlyExpenseYPoints = monthlyTrendData.map((t) => 140 - ((t.amount * 0.08) / maxMonthlyAmount) * 100);
  const buildFinancePath = (yPoints: number[]) => {
    return yPoints.map((y, idx) => `${idx === 0 ? "M" : "L"} ${50 + idx * 50} ${y}`).join(" ");
  };
  const financeIncomePath = buildFinancePath(financeInterval === "weekly" ? weeklyYPoints : monthlyYPoints);
  const financeExpensePath = buildFinancePath(financeInterval === "weekly" ? weeklyExpenseYPoints : monthlyExpenseYPoints);
  const weeklyLabels = last7Days.map(date => new Date(date).toLocaleDateString("en-US", { weekday: "short" }));
  const monthlyLabels = last7Months.map(month => new Date(month + "-02").toLocaleDateString("en-US", { month: "short" }));

  const handleSendSMS = (studentName: string, parentName: string, amount: number) => {
    setAlertSuccessMsg(`Mock Alert sent to ${parentName} regarding ${studentName}'s pending dues of ₹${amount.toLocaleString("en-IN")}`);
    setTimeout(() => setAlertSuccessMsg(""), 5000);
  };

  const [compressingStudentId, setCompressingStudentId] = useState<string | null>(null);

  const compressAndUploadPhoto = async (studentId: string, file: File) => {
    setCompressingStudentId(studentId);
    try {
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const targetWidth = 240;
            const targetHeight = 240;
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }
            
            const sourceSize = Math.min(img.width, img.height);
            const sourceX = (img.width - sourceSize) / 2;
            const sourceY = (img.height - sourceSize) / 2;
            
            ctx.drawImage(
              img, 
              sourceX, sourceY, sourceSize, sourceSize,
              0, 0, targetWidth, targetHeight
            );
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Compression failed"));
                }
              },
              "image/jpeg",
              0.75
            );
          };
          img.onerror = () => reject(new Error("Failed to load image"));
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
      });
      
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("file", new File([compressedBlob], `student_${studentId}.jpg`, { type: "image/jpeg" }));
      
      const res = await fetch("/api/students/upload-photo", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Upload failed");
      }
      
      await refreshData();
      alert("Photo uploaded and updated successfully!");
    } catch (err: any) {
      alert("Auto-compress & upload failed: " + err.message);
    } finally {
      setCompressingStudentId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans w-full max-w-full overflow-x-hidden">
      {/* 1. Header & Quick Overview */}
      <div className="flex flex-col gap-1 border-b border-slate-200/80 pb-4">
        <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Super Admin Dashboard</h2>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Global operations control: assign roles, toggle account blocks, register new students, and broadcast alerts.
        </p>
      </div>
      {activeTab === "dashboard" ? (
        <div className="space-y-6 animate-fade-in font-sans">
          {(() => {
            const girlsFirstNames = ["diya", "anya", "ananya", "kiara", "priya", "sneha", "pooja", "neha", "riya", "simran", "kajal", "preeti", "shalini", "deepika", "kiran", "aisha", "jyoti", "meera", "geeta", "rekha", "sunita", "anita", "kavita", "mamta", "babita", "sapna", "poonam", "usha"];
            const studentGenders = students.map(s => {
              const firstName = s.name.split(" ")[0].toLowerCase();
              const isGirl = girlsFirstNames.includes(firstName);
              return { ...s, gender: isGirl ? "GIRL" : "BOY" };
            });
            const totalStudents = students.length;
            const girlsCount = studentGenders.filter(s => s.gender === "GIRL").length;
            const boysCount = totalStudents - girlsCount;

            const newAdmissionsCount = students.filter(s => {
              const idNum = parseInt(s.id.replace("std-id-", ""));
              return !isNaN(idNum) && idNum <= 120;
            }).length;
            const oldStudentsCount = totalStudents - newAdmissionsCount;

            const totalEarnings = receipts.reduce((sum, r) => sum + r.amount, 0);
            const totalDues = dueItems.reduce((sum, d) => sum + d.amount, 0);
            const totalSales = totalEarnings + totalDues;

            const cashTally = receipts.filter(r => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
            const upiTally = receipts.filter(r => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);
            const bankTally = receipts.filter(r => r.method === "BANK_TRANSFER" || r.method === "CHEQUE" || r.method === "ONLINE").reduce((sum, r) => sum + r.amount, 0);

            const todayStr = (() => {
              const d = new Date();
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })();
            const todayReceipts = receipts.filter(r => r.createdAt === todayStr);
            const todayCash = todayReceipts.filter(r => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
            const todayUpi = todayReceipts.filter(r => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);
            const todayBank = todayReceipts.filter(r => r.method === "BANK_TRANSFER" || r.method === "CHEQUE" || r.method === "ONLINE").reduce((sum, r) => sum + r.amount, 0);
            const todayTotal = todayReceipts.reduce((sum, r) => sum + r.amount, 0);

            const currentMonthStr = (() => {
              const d = new Date();
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            })();
            const monthlyReceipts = receipts.filter(r => r.createdAt.startsWith(currentMonthStr));
            const monthlyTotal = monthlyReceipts.reduce((sum, r) => sum + r.amount, 0);

            const collectorStats: { [key: string]: { name: string; role: string; count: number; total: number } } = {};
            receipts.forEach(r => {
              const collectorName = r.collectedBy || "System User";
              const collectorRole = r.collectedByRole || "ADMIN";
              if (!collectorStats[collectorName]) {
                collectorStats[collectorName] = { name: collectorName, role: collectorRole, count: 0, total: 0 };
              }
              collectorStats[collectorName].count += 1;
              collectorStats[collectorName].total += r.amount;
            });
            const collectorsList = Object.values(collectorStats).sort((a, b) => b.total - a.total);

            const classCounts: { [key: string]: number } = {};
            students.forEach((s) => {
              classCounts[s.class] = (classCounts[s.class] || 0) + 1;
            });
            const classesListSorted = Object.entries(classCounts).map(([className, count]) => ({ className, count })).sort((a,b) => a.className.localeCompare(b.className));

            const currentMonth = new Date().getMonth();
            const upcomingBirthdays = students.filter(s => {
              if (!s.dob) return false;
              const bdate = new Date(s.dob);
              return bdate.getMonth() === currentMonth;
            }).slice(0, 6).map(s => {
              const bdate = new Date(s.dob!);
              return {
                id: s.id,
                name: s.name,
                classSection: `${s.class}-${s.section}`,
                day: bdate.getDate(),
                month: bdate.toLocaleString("default", { month: "short" })
              };
            });

            const totalAttendance = attendances.length;
            const presentCount = attendances.filter(a => a.status === "PRESENT").length;
            const absentCount = attendances.filter(a => a.status === "ABSENT").length;
            const lateCount = attendances.filter(a => a.status === "LATE").length;
            const leaveCount = attendances.filter(a => a.status === "LEAVE").length;
            const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 92;

            const monthlyRevenue: { [key: string]: number } = {
              "Apr": 0, "May": 0, "Jun": 0, "Jul": 0, "Aug": 0, "Sep": 0,
              "Oct": 0, "Nov": 0, "Dec": 0, "Jan": 0, "Feb": 0, "Mar": 0
            };
            const monthMapping: { [key: string]: string } = {
              "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep",
              "10": "Oct", "11": "Nov", "12": "Dec", "01": "Jan", "02": "Feb", "03": "Mar"
            };
            receipts.forEach(r => {
              const monthKey = r.createdAt.split("-")[1];
              const monthName = monthMapping[monthKey];
              if (monthName) {
                monthlyRevenue[monthName] += r.amount;
              }
            });
            const monthsOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
            const maxRev = Math.max(...Object.values(monthlyRevenue), 1000);

            return (
              <>
                <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col lg:flex-row justify-between items-center gap-4 relative overflow-hidden border border-slate-800">
                  <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">
                      Today's Counter Till
                    </span>
                    <h3 className="text-sm font-black tracking-tight text-slate-100">
                      Daily Revenue Collection Tally
                    </h3>
                    <p className="text-[9px] text-slate-400 font-semibold">
                      Match physical cash drawer balance before closing session today ({new Date().toLocaleDateString("en-IN")}).
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto pt-2 lg:pt-0">
                    <div className="space-y-1 sm:border-r border-slate-800 sm:pr-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Cash Tally</span>
                      <span className="text-sm font-black text-emerald-450">₹{todayCash.toLocaleString("en-IN")}</span>
                    </div>
                    
                    <div className="space-y-1 sm:border-r border-slate-800 sm:pr-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">UPI QR Scan</span>
                      <span className="text-sm font-black text-indigo-405 font-bold">₹{todayUpi.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="space-y-1 sm:border-r border-slate-800 sm:pr-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Bank / Cheque</span>
                      <span className="text-sm font-black text-slate-300">₹{todayBank.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-2xl border border-slate-800/80">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block leading-none mb-1">Total Today</span>
                      <span className="text-sm font-black text-white block">₹{todayTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Students Card */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:border-indigo-300 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{totalStudents}</h4>
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Total Students</span>
                      </div>
                      <div className="h-10 w-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span className="text-pink-650 bg-pink-50 px-2.5 py-1 rounded-lg">Girls: {girlsCount}</span>
                      <span className="text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg">Boys: {boysCount}</span>
                    </div>
                  </div>

                  {/* Total Earnings Card */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:border-indigo-300 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black text-emerald-600 tracking-tight">₹{totalEarnings.toLocaleString("en-IN")}</h4>
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Total Earning</span>
                      </div>
                      <div className="h-10 w-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                        <DollarSign className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400">
                      Current Session Collections
                    </div>
                  </div>

                  {/* Total Dues Card */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:border-indigo-300 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black text-rose-500 tracking-tight">₹{totalDues.toLocaleString("en-IN")}</h4>
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Total Dues</span>
                      </div>
                      <div className="h-10 w-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg w-fit">
                      {dueItems.length} Outstanding Invoices
                    </div>
                  </div>

                  {/* Total Sales Card */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm hover:border-indigo-300 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black text-indigo-750 tracking-tight">₹{totalSales.toLocaleString("en-IN")}</h4>
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Total Sales</span>
                      </div>
                      <div className="h-10 w-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-700 border border-indigo-100">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">New Adm: {newAdmissionsCount}</span>
                      <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Old: {oldStudentsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Finance Snapshot & Who Cut Receipt Tracker */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Finance Snapshot Card */}
                  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4 lg:col-span-2">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Finance Snapshot</h4>
                      <span className="text-[10px] font-bold text-slate-400">Total collection methods</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-1">
                        <span className="text-[9px] font-black text-emerald-600 block uppercase tracking-wider">Cash in Hand</span>
                        <p className="text-lg font-black text-emerald-700">₹{cashTally.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-1">
                        <span className="text-[9px] font-black text-indigo-600 block uppercase tracking-wider">UPI Collections</span>
                        <p className="text-lg font-black text-indigo-700">₹{upiTally.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-[9px] font-black text-slate-500 block uppercase tracking-wider">Bank / Cheque</span>
                        <p className="text-lg font-black text-slate-700">₹{bankTally.toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    <div className="pt-3 flex justify-between text-xs font-semibold text-slate-500">
                      <span>Monthly Total: <strong className="text-slate-800 font-bold">₹{monthlyTotal.toLocaleString("en-IN")}</strong></span>
                      <span>Total Sales Volume: <strong className="text-indigo-650 font-bold">₹{totalSales.toLocaleString("en-IN")}</strong></span>
                    </div>
                  </div>

                  {/* Who Cut the Receipt Tracker */}
                  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Collection Logs By User</h4>
                    </div>

                    <div className="space-y-3 max-h-[170px] overflow-y-auto pr-1">
                      {collectorsList.map((col, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{col.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{col.role}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-slate-800">₹{col.total.toLocaleString("en-IN")}</p>
                            <p className="text-[9px] text-slate-400 font-bold">{col.count} receipts</p>
                          </div>
                        </div>
                      ))}
                      {collectorsList.length === 0 && (
                        <p className="text-center py-6 text-xs text-slate-400 font-semibold">No collections logged yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Revenue Overview Monthly Chart & Student Per Class */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Revenue Overview Monthly Chart */}
                  <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Revenue Overview (Monthly Graph)</h4>
                      <span className="text-[10px] text-slate-400 font-bold">Session 2026-27</span>
                    </div>

                    <div className="h-64 w-full flex items-end justify-between gap-2 pt-4 px-2 select-none">
                      {monthsOrder.map((m) => {
                        const val = monthlyRevenue[m] || 0;
                        const pct = maxRev > 0 ? (val / maxRev) * 100 : 0;
                        return (
                          <div key={m} className="flex-1 flex flex-col items-center gap-2 group relative">
                            {/* Value Tooltip */}
                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-black py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-10 whitespace-nowrap">
                              ₹{val.toLocaleString("en-IN")}
                            </div>
                            {/* Bar */}
                            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl h-44 flex items-end overflow-hidden">
                              <div 
                                className="w-full bg-gradient-to-t from-indigo-500 to-indigo-655 hover:from-indigo-655 hover:to-indigo-700 transition-all rounded-t-lg" 
                                style={{ height: `${Math.max(pct, 4)}%` }} 
                              />
                            </div>
                            {/* Label */}
                            <span className="text-[9px] font-black text-slate-455 uppercase tracking-wider">{m}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Attendance Overview gauge card */}
                  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Attendance Overview</h4>
                    </div>

                    <div className="flex flex-col items-center justify-center py-4 space-y-4">
                      {/* Gauge Indicator */}
                      <div className="relative h-28 w-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r="48" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                          <circle cx="56" cy="56" r="48" fill="none" stroke="#4f46e5" strokeWidth="10" strokeDasharray={301.6} strokeDashoffset={301.6 - (301.6 * attendanceRate) / 100} strokeLinecap="round" className="transition-all duration-500" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-slate-800">{attendanceRate}%</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rate</span>
                        </div>
                      </div>

                      <div className="w-full grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                        <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-xl">
                          <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                          <span>Present: {presentCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-xl">
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Absent: {absentCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Birthday of Students */}
                  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4 lg:col-span-2">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Upcoming Birthdays This Month</h4>
                      <span className="text-[10px] text-slate-455 font-bold uppercase">Happy Birthday! ­ƒÄé</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[190px] overflow-y-auto pr-1">
                      {upcomingBirthdays.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50/30 border border-amber-100/60 rounded-2xl">
                          <div className="h-10 w-10 bg-amber-100 text-amber-800 rounded-xl flex flex-col items-center justify-center shrink-0 border border-amber-200 select-none">
                            <span className="text-xs font-black leading-none">{s.day}</span>
                            <span className="text-[8px] font-bold uppercase mt-0.5">{s.month}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-slate-800 truncate">{s.name}</h5>
                            <p className="text-[10px] text-slate-400 font-semibold">Class {s.classSection}</p>
                          </div>
                        </div>
                      ))}
                      {upcomingBirthdays.length === 0 && (
                        <p className="col-span-2 text-center py-8 text-xs text-slate-405 font-semibold">No student birthdays registered this month.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">

          {/* TAB: Collect Fees (Offline Counter Payment) */}
          {activeTab === "collect" && (
            <div>
              {!selectedStudentId ? (
                // SEARCH VIEW (No student selected)
                <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
                  <div className="inline-flex p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.06)]">
                    <CreditCard className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Counter Fee Collection</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Search for a student by their Name, Admission Number, or Family Code to access their billing ledger.
                    </p>
                  </div>
                  
                  {/* Search Input Container */}
                  <div className="relative max-w-lg mx-auto">
                    <div className="relative shadow-sm rounded-xl border border-slate-200 bg-white p-1 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-300">
                      <div className="flex items-center">
                        <Search className="h-4.5 w-4.5 text-slate-400 ml-3" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="Type Student Name, Admission No, or Family ID..."
                          className="w-full text-xs font-semibold py-2.5 px-3 outline-none border-none bg-transparent text-slate-700 placeholder-slate-400"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedStudentId("");
                              setSelectedDueIds([]);
                              setDiscountsState({});
                              setPayingState({});
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 text-[10px] font-bold mr-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Suggestions dropdown inside search view */}
                    {showSuggestions && suggestions.length > 0 && (
                      <>
                        <div 
                          className="fixed inset-0 z-10 cursor-default" 
                          onClick={() => setShowSuggestions(false)} 
                        />
                        <div className="absolute z-20 w-full bg-white border border-slate-200/80 rounded-xl mt-2 shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-200 text-left">
                          {suggestions.map((s) => {
                            const studentDueSum = dueItems
                              .filter((d) => d.studentId === s.id && d.status === "UNPAID")
                              .reduce((sum, i) => sum + i.amount, 0);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  handleStudentSelect(s.id);
                                  setSearchQuery(`${s.name} (${s.class}-${s.section})`);
                                  setShowSuggestions(false);
                                }}
                                className="w-full px-5 py-3 hover:bg-indigo-50/50 text-xs transition-colors flex justify-between items-center cursor-pointer group"
                              >
                                <div>
                                  <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                    {s.name}
                                    {s.familyCode && (
                                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded border border-slate-200/60">
                                        Family: {s.familyCode}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] font-semibold text-slate-400 mt-1">
                                    Class: {s.class}-{s.section} | Adm: {s.admissionNo}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                                    studentDueSum > 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-green-50 text-green-600 border border-green-100"
                                  }`}>
                                    Rs. {studentDueSum}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4 text-left">
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 h-fit border border-indigo-100/50">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Family Accounts</h4>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          Selecting a student automatically bundles sibling dues. Issue a single combined receipt for parents.
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex gap-3">
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 h-fit border border-emerald-100/50">
                        <Printer className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Print Vouchers</h4>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          Record counter payments and print official receipts instantly. Shows discounts and remaining balances.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                // SELECTED STUDENT FLOW (Fees detail and Collect Fee)
                <div className="space-y-6">
                  
                  {/* 1. Header Student Panel Card */}
                  <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Background decoration */}
                    <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setSelectedStudentId("");
                          setSearchQuery("");
                          setSelectedDueIds([]);
                          setDiscountsState({});
                          setPayingState({});
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-300 hover:text-white transition-colors cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Search
                      </button>
                      
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-black tracking-tight">{selectedStudentObj?.name}</h3>
                        <span className="text-[9px] font-black uppercase bg-indigo-600/60 text-white px-2 py-0.5 rounded-full border border-indigo-500/50">
                          Class {selectedStudentObj?.class}-{selectedStudentObj?.section}
                        </span>
                        {selectedStudentObj?.familyCode && (
                          <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <Users className="h-3 w-3" /> Family Code: {selectedStudentObj?.familyCode}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-slate-300 text-[10px] font-semibold">
                        <p>Admission No: <span className="font-bold text-white">{selectedStudentObj?.admissionNo}</span></p>
                        <p>Parent Name: <span className="font-bold text-white">{selectedStudentObj?.parentName}</span></p>
                        <p>Parent Phone: <span className="font-bold text-white">{selectedStudentObj?.parentPhone}</span></p>
                        {siblingStudents.length > 1 && (
                          <p className="text-amber-400">
                            Siblings: <span className="font-bold">{siblingStudents.length} Children Linked</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left md:text-right space-y-1 shrink-0 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/30">
                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Total Outstanding Dues</span>
                      <h3 className="text-xl font-black text-rose-400 tracking-tight">
                        Rs. {selectedStudentDues.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-IN")}
                      </h3>
                      <p className="text-[9px] text-slate-300 font-bold">{selectedStudentDues.length} Unpaid Invoices</p>
                    </div>
                  </div>

                  {/* 2. Main Ledger & Checkout Panel Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    
                    {/* Left Col: Invoice List grouped by Child */}
                    <div className="lg:col-span-3 space-y-4">
                      
                      {/* Sibling Tabs */}
                      {siblingStudents.length > 1 && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                            Select Family Member
                          </label>
                          <div className="flex flex-wrap gap-2 pb-1.5 border-b border-slate-100">
                            {siblingStudents.map((child) => {
                              const childDues = selectedStudentDues.filter(d => d.studentId === child.id);
                              const childDueSum = childDues.reduce((sum, d) => sum + d.amount, 0);
                              const childSelectedCount = childDues.filter(d => selectedDueIds.includes(d.id)).length;
                              const isActive = (activeSiblingTabId || selectedStudentId) === child.id;
                              
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => setActiveSiblingTabId(child.id)}
                                  className={`px-3 py-2 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-3 shrink-0 ${
                                    isActive
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                      : "bg-white border-slate-200/80 text-slate-600 hover:border-slate-350 hover:bg-slate-50/50"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-white animate-pulse" : "bg-indigo-500"}`} />
                                  <div>
                                    <span className="block text-xs font-black tracking-tight leading-tight">{child.name}</span>
                                    <span className={`block text-[8px] mt-0.5 font-bold ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
                                      Class {child.class}-{child.section} • {childDues.length} dues (₹{childDueSum.toLocaleString("en-IN")})
                                    </span>
                                  </div>
                                  {childSelectedCount > 0 && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                                      isActive ? "bg-white text-indigo-700 font-extrabold" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                    }`}>
                                      {childSelectedCount} selected
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Header with Quick Presets */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Outstanding Invoices</h4>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Select and configure the dues to collect now.</p>
                        </div>
                        
                        {selectedStudentDues.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const allIds = selectedStudentDues.map(d => d.id);
                                setSelectedDueIds(allIds);
                                const newD = { ...discountsState };
                                const newP = { ...payingState };
                                selectedStudentDues.forEach(due => {
                                  newD[due.id] = 0;
                                  newP[due.id] = due.amount;
                                });
                                setDiscountsState(newD);
                                setPayingState(newP);
                              }}
                              className="text-[9px] font-black uppercase text-indigo-700 hover:text-indigo-850 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Select All (All Children)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const activeChildId = activeSiblingTabId || selectedStudentId;
                                const activeChildDues = selectedStudentDues.filter(d => d.studentId === activeChildId);
                                const activeChildIds = activeChildDues.map(d => d.id);
                                
                                setSelectedDueIds(prev => {
                                  const next = [...prev];
                                  activeChildIds.forEach(id => {
                                    if (!next.includes(id)) next.push(id);
                                  });
                                  return next;
                                });
                                
                                setDiscountsState(d => {
                                  const next = { ...d };
                                  activeChildDues.forEach(due => {
                                    next[due.id] = 0;
                                  });
                                  return next;
                                });
                                
                                setPayingState(p => {
                                  const next = { ...p };
                                  activeChildDues.forEach(due => {
                                    next[due.id] = due.amount;
                                  });
                                  return next;
                                });
                              }}
                              className="text-[9px] font-black uppercase text-slate-700 hover:text-slate-850 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Select Active Child
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDueIds([]);
                                setDiscountsState({});
                                setPayingState({});
                              }}
                              className="text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Focused Child Invoice List */}
                      <div>
                        {(() => {
                          const childId = activeSiblingTabId || selectedStudentId;
                          const child = siblingStudents.find(s => s.id === childId);
                          if (!child) return null;
                          const childDues = selectedStudentDues.filter(d => d.studentId === child.id);
                          
                          if (childDues.length === 0) {
                            return (
                              <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                                <div>
                                  <p className="text-xs font-black text-slate-800">All Fees Cleared</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">No outstanding invoices remain for {child.name}.</p>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                              <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-slate-800">{child.name}</span>
                                  <span className="text-[9px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                    Class {child.class}-{child.section}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {childDues.length} Outstanding Items
                                </span>
                              </div>

                              <div className="divide-y divide-slate-100 p-2 space-y-2 max-h-[480px] overflow-y-auto">
                                {childDues.map((due) => {
                                  const isChecked = selectedDueIds.includes(due.id);
                                  return (
                                    <div
                                      key={due.id}
                                      className={`p-3.5 border rounded-xl text-xs space-y-3 transition-all duration-150 ${
                                        isChecked 
                                          ? "bg-indigo-50/10 border-indigo-200 shadow-sm" 
                                          : "bg-transparent border-transparent hover:border-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleDueSelection(due.id)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 cursor-pointer"
                                          />
                                          <div>
                                            <div className="flex items-center flex-wrap gap-1.5">
                                              <span className="font-bold text-slate-800 text-xs">{due.name}</span>
                                              {due.totalPaid && due.totalPaid > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded leading-none">
                                                  Partially Paid (₹{due.totalPaid} Paid)
                                                </span>
                                              ) : null}
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                                              Due Date: {due.dueDate}
                                              {due.originalAmount && due.originalAmount !== due.amount ? ` | Original: ₹${due.originalAmount}` : ""}
                                            </span>
                                          </div>
                                        </label>
                                        <span className="font-black text-slate-800">₹{due.amount.toLocaleString("en-IN")}</span>
                                      </div>
                                      
                                      {isChecked && (
                                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider animate-in fade-in duration-150">
                                          <div>
                                            <span className="block mb-1 text-slate-400">Discount (₹)</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max={due.amount}
                                              value={discountsState[due.id] ?? 0}
                                              onChange={(e) => {
                                                const disc = Math.max(0, Math.min(due.amount, Number(e.target.value) || 0));
                                                setDiscountsState((d) => ({ ...d, [due.id]: disc }));
                                                setPayingState((p) => ({ ...p, [due.id]: due.amount - disc }));
                                              }}
                                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-500"
                                            />
                                          </div>
                                          <div>
                                            <span className="block mb-1 text-slate-400">Paying Amount (₹)</span>
                                            <div className="relative">
                                              <input
                                                type="number"
                                                min="0"
                                                max={due.amount - (discountsState[due.id] ?? 0)}
                                                value={payingState[due.id] ?? due.amount}
                                                onChange={(e) => {
                                                  const disc = discountsState[due.id] ?? 0;
                                                  const payVal = Math.max(0, Math.min(due.amount - disc, Number(e.target.value) || 0));
                                                  setPayingState((p) => ({ ...p, [due.id]: payVal }));
                                                }}
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-500 pr-10"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const disc = discountsState[due.id] ?? 0;
                                                  setPayingState(p => ({ ...p, [due.id]: due.amount - disc }));
                                                }}
                                                className="absolute right-1 top-1.5 bottom-1.5 px-1.5 bg-indigo-50 hover:bg-indigo-100 text-[8px] font-black text-indigo-700 rounded transition-colors cursor-pointer"
                                              >
                                                FULL
                                              </button>
                                            </div>
                                          </div>
                                          <div className="flex flex-col justify-end text-right">
                                            <span className="block text-slate-400 mb-1">Arrears Remaining</span>
                                            <span className="text-xs font-black text-rose-600 py-2">
                                              ₹{(due.amount - (discountsState[due.id] ?? 0) - (payingState[due.id] ?? due.amount)).toLocaleString("en-IN")}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Sibling / Family Receipt Log */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Family Payment History</h4>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {receipts
                            .filter(r => siblingStudentIds.includes(r.studentId as string) || (r.studentIds && r.studentIds.some((id: string) => siblingStudentIds.includes(id))))
                            .map((rec) => (
                              <div
                                key={rec.id}
                                onClick={() => {
                                  const std = students.find(s => s.id === rec.studentId);
                                  setActiveReceipt({
                                    ...rec,
                                    admissionNo: std ? std.admissionNo : "Unified/Family",
                                    discount: 0,
                                    arrears: 0,
                                  });
                                  setShowReceiptModal(true);
                                }}
                                className="p-3 border border-slate-100 bg-slate-50/40 hover:bg-slate-100/60 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer transition-all hover:scale-[1.01] duration-150"
                              >
                                <div>
                                  <p className="font-bold text-slate-800">{rec.studentName}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">Receipt: {rec.receiptNo} | {rec.createdAt}</p>
                                  <p className="text-[8px] text-indigo-600 font-bold max-w-sm truncate mt-0.5">{rec.details}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                  <p className="font-extrabold text-slate-800">Rs. {rec.amount.toLocaleString("en-IN")}</p>
                                  <span className="text-[8px] font-black uppercase bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded">
                                    {rec.method} Verified
                                  </span>
                                </div>
                              </div>
                            ))}
                          
                          {receipts.filter(r => siblingStudentIds.includes(r.studentId as string) || (r.studentIds && r.studentIds.some((id: string) => siblingStudentIds.includes(id)))).length === 0 && (
                            <p className="text-[10px] text-slate-400 font-semibold italic text-center py-4 bg-slate-50/50 rounded-lg">
                              No receipts found for this family ledger.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Col: Checkout & Calculators Panel */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-4 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Payment Summary</h4>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Review totals and payment mode details.</p>
                        </div>

                        {/* Quick FIFO Allocation Tool */}
                        {selectedStudentDues.length > 0 && (
                          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3.5 space-y-2">
                            <label className="text-[9px] font-black text-indigo-750 uppercase tracking-wider block">
                              Smart Auto-Allocate (FIFO)
                            </label>
                            <p className="text-[9px] text-slate-400 font-semibold leading-tight">
                              Type an amount to automatically select and pay the oldest outstanding dues first.
                            </p>
                            <div className="flex gap-2 mt-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="Enter amount (e.g. 5000)..."
                                value={fifoAmount}
                                onChange={(e) => setFifoAmount(e.target.value)}
                                className="flex-1 text-xs font-bold py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-650"
                              />
                              <button
                                type="button"
                                onClick={() => handleFIFOAllocate(fifoAmount)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shadow-sm shrink-0"
                              >
                                Allocate
                              </button>
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleOfflinePayment} className="space-y-4">
                          
                          {/* Net Payable & Discount Sticky */}
                          <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-xl px-4 py-1">
                            <div className="flex justify-between items-center py-3 text-xs font-semibold text-slate-500">
                              <span>Selected Items:</span>
                              <span className="font-bold text-slate-700">{selectedDueIds.length} Invoice(s)</span>
                            </div>
                            <div className="flex justify-between items-center py-3 text-xs font-semibold text-slate-500">
                              <span>Total Discount:</span>
                              <span className="font-extrabold text-green-600">
                                Rs. {selectedDueIds.reduce((sum, id) => sum + (discountsState[id] ?? 0), 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-3 text-xs font-bold text-slate-800">
                              <span>Net Payable Amount:</span>
                              <span className="text-sm font-black text-indigo-600">
                                Rs. {selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          {/* Interactive Payment Methods Button Grid */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              Choose Payment Method
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: "CASH", label: "Cash Counter" },
                                { id: "UPI", label: "UPI QR Scan" },
                                { id: "CHEQUE", label: "Bank Cheque" },
                                { id: "BANK_TRANSFER", label: "Direct Transfer" },
                              ].map((method) => {
                                const isActive = payMethod === method.id;
                                return (
                                  <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setPayMethod(method.id)}
                                    className={`p-2.5 border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                      isActive
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                        : "bg-white border-slate-200/80 hover:border-indigo-300 text-slate-600"
                                    }`}
                                  >
                                    <span className="text-[10px] font-bold block">{method.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* UPI Dynamic QR Code Selector */}
                          {payMethod === "UPI" && (() => {
                            const netPayable = selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0);
                            const upiLink = `upi://pay?pa=${schoolInfo.upiId || "gngschool@icici"}&pn=${encodeURIComponent(schoolInfo.upiMerchantName || schoolInfo.name || "School Finance")}&am=${netPayable.toFixed(2)}&cu=INR&tn=${encodeURIComponent("School Fees")}`;
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`;
                            return (
                              <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-3 text-center animate-in slide-in-from-top-2 duration-200">
                                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block">
                                  Scan UPI QR to Pay
                                </span>
                                <div className="relative p-2 bg-slate-50 rounded-xl border border-slate-200/50">
                                  <img src={qrUrl} alt="UPI QR Code" className="w-36 h-36 mx-auto" />
                                  <div className="absolute inset-x-2 top-2 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-bounce" />
                                </div>
                                <p className="text-xs font-black text-indigo-600">
                                  ₹{netPayable.toLocaleString("en-IN")}
                                </p>
                                <p className="text-[8px] text-slate-400 font-semibold leading-tight max-w-[185px] mx-auto">
                                  Scan using GPay, PhonePe, Paytm, or any UPI app. Amount is pre-filled.
                                </p>

                                
                                <div className="w-full space-y-1 text-left">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                    UPI Transaction Ref ID (UTR)
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={transactionRef}
                                    onChange={(e) => setTransactionRef(e.target.value)}
                                    placeholder="Enter 12-digit UPI Ref/UTR No..."
                                    className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-650 focus:ring-1 focus:ring-indigo-100"
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Cheque / Bank Transfer Reference No Input */}
                          {(payMethod === "CHEQUE" || payMethod === "BANK_TRANSFER") && (
                            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                Transaction reference / Cheque No
                              </label>
                              <input
                                type="text"
                                required
                                value={transactionRef}
                                onChange={(e) => setTransactionRef(e.target.value)}
                                placeholder="e.g. TXN98765432, CHQ-201..."
                                className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-650 focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                          )}

                          {/* Cash return helper (Only relevant for Cash Counter) */}
                          {payMethod === "CASH" && (
                            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Cash Received
                                </label>
                                <input
                                  type="number"
                                  placeholder="Amount received..."
                                  value={amountReceived}
                                  onChange={(e) => setAmountReceived(e.target.value)}
                                  className="w-full text-xs font-bold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-indigo-600"
                                />
                              </div>
                              <div className="text-right flex flex-col justify-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Change Due
                                </span>
                                <span className="text-sm font-extrabold text-indigo-600 block mt-0.5">
                                  Rs. {(() => {
                                    const netPayable = selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0);
                                    const received = Number(amountReceived) || 0;
                                    return received > netPayable ? (received - netPayable).toLocaleString("en-IN") : 0;
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={selectedDueIds.length === 0}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            Generate Receipt & Record (Rs. {selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0).toLocaleString("en-IN")})
                          </button>
                        </form>
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB: Configure Fees */}
          {activeTab === "structures" && (
            <div className="space-y-5 animate-fade-in">


              {/* 12-MONTH BULK BILL GENERATOR CARD */}
              <div className="bg-emerald-50 border border-emerald-200/70 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/10">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wider">
                      Generate 12 Months Bills (Session April - March)
                    </h4>
                    <p className="text-[10px] text-emerald-700 font-semibold leading-relaxed mt-0.5">
                      Generate 12 months of fees (April to March) for all active students at the start of the new academic session.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center bg-white p-1.5 border border-emerald-200/60 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <select
                    value={billYear}
                    onChange={(e) => setBillYear(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-slate-700 border-none outline-none px-2 cursor-pointer"
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                    <option value="2028-2029">2028-2029</option>
                  </select>
                  
                  <button
                    type="button"
                    disabled={billLoading}
                    onClick={async () => {
                      setBillLoading(true);
                      setBillResult(null);
                      const result = await generateBills(billYear);
                      setBillResult(result);
                      setBillLoading(false);
                      setTimeout(() => setBillResult(null), 6000);
                    }}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    {billLoading ? (
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    )}
                    Generate 12 Months Bills
                  </button>
                </div>
                {billResult && (
                  <div className="text-[10px] font-extrabold text-emerald-800 animate-fade-in self-center bg-white px-2 py-1 rounded border border-emerald-200">
                    Ô£ô Generated: {billResult.totalGenerated} | Skipped: {billResult.totalSkipped} (Idempotent)
                  </div>
                )}
              </div>

              {/* MAIN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left Panel: Matrix */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Class &times; Fee Type Amount Matrix
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Enter the amount (Rs.) for each class and fee type, then click Save. The billing months will be auto-generated.
                      </p>
                    </div>
                    {structSuccess && (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 py-1.5 px-3 rounded-lg border border-green-200 text-[10px] font-bold animate-fade-in">
                        <CheckCircle className="h-4 w-4" /> Saved!
                      </div>
                    )}
                  </div>

                  {feeHeads.length === 0 ? (
                    <div className="border-2 border-dashed border-indigo-200 rounded-xl py-10 text-center">
                      <div className="text-3xl mb-2">&#128073;</div>
                      <p className="text-xs font-bold text-slate-500">Please create Fee Types in the right-hand panel first</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">e.g. Tuition Fee (Monthly), Transport Fee (Monthly), Admission Fee (One-Time)</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/80">
                            <th className="py-3 px-4 text-[9px] font-black uppercase text-slate-400 tracking-wider">Class &amp; Section</th>
                            {feeHeads.map((head) => {
                              const freqColor: Record<string,string> = {
                                monthly: "text-blue-600 bg-blue-50 border-blue-200",
                                annual: "text-amber-600 bg-amber-50 border-amber-200",
                                one_time: "text-green-600 bg-green-50 border-green-200",
                                exam: "text-purple-600 bg-purple-50 border-purple-200",
                                ad_hoc: "text-slate-500 bg-slate-50 border-slate-200",
                              };
                              const freqLabel: Record<string,string> = {
                                monthly: "12\u00d7/yr",
                                annual: "1\u00d7/yr",
                                one_time: "Once",
                                exam: "Exam",
                                ad_hoc: "Manual",
                              };
                              return (
                                <th key={head.name} className="py-3 px-4 text-right min-w-[130px]">
                                  <div className="text-[9px] font-black uppercase text-slate-600">{head.name}</div>
                                  <span className={`text-[7px] border px-1.5 py-0.5 rounded-full font-black uppercase mt-0.5 inline-block ${freqColor[head.frequency] || "text-slate-500 bg-slate-50 border-slate-200"}`}>
                                    {freqLabel[head.frequency] || head.frequency}
                                  </span>
                                </th>
                              );
                            })}
                            <th className="py-3 px-4 text-center text-[9px] font-black uppercase text-slate-400 tracking-wider min-w-[110px]">Save Row</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {/* Fallback Row */}
                          <tr className="hover:bg-slate-50/50 bg-indigo-50/20">
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-indigo-700 text-xs">All Classes</div>
                              <div className="text-[9px] text-indigo-400 font-semibold">Fallback — if class-specific amount is not defined</div>
                            </td>
                            {feeHeads.map((head) => (
                              <td key={head.name} className="py-2 px-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-slate-400 font-bold">Rs.</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={gridInputs["All"]?.[head.name] ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGridInputs(prev => ({
                                        ...prev,
                                        All: { ...(prev.All || {}), [head.name]: val }
                                      }));
                                    }}
                                    className="w-full text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 text-right min-w-[80px]"
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleSaveClassGrid("All", "All")}
                                className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer w-full shadow-sm hover:shadow"
                              >
                                <Check className="h-3.5 w-3.5" /> Save
                              </button>
                            </td>
                          </tr>

                          {/* Dynamic Class Rows */}
                          {classes.length > 0 ? (
                            classes.map((cls) => {
                              const annualTotal = feeHeads.reduce((sum, head) => {
                                const amt = parseFloat(gridInputs[cls.id]?.[head.name] || "0") || 0;
                                if (head.frequency === "monthly") return sum + amt * 12;
                                if (head.frequency === "annual") return sum + amt;
                                if (head.frequency === "one_time") return sum + amt;
                                if (head.frequency === "exam") return sum + amt * 3;
                                return sum + amt;
                              }, 0);
                              return (
                                <tr key={cls.id} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-800 text-xs">Class {cls.name} &mdash; {cls.section}</div>
                                    {annualTotal > 0 && (
                                      <div className="text-[9px] text-emerald-600 font-bold mt-0.5">
                                        &asymp; Rs. {annualTotal.toLocaleString("en-IN")}/year
                                      </div>
                                    )}
                                  </td>
                                  {feeHeads.map((head) => (
                                    <td key={head.name} className="py-2.5 px-4">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-slate-400 font-bold">Rs.</span>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={gridInputs[cls.id]?.[head.name] ?? ""}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setGridInputs(prev => ({
                                              ...prev,
                                              [cls.id]: { ...(prev[cls.id] || {}), [head.name]: val }
                                            }));
                                          }}
                                          className="w-full text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-right min-w-[80px]"
                                        />
                                      </div>
                                    </td>
                                  ))}
                                  <td className="py-2.5 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveClassGrid(cls.id, cls.name)}
                                      className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer w-full shadow-sm hover:shadow"
                                    >
                                      <Check className="h-3.5 w-3.5" /> Save
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={2 + feeHeads.length} className="text-center py-8 text-slate-400 italic text-xs">
                                Please create classes in Right Panel &rarr; Card 1 first.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Auto-billing calendar preview */}
                  {feeHeads.some(h => h.frequency === "monthly") && (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Auto-Generated Monthly Bills (April &rarr; March)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map((m) => (
                          <span key={m} className="text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            {m}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold mt-1.5">The system automatically generates these 12 monthly bills &mdash; no manual entry required.</p>
                    </div>
                  )}
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-1 space-y-5">

                  {/* Card 1: Manage Classes */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">1. Classes &amp; Sections</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Create classes and sections for your school (KG to 12th).</p>
                    </div>

                    {classSuccess && (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2 rounded border border-green-100 text-[10px] font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" /> Class added successfully!
                      </div>
                    )}

                    <form onSubmit={handleAddClass} className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Class</label>
                          <input
                            type="text"
                            required
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="e.g. 1, 10, KG"
                            className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</label>
                          <input
                            type="text"
                            required
                            value={newClassSection}
                            onChange={(e) => setNewClassSection(e.target.value)}
                            placeholder="e.g. A, B"
                            className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" /> Add Class
                      </button>
                    </form>

                    <div className="space-y-1.5 pt-3 border-t border-slate-200/80">
                      <p className="text-[9px] font-black uppercase text-slate-400">Active Classes ({classes.length})</p>
                      <div className="space-y-1 max-h-[130px] overflow-y-auto pr-1">
                        {classes.length > 0 ? (
                          classes.map((cls) => (
                            <div key={cls.id} className="flex justify-between items-center p-2 border border-slate-200/80 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all">
                              <span>Class {cls.name} &mdash; {cls.section}</span>
                              <button
                                type="button"
                                onClick={() => removeClass(cls.id)}
                                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-all cursor-pointer"
                                title="Delete Class"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 italic py-3 text-center">No classes created yet.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Manage Fee Types */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">2. Fee Types (Heads)</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define fee name and billing cycle. Select billing frequency rather than writing specific months.</p>
                    </div>

                    {/* Frequency selector cards */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { freq: "monthly", label: "Monthly", desc: "Apr\u2013Mar (12 auto)", color: "border-blue-200 text-blue-700", bg: "bg-blue-50", active: "ring-2 ring-blue-400" },
                        { freq: "annual", label: "Annual", desc: "1 bill/year", color: "border-amber-200 text-amber-700", bg: "bg-amber-50", active: "ring-2 ring-amber-400" },
                        { freq: "one_time", label: "One-Time", desc: "Only once", color: "border-green-200 text-green-700", bg: "bg-green-50", active: "ring-2 ring-green-400" },
                        { freq: "exam", label: "Exam Cycle", desc: "During exams", color: "border-purple-200 text-purple-700", bg: "bg-purple-50", active: "ring-2 ring-purple-400" },
                      ].map(({ freq, label, desc, color, bg, active }) => (
                        <div
                          key={freq}
                          onClick={() => setNewHeadFreq(freq)}
                          className={`${bg} border ${color} rounded-lg p-2 text-center cursor-pointer transition-all hover:scale-[1.02] ${newHeadFreq === freq ? active : ""}`}
                        >
                          <div className={`text-[10px] font-black uppercase ${color.split(" ")[1]}`}>{label}</div>
                          <div className="text-[8px] font-semibold text-slate-500 mt-0.5">{desc}</div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddHead} className="space-y-2.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fee Type Name</label>
                        <input
                          type="text"
                          required
                          value={newHead}
                          onChange={(e) => setNewHead(e.target.value)}
                          placeholder="e.g. Tuition Fee, Transport Fee..."
                          className="w-full text-xs font-semibold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Billing Cycle (Selected above)</label>
                        <select
                          value={newHeadFreq}
                          onChange={(e) => setNewHeadFreq(e.target.value)}
                          className="w-full text-xs font-black py-1.5 px-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        >
                          <option value="monthly">Monthly — April to March (12 auto-bills)</option>
                          <option value="annual">Annual — Once a year (April)</option>
                          <option value="one_time">One-Time — Admission / Registration</option>
                          <option value="exam">Exam Cycle — Charged during exams</option>
                          <option value="ad_hoc">Ad-hoc — Fine / Manual fee</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" /> Add Fee Type
                      </button>
                    </form>

                    {feeHeads.length > 0 && (
                      <div className="space-y-1.5 pt-3 border-t border-slate-200/80">
                        <p className="text-[9px] font-black uppercase text-slate-400">Configured Fee Types ({feeHeads.length})</p>
                        <div className="space-y-1 max-h-[170px] overflow-y-auto pr-1">
                          {feeHeads.map((head, index) => {
                            const freqMeta: Record<string,{label:string; color:string}> = {
                              monthly:  { label: "Monthly \u2014 12\u00d7/yr",  color: "bg-blue-50 border-blue-200 text-blue-700" },
                              annual:   { label: "Annual \u2014 1\u00d7/yr",    color: "bg-amber-50 border-amber-200 text-amber-700" },
                              one_time: { label: "One-Time",               color: "bg-green-50 border-green-200 text-green-700" },
                              exam:     { label: "Exam Cycle",             color: "bg-purple-50 border-purple-200 text-purple-700" },
                              ad_hoc:   { label: "Ad-hoc",                 color: "bg-slate-100 border-slate-200 text-slate-600" },
                            };
                            const meta = freqMeta[head.frequency] || { label: head.frequency, color: "bg-slate-100 border-slate-200 text-slate-600" };
                            return (
                              <div key={index} className="flex items-center justify-between p-2 border border-slate-200/80 rounded-lg bg-slate-50/50 hover:bg-slate-50 group transition-all">
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-bold text-slate-700 truncate">{head.name}</div>
                                  <span className={`text-[8px] border px-1.5 py-0.5 rounded-full font-bold mt-0.5 inline-block ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFeeHead(head.name)}
                                  className="ml-2 text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 flex-shrink-0"
                                  title="Delete Fee Type"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 1: User Security */}
          {activeTab === "users" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  User Account & Security Controls
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Monitor and manage system credentials. Lock accounts to block logins, reset passwords, or delete users permanently.
                </p>
              </div>

              {/* Staff vs Parents Directory Switcher */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  onClick={() => {
                    setSecurityTabMode("staff");
                    setUserRoleFilter(""); // Clear role filter
                  }}
                  className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    securityTabMode === "staff"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  ­ƒÅ½ School Staff Directory
                </button>
                <button
                  onClick={() => {
                    setSecurityTabMode("parents");
                    setUserRoleFilter("PARENT"); // Force PARENT filter
                  }}
                  className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    securityTabMode === "parents"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  ­ƒæ¿ÔÇì­ƒæ®ÔÇì­ƒæª Parents & Guardians Directory
                </button>
              </div>

              {/* Quick User Stats Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
                    <span className="text-xl font-black text-slate-800">
                      {securityTabMode === "staff" 
                        ? usersList.filter(u => u.role !== "PARENT").length 
                        : usersList.filter(u => u.role === "PARENT").length
                      }
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-100">
                    ­ƒæÑ
                  </div>
                </div>
                <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-green-500 uppercase tracking-wider block">Active Accounts</span>
                    <span className="text-xl font-black text-green-700">
                      {securityTabMode === "staff"
                        ? usersList.filter(u => u.role !== "PARENT" && u.status === "ACTIVE").length
                        : usersList.filter(u => u.role === "PARENT" && u.status === "ACTIVE").length
                      }
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold border border-green-100/50">
                    Ô£ô
                  </div>
                </div>
                <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Locked Accounts</span>
                    <span className="text-xl font-black text-rose-700">
                      {securityTabMode === "staff"
                        ? usersList.filter(u => u.role !== "PARENT" && u.status === "BLOCKED").length
                        : usersList.filter(u => u.role === "PARENT" && u.status === "BLOCKED").length
                      }
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 text-xs font-bold border border-rose-100/50">
                    ­ƒöÆ
                  </div>
                </div>
              </div>

              {/* Search & Filter Options */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm w-full">
                <div className="flex flex-col sm:flex-row flex-1 gap-2 items-center w-full sm:w-auto">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={securityTabMode === "staff" ? "Search Staff Name, Username..." : "Search Parent Name, Username..."}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full text-xs font-semibold py-2 pl-9 pr-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all"
                    />
                  </div>
                  {securityTabMode === "staff" && (
                    <div className="w-full sm:w-auto">
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer w-full"
                      >
                        <option value="">All Staff Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="TEACHER">Teacher</option>
                      </select>
                    </div>
                  )}
                </div>

                {securityTabMode === "staff" && (
                  <button
                    onClick={() => {
                      setNewStaffName("");
                      setNewStaffUsername("");
                      setNewStaffEmail("");
                      setNewStaffRole("TEACHER");
                      setNewStaffPassword("");
                      setNewStaffPhone("");
                      setNewStaffEmployeeId("");
                      setAddStaffError("");
                      setAddStaffSuccess("");
                      setShowAddStaffModal(true);
                    }}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-500/10 cursor-pointer w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5"
                  >
                    Ô×ò Register Staff Account
                  </button>
                )}
              </div>

              {/* System Users Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">System Role</th>
                        <th className="py-3 px-4">Account status</th>
                        <th className="py-3 px-4 text-right">Access Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = usersList.filter((usr) => {
                          const matchesSearch = 
                            usr.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                            usr.username.toLowerCase().includes(userSearch.toLowerCase());
                          
                          // Segregate by staff vs parents tab
                          const matchesTab = securityTabMode === "staff" ? usr.role !== "PARENT" : usr.role === "PARENT";
                          const matchesRole = !userRoleFilter || usr.role === userRoleFilter;
                          return matchesSearch && matchesTab && matchesRole;
                        });

                        const totalItems = filtered.length;
                        const itemsPerPageLocal = securityTabMode === "parents" ? 10 : 50;
                        const totalPages = Math.ceil(totalItems / itemsPerPageLocal);
                        const activePage = securityTabMode === "parents" ? Math.min(parentsCurrentPage, totalPages || 1) : 1;
                        const startIndex = (activePage - 1) * itemsPerPageLocal;
                        
                        const paginatedUsers = securityTabMode === "parents" 
                          ? filtered.slice(startIndex, startIndex + itemsPerPageLocal)
                          : filtered;

                        return (
                          <>
                            {paginatedUsers.map((usr) => {
                              // Define role color schemes
                              const isBlocked = usr.status === "BLOCKED";
                              const roleColors = 
                                usr.role === "ADMIN" 
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : usr.role === "ACCOUNTANT"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : usr.role === "TEACHER"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200";

                              return (
                                <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-650 font-black flex items-center justify-center border border-slate-200 shrink-0">
                                        {usr.name.slice(0, 1).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-extrabold text-slate-800">{usr.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                                          @{usr.username}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded border ${roleColors}`}>
                                      {usr.role}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span
                                      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        !isBlocked
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                                      }`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full ${!isBlocked ? "bg-emerald-500" : "bg-rose-500"}`} />
                                      {usr.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="inline-flex gap-2">
                                      {/* 1. Lock/Unlock Button */}
                                      <button
                                        onClick={() => toggleUserStatus(usr.id)}
                                        title={isBlocked ? "Unlock Account" : "Lock Account"}
                                        className={`py-1 px-2.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                          !isBlocked
                                            ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-150"
                                            : "bg-green-50 hover:bg-green-100 text-green-600 border-green-150"
                                        }`}
                                      >
                                        {isBlocked ? "­ƒöô Unlock" : "­ƒöÆ Lock"}
                                      </button>

                                      {/* 2. Reset Password Modal Trigger */}
                                      <button
                                        onClick={() => {
                                          setResetUserId(usr.id);
                                          setResetUserName(usr.name);
                                          setResetNewPassword("");
                                          setResetConfirmPassword("");
                                          setResetModalError("");
                                          setResetModalSuccess("");
                                          setShowPasswordResetModal(true);
                                        }}
                                        title="Reset User Password"
                                        className="py-1 px-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
                                      >
                                        ­ƒöæ Reset PW
                                      </button>

                                      {/* 3. Delete User Trigger */}
                                      <button
                                        onClick={async () => {
                                          const confirmMsg = 
                                            usr.role === "PARENT"
                                              ? `CAUTION: Are you sure you want to permanently delete parent account "${usr.name}"? This will ALSO delete their registered children, dues, fee invoices, ledger transactions, and attendance logs. This action CANNOT be undone.`
                                              : `Are you sure you want to permanently delete staff account "${usr.name}"? This action CANNOT be undone.`;
                                          
                                          if (confirm(confirmMsg)) {
                                            const res = await deleteUser(usr.id);
                                            if (res.success) {
                                              alert("User successfully deleted.");
                                            } else {
                                              alert("Error: " + res.error);
                                            }
                                          }
                                        }}
                                        title="Delete User Account"
                                        className="py-1 px-2 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-150 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                                      >
                                        ­ƒùæ´©Å Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {paginatedUsers.length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-8 text-slate-400 font-bold italic">
                                  No credentials found matching filters.
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination controls for parents list */}
              {securityTabMode === "parents" && (() => {
                const filtered = usersList.filter((usr) => {
                  const matchesSearch = 
                    usr.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                    usr.username.toLowerCase().includes(userSearch.toLowerCase());
                  return matchesSearch && usr.role === "PARENT";
                });
                const totalItems = filtered.length;
                const itemsPerPageLocal = 10;
                const totalPages = Math.ceil(totalItems / itemsPerPageLocal);
                if (totalPages <= 1) return null;

                return (
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mt-3 text-xs font-bold text-slate-500 gap-3">
                    <div>
                      Showing <span className="text-slate-800 font-extrabold">{((parentsCurrentPage - 1) * itemsPerPageLocal) + 1}</span> to{" "}
                      <span className="text-slate-800 font-extrabold">
                        {Math.min(parentsCurrentPage * itemsPerPageLocal, totalItems)}
                      </span>{" "}
                      of <span className="text-slate-855 font-black">{totalItems}</span> parents
                    </div>
                    <div className="flex gap-1 flex-wrap items-center">
                      <button
                        type="button"
                        disabled={parentsCurrentPage === 1}
                        onClick={() => setParentsCurrentPage((prev) => Math.max(1, prev - 1))}
                        className="h-7 px-2 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed text-[10px]"
                      >
                        Prev
                      </button>

                      {(() => {
                        const getPageNumbers = (curr: number, total: number) => {
                          const pages: (number | string)[] = [];
                          const maxNeighbours = 1;
                          if (total <= 5) {
                            for (let i = 1; i <= total; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (curr > 2 + maxNeighbours) {
                              pages.push("...");
                            }
                            const start = Math.max(2, curr - maxNeighbours);
                            const end = Math.min(total - 1, curr + maxNeighbours);
                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }
                            if (curr < total - 1 - maxNeighbours) {
                              pages.push("...");
                            }
                            pages.push(total);
                          }
                          return pages;
                        };

                        const pageList = getPageNumbers(parentsCurrentPage, totalPages);
                        return pageList.map((item, idx) => {
                          if (item === "...") {
                            return (
                              <span key={`dots-${idx}`} className="h-7 w-7 flex items-center justify-center text-slate-400 font-bold select-none text-[10px]">
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={`page-${item}`}
                              type="button"
                              onClick={() => {
                                setParentsCurrentPage(Number(item));
                              }}
                              className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                parentsCurrentPage === item
                                  ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/10"
                                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-650"
                              }`}
                            >
                              {item}
                            </button>
                          );
                        });
                      })()}

                      <button
                        type="button"
                        disabled={parentsCurrentPage === totalPages}
                        onClick={() => setParentsCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className="h-7 px-2 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed text-[10px]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: Notice Board */}
          {activeTab === "notices" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Broadcast Notice
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Broadcast critical circular alerts directly onto notice widgets.
                  </p>
                </div>

                {noticeSuccess && (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded border border-green-100 text-[11px] font-semibold">
                    <CheckCircle className="h-4 w-4" /> Notice broadcasted live!
                  </div>
                )}

                <form onSubmit={handleCreateNotice} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notice Title</label>
                    <input
                      type="text"
                      required
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      placeholder="e.g. Independence Day Celebrations"
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Broadcast Target Audience</label>
                    <select
                      value={noticeTarget}
                      onChange={(e) => setNoticeTarget(e.target.value as any)}
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    >
                      <option value="ALL">All Users (PTM & Alerts)</option>
                      <option value="TEACHERS">Teachers Only</option>
                      <option value="PARENTS">Parents Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notice Content</label>
                    <textarea
                      required
                      rows={4}
                      value={noticeContent}
                      onChange={(e) => setNoticeContent(e.target.value)}
                      placeholder="Type details about timings, dress codes, holiday dates..."
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 resize-none"
                    />
                  </div>

                  <button type="submit" className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all cursor-pointer">
                    Broadcast Notice
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b border-slate-200/80 pb-2">
                  History Logs (Broadcasted Bulletins)
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Circular history log containing recent announcements.
                </p>
                <div className="space-y-3">
                  <div className="p-4 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                        Target: ALL
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400">2026-07-10</span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800">Parent-Teacher Meeting (PTM)</h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      The first PTM of the academic session 2026-27 is scheduled for Saturday, 18th July. Timings: 9:00 AM to 12:30 PM.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Register Student */}
          {activeTab === "students" && (
            <div className="space-y-6">
              {/* Header Selector: Directory vs Single vs Bulk */}
              <div className="flex border-b border-slate-200 mb-4 gap-2">
                <button
                  onClick={() => setImportMode("directory")}
                  className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    importMode === "directory"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Student Directory
                </button>
                <button
                  onClick={() => setImportMode("single")}
                  className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    importMode === "single"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Single Registration
                </button>
                <button
                  onClick={() => setImportMode("bulk")}
                  className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    importMode === "bulk"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Bulk CSV Import
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
                    {/* SEARCH AND FILTERS */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Name, ADM No, Family ID..."
                        value={dirSearch}
                        onChange={(e) => {
                          setDirSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full text-xs font-semibold py-2 pl-9 pr-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all"
                      />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <select
                        value={dirClassFilter}
                        onChange={(e) => {
                          setDirClassFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer w-full sm:w-auto"
                      >
                        <option value="">All Classes</option>
                        {classes.map((cls: any) => (
                          <option key={cls.id} value={cls.name}>{cls.name}-{cls.section}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* BULK ACTIONS FLOATING BAR */}
                  {selectedStudentIds.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-2xl flex items-center justify-between text-xs font-black text-indigo-900 animate-fade-in gap-3 shadow-[0_4px_12px_rgba(79,70,229,0.06)] bg-indigo-50/90 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white rounded-full h-5 w-5 flex items-center justify-center font-extrabold text-[10px]">
                          {selectedStudentIds.length}
                        </span>
                        <span>Students Selected</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setPromoteClass("");
                            setPromoteSection("A");
                            setShowBulkPromoteModal(true);
                          }}
                          className="py-1.5 px-3 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" /> Bulk Promote
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Suspend ${selectedStudentIds.length} selected students?`)) {
                              await updateStudentStatus(selectedStudentIds, "SUSPENDED");
                              setSelectedStudentIds([]);
                            }
                          }}
                          className="py-1.5 px-3 bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Bulk Suspend
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Mark ${selectedStudentIds.length} selected students as LEFT (TC Issued)?`)) {
                              await updateStudentStatus(selectedStudentIds, "LEFT");
                              setSelectedStudentIds([]);
                            }
                          }}
                          className="py-1.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Bulk Left (TC)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="py-1.5 px-2.5 text-slate-400 hover:text-slate-650 font-bold cursor-pointer"
                        >
                          Deselect
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STUDENT DIRECTORY TABLE */}
                  {(() => {
                    const filtered = students.filter((s: any) => {
                      const matchesSearch = 
                        s.name.toLowerCase().includes(dirSearch.toLowerCase()) ||
                        s.admissionNo.toLowerCase().includes(dirSearch.toLowerCase()) ||
                        (s.familyCode && s.familyCode.toLowerCase().includes(dirSearch.toLowerCase()));
                      const matchesClass = 
                        !dirClassFilter || s.class === dirClassFilter;
                      return matchesSearch && matchesClass;
                    });

                    const totalItems = filtered.length;
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
                    const activePage = Math.min(currentPage, totalPages || 1);
                    const startIndex = (activePage - 1) * itemsPerPage;
                    const paginatedStudents = filtered.slice(startIndex, startIndex + itemsPerPage);

                    return (
                      <>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

                          {/* ── MOBILE: Student Cards ── */}
                          <div className="block sm:hidden divide-y divide-slate-100">
                            {paginatedStudents.length === 0 ? (
                              <div className="text-center py-10 text-slate-400">
                                <p className="text-sm font-semibold">No students found.</p>
                              </div>
                            ) : paginatedStudents.map((std: any) => {
                              const status = std.status || "ACTIVE";
                              const statusColors = {
                                ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
                                SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
                                LEFT: "bg-rose-50 text-rose-700 border-rose-200",
                              };
                              return (
                                <div key={std.id} className="p-4 flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedStudentIds.includes(std.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedStudentIds(prev => [...prev, std.id]);
                                      else setSelectedStudentIds(prev => prev.filter(id => id !== std.id));
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 h-4 w-4 shrink-0"
                                  />
                                  <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
                                    {std.photoUrl ? <img src={std.photoUrl} alt={std.name} className="h-full w-full object-cover rounded-full" /> : std.name.substring(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-sm text-slate-800 truncate">{std.name}</span>
                                      {std.isRte && <span className="text-[8px] font-black uppercase bg-purple-100 text-purple-700 px-1 rounded border border-purple-200 shrink-0">RTE</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-semibold">
                                      Cl {std.class}-{std.section} • {std.admissionNo}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColors[status as keyof typeof statusColors] || statusColors.ACTIVE}`}>
                                      {status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedStudent(std); setShowDetailModal(true); }}
                                      className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg press-scale"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* ── DESKTOP: Student Table ── */}
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
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
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                  </th>
                                  <th className="py-3 px-4">Student Name</th>
                                  <th className="py-3 px-4">Class</th>
                                  <th className="py-3 px-4">Family ID</th>
                                  <th className="py-3 px-4">ADM Number</th>
                                  <th className="py-3 px-4">Father Name</th>
                                  <th className="py-3 px-4 text-center">Status</th>
                                  <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="text-center py-8 text-slate-400 font-bold italic">
                                      No students found matching filters.
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedStudents.map((std: any) => {
                                    const status = std.status || "ACTIVE";
                                    return (
                                      <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
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
                                              <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-750 flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
                                                {std.name.substring(0, 2)}
                                              </div>
                                            )}
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <div className="font-extrabold text-slate-800">{std.name}</div>
                                                {std.isRte && (
                                                  <span className="bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-1 rounded border border-purple-200">
                                                    RTE
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-500">
                                          {std.class}-{std.section}
                                        </td>
                                        <td className="py-3 px-4">
                                          <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-1 rounded text-[10px] border border-slate-200">
                                            {std.familyCode || "N/A"}
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                                          {std.admissionNo}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">{std.parentName || "N/A"}</td>
                                        <td className="py-3 px-4 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            status === "ACTIVE"
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                              : status === "SUSPENDED"
                                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                                              : "bg-rose-50 text-rose-700 border border-rose-200"
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
                                              <div className="absolute right-4 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-40 py-1 divide-y divide-slate-100 animate-fade-in text-left">
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
                                                    setEditName(std.name);
                                                    setEditDob(std.dob || "");
                                                    setEditAadhaar(std.aadhaar || "");
                                                    setEditDisability(std.disability || "No");
                                                    setEditFatherName(std.fatherName || std.parentName || "");
                                                    setEditMotherName(std.motherName || "");
                                                    setEditFatherMobile(std.fatherMobile || std.parentPhone || "");
                                                    setEditMotherMobile(std.motherMobile || "");
                                                    setEditFatherAadhaar(std.fatherAadhaar || "");
                                                    setEditAddress(std.address || "");
                                                    setEditParentEmail(std.parentEmail || "");
                                                    setEditCategory(std.category || "General");
                                                    setEditReligion(std.religion || "Hinduism");
                                                    setEditMotherTongue(std.motherTongue || "Hindi");
                                                    setEditNationality(std.nationality || "Indian");
                                                    setEditParentOccupation(std.parentOccupation || "");
                                                    setEditFamilyIncome(std.familyIncome || "");
                                                    setEditEmergencyName(std.emergencyName || "");
                                                    setEditEmergencyPhone(std.emergencyPhone || "");
                                                    setEditMotherAadhaar(std.motherAadhaar || "");
                                                    setEditTransportMode(std.transportMode || "Self");
                                                    setEditBusRoute(std.busRoute || "");
                                                    setEditBusStop(std.busStop || "");
                                                    setEditIsRte(!!std.isRte);
                                                    
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
                        {totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mt-3 text-xs font-bold text-slate-500 gap-3">
                            <div>
                              Showing <span className="text-slate-800 font-extrabold">{startIndex + 1}</span> to{" "}
                              <span className="text-slate-800 font-extrabold">
                                {Math.min(startIndex + itemsPerPage, totalItems)}
                              </span>{" "}
                              of <span className="text-slate-855 font-black">{totalItems}</span> students
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                  <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => {
                                      setCurrentPage(pageNum);
                                    }}
                                    className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                      activePage === pageNum
                                        ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/10"
                                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )
            ) : importMode === "single" ? (
                <div className="max-w-4xl mx-auto space-y-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Register Student Profile
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Fill details accurately. Parent accounts are auto-linked or created.
                      </p>
                    </div>

                    {stdSuccess && (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded border border-green-100 text-[11px] font-semibold animate-fade-in">
                        <CheckCircle className="h-4 w-4" /> Pupil registered and dues assigned successfully!
                      </div>
                    )}

                    <form onSubmit={handleRegisterStudent} className="space-y-6">
                      {/* Section 1: Student Info & Demographics */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider border-b border-indigo-50 pb-1.5">
                          1. Personal & Demographics Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Name *</label>
                            <input
                              type="text"
                              required
                              value={stdName}
                              onChange={(e) => setStdName(e.target.value)}
                              placeholder="Full Name"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DOB *</label>
                            <input
                              type="date"
                              required
                              value={stdDob}
                              onChange={(e) => setStdDob(e.target.value)}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Aadhaar Number</label>
                            <input
                              type="text"
                              maxLength={12}
                              value={stdAadhaar}
                              onChange={(e) => setStdAadhaar(e.target.value.replace(/\D/g, ""))}
                              placeholder="12-digit number"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Caste Category</label>
                            <select
                              value={stdCategory}
                              onChange={(e) => setStdCategory(e.target.value)}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            >
                              <option value="General">General</option>
                              <option value="OBC">OBC</option>
                              <option value="SC">SC</option>
                              <option value="ST">ST</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Religion</label>
                            <input
                              type="text"
                              value={stdReligion}
                              onChange={(e) => setStdReligion(e.target.value)}
                              placeholder="e.g. Hinduism, Islam..."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Disability</label>
                            <select
                              value={stdDisability}
                              onChange={(e) => setStdDisability(e.target.value)}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            >
                              <option value="No">No</option>
                              <option value="Yes (Visual)">Yes (Visual)</option>
                              <option value="Yes (Hearing)">Yes (Hearing)</option>
                              <option value="Yes (Locomotor)">Yes (Locomotor)</option>
                              <option value="Yes (Other)">Yes (Other)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother Tongue</label>
                            <input
                              type="text"
                              value={stdMotherTongue}
                              onChange={(e) => setStdMotherTongue(e.target.value)}
                              placeholder="e.g. Hindi, English..."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nationality</label>
                            <input
                              type="text"
                              value={stdNationality}
                              onChange={(e) => setStdNationality(e.target.value)}
                              placeholder="e.g. Indian..."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">RTE Student? (100% Waiver)</label>
                            <select
                              value={stdIsRte ? "Yes" : "No"}
                              onChange={(e) => setStdIsRte(e.target.value === "Yes")}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            >
                              <option value="No">No (Standard Billing)</option>
                              <option value="Yes">Yes (RTE 100% Fee Waiver)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Academic Details & Previous School */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider border-b border-indigo-50 pb-1.5">
                          2. Academic History & Admissions
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Class</label>
                            <select
                              value={stdClass}
                              onChange={(e) => {
                                const selectedName = e.target.value;
                                setStdClass(selectedName);
                                const matched = classes.find(c => c.name === selectedName);
                                if (matched) {
                                  setStdSection(matched.section);
                                }
                              }}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            >
                              <option value="">Select Class</option>
                              {Array.from(new Set(classes.map(c => c.name))).map((className) => (
                                <option key={className} value={className}>{className}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</label>
                            <select
                              value={stdSection}
                              onChange={(e) => setStdSection(e.target.value)}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            >
                              <option value="">Select Section</option>
                              {classes.filter(c => c.name === stdClass).map((cls) => (
                                <option key={cls.id} value={cls.section}>{cls.section}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Admission Date</label>
                            <input
                              type="date"
                              value={stdAdmissionDate}
                              onChange={(e) => setStdAdmissionDate(e.target.value)}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Board Registration No.</label>
                            <input
                              type="text"
                              value={stdBoardRegNo}
                              onChange={(e) => setStdBoardRegNo(e.target.value)}
                              placeholder="CBSE / Board ID"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Previous School Name</label>
                            <input
                              type="text"
                              value={stdPrevSchoolName}
                              onChange={(e) => setStdPrevSchoolName(e.target.value)}
                              placeholder="DPS, KV, etc."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Previous Class Passed</label>
                            <input
                              type="text"
                              value={stdPrevClassPassed}
                              onChange={(e) => setStdPrevClassPassed(e.target.value)}
                              placeholder="Class 9Passed"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TC Number</label>
                            <input
                              type="text"
                              value={stdTcNumber}
                              onChange={(e) => setStdTcNumber(e.target.value)}
                              placeholder="Transfer Certificate No."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Family Information & Finance */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider border-b border-indigo-50 pb-1.5">
                          3. Family Details & Household Finance
                        </h4>

                        {/* Family ID Selector */}
                        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3 mb-4">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                            Family Linkage Setup (Sibling Grouping)
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="stdFamilyIdMode"
                                value="auto"
                                checked={stdFamilyIdMode === "auto"}
                                onChange={() => {
                                  setStdFamilyIdMode("auto");
                                  // Clear prefilled parent fields
                                  setStdFatherName("");
                                  setStdFatherMobile("");
                                  setStdParentEmail("");
                                  setStdAddress("");
                                  setStdParentOccupation("");
                                  setStdFamilyIncome("");
                                  setStdEmergencyName("");
                                  setStdEmergencyPhone("");
                                  setStdMotherName("");
                                  setStdMotherMobile("");
                                  setStdFatherAadhaar("");
                                  setStdMotherAadhaar("");
                                }}
                                className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                              Auto-Generate New Family ID
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="stdFamilyIdMode"
                                value="existing"
                                checked={stdFamilyIdMode === "existing"}
                                onChange={() => setStdFamilyIdMode("existing")}
                                className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                              Link to Existing Family / Sibling
                            </label>
                          </div>

                          {stdFamilyIdMode === "existing" && (
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Select Sibling's Family Code *
                              </label>
                              <select
                                required={stdFamilyIdMode === "existing"}
                                value={stdSelectedFamilyCode}
                                onChange={(e) => setStdSelectedFamilyCode(e.target.value)}
                                className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 cursor-pointer"
                              >
                                <option value="">-- Select Sibling's Family --</option>
                                {parentFamilies.map((fam) => (
                                  <option key={fam.familyCode} value={fam.familyCode}>
                                    {fam.familyCode} - {fam.parentName} ({fam.parentPhone})
                                  </option>
                                ))}
                              </select>
                              <p className="text-[9px] text-amber-600 font-bold mt-1">
                                Notice: Linking to an existing Family will automatically inherit all parent details, email, and address.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Father's Name *</label>
                            <input
                              type="text"
                              required
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdFatherName}
                              onChange={(e) => setStdFatherName(e.target.value)}
                              placeholder="Father Name"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother's Name</label>
                            <input
                              type="text"
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdMotherName}
                              onChange={(e) => setStdMotherName(e.target.value)}
                              placeholder="Mother Name"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Father's Mobile *</label>
                            <input
                              type="text"
                              required
                              maxLength={10}
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdFatherMobile}
                              onChange={(e) => setStdFatherMobile(e.target.value.replace(/\D/g, ""))}
                              placeholder="10-digit number"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother's Mobile</label>
                            <input
                              type="text"
                              maxLength={10}
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdMotherMobile}
                              onChange={(e) => setStdMotherMobile(e.target.value.replace(/\D/g, ""))}
                              placeholder="10-digit number"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Father's Aadhaar</label>
                            <input
                              type="text"
                              maxLength={12}
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdFatherAadhaar}
                              onChange={(e) => setStdFatherAadhaar(e.target.value.replace(/\D/g, ""))}
                              placeholder="12-digit number"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother's Aadhaar</label>
                            <input
                              type="text"
                              maxLength={12}
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdMotherAadhaar}
                              onChange={(e) => setStdMotherAadhaar(e.target.value.replace(/\D/g, ""))}
                              placeholder="12-digit number"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent's Profession</label>
                            <input
                              type="text"
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdParentOccupation}
                              onChange={(e) => setStdParentOccupation(e.target.value)}
                              placeholder="e.g. Service, Business, Farmer..."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Family Annual Income (Rs.)</label>
                            <input
                              type="number"
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdFamilyIncome}
                              onChange={(e) => setStdFamilyIncome(e.target.value)}
                              placeholder="Annual salary/earnings"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="md:col-span-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent Email</label>
                            <input
                              type="email"
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdParentEmail}
                              onChange={(e) => setStdParentEmail(e.target.value)}
                              placeholder="parent@email.com"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address *</label>
                            <input
                              type="text"
                              required
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdAddress}
                              onChange={(e) => setStdAddress(e.target.value)}
                              placeholder="House No, Street, Landmark..."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Emergency & Transport */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider border-b border-indigo-50 pb-1.5">
                          4. Safety, Emergency & Transport
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/30 p-3.5 rounded-2xl border border-slate-100/80">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Emergency Contact Person</label>
                            <input
                              type="text"
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdEmergencyName}
                              onChange={(e) => setStdEmergencyName(e.target.value)}
                              placeholder="Guardian / Contact Name"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Emergency Phone Number</label>
                            <input
                              type="text"
                              maxLength={10}
                              disabled={stdFamilyIdMode === "existing"}
                              value={stdEmergencyPhone}
                              onChange={(e) => setStdEmergencyPhone(e.target.value.replace(/\D/g, ""))}
                              placeholder="10-digit mobile"
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mode of Transport</label>
                            <select
                              value={stdTransportMode}
                              onChange={(e) => setStdTransportMode(e.target.value)}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                            >
                              <option value="Self">Self / Walk</option>
                              <option value="School Bus">School Bus</option>
                              <option value="Private Cab">Private Cab / Van</option>
                              <option value="Parents Drop">Parents Drop</option>
                            </select>
                          </div>
                          {stdTransportMode === "School Bus" && (
                            <>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bus Route</label>
                                <input
                                  type="text"
                                  value={stdBusRoute}
                                  onChange={(e) => setStdBusRoute(e.target.value)}
                                  placeholder="e.g. Route-B"
                                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bus Stop Name</label>
                                <input
                                  type="text"
                                  value={stdBusStop}
                                  onChange={(e) => setStdBusStop(e.target.value)}
                                  placeholder="e.g. Sector-15 Crossing"
                                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Section 5: Initial Billing */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider border-b border-indigo-50 pb-1.5">
                          5. Auto-Assigned Class Fees Preview
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                          {feeStructures.filter(fs => fs.className === stdClass || fs.className === "All").length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Registering in Class {stdClass} will automatically assign these fees:
                              </p>
                              <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto">
                                {feeStructures
                                  .filter(fs => fs.className === stdClass || fs.className === "All")
                                  .map((struct, index) => (
                                    <div key={index} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-800">{struct.name}</span>
                                        <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded">
                                          {struct.frequency}
                                        </span>
                                      </div>
                                      <span className="font-extrabold text-indigo-600">Rs. {struct.total.toLocaleString("en-IN")}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-semibold italic py-2 text-center">
                              No automated fee structures configured for Class {stdClass} or 'All Classes'. Config them under "Configure Fees".
                            </p>
                          )}
                        </div>
                      </div>

                      <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer">
                        Register Student Account & Dues
                      </button>
                    </form>
                </div>
              ) : (
                // Bulk import mode panel
                <div className="space-y-6 max-w-4xl bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Bulk Import Students via CSV
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Download the standardized CSV template, fill the details, and upload them in bulk.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadCSVTemplate}
                      className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download className="h-4 w-4" /> Download CSV Template
                    </button>
                  </div>

                  {importCount && (
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
                                <td className="py-2 px-3">{row.dob}</td>
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
            </div>
          )}

          {/* TAB: ID Cards & Photos */}
          {activeTab === "idcards" && (
            <div className="space-y-6 animate-fade-in text-left">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Student ID Cards &amp; Photos Center
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Class-wise quick photo upload with client-side auto-compressor and print-ready dynamic ID card layout.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={selectedIdCardStudentIds.length === 0}
                  onClick={() => setIsPrintingIdCards(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Printer className="h-4 w-4" /> Print Selected ID Cards ({selectedIdCardStudentIds.length})
                </button>
              </div>

              {/* Class Selector and Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Class:</span>
                  <select
                    value={idClassFilter}
                    onChange={(e) => {
                      setIdClassFilter(e.target.value);
                      setSelectedIdCardStudentIds([]);
                    }}
                    className="text-xs font-bold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer w-full sm:w-[180px]"
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.name}>{cls.name}-{cls.section}</option>
                    ))}
                  </select>
                </div>

                {idClassFilter && (
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all-idcards"
                        checked={
                          students.filter(s => s.class === idClassFilter).length > 0 &&
                          students.filter(s => s.class === idClassFilter).every(s => selectedIdCardStudentIds.includes(s.id))
                        }
                        onChange={(e) => {
                          const classStds = students.filter(s => s.class === idClassFilter);
                          if (e.target.checked) {
                            setSelectedIdCardStudentIds(classStds.map(s => s.id));
                          } else {
                            setSelectedIdCardStudentIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="select-all-idcards" className="cursor-pointer">Select All Class</label>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full">
                      {students.filter(s => s.class === idClassFilter).length} Students
                    </span>
                  </div>
                )}
              </div>

              {/* Roster Grid */}
              {!idClassFilter ? (
                <div className="bg-slate-50 border-2 border-dashed border-indigo-100 rounded-2xl py-12 text-center">
                  <div className="text-3xl mb-2">🪪</div>
                  <p className="text-xs font-bold text-slate-500">Select a class from the dropdown above to start managing photos and printing ID cards.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {students
                    .filter((s) => s.class === idClassFilter)
                    .map((std) => (
                      <div
                        key={std.id}
                        className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 transition-all relative ${
                          selectedIdCardStudentIds.includes(std.id)
                            ? "border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/5"
                            : "border-slate-200/80 hover:border-slate-300"
                        }`}
                      >
                        {/* Checkbox selector */}
                        <div className="absolute top-3 left-3 z-10 bg-white rounded">
                          <input
                            type="checkbox"
                            checked={selectedIdCardStudentIds.includes(std.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIdCardStudentIds((prev) => [...prev, std.id]);
                              } else {
                                setSelectedIdCardStudentIds((prev) => prev.filter((id) => id !== std.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </div>

                        {/* Photo Box */}
                        <div className="flex flex-col items-center gap-2 mt-2">
                          <div className="h-24 w-24 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center bg-slate-50 relative group">
                            {std.photoUrl ? (
                              <img src={std.photoUrl} alt={std.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-slate-400 font-extrabold text-2xl uppercase">
                                {std.name.substring(0, 2)}
                              </span>
                            )}
                            {compressingStudentId === std.id && (
                              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-bold">
                                Compress...
                              </div>
                            )}
                          </div>
                          
                          {/* File input */}
                          <label className="text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-1.5 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4zm3 10a3 3 0 116 0H7zm6-3a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" /><path d="M12 9a1 1 0 100-2 1 1 0 000 2z" /></svg>
                            <span>{std.photoUrl ? "Change Photo" : "Upload Photo"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) compressAndUploadPhoto(std.id, file);
                              }}
                            />
                          </label>
                        </div>

                        {/* Info details */}
                        <div className="border-t border-slate-100 pt-3 text-center">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{std.name}</h4>
                          <div className="flex justify-center gap-2 mt-1 text-[9px] font-bold text-slate-400 uppercase">
                            <span>ADM: {std.admissionNo}</span>
                            <span>&bull;</span>
                            <span>ROLL: {std.rollNo || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: School Setup */}
          {activeTab === "school" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column: School Profile */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-4 text-left">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      School Profile customizer
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Update primary contact variables displayed across ledger invoice receipts.
                    </p>
                  </div>

                  {schoolSuccess && (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2 rounded border border-green-100 text-[11px] font-semibold">
                      <CheckCircle className="h-4 w-4" /> Institutional details updated!
                    </div>
                  )}

                  <form onSubmit={handleUpdateSchool} className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">School Name</label>
                      <input
                        type="text"
                        required
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Institutional Address</label>
                      <input
                        type="text"
                        required
                        value={schoolAddress}
                        onChange={(e) => setSchoolAddress(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Phone</label>
                        <input
                          type="text"
                          required
                          value={schoolPhone}
                          onChange={(e) => setSchoolPhone(e.target.value)}
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Accounts Email</label>
                        <input
                          type="email"
                          required
                          value={schoolEmail}
                          onChange={(e) => setSchoolEmail(e.target.value)}
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">School UPI ID (VPA)</label>
                        <input
                          type="text"
                          placeholder="e.g. gngschool@icici"
                          value={schoolUpiId}
                          onChange={(e) => setSchoolUpiId(e.target.value)}
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">UPI Merchant/Payee Name</label>
                        <input
                          type="text"
                          placeholder="e.g. St GNG School"
                          value={schoolUpiMerchantName}
                          onChange={(e) => setSchoolUpiMerchantName(e.target.value)}
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer">
                      Save Institutional Settings
                    </button>
                  </form>
                </div>

                {/* Right Column: Admin Profile Settings */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-4 text-left">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Admin Profile Settings
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Update your system login profile name, username, email address, and phone number.
                    </p>
                  </div>

                  {adminProfileSuccess && (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-100 text-[10px] font-bold">
                      Ô£ô {adminProfileSuccess}
                    </div>
                  )}

                  {adminProfileError && (
                    <div className="flex items-center gap-2 bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-100 text-[10px] font-bold">
                      ÔÜá´©Å {adminProfileError}
                    </div>
                  )}

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setAdminProfileError("");
                      setAdminProfileSuccess("");
                      if (!user) return;

                      const res = await updateAdminProfile(user.id, {
                        name: adminFormName,
                        username: adminFormUsername,
                        email: adminFormEmail,
                        phone: adminFormPhone,
                      });

                      if (res.success) {
                        setAdminProfileSuccess("Admin profile details updated successfully!");
                      } else {
                        setAdminProfileError(res.error || "Failed to update profile details.");
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={adminFormName}
                        onChange={(e) => setAdminFormName(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Username (Login ID)</label>
                      <input
                        type="text"
                        required
                        value={adminFormUsername}
                        onChange={(e) => setAdminFormUsername(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={adminFormEmail}
                          onChange={(e) => setAdminFormEmail(e.target.value)}
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Phone</label>
                        <input
                          type="text"
                          value={adminFormPhone}
                          onChange={(e) => setAdminFormPhone(e.target.value)}
                          className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer">
                      Save Profile Details
                    </button>
                  </form>
                </div>
              </div>

              {/* Google Cloud Integration Panel */}
              <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-4 text-left">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-indigo-600" /> Google Cloud Integration Panel
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Connect Google Sheets to export reports and Google Drive to backup your database. Make sure you share the sheet/folder with the Service Account email.
                  </p>
                </div>

                {googleStatus && (
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-[10px] font-bold ${
                    googleStatus.type === "success" 
                      ? "bg-green-50 text-green-700 border-green-100" 
                      : "bg-rose-50 text-rose-700 border-rose-100"
                  }`}>
                    {googleStatus.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {googleStatus.msg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* Google Sheets Sync Box */}
                  <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4.5 space-y-3.5">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Google Sheets Data Synchronization</h4>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Appends ledger entries and student profiles directly to Sheet1.</p>
                    </div>
                    
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Google Spreadsheet ID (from URL)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1aBCdEfGhIjKlMnOpQrStUvWxYz1234567890"
                        value={googleSpreadsheetId}
                        onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        onClick={triggerSyncStudents}
                        disabled={syncingStudents}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {syncingStudents ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        Sync Students
                      </button>
                      <button
                        onClick={triggerSyncLedger}
                        disabled={syncingLedger}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {syncingLedger ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                        Sync Financials
                      </button>
                    </div>
                  </div>

                  {/* Google Drive Backup Box */}
                  <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4.5 space-y-3.5">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Google Drive Database Backup</h4>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Creates a full JSON database snapshot and uploads it to a folder.</p>
                    </div>

                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Google Drive Folder ID (from URL)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1xYz234567890aBCdEfGhIjKlMnOpQrSt"
                        value={googleFolderId}
                        onChange={(e) => handleFolderIdChange(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600"
                      />
                    </div>

                    <button
                      onClick={triggerBackupDrive}
                      disabled={backingUp}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer pt-1"
                    >
                      {backingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                      Backup to Google Drive
                    </button>
                  </div>
                  </div>
                </div>

              {/* Dynamic Exam Configuration Panel */}
              <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-4 text-left">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Academic Examination Customizer
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Configure custom exam terms (e.g. Unit-1, Half Yearly, Annual) used for student grading.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Add New Exam Inline Form */}
                  <div className="flex gap-2 items-end max-w-md">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Exam Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Unit-3, Weekly Test 1"
                        value={newExamInput}
                        onChange={(e) => setNewExamInput(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newExamInput.trim();
                        if (trimmed && !schoolExams.includes(trimmed)) {
                          setSchoolExams((prev) => [...prev, trimmed]);
                          setSchoolExamConfig((prev: any) => ({
                            ...prev,
                            [trimmed]: { isSplit: false, maxMarks: 100, components: [] }
                          }));
                          setSelectedConfigExam(trimmed);
                          setNewExamInput("");
                        }
                      }}
                      className="px-4 py-2 bg-slate-105 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Add Exam
                    </button>
                  </div>

                  {/* List of current Exams */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Configured Exams (Select an exam to configure its grading parameters)
                    </label>
                    {schoolExams.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {schoolExams.map((exam, idx) => {
                          const isActive = selectedConfigExam === exam;
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedConfigExam(exam)}
                              className={`flex items-center gap-1.5 border rounded-xl pl-3 pr-2 py-1 text-xs font-bold shadow-sm cursor-pointer transition-all ${
                                isActive
                                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                                  : "bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span>{exam}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSchoolExams((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  );
                                  if (selectedConfigExam === exam) {
                                    setSelectedConfigExam("");
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-500 font-extrabold text-sm ml-1 focus:outline-none transition-colors"
                                title="Delete Exam"
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic font-medium">
                        No custom exam types configured. Standard default exams will be active.
                      </p>
                    )}
                  </div>

                  {/* Selected Exam Settings Sub-panel */}
                  {selectedConfigExam && (() => {
                    const config = schoolExamConfig[selectedConfigExam] || { isSplit: false, maxMarks: 100, components: [] };
                    return (
                      <div className="bg-slate-50/50 border border-slate-200/80 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                            Grading Parameters for: {selectedConfigExam}
                          </h4>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-450">
                            Total Max Marks: {config.isSplit 
                              ? (config.components || []).reduce((sum: number, c: any) => sum + (c.max || 0), 0) 
                              : (config.maxMarks || 100)}
                          </span>
                        </div>

                        {/* Split assessment Toggle */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isSplitToggle"
                            checked={config.isSplit || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const defaultComps = [
                                { name: "Written Exam", max: 80 },
                                { name: "Note Book", max: 5 },
                                { name: "Sub. Enrich.", max: 5 },
                                { name: "Pr. Act.", max: 10 }
                              ];
                              setSchoolExamConfig((prev: any) => ({
                                ...prev,
                                [selectedConfigExam]: {
                                  ...prev[selectedConfigExam],
                                  isSplit: checked,
                                  components: checked ? defaultComps : [],
                                  maxMarks: checked ? 100 : 100
                                }
                              }));
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <label htmlFor="isSplitToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                            Enable split assessment (CBSE-style internal + written breakdown)
                          </label>
                        </div>

                        {/* If not split: edit maxMarks */}
                        {!config.isSplit ? (
                          <div className="max-w-xs">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Maximum Marks
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={config.maxMarks || 100}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setSchoolExamConfig((prev: any) => ({
                                  ...prev,
                                  [selectedConfigExam]: {
                                    ...prev[selectedConfigExam],
                                    maxMarks: val
                                  }
                                }));
                              }}
                              className="w-full text-xs font-semibold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600"
                            />
                          </div>
                        ) : (
                          // If split: render components list and form
                          <div className="space-y-4 text-xs font-semibold text-slate-700">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                Assessment Components
                              </label>
                              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase">
                                      <th className="p-2">Component Name</th>
                                      <th className="p-2 text-center w-24">Max Marks</th>
                                      <th className="p-2 text-center w-16">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(config.components || []).map((comp: any, cIdx: number) => (
                                      <tr key={cIdx}>
                                        <td className="p-2">
                                          <input
                                            type="text"
                                            value={comp.name}
                                            onChange={(e) => {
                                              const newName = e.target.value;
                                              setSchoolExamConfig((prev: any) => {
                                                const comps = [...prev[selectedConfigExam].components];
                                                comps[cIdx] = { ...comps[cIdx], name: newName };
                                                return {
                                                  ...prev,
                                                  [selectedConfigExam]: {
                                                    ...prev[selectedConfigExam],
                                                    components: comps
                                                  }
                                                };
                                              });
                                            }}
                                            className="w-full font-bold outline-none border-b border-transparent focus:border-indigo-600"
                                          />
                                        </td>
                                        <td className="p-2 text-center">
                                          <input
                                            type="number"
                                            min="0"
                                            value={comp.max}
                                            onChange={(e) => {
                                              const newMax = parseFloat(e.target.value) || 0;
                                              setSchoolExamConfig((prev: any) => {
                                                const comps = [...prev[selectedConfigExam].components];
                                                comps[cIdx] = { ...comps[cIdx], max: newMax };
                                                const total = comps.reduce((sum: number, c: any) => sum + (c.max || 0), 0);
                                                return {
                                                  ...prev,
                                                  [selectedConfigExam]: {
                                                    ...prev[selectedConfigExam],
                                                    components: comps,
                                                    maxMarks: total
                                                  }
                                                };
                                              });
                                            }}
                                            className="w-16 text-center font-bold outline-none border-b border-transparent focus:border-indigo-600"
                                          />
                                        </td>
                                        <td className="p-2 text-center">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSchoolExamConfig((prev: any) => {
                                                const comps = prev[selectedConfigExam].components.filter((_: any, i: number) => i !== cIdx);
                                                const total = comps.reduce((sum: number, c: any) => sum + (c.max || 0), 0);
                                                return {
                                                  ...prev,
                                                  [selectedConfigExam]: {
                                                    ...prev[selectedConfigExam],
                                                    components: comps,
                                                    maxMarks: total
                                                  }
                                                };
                                              });
                                            }}
                                            className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                                          >
                                            Delete
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {/* Mobile Card List */}
                                <div className="sm:hidden divide-y divide-slate-100">
                                  {(config.components || []).map((comp: any, cIdx: number) => (
                                    <div key={cIdx} className="p-3 space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">{comp.name}</span>
                                        <button type="button" onClick={() => { /* logic same as above */ }} className="text-rose-600 text-[10px] font-bold">Delete</button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <label className="text-[9px] font-bold text-slate-400">Max Marks:</label>
                                        <input type="number" value={comp.max} className="w-16 text-xs font-bold border-b" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Add Component Form */}
                            <div className="flex gap-2 items-end bg-white border border-slate-200/70 p-3 rounded-lg max-w-md">
                              <div className="flex-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                  New Component Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Oral test"
                                  value={newCompName}
                                  onChange={(e) => setNewCompName(e.target.value)}
                                  className="w-full text-xs font-semibold py-1 px-2 border border-slate-200 rounded outline-none focus:border-indigo-600"
                                />
                              </div>
                              <div className="w-20">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                  Max Marks
                                </label>
                                <input
                                  type="number"
                                  placeholder="10"
                                  value={newCompMax}
                                  onChange={(e) => setNewCompMax(e.target.value)}
                                  className="w-full text-xs font-semibold py-1 px-2 border border-slate-200 rounded outline-none focus:border-indigo-600"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const name = newCompName.trim();
                                  const maxVal = parseFloat(newCompMax) || 0;
                                  if (name && maxVal > 0) {
                                    setSchoolExamConfig((prev: any) => {
                                      const current = prev[selectedConfigExam] || { components: [] };
                                      const comps = [...(current.components || []), { name, max: maxVal }];
                                      const total = comps.reduce((sum: number, c: any) => sum + (c.max || 0), 0);
                                      return {
                                        ...prev,
                                        [selectedConfigExam]: {
                                          ...current,
                                          components: comps,
                                          maxMarks: total
                                        }
                                      };
                                    });
                                    setNewCompName("");
                                    setNewCompMax("");
                                  }
                                }}
                                className="px-3 py-1 bg-slate-105 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all cursor-pointer animate-fade-in"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Save button */}
                  <div className="border-t border-slate-100 pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        setSavingExams(true);
                        try {
                          await updateSchoolInfo({
                            ...schoolInfo,
                            exams: schoolExams,
                            examConfig: schoolExamConfig,
                          });
                          setSchoolSuccess(true);
                          setTimeout(() => setSchoolSuccess(false), 3000);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setSavingExams(false);
                        }
                      }}
                      disabled={savingExams}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer disabled:opacity-55"
                    >
                      {savingExams ? "Saving..." : "Save Exam Configuration"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Audit Trails */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  System Security Audit Logs
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Relational activity tracker showing all transactions, approvals, and credentials blocks.
                </p>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
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
              </div>
            </div>
          )}

          {/* TAB 6: Receipts Ledger & Audit Hub */}
          {activeTab === "ledger" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Receipts & Audit Ledger Book
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Track and reprint all invoices, or audit raw double-entry transactions ledger.
                  </p>
                </div>

                {/* Sub-tab toggle buttons */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl self-start md:self-auto select-none shrink-0 border border-slate-200/40">
                  <button
                    onClick={() => setLedgerSubTab("receipts")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      ledgerSubTab === "receipts"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Receipt Vouchers
                  </button>
                  <button
                    onClick={() => setLedgerSubTab("raw")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      ledgerSubTab === "raw"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Double-Entry Ledger
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Name, Receipt #, or Desc..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all placeholder-slate-400"
                  />
                </div>

                {/* Date Filter */}
                <div className="relative">
                  <input
                    type="date"
                    value={ledgerDate}
                    onChange={(e) => setLedgerDate(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all text-slate-705"
                  />
                </div>

                {/* Clear Filters Button */}
                {(ledgerSearch || ledgerDate) && (
                  <button
                    onClick={() => {
                      setLedgerSearch("");
                      setLedgerDate("");
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all self-stretch cursor-pointer border border-slate-200/50"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Receipts Book Sub-Tab */}
              {ledgerSubTab === "receipts" && (
                <div className="space-y-4">
                  {/* Aggregate Summary Box */}
                  {(() => {
                    const filtered = receipts.filter((r) => {
                      const matchesSearch =
                        !ledgerSearch.trim() ||
                        r.receiptNo.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        r.studentName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        r.details?.toLowerCase().includes(ledgerSearch.toLowerCase());
                      const matchesDate = !ledgerDate || r.createdAt === ledgerDate;
                      return matchesSearch && matchesDate;
                    });

                    const totalAmt = filtered.reduce((sum, r) => sum + r.amount, 0);
                    const cashAmt = filtered.filter(r => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
                    const upiAmt = filtered.filter(r => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);
                    const bankAmt = filtered.filter(r => r.method === "ONLINE" || r.method === "CHEQUE").reduce((sum, r) => sum + r.amount, 0);

                    return (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Receipts</span>
                          <span className="text-sm font-black text-slate-800 mt-1 block">{filtered.length} Vouchers</span>
                        </div>
                        <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">Total Collection</span>
                          <span className="text-sm font-black text-slate-900 mt-1 block">₹{totalAmt.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block">Cash Collection</span>
                          <span className="text-sm font-black text-emerald-700 mt-1 block">₹{cashAmt.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                          <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block">UPI & Digital</span>
                          <span className="text-sm font-black text-blue-700 mt-1 block">₹{(upiAmt + bankAmt).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Receipts Vouchers Table */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.015)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                            <th className="py-3 px-4">Receipt No</th>
                            <th className="py-3 px-4">Student & Class</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Mode</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {(() => {
                            const filtered = receipts.filter((r) => {
                              const matchesSearch =
                                !ledgerSearch.trim() ||
                                r.receiptNo.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                                r.studentName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                                r.details?.toLowerCase().includes(ledgerSearch.toLowerCase());
                              const matchesDate = !ledgerDate || r.createdAt === ledgerDate;
                              return matchesSearch && matchesDate;
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-[11px] text-slate-400 font-semibold italic bg-slate-50/30">
                                    No receipts found matching filters.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((rec) => (
                              <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-3.5 px-4 font-black text-indigo-755">{rec.receiptNo}</td>
                                <td className="py-3.5 px-4">
                                  <p className="font-extrabold text-slate-900">{rec.studentName}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{rec.classSection}</p>
                                </td>
                                <td className="py-3.5 px-4 max-w-xs truncate text-[10px] text-slate-500 font-medium">
                                  {rec.details}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 text-[10px] font-bold">{rec.createdAt}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                    rec.method === "CASH"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : "bg-blue-50 text-blue-700 border-blue-100"
                                  }`}>
                                    {rec.method}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-slate-955">
                                  ₹{rec.amount.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    onClick={() => {
                                      const std = students.find((s) => s.id === rec.studentId);
                                      setActiveReceipt({
                                        ...rec,
                                        admissionNo: std ? std.admissionNo : "Unified/Family",
                                        discount: 0,
                                        arrears: 0,
                                      });
                                      setShowReceiptModal(true);
                                    }}
                                    className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Double-Entry Ledger Sub-Tab */}
              {ledgerSubTab === "raw" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>Double-Entry Records Logs</span>
                    <span>Total {ledgerEntries.length} items logged</span>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {(() => {
                      const filtered = ledgerEntries.filter((log) => {
                        const student = students.find((s) => s.id === log.studentId);
                        const matchesSearch =
                          !ledgerSearch.trim() ||
                          student?.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                          log.description.toLowerCase().includes(ledgerSearch.toLowerCase());
                        const matchesDate = !ledgerDate || log.createdAt === ledgerDate;
                        return matchesSearch && matchesDate;
                      });

                      if (filtered.length === 0) {
                        return (
                          <p className="text-[10px] text-slate-400 font-semibold italic text-center py-6 bg-slate-50/50 rounded-lg">
                            No ledger items found matching filters.
                          </p>
                        );
                      }

                      return filtered.map((log) => {
                        const isCharge = log.type === "CHARGE" || log.type === "FINE";
                        const student = students.find((s) => s.id === log.studentId);
                        return (
                          <div
                            key={log.id}
                            className="p-3 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs font-semibold"
                          >
                            <div>
                              <p className="font-black text-slate-800">
                                {student?.name || "Student"} ({student?.class}-{student?.section})
                              </p>
                              <p className="text-slate-500 font-semibold text-[10px] mt-0.5">{log.description}</p>
                              <span className="text-[8px] font-bold text-slate-400 uppercase">{log.createdAt}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-black ${isCharge ? "text-rose-600" : "text-emerald-600"}`}>
                                {isCharge ? "+" : "-"} ₹{log.amount.toLocaleString("en-IN")}
                              </span>
                              <span
                                className={`block text-[7px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded border self-end ${
                                  isCharge
                                    ? "bg-rose-50 border-rose-100 text-rose-800"
                                    : "bg-green-50 border-green-100 text-green-800"
                                }`}
                              >
                                {log.type}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Feed Student Marks */}
          {activeTab === "marks" && (
            <MarksFeedingConsole />
          )}

          {/* TAB 7: Unpaid Fee Defaulters Registry & Dues Report */}
          {activeTab === "defaulters" && (
            <div className="space-y-5">
              {alertSuccessMsg && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded-xl border border-green-100 text-xs font-semibold animate-fade-in">
                  <CheckCircle className="h-4 w-4" />
                  {alertSuccessMsg}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Dues & Defaulters Report
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Click on any student card to view detailed fee breakdown.
                  </p>
                </div>
                <button
                  onClick={() => alert("Exporting XLS report...")}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-bold text-slate-600 self-start md:self-auto cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export XLS
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Search by Student Name or Parent..."
                  value={defaulterSearch}
                  onChange={(e) => { setDefaulterSearch(e.target.value); setExpandedStudentId(null); setDefaulterPage(1); }}
                  className="w-full text-xs font-semibold py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all placeholder-slate-400"
                />
                <select
                  value={defaulterClass}
                  onChange={(e) => { setDefaulterClass(e.target.value); setExpandedStudentId(null); setDefaulterPage(1); }}
                  className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all text-slate-600"
                >
                  <option value="All">All Classes (Outstanding)</option>
                  {Array.from(new Set([
                    ...classes.map(c => `${c.name}-${c.section}`),
                    ...students.map(s => `${s.class}-${s.section}`)
                  ])).filter(Boolean).sort().map((cls) => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>

              {/* Card Grid */}
              {(() => {
                // Pre-group due items by student id to optimize rendering speed from O(N * M) to O(N + M)
                const studentDuesMap = new Map<string, typeof dueItems>();
                const unpaidDuesMap = new Map<string, typeof dueItems>();
                const paidDuesMap = new Map<string, typeof dueItems>();

                for (const d of dueItems) {
                  const sid = d.studentId;
                  if (!studentDuesMap.has(sid)) studentDuesMap.set(sid, []);
                  studentDuesMap.get(sid)!.push(d);

                  if (d.status === "UNPAID") {
                    if (!unpaidDuesMap.has(sid)) unpaidDuesMap.set(sid, []);
                    unpaidDuesMap.get(sid)!.push(d);
                  } else if (d.status === "PAID") {
                    if (!paidDuesMap.has(sid)) paidDuesMap.set(sid, []);
                    paidDuesMap.get(sid)!.push(d);
                  }
                }

                const filteredDefaulters = students.filter((s) => {
                  const unpaidDues = unpaidDuesMap.get(s.id) || [];
                  if (unpaidDues.length === 0) return false;
                  const matchesSearch = !defaulterSearch.trim() ||
                    s.name.toLowerCase().includes(defaulterSearch.toLowerCase()) ||
                    s.parentName.toLowerCase().includes(defaulterSearch.toLowerCase());
                  const sClassVal = `${s.class}-${s.section}`;
                  const matchesClass = defaulterClass === "All" || sClassVal === defaulterClass;
                  return matchesSearch && matchesClass;
                });

                const totalOutstanding = filteredDefaulters.reduce((sum, s) => {
                  const unpaidDues = unpaidDuesMap.get(s.id) || [];
                  return sum + unpaidDues.reduce((a, d) => a + d.amount, 0);
                }, 0);

                // If a student's statement is opened, render the detailed page view
                if (expandedStudentId) {
                  const std = filteredDefaulters.find((s) => s.id === expandedStudentId) || students.find((s) => s.id === expandedStudentId);
                  if (std) {
                    const allDues    = studentDuesMap.get(std.id) || [];
                    const unpaidDues = unpaidDuesMap.get(std.id) || [];
                    const paidDues   = paidDuesMap.get(std.id) || [];
                    const totalFee   = allDues.reduce((s, d) => s + d.amount, 0);
                    const totalPaid  = paidDues.reduce((s, d) => s + d.amount, 0);
                    const totalDue   = unpaidDues.reduce((s, d) => s + d.amount, 0);

                    return (
                      <div className="space-y-5 animate-fade-in bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                        {/* Back navigation */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <button
                            onClick={() => setExpandedStudentId(null)}
                            className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group"
                          >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dues Report
                          </button>
                          <span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1 rounded-full">
                            Outstanding Dues: ₹{totalDue.toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Student Profile Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border border-slate-100/80 rounded-2xl p-5">
                          <div className="flex items-center gap-4">
                            {std.photoUrl ? (
                              <img src={std.photoUrl} alt={std.name} className="h-16 w-16 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0" />
                            ) : (
                              <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xl uppercase shadow-inner shrink-0">
                                {std.name.substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Student Profile</span>
                              <h4 className="text-lg font-black text-slate-900 mt-0.5 tracking-tight uppercase">{std.name}</h4>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-400" /> ADM: {std.admissionNo}</span>
                                <span className="text-slate-300">&bull;</span>
                                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-slate-400" /> Class: {std.class} - {std.section}</span>
                                {std.rollNo && (
                                  <>
                                    <span className="text-slate-300">&bull;</span>
                                    <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5 text-slate-400" /> Roll: {std.rollNo}</span>
                                  </>
                                )}
                                {std.familyCode && (
                                  <>
                                    <span className="text-slate-300">&bull;</span>
                                    <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5 text-slate-400" /> Fam Code: {std.familyCode}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="md:border-l md:border-slate-200/80 md:pl-6 space-y-1.5 shrink-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                              <span className="text-slate-400 flex items-center justify-center"><UserCheck className="h-4 w-4" /></span>
                              <span>{std.fatherName || std.parentName}</span>
                            </div>
                            { (std.fatherMobile || std.parentPhone) && (
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <span className="text-slate-400 flex items-center justify-center"><Phone className="h-4 w-4" /></span>
                                <span>{std.fatherMobile || std.parentPhone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Financial Overview Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Total Fees Allocated</span>
                              <span className="text-base font-black text-slate-800 mt-0.5 block">₹{totalFee.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                              <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest block">Total Fees Paid</span>
                              <span className="text-base font-black text-emerald-600 mt-0.5 block">₹{totalPaid.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                            <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                              <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest block">Total Outstanding Dues</span>
                              <span className="text-base font-black text-rose-600 mt-0.5 block">₹{totalDue.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Statement Title & Table */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mt-2">
                          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex justify-between items-center">
                            <h5 className="text-xs font-black uppercase text-slate-700 tracking-wider">Fee Transaction Ledger / Statement</h5>
                            <span className="text-[10px] font-bold text-slate-400">{allDues.length} entries</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                                  <th className="py-3 px-5">Due Date</th>
                                  <th className="py-3 px-5">Fee Details</th>
                                  <th className="py-3 px-5 text-right">Amount</th>
                                  <th className="py-3 px-5 text-right text-amber-600">Concession</th>
                                  <th className="py-3 px-5 text-right text-emerald-600">Paid</th>
                                  <th className="py-3 px-5 text-right text-rose-600">Due</th>
                                  <th className="py-3 px-5 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                {allDues.map((d) => (
                                  <tr key={d.id} className={`${d.status === "UNPAID" ? "bg-rose-50/10" : ""} hover:bg-slate-50/40 transition-colors`}>
                                    <td className="py-3 px-5 text-slate-400 font-bold whitespace-nowrap">{d.dueDate || "—"}</td>
                                    <td className="py-3 px-5 font-bold text-slate-800">{d.name}</td>
                                    <td className="py-3 px-5 text-right text-slate-700">₹{d.amount.toLocaleString("en-IN")}</td>
                                    <td className="py-3 px-5 text-right text-amber-500 font-bold">₹0.00</td>
                                    <td className="py-3 px-5 text-right text-emerald-600 font-black">
                                      {d.status === "PAID" ? `₹${d.amount.toLocaleString("en-IN")}` : "₹0.00"}
                                    </td>
                                    <td className="py-3 px-5 text-right text-rose-600 font-black">
                                      {d.status === "UNPAID" ? `₹${d.amount.toLocaleString("en-IN")}` : "₹0.00"}
                                    </td>
                                    <td className="py-3 px-5 text-center">
                                      <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                        d.status === "PAID"
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                          : "bg-rose-50 border-rose-200 text-rose-700"
                                      }`}>
                                        {d.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-black">
                                  <td colSpan={2} className="py-3.5 px-5 text-right text-slate-500 uppercase tracking-wider">Grand Total</td>
                                  <td className="py-3.5 px-5 text-right text-slate-800">₹{totalFee.toLocaleString("en-IN")}</td>
                                  <td className="py-3.5 px-5 text-right text-amber-500">₹0.00</td>
                                  <td className="py-3.5 px-5 text-right text-emerald-600">₹{totalPaid.toLocaleString("en-IN")}</td>
                                  <td className="py-3.5 px-5 text-right text-rose-600">₹{totalDue.toLocaleString("en-IN")}</td>
                                  <td className="py-3.5 px-5"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap">
                            <button
                              onClick={() => window.print()}
                              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                              <Printer className="h-4 w-4 text-slate-500" /> Print Statement
                            </button>
                            <button
                              onClick={() => handleSendSMS(std.name, std.parentName, totalDue)}
                              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                              <Send className="h-4 w-4 text-emerald-600" /> Send Reminder
                            </button>
                            <button
                              onClick={() => alert("Exporting statement...")}
                              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                              <Download className="h-4 w-4 text-slate-500" /> Export CSV
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }

                const ITEMS_PER_PAGE = 12;
                const totalPages = Math.ceil(filteredDefaulters.length / ITEMS_PER_PAGE) || 1;
                const activePage = Math.min(defaulterPage, totalPages);
                const paginatedDefaulters = filteredDefaulters.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

                return (
                  <div className="space-y-4">
                    {/* Top Stats Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "Total Students", value: students.length, color: "text-slate-800" },
                        { label: "With Outstanding Due", value: filteredDefaulters.length, color: "text-rose-600" },
                        { label: "Fully Cleared", value: students.length - filteredDefaulters.length, color: "text-emerald-600" },
                        { label: "Total Outstanding", value: `₹${totalOutstanding.toLocaleString("en-IN")}`, color: "text-rose-700" },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-white border border-slate-200/70 rounded-xl px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">{stat.label}</span>
                          <span className={`text-base font-black mt-0.5 block ${stat.color}`}>{stat.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Student Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {paginatedDefaulters.map((std) => {
                        const allDues    = studentDuesMap.get(std.id) || [];
                        const unpaidDues = unpaidDuesMap.get(std.id) || [];
                        const paidDues   = paidDuesMap.get(std.id) || [];
                        const totalFee   = allDues.reduce((s, d) => s + d.amount, 0);
                        const totalPaid  = paidDues.reduce((s, d) => s + d.amount, 0);
                        const totalDue   = unpaidDues.reduce((s, d) => s + d.amount, 0);

                        return (
                          <div
                            key={std.id}
                            onClick={() => setExpandedStudentId(std.id)}
                            className="bg-white rounded-2xl border transition-all duration-200 overflow-hidden border-slate-200 hover:border-indigo-400 hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer group flex flex-col justify-between"
                          >
                            {/* Card Body */}
                            <div className="px-4 pt-4 pb-3">
                              {/* Name + DUE badge */}
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3">
                                  {std.photoUrl ? (
                                    <img src={std.photoUrl} alt={std.name} className="h-9 w-9 rounded-xl object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-750 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                                      {std.name.substring(0, 2)}
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                                      {std.name}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-bold flex-wrap">
                                      <span className="flex items-center gap-0.5"><Users className="h-3 w-3 text-slate-400" /> ADM: {std.admissionNo}</span>
                                      <span>┬À</span>
                                      <span className="flex items-center gap-0.5"><FileText className="h-3 w-3 text-slate-400" /> {allDues.length} fee records</span>
                                      {std.familyCode && (
                                        <>
                                          <span>┬À</span>
                                          <span className="flex items-center gap-0.5"><Home className="h-3 w-3 text-slate-400" /> {std.familyCode}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="shrink-0 text-[8px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full mt-0.5">
                                  DUE
                                </span>
                              </div>

                              {/* Class / Roll No boxes */}
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">Class</span>
                                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{std.class} - {std.section}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">Roll No.</span>
                                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{std.rollNo || "—"}</span>
                                </div>
                              </div>

                              {/* Parent Info */}
                              <div className="space-y-1 mb-3">
                                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{std.fatherName || std.parentName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{std.fatherMobile || std.parentPhone}</span>
                                </div>
                              </div>

                              {/* Financial Strip */}
                              <div className="grid grid-cols-3 border border-slate-100 rounded-xl overflow-hidden">
                                <div className="px-3 py-2.5 text-center border-r border-slate-100">
                                  <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest block">Total Fee</span>
                                  <span className="text-[11px] font-black text-slate-800 mt-0.5 block">₹{totalFee.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="px-3 py-2.5 text-center border-r border-slate-100">
                                  <span className="text-[7px] font-black uppercase text-emerald-500 tracking-widest block">Paid</span>
                                  <span className="text-[11px] font-black text-emerald-600 mt-0.5 block">₹{totalPaid.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="px-3 py-2.5 text-center">
                                  <span className="text-[7px] font-black uppercase text-rose-500 tracking-widest block">Due</span>
                                  <span className="text-[11px] font-black text-rose-600 mt-0.5 block">₹{totalDue.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                            </div>

                            {/* View Full Statement CTA */}
                            <div className="w-full flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/20 group-hover:bg-indigo-50/30 transition-colors">
                              <span className="text-[10px] font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                                View Full Statement
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 text-indigo-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 mt-4 text-xs font-bold text-slate-500 select-none">
                        <button
                          disabled={activePage === 1}
                          onClick={() => { setDefaulterPage(activePage - 1); setExpandedStudentId(null); }}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                        >
                          Previous
                        </button>
                        <span>
                          Page {activePage} of {totalPages}
                        </span>
                        <button
                          disabled={activePage === totalPages}
                          onClick={() => { setDefaulterPage(activePage + 1); setExpandedStudentId(null); }}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

             {/* Printable Invoice Receipt Modal */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl w-full p-6 shadow-2xl relative space-y-4 transition-all ${
            receiptPageSize === "A5" ? "max-w-md" : "max-w-2xl"
          }`}>
            
            {/* Page Size Selector */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-bold text-slate-500 gap-2 shrink-0">
              <span>Print Page Layout:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setReceiptPageSize("A5")}
                  className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                    receiptPageSize === "A5"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-650"
                  }`}
                >
                  ­ƒôä A5 Compact
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPageSize("A4")}
                  className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                    receiptPageSize === "A4"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-650"
                  }`}
                >
                  ­ƒôä A4 Standard
                </button>
              </div>
            </div>

            {/* Print Styling Override */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible;
                }
                #receipt-print-area {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                  box-sizing: border-box;
                  padding: ${receiptPageSize === "A5" ? "8mm" : "15mm"} !important;
                  margin: 0 !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                }
                @page {
                  size: ${receiptPageSize === "A5" ? "A5 portrait" : "A4 portrait"};
                  margin: 0;
                }
              }
            `}} />
            
            <div
              id="receipt-print-area"
              className={`border-2 rounded-2xl bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all ${
                receiptPageSize === "A5"
                  ? "border-slate-200 p-4 space-y-3 text-[9px]"
                  : "border-slate-300 p-8 space-y-6 text-sm"
              } ${
                (() => {
                  const text = (activeReceipt.details || activeReceipt.remarks || "").toLowerCase();
                  const months = ["april", "may", "june", "july", "august", "september", "october", "november", "december", "january", "february", "march"];
                  let isAnnual = text.includes("full year") || text.includes("annual") || text.includes("1 year") || text.includes("12 months");
                  if (activeReceipt.items) {
                    const itemTexts = activeReceipt.items.map((i: any) => (i.name || i.description || "").toLowerCase()).join(" ");
                    const matches = months.filter(m => itemTexts.includes(m) || text.includes(m));
                    if (matches.length >= 10) isAnnual = true;
                  }
                  return isAnnual ? "border-amber-400 bg-amber-50/10 shadow-md shadow-amber-500/5" : "";
                })()
              }`}
            >
              {/* Annual Clearance Banner */}
              {(() => {
                const text = (activeReceipt.details || activeReceipt.remarks || "").toLowerCase();
                const months = ["april", "may", "june", "july", "august", "september", "october", "november", "december", "january", "february", "march"];
                let isAnnual = text.includes("full year") || text.includes("annual") || text.includes("1 year") || text.includes("12 months");
                if (activeReceipt.items) {
                  const itemTexts = activeReceipt.items.map((i: any) => (i.name || i.description || "").toLowerCase()).join(" ");
                  const matches = months.filter(m => itemTexts.includes(m) || text.includes(m));
                  if (matches.length >= 10) isAnnual = true;
                }
                return isAnnual ? (
                  <div className={`bg-amber-500/10 border border-amber-300 text-amber-700 font-black uppercase py-1 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 select-none ${
                    receiptPageSize === "A5" ? "text-[10px]" : "text-sm py-2"
                  }`}>
                    ­ƒÅå Ôÿà FULL YEAR ANNUAL CLEARANCE VOUCHER Ôÿà ­ƒÅå
                  </div>
                ) : null;
              })()}

              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="School Logo" className={`rounded-full object-contain border border-slate-100 bg-white ${
                    receiptPageSize === "A5" ? "h-8 w-8" : "h-12 w-12"
                  }`} />
                  <div className="space-y-0.5">
                    <h4 className={`font-black text-indigo-700 uppercase tracking-tight leading-tight ${
                      receiptPageSize === "A5" ? "text-sm" : "text-xl"
                    }`}>{schoolInfo.name}</h4>
                    <p className={`text-slate-500 font-semibold leading-tight ${
                      receiptPageSize === "A5" ? "text-[8px] max-w-[280px]" : "text-xs max-w-[450px]"
                    }`}>{schoolInfo.address}</p>
                    <p className={`text-slate-400 font-bold ${
                      receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                    }`}>Phone: {schoolInfo.phone} | Email: {schoolInfo.email}</p>
                  </div>
                </div>
                <div className="text-right space-y-0.5 shrink-0">
                  <span className={`bg-indigo-50 border border-indigo-100 text-indigo-700 font-black uppercase rounded-md tracking-wider ${
                    receiptPageSize === "A5" ? "text-[8px] px-2 py-0.5" : "text-xs px-3.5 py-1"
                  }`}>
                    Official Fee Receipt
                  </span>
                  <p className={`text-slate-500 font-bold mt-1 ${
                    receiptPageSize === "A5" ? "text-[9px]" : "text-xs"
                  }`}>No: <span className="font-extrabold text-slate-900">{activeReceipt.receiptNo}</span></p>
                  <p className={`text-slate-400 font-bold ${
                    receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                  }`}>Date: <span className="font-extrabold text-slate-850">{activeReceipt.createdAt}</span></p>
                </div>
              </div>

              {/* Student Metadata Card */}
              <div className={`grid grid-cols-2 bg-slate-50/70 border border-slate-100/80 rounded-xl gap-x-4 ${
                receiptPageSize === "A5" ? "text-[9px] p-2.5 gap-y-1.5" : "text-xs p-4 gap-y-2.5"
              }`}>
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-bold">Student Name:</p>
                  <p className={`font-extrabold text-slate-900 truncate leading-tight ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>{activeReceipt.studentName}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-slate-400 font-bold">Class / Section:</p>
                  <p className={`font-extrabold text-slate-900 truncate leading-tight ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>{activeReceipt.classSection}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-bold">Admission / Family ID:</p>
                  <p className={`font-extrabold text-slate-900 leading-tight ${
                    receiptPageSize === "A5" ? "" : "text-sm"
                  }`}>{activeReceipt.admissionNo || activeReceipt.admissionId || "Multi-Child / Family"}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-slate-400 font-bold">Payment Method:</p>
                  <p className={`font-extrabold text-slate-900 uppercase leading-tight ${
                    receiptPageSize === "A5" ? "" : "text-sm"
                  }`}>{activeReceipt.method} Counter</p>
                </div>
              </div>
              {(() => {
                const groupedItems = getGroupedReceiptItems(activeReceipt.items || []);
                const hasDiscounts = groupedItems.some((i: any) => i.discount > 0);
                
                return (
                  <div className="space-y-1.5">
                    <p className={`font-black uppercase text-slate-400 tracking-wider ${
                      receiptPageSize === "A5" ? "text-[8px]" : "text-[10px]"
                    }`}>Receipt Breakdown</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 ${
                            receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                          }`}>
                            <th className={receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}>Description</th>
                            {hasDiscounts && (
                              <th className={`text-right ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>Discount</th>
                            )}
                            <th className={`text-right ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>Paid Amount</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y divide-slate-100 font-semibold text-slate-700 ${
                          receiptPageSize === "A5" ? "text-[9px]" : "text-xs"
                        }`}>
                          {groupedItems.length > 0 ? (
                            groupedItems.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/20">
                                <td className={`max-w-[200px] truncate ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>{item.name || item.description}</td>
                                {hasDiscounts && (
                                  <td className={`text-right text-indigo-650 font-bold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                    {item.discount > 0 ? `₹${item.discount}` : "-"}
                                  </td>
                                )}
                                <td className={`text-right text-slate-900 font-extrabold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                  ₹{item.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))
                          ) : (
                            // Fallback parsing if items array is empty
                            <tr>
                              <td className={`max-w-[200px] truncate ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>{activeReceipt.details}</td>
                              <td className={`text-right text-slate-900 font-extrabold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                  ₹{activeReceipt.amount.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Financial Summary Box */}
              <div className="flex justify-end pt-0.5">
                <div className={`font-bold text-slate-500 bg-slate-50/40 border border-slate-100 rounded-xl ${
                  receiptPageSize === "A5" ? "w-56 p-2.5 space-y-1 text-[9px]" : "w-80 p-4 space-y-2 text-xs"
                }`}>
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="text-slate-800">₹{activeReceipt.amount.toLocaleString("en-IN")}</span>
                  </div>
                  {activeReceipt.discount > 0 && (
                    <div className="flex justify-between items-center text-indigo-600">
                      <span>Discount:</span>
                      <span className="font-extrabold">₹{activeReceipt.discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {activeReceipt.arrears > 0 && (
                    <div className="flex justify-between items-center text-rose-600">
                      <span>Remaining Arrears:</span>
                      <span className="font-extrabold">₹{activeReceipt.arrears.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className={`border-t border-slate-200 pt-1.5 flex justify-between items-center text-emerald-700 font-black ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>
                    <span>Total Paid:</span>
                    <span>₹{activeReceipt.amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Computer generated text */}
              <div className="flex justify-between items-end pt-3">
                <div className={`text-slate-400 leading-tight italic ${
                  receiptPageSize === "A5" ? "text-[7px] max-w-[200px]" : "text-[10px] max-w-[320px]"
                }`}>
                  * Note: This is an officially verified computer-generated fee receipt. No physical signature is required.
                </div>
                <div className="text-center w-28 shrink-0">
                  <div className="h-6 w-full flex items-center justify-center">
                    <span className={`font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded rotate-[-2deg] ${
                      receiptPageSize === "A5" ? "text-[7px]" : "text-[10px]"
                    }`}>
                      SYSTEM VERIFIED
                    </span>
                  </div>
                  <p className={`text-slate-400 font-bold border-t border-slate-200 pt-0.5 mt-0.5 ${
                    receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                  }`}>
                    Authorized Cashier
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Voucher
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setActiveReceipt(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                Dismiss Receipt
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 2. Edit Profile Modal */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto text-left">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Edit Student: {selectedStudent.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Update details and save to system database</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedStudent(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await editStudentDetails(selectedStudent.id, {
                  name: editName,
                  dob: editDob,
                  aadhaar: editAadhaar,
                  disability: editDisability,
                  fatherName: editFatherName,
                  motherName: editMotherName,
                  fatherMobile: editFatherMobile,
                  motherMobile: editMotherMobile,
                  fatherAadhaar: editFatherAadhaar,
                  address: editAddress,
                  parentEmail: editParentEmail,
                  category: editCategory,
                  religion: editReligion,
                  motherTongue: editMotherTongue,
                  nationality: editNationality,
                  parentOccupation: editParentOccupation,
                  familyIncome: editFamilyIncome,
                  emergencyName: editEmergencyName,
                  emergencyPhone: editEmergencyPhone,
                  motherAadhaar: editMotherAadhaar,
                  transportMode: editTransportMode,
                  busRoute: editBusRoute,
                  busStop: editBusStop,
                  isRte: editIsRte,
                });
                setShowEditModal(false);
                setSelectedStudent(null);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth (YYYY-MM-DD)</label>
                  <input
                    type="text"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Aadhaar Number</label>
                  <input
                    type="text"
                    value={editAadhaar}
                    onChange={(e) => setEditAadhaar(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Disability Status</label>
                  <select
                    value={editDisability}
                    onChange={(e) => setEditDisability(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Parent Details</h5>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Father's Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFatherName}
                    onChange={(e) => setEditFatherName(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother's Full Name</label>
                  <input
                    type="text"
                    value={editMotherName}
                    onChange={(e) => setEditMotherName(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Father's Mobile Phone</label>
                  <input
                    type="text"
                    required
                    value={editFatherMobile}
                    onChange={(e) => setEditFatherMobile(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother's Mobile Phone</label>
                  <input
                    type="text"
                    value={editMotherMobile}
                    onChange={(e) => setEditMotherMobile(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Father's Aadhaar Number</label>
                  <input
                    type="text"
                    value={editFatherAadhaar}
                    onChange={(e) => setEditFatherAadhaar(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mother's Aadhaar Number</label>
                  <input
                    type="text"
                    value={editMotherAadhaar}
                    onChange={(e) => setEditMotherAadhaar(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address</label>
                  <input
                    type="text"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent Email</label>
                  <input
                    type="email"
                    value={editParentEmail}
                    onChange={(e) => setEditParentEmail(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent Occupation</label>
                  <input
                    type="text"
                    value={editParentOccupation}
                    onChange={(e) => setEditParentOccupation(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>

                <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Other Parameters</h5>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Religion</label>
                  <input
                    type="text"
                    value={editReligion}
                    onChange={(e) => setEditReligion(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Emergency Name</label>
                  <input
                    type="text"
                    value={editEmergencyName}
                    onChange={(e) => setEditEmergencyName(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={editEmergencyPhone}
                    onChange={(e) => setEditEmergencyPhone(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Transport Mode</label>
                  <select
                    value={editTransportMode}
                    onChange={(e) => setEditTransportMode(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  >
                    <option value="Self">Self</option>
                    <option value="Bus">Bus</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">RTE Student? (100% Waiver)</label>
                  <select
                    value={editIsRte ? "Yes" : "No"}
                    onChange={(e) => setEditIsRte(e.target.value === "Yes")}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  >
                    <option value="No">No (Standard Billing)</option>
                    <option value="Yes">Yes (RTE 100% Fee Waiver)</option>
                  </select>
                </div>
                {editTransportMode === "Bus" && (
                  <>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bus Route</label>
                      <input
                        type="text"
                        value={editBusRoute}
                        onChange={(e) => setEditBusRoute(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bus Stop</label>
                      <input
                        type="text"
                        value={editBusStop}
                        onChange={(e) => setEditBusStop(e.target.value)}
                        className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
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
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Promote Student Modal */}
      {showPromoteModal && selectedStudent && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-left animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Promote Student</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Move pupil to next Academic Class/Section</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedStudent(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
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
                  {["KG", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"].map((clsName) => (
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

      {/* 4. Bulk Promote Students Modal */}
      {showBulkPromoteModal && selectedStudentIds.length > 0 && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-left animate-fade-in">
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
                  {["KG", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"].map((clsName) => (
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

      {/* 5. Custom Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-45 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-left animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Reset User Password</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Set a new access password for {resetUserName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setResetUserId("");
                  setResetUserName("");
                  setResetNewPassword("");
                  setResetConfirmPassword("");
                  setResetModalError("");
                  setResetModalSuccess("");
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {resetModalError && (
              <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-100 text-[10px] font-bold">
                ÔÜá´©Å {resetModalError}
              </div>
            )}

            {resetModalSuccess && (
              <div className="bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-100 text-[10px] font-bold">
                Ô£ô {resetModalSuccess}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setResetModalError("");
                setResetModalSuccess("");

                if (resetNewPassword !== resetConfirmPassword) {
                  setResetModalError("Passwords do not match!");
                  return;
                }
                if (resetNewPassword.length < 6) {
                  setResetModalError("Password must be at least 6 characters long.");
                  return;
                }

                const res = await resetUserPassword(resetUserId, resetNewPassword);
                if (res.success) {
                  setResetModalSuccess("Password has been changed successfully.");
                  setResetNewPassword("");
                  setResetConfirmPassword("");
                  setTimeout(() => {
                    setShowPasswordResetModal(false);
                    setResetUserId("");
                    setResetUserName("");
                    setResetModalSuccess("");
                  }, 1500);
                } else {
                  setResetModalError(res.error || "Failed to reset password.");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setResetUserId("");
                    setResetUserName("");
                    setResetNewPassword("");
                    setResetConfirmPassword("");
                    setResetModalError("");
                    setResetModalSuccess("");
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer text-center"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Register New Staff Account Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-45 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-left animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Register Staff Account</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Create credential login profiles for Teachers, Accountants, or Admins.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddStaffModal(false);
                  setNewStaffName("");
                  setNewStaffUsername("");
                  setNewStaffEmail("");
                  setNewStaffRole("TEACHER");
                  setNewStaffPassword("");
                  setNewStaffPhone("");
                  setNewStaffEmployeeId("");
                  setAddStaffError("");
                  setAddStaffSuccess("");
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {addStaffError && (
              <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-100 text-[10px] font-bold">
                ÔÜá´©Å {addStaffError}
              </div>
            )}

            {addStaffSuccess && (
              <div className="bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-100 text-[10px] font-bold">
                Ô£ô {addStaffSuccess}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAddStaffError("");
                setAddStaffSuccess("");

                if (newStaffPassword.length < 6) {
                  setAddStaffError("Password must be at least 6 characters.");
                  return;
                }

                const res = await registerNewStaff({
                  name: newStaffName,
                  username: newStaffUsername,
                  email: newStaffEmail,
                  role: newStaffRole,
                  password: newStaffPassword,
                  phone: newStaffPhone,
                  employeeId: newStaffEmployeeId || undefined
                });

                if (res.success) {
                  setAddStaffSuccess("Staff account registered successfully!");
                  setTimeout(() => {
                    setShowAddStaffModal(false);
                    setNewStaffName("");
                    setNewStaffUsername("");
                    setNewStaffEmail("");
                    setNewStaffRole("TEACHER");
                    setNewStaffPassword("");
                    setNewStaffPhone("");
                    setNewStaffEmployeeId("");
                    setAddStaffSuccess("");
                  }, 1500);
                } else {
                  setAddStaffError(res.error || "Failed to register staff account.");
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">System Role *</label>
                  <select
                    required
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Employee/ID Code</label>
                  <input
                    type="text"
                    value={newStaffEmployeeId}
                    onChange={(e) => setNewStaffEmployeeId(e.target.value)}
                    placeholder="e.g. TCH-9021"
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Username (Login ID) *</label>
                <input
                  type="text"
                  required
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  placeholder="e.g. rahul_teacher"
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="rahul@school.com"
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="Mobile number"
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStaffModal(false);
                    setNewStaffName("");
                    setNewStaffUsername("");
                    setNewStaffEmail("");
                    setNewStaffRole("TEACHER");
                    setNewStaffPassword("");
                    setNewStaffPhone("");
                    setNewStaffEmployeeId("");
                    setAddStaffError("");
                    setAddStaffSuccess("");
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer text-center"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Print ID Cards Overlay */}
      {isPrintingIdCards && (
        <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto flex flex-col p-6 print:p-0 print:bg-white">
          {/* Controls Bar - Hidden in printing */}
          <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-lg w-full max-w-5xl mx-auto mb-6 print:hidden">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">ID Card Print Layout</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Ready to print. Click Print to open browser settings, or back to adjust selection.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPrintingIdCards(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm text-slate-700"
              >
                Back to Grid
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Open Print Menu
              </button>
            </div>
          </div>

          {/* ID Cards Layout Canvas */}
          <div className="flex-1 w-full max-w-5xl mx-auto bg-slate-100/50 p-8 rounded-3xl border border-slate-200 shadow-inner overflow-y-auto print:p-0 print:bg-white print:border-none print:shadow-none">
            <div id="idcards-print-area" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center items-center print:grid-cols-3 print:gap-4 print:p-0">
              {students
                .filter((s) => selectedIdCardStudentIds.includes(s.id))
                .map((std) => (
                  <div
                    key={std.id}
                    className="w-[54mm] h-[86mm] bg-white border border-slate-200 rounded-[16px] shadow-[0_4px_20px_rgba(99,102,241,0.06)] relative overflow-hidden flex flex-col justify-between p-3.5 select-none print:shadow-none print:border-slate-300 shrink-0 mx-auto"
                    style={{ pageBreakInside: "avoid" }}
                  >
                    {/* Top Accent Gradient Bar */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
                    
                    {/* Watermark Logo Background */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                      <img src="/logo.png" alt="" className="w-16 h-16 object-contain" />
                    </div>

                    {/* Header School Banner */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 relative z-10">
                      <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-8 w-8 object-contain shrink-0 bg-indigo-50/50 p-0.5 rounded-full border border-indigo-100/50" />
                      <div className="text-left min-w-0 flex-1">
                        <h4 className="text-[9.5px] font-black text-indigo-950 uppercase tracking-tight truncate leading-none font-sans">
                          St. G.N.G. School
                        </h4>
                        <p className="text-[5px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-0.5">
                          Varanasi &bull; CBSE Affiliated
                        </p>
                      </div>
                    </div>

                    {/* Middle Section (Photo & Name) */}
                    <div className="flex flex-col items-center mt-2.5 shrink-0 relative z-10">
                      <div className="h-[25mm] w-[24mm] rounded-[10px] border-[1.5px] border-indigo-100 shadow-md flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {std.photoUrl ? (
                          <img src={std.photoUrl} alt={std.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-indigo-300 font-black text-[12px] uppercase">
                            {std.name.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/80 text-[4.5px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase mt-2 leading-none">
                        STUDENT ID
                      </span>
                      
                      <h5 className="text-[9.5px] font-black text-slate-800 uppercase mt-2 tracking-tight text-center leading-tight truncate w-full font-sans">
                        {std.name}
                      </h5>
                    </div>

                    {/* Details Grid inside a neat card */}
                    <div className="px-2 py-1.5 bg-slate-50/80 border border-slate-100 rounded-xl mt-2 flex-1 flex flex-col justify-center relative z-10 space-y-1">
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Class-Sec</span>
                        <span className="text-slate-800 font-black">{std.class}-{std.section}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Roll Number</span>
                        <span className="text-slate-800 font-black">{std.rollNo || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Admission No</span>
                        <span className="text-slate-800 font-black">{std.admissionNo}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Father's Name</span>
                        <span className="text-slate-800 font-black uppercase truncate max-w-[28mm]">{std.fatherName || std.parentName || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Contact No</span>
                        <span className="text-slate-800 font-black">{std.fatherMobile || std.parentPhone || "N/A"}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between gap-1 mt-2 shrink-0 relative z-10">
                      {/* Barcode lines */}
                      <div className="flex items-center gap-[1.5px] h-3 select-none opacity-85 shrink-0">
                        {[1, 2, 1, 3, 1, 2, 1, 4, 1, 2, 1, 3, 2, 1].map((w, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-900 inline-block h-[12px]"
                            style={{ width: `${w}px` }}
                          />
                        ))}
                      </div>
                      
                      <div className="text-center select-none shrink-0 pr-1">
                        <span className="font-mono text-[6.5px] font-black text-indigo-600 block italic leading-none" style={{ transform: "rotate(-3deg)" }}>
                          S.K. Sen
                        </span>
                        <span className="text-[4.5px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5 leading-none">
                          Principal
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Print Styling Override */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #idcards-print-area, #idcards-print-area * {
                visibility: visible;
              }
              #idcards-print-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: white !important;
                box-sizing: border-box;
                padding: 10mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 15px !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `}} />
        </div>
      )}
    </div>
  );
}
