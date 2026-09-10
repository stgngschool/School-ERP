"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuthLogic } from "../hooks/useAuthLogic";

export type Role = "ADMIN" | "ACCOUNTANT" | "TEACHER" | "PARENT";
type UserStatus = "ACTIVE" | "BLOCKED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AuthStage =
  | "APP STARTED"
  // ── AC-07: Renamed from the vestigial Supabase stage — app uses JWT/cookie auth, not Supabase auth.
  | "AUTH GATEWAY READY"
  | "CHECKING SESSION"
  | "SESSION FOUND"
  | "AUTH USER LOADED"
  | "PROFILE LOADED"
  | "ADMIN LOADED"
  | "STUDENTS FETCH START"
  | "STUDENTS FETCH COMPLETE"
  | "DASHBOARD READY";

export interface MockUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: UserStatus;
  email?: string;
  phone?: string;
  teacherProfile?: {
    id: string;
    employeeId: string;
    classes: { id: string; name: string; section: string }[];
  } | null;
}

export interface MockStudent {
  id: string;
  name: string;
  admissionNo: string;
  rollNo: string;
  class: string;
  section: string;
  parentName: string;
  parentPhone: string;
  dob?: string;
  aadhaar?: string;
  disability?: string;
  fatherName?: string;
  motherName?: string;
  fatherMobile?: string;
  motherMobile?: string;
  fatherAadhaar?: string;
  parentEmail?: string;
  address?: string;
  category?: string;
  religion?: string;
  motherTongue?: string;
  nationality?: string;
  admissionDate?: string;
  boardRegNo?: string;
  prevSchoolName?: string;
  prevClassPassed?: string;
  tcNumber?: string;
  parentOccupation?: string;
  familyIncome?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  motherAadhaar?: string;
  transportMode?: string;
  busRoute?: string;
  busStop?: string;
  familyCode?: string;
  isRte?: boolean;
  concessionId?: string;
  concession?: {
    id: string;
    name: string;
    percentage: number;
    feeHeadName: string;
  } | null;
  photoUrl?: string;
  isMarksheetClaimed?: boolean;
  gender?: string;
}

export interface MockDueItem {
  id: string;
  studentId: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "PAID" | "UNPAID";
  originalAmount?: number;
  totalPaid?: number;
  totalDiscount?: number;
  fine?: number;
  isCurrentSession?: boolean;
  sessionName?: string;
}

export interface MockAttendance {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  // ── AT-04: Server-provided concurrency token. Sent back as expectedUpdatedAt on save.
  updatedAt?: string;
}

export interface MockHomework {
  id: string;
  classSection: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  fileUrl?: string | null;
}

export interface MockLeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  classSection: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  fileUrl?: string | null;
  remarks?: string;
}

export interface MockNotice {
  id: string;
  title: string;
  content: string;
  category?: string;
  target: string;
  isUrgent?: boolean;
  isActive?: boolean;
  fileUrl?: string | null;
  createdAt: string;
}

export interface MockLedgerEntry {
  id: string;
  studentId: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  createdById?: string;
}

export interface MockReceipt {
  id: string;
  studentId: string;
  receiptNo: string;
  manualReceiptNo?: string | null;
  amount: number;
  subtotal?: number;
  discount?: number;
  arrears?: number;
  otherArrears?: number;
  amountInWords?: string;
  paymentMethod: string;
  transactionRef: string;
  createdAt: string;
  items: {
    name: string;
    amount: number;
    originalAmount?: number;
    discount?: number;
    balance?: number;
  }[];
  studentName?: string;
  classSection?: string;
  admissionNo?: string;
  fatherName?: string;
  details?: string;
  method?: string;
  studentIds?: string[];
  collectedBy?: string;
  collectedByRole?: string;
  createdById?: string;
}

export interface MockSchoolInfo {
  name: string;
  address: string;
  phone: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  schoolTimings?: string;
  admissionSession?: string;
  admissionStatus?: string;
  admissionClasses?: string;
  marqueeText?: string;
  googleMapsUrl?: string;
  youtubeUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  email: string;
  udiseCode?: string;
  upiId?: string;
  upiMerchantName?: string;
  enableTransport?: boolean;
  enableLateFee?: boolean;
  lateFeeGraceDays?: number;
  lateFeeAmount?: number;
  lateFeeType?: string;
  exams?: string[];
  examConfig?: any;
  enablePublicResults?: boolean;
  allowedPublicExams?: string[];
  adminNotes?: string[];
  googleSpreadsheetId?: string;
  googleFolderId?: string;
  [key: string]: any;
}

export interface MockAuditLog {
  id: string;
  userName: string;
  role: string;
  action: string;
  createdAt: string;
}

export interface MockCalendarEvent {
  id: string;
  title: string;
  day: number;
  month: number;
  year: number;
  weekday: string;
  ticketsSold?: string | null;
  pct?: string | null;
  createdAt: string;
}

export interface MockAdmissionApplication {
  id: string;
  applicationNo: string;
  studentName: string;
  classApplied: string;
  gender?: string | null;
  dob?: string | null;
  aadhaar?: string | null;
  category?: string | null;
  religion?: string | null;
  motherTongue?: string | null;
  nationality?: string | null;
  disability?: string | null;
  bloodGroup?: string | null;
  photoUrl?: string | null;
  fatherName: string;
  fatherMobile: string;
  fatherOccupation?: string | null;
  fatherAadhaar?: string | null;
  motherName?: string | null;
  motherMobile?: string | null;
  motherOccupation?: string | null;
  motherAadhaar?: string | null;
  parentEmail?: string | null;
  address: string;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  familyIncome?: string | null;
  prevSchoolName?: string | null;
  prevClassPassed?: string | null;
  tcNumber?: string | null;
  transportRequired?: boolean;
  busStop?: string | null;
  isRte?: boolean;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | string;
  rejectionReason?: string | null;
  adminRemarks?: string | null;
  assignedSection?: string | null;
  enrolledStudentId?: string | null;
  enrolledStudent?: {
    id: string;
    admissionNumber: string;
    rollNumber?: string | null;
    class?: { name: string; section: string };
    parentProfile?: { familyCode: string };
  } | null;
  reviewedBy?: {
    id: string;
    name: string;
    username: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: MockUser | null;
  activeRole: Role | null;
  authLoading: boolean;
  usersList: MockUser[];
  schoolInfo: MockSchoolInfo;
  students: MockStudent[];
  dueItems: MockDueItem[];
  attendances: MockAttendance[];
  homeworks: MockHomework[];
  leaveRequests: MockLeaveRequest[];
  notices: MockNotice[];
  admissionApplications: MockAdmissionApplication[];
  ledgerEntries: MockLedgerEntry[];
  receipts: MockReceipt[];
  feeHeads: { name: string; frequency: string }[];
  feeStructures: { name: string; frequency: string; total: number; className: string; items?: { headName: string; amount: number }[] }[];
  classes: { id: string; name: string; section: string }[];
  auditLogs: MockAuditLog[];
  studentsLoaded: boolean;
  billingLoaded: boolean;
  attendanceLoaded: boolean;
  switchRole: (role: Role) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string, currentPassword?: string, adminPassword?: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateAdminProfile: (userId: string, data: { name: string; username: string; email: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  registerNewStaff: (data: any) => Promise<{ success: boolean; error?: string }>;
  updateSchoolInfo: (info: Partial<MockSchoolInfo>) => Promise<void>;
  markAttendance: (studentId: string, date: string, status: AttendanceStatus) => Promise<void>;
  markBatchAttendance: (records: { studentId: string; date: string; status: AttendanceStatus; expectedUpdatedAt?: string }[]) => Promise<void>;
  addHomework: (
    classSection: string,
    subject: string,
    title: string,
    description: string,
    dueDate: string,
    file?: File | null
  ) => Promise<void>;
  deleteHomework: (id: string) => Promise<void>;
  applyLeave: (
    studentId: string,
    startDate: string,
    endDate: string,
    reason: string,
    file?: File | null
  ) => Promise<void>;
  updateLeaveStatus: (id: string, status: LeaveStatus, remarks: string) => Promise<void>;
  addNotice: (
    title: string,
    content: string,
    target: string,
    category?: string,
    isUrgent?: boolean,
    fileUrl?: string
  ) => Promise<void>;
  updateNotice: (
    id: string,
    data: {
      title?: string;
      content?: string;
      target?: string;
      category?: string;
      isUrgent?: boolean;
      isActive?: boolean;
      fileUrl?: string | null;
    }
  ) => Promise<boolean>;
  deleteNotice: (id: string) => Promise<boolean>;
  recordItemizedPayment: (
    studentId: string | null,
    items: { ledgerEntryId: string; payAmount: number; discountAmount: number }[],
    paymentMethod: string,
    transactionRef?: string,
    parentProfileId?: string,
    manualReceiptNo?: string
  ) => Promise<{ success: boolean; receipt?: any; error?: string }>;
  addStudent: (
    studentData: {
      name: string;
      classVal: string;
      section: string;
      dob: string;
      aadhaar: string;
      disability: string;
      fatherName: string;
      motherName: string;
      fatherMobile: string;
      motherMobile: string;
      fatherAadhaar: string;
      address: string;
      parentEmail: string;
      category: string;
      religion: string;
      motherTongue: string;
      nationality: string;
      admissionDate: string;
      boardRegNo: string;
      prevSchoolName: string;
      prevClassPassed: string;
      tcNumber: string;
      parentOccupation: string;
      familyIncome: string;
      emergencyName: string;
      emergencyPhone: string;
      motherAadhaar: string;
      transportMode: string;
      busRoute: string;
      busStop: string;
      familyCode?: string;
      isRte?: boolean;
    },
    initialDues?: { name: string; amount: number }[]
  ) => Promise<{ success: boolean; student?: any; error?: string }>;
  bulkImportStudents: (
    studentsList: any[],
    onProgress?: (processed: number, total: number, currentBatch: number, totalBatches: number) => void
  ) => Promise<{ success: boolean; totalImported: number; error?: string }>;
  addFeeHead: (name: string, frequency?: string) => Promise<void>;
  removeFeeHead: (name: string) => Promise<void>;
  addFeeStructure: (name: string, frequency: string, total: number, className?: string, items?: { headName: string; amount: number }[]) => Promise<void>;
  addClass: (name: string, section: string) => Promise<void>;
  removeClass: (id: string) => Promise<void>;
  generateBills: (academicYear: string) => Promise<{ success: boolean; totalGenerated: number; totalSkipped: number; message: string } | null>;
  triggerAudit: (action: string) => Promise<void>;
  updateStudentStatus: (studentId: string | string[], status: string) => Promise<void>;
  promoteStudent: (studentId: string | string[], classVal: string, section: string) => Promise<void>;
  editStudentDetails: (studentId: string, studentData: any) => Promise<{ success: boolean; error?: string; student?: any }>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  eventsList: MockCalendarEvent[];
  addEvent: (title: string, day: number, weekday: string) => Promise<void>;
  cloneFeeStructure: (fromClassName: string, toClassName: string) => Promise<boolean>;
  transportStops: { id: string; name: string; amount: number }[];
  addTransportStop: (name: string, amount: number) => Promise<void>;
  removeTransportStop: (id: string) => Promise<void>;
  refreshTransportStops: () => Promise<void>;
  concessions: { id: string; name: string; percentage: number; feeHeadName: string }[];
  addConcession: (name: string, percentage: number, feeHeadName: string) => Promise<void>;
  removeConcession: (id: string) => Promise<void>;
  refreshConcessions: () => Promise<void>;
  login: (username: string, password: string, portal?: "STAFF" | "PARENT") => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshBilling: () => Promise<void>;
  fetchBillingSummary: () => Promise<any>;
  refreshAttendance: () => Promise<void>;
  refreshHomework: () => Promise<void>;
  refreshLeave: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshNotices: () => Promise<void>;
  refreshAdmissionApplications: () => Promise<void>;
  createAdmissionApplication: (data: any) => Promise<{ success: boolean; applicationNo?: string; error?: string }>;
  updateAdmissionApplication: (id: string, data: any) => Promise<boolean>;
  approveAdmissionApplication: (id: string, approvalData?: any) => Promise<{ success: boolean; message?: string; student?: any; error?: string }>;
  rejectAdmissionApplication: (id: string, reason: string) => Promise<boolean>;
  deleteAdmissionApplication: (id: string) => Promise<boolean>;
  refreshSchool: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshAudits: () => Promise<void>;
  currentStage: AuthStage;
  stageError: string | null;
  retryInitSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authLogic = useAuthLogic(async (targetUser) => {
    if (typeof refreshData !== "undefined") {
      await refreshData(targetUser);
    }
  });
  const {
    user,
    setUser,
    activeRole,
    setActiveRole,
    authLoading,
    currentStage,
    setCurrentStage,
    stageError,
    initSession,
    login,
    logout,
    switchRole
  } = authLogic;

  const [usersList, setUsersList] = useState<MockUser[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (activeRole === "PARENT") setActiveTab("dashboard");
    if (activeRole === "TEACHER") setActiveTab("attendance");
    if (activeRole === "ACCOUNTANT") setActiveTab("dashboard");
    if (activeRole === "ADMIN") setActiveTab("dashboard");
  }, [activeRole]);

  // Client-side instant SWR storage helpers
  const getLocalCache = <T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return (parsed?.data !== undefined ? parsed.data : parsed) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const setLocalCache = (key: string, data: any) => {
    if (typeof window === "undefined" || data === undefined || data === null) return;
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      try {
        localStorage.removeItem("gng_cached_attendances");
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
      } catch {}
    }
  };

  // Database states with instant local cache hydration (0ms UI paint)
  const [schoolInfo, setSchoolInfo] = useState<MockSchoolInfo>(() =>
    getLocalCache("gng_cached_schoolInfo", {
      name: "Loading School Profile...",
      address: "",
      phone: "",
      email: "",
      upiId: "",
      upiMerchantName: "",
      enableTransport: true,
      enableLateFee: true,
      lateFeeGraceDays: 10,
      lateFeeAmount: 50,
      lateFeeType: "FLAT",
      exams: ["Unit-1", "Half Yearly", "Unit-2", "Annual"],
      examConfig: {
        "Unit-1": {
          isSplit: true,
          maxMarks: 20,
          components: [
            { name: "Note Book", max: 5 },
            { name: "Sub. Enrich.", max: 5 },
            { name: "Pr. Act.", max: 10 }
          ]
        },
        "Unit-2": {
          isSplit: true,
          maxMarks: 20,
          components: [
            { name: "Note Book", max: 5 },
            { name: "Sub. Enrich.", max: 5 },
            { name: "Pr. Act.", max: 10 }
          ]
        },
        "Half Yearly": {
          isSplit: false,
          maxMarks: 80
        },
        "Annual": {
          isSplit: false,
          maxMarks: 80
        }
      },
    })
  );
  const [students, setStudents] = useState<MockStudent[]>(() =>
    getLocalCache("gng_cached_students", [])
  );
  const [dueItems, setDueItems] = useState<MockDueItem[]>(() =>
    getLocalCache("gng_cached_dueItems", [])
  );
  const [attendances, setAttendances] = useState<MockAttendance[]>(() =>
    getLocalCache("gng_cached_attendances", [])
  );
  const [homeworks, setHomeworks] = useState<MockHomework[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<MockLeaveRequest[]>([]);
  const [notices, setNotices] = useState<MockNotice[]>(() =>
    getLocalCache("gng_cached_notices", [])
  );
  const [admissionApplications, setAdmissionApplications] = useState<MockAdmissionApplication[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<MockLedgerEntry[]>(() =>
    getLocalCache("gng_cached_ledgerEntries", [])
  );
  const [receipts, setReceipts] = useState<MockReceipt[]>(() =>
    getLocalCache("gng_cached_receipts", [])
  );
  const [feeHeads, setFeeHeads] = useState<{ name: string; frequency: string }[]>(() =>
    getLocalCache("gng_cached_feeHeads", [])
  );
  const [feeStructures, setFeeStructures] = useState<{ name: string; frequency: string; total: number; className: string; items?: { headName: string; amount: number }[] }[]>(() =>
    getLocalCache("gng_cached_feeStructures", [])
  );
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>(() =>
    getLocalCache("gng_cached_classes", [])
  );
  const [auditLogs, setAuditLogs] = useState<MockAuditLog[]>([]);
  const [eventsList, setEventsList] = useState<MockCalendarEvent[]>([]);
  const [transportStops, setTransportStops] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [concessions, setConcessions] = useState<{ id: string; name: string; percentage: number; feeHeadName: string }[]>([]);

  const [studentsLoaded, setStudentsLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const cached = localStorage.getItem("gng_cached_students");
      return !!cached && (JSON.parse(cached)?.data?.length > 0 || JSON.parse(cached)?.length > 0);
    } catch {
      return false;
    }
  });
  const [billingLoaded, setBillingLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const cached = localStorage.getItem("gng_cached_dueItems");
      return !!cached && (JSON.parse(cached)?.data?.length > 0 || JSON.parse(cached)?.length > 0);
    } catch {
      return false;
    }
  });
  const [attendanceLoaded, setAttendanceLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const cached = localStorage.getItem("gng_cached_attendances");
      return !!cached && (JSON.parse(cached)?.data?.length > 0 || JSON.parse(cached)?.length > 0);
    } catch {
      return false;
    }
  });

  const clearApiCache = (urlPrefix?: string) => {
    if (typeof window === 'undefined') return;
    if (!urlPrefix) {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('__api_cache_')) sessionStorage.removeItem(key);
      });
      return;
    }
    const targetKey = '__api_cache_' + urlPrefix;
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(targetKey)) sessionStorage.removeItem(key);
    });
  };

  const apiFetch = async (
    url: string,
    options: RequestInit = {},
    timeoutMs = 15000,
    useCache = false,
    retries = 1
  ): Promise<any> => {
    // ── AC-02: Helper to determine whether a response payload has meaningful
    //    data worth caching. For plain arrays: must be non-empty. For objects
    //    whose values are arrays (e.g. billing: { ledgerEntries, receipts, dueItems }):
    //    at least one array value must be non-empty — an object consisting
    //    entirely of empty arrays is not meaningful cached state and must not
    //    be returned to callers instead of a fresh fetch after a mutation.
    const hasSubstantiveData = (d: any): boolean => {
      if (!d) return false;
      if (Array.isArray(d)) return d.length > 0;
      if (typeof d === 'object') {
        const vals = Object.values(d);
        // If every value is an empty array, treat as empty
        const allEmptyArrays = vals.length > 0 && vals.every((v) => Array.isArray(v) && v.length === 0);
        if (allEmptyArrays) return false;
        return vals.length > 0;
      }
      return !!d;
    };

    // 1. Check Session Cache (never serve empty-array state if cached accidentally)
    if (useCache && typeof window !== 'undefined') {
      const cacheKey = '__api_cache_' + url;
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          if (hasSubstantiveData(cached.data) && Date.now() - cached.timestamp < 1000 * 60 * 5) {
            return cached.data;
          }
          // Stale or empty-only cache — remove it so next call fetches fresh
          sessionStorage.removeItem(cacheKey);
        } catch (e) {}
      }
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          ...options,
          credentials: "include",
          cache: options.cache ?? "no-store",
          signal: controller.signal,
        });
        clearTimeout(tid);

        if (!res.ok) {
          console.warn(`[apiFetch] ${url} returned ${res.status} on attempt ${attempt + 1}/${retries + 1}`);
          if (attempt < retries) continue;
          return null;
        }

        const data = await res.json();

        // 2. Only cache substantive non-empty payloads (AC-02)
        if (useCache && typeof window !== 'undefined' && data) {
          if (hasSubstantiveData(data)) {
            try {
              sessionStorage.setItem(
                '__api_cache_' + url,
                JSON.stringify({ data, timestamp: Date.now() })
              );
            } catch (e) {}
          }
        }

        return data;
      } catch (err: any) {
        clearTimeout(tid);
        console.warn(`[apiFetch] ${url} failed on attempt ${attempt + 1}/${retries + 1}:`, err.message);
        if (attempt < retries) continue;
        return null;
      }
    }
    return null;
  };


  // ── AC-06: Keep a ref to the latest user so refreshData can be defined with []
  // dependency (stable across renders) without creating stale closures.
  const userRef = useRef<MockUser | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Fetch live database records scoped by user role & needs in controlled stages
  const refreshData = useCallback(async (targetUser?: MockUser | null) => {
    // Use explicit targetUser if provided; otherwise fall back to the ref (avoids stale closure)
    const userToFetch = targetUser !== undefined ? targetUser : userRef.current;
    if (!userToFetch) {
      setSchoolInfo({
        name: "Loading School Profile...",
        address: "",
        phone: "",
        email: "",
        upiId: "",
        upiMerchantName: "",
        enableTransport: true,
        enableLateFee: true,
        lateFeeGraceDays: 10,
        lateFeeAmount: 50,
        lateFeeType: "FLAT",
        exams: [],
        examConfig: {},
      });
      setDueItems([]);
      setAttendances([]);
      setHomeworks([]);
      setLeaveRequests([]);
      setNotices([]);
      setLedgerEntries([]);
      setReceipts([]);
      setStudents([]);
      setFeeHeads([]);
      setFeeStructures([]);
      setClasses([]);
      setAuditLogs([]);
      setEventsList([]);
      setTransportStops([]);
      setConcessions([]);
      setStudentsLoaded(false);
      setBillingLoaded(false);
      setAttendanceLoaded(false);
      return;
    }

    try {
      setCurrentStage("STUDENTS FETCH START");
      const isStaff = userToFetch.role === "ADMIN" || userToFetch.role === "ACCOUNTANT";
      const role = userToFetch.role;

      // ─── Parallel Core Data Hydration (Instant & Progressive) ───
      // 1. Metadata (Instant cached responses)
      const schoolLoad = apiFetch("/api/school", {}, 10000, true).then((data) => {
        if (data) {
          setSchoolInfo(data);
          setLocalCache("gng_cached_schoolInfo", data);
        }
      });
      const classesLoad = apiFetch("/api/classes", {}, 10000, true).then((data) => {
        if (data) {
          setClasses(data);
          setLocalCache("gng_cached_classes", data);
        }
      });
      const feeConfigLoad = apiFetch("/api/fee-config", {}, 10000, true).then((feeData) => {
        if (feeData) {
          setFeeHeads(feeData.feeHeads || []);
          setFeeStructures(feeData.feeStructures || []);
          setLocalCache("gng_cached_feeHeads", feeData.feeHeads || []);
          setLocalCache("gng_cached_feeStructures", feeData.feeStructures || []);
        }
      });
      const noticesLoad = apiFetch("/api/notice", {}, 10000, false).then((data) => {
        if (Array.isArray(data)) {
          setNotices(data);
          setLocalCache("gng_cached_notices", data);
        }
      });

      const transportLoad = isStaff
        ? apiFetch("/api/transport", {}, 10000, true).then((transData) => {
            if (transData) setTransportStops(transData.map((d: any) => ({ ...d, amount: d.amount / 100 })));
          })
        : Promise.resolve();

      const concessionsLoad = isStaff
        ? apiFetch("/api/concessions", {}, 10000, true).then((data) => data && setConcessions(data))
        : Promise.resolve();

      // 2. Core Dashboard Metrics (Students + Billing + Attendance)
      const studentsLoad = apiFetch("/api/students", {}, 15000, true).then((data) => {
        if (data && Array.isArray(data)) {
          setStudents(data);
          setStudentsLoaded(true);
          setLocalCache("gng_cached_students", data);
        }
      });

      const billingLoad = apiFetch("/api/billing", {}, 15000, true).then((data) => {
        if (data) {
          setLedgerEntries(data.ledgerEntries || []);
          setReceipts(data.receipts || []);
          setDueItems(data.dueItems || []);
          setBillingLoaded(true);
          setLocalCache("gng_cached_dueItems", data.dueItems || []);
          setLocalCache("gng_cached_receipts", data.receipts || []);
          setLocalCache("gng_cached_ledgerEntries", data.ledgerEntries || []);
        }
      });

      const attendanceLoad = apiFetch("/api/attendance", {}, 12000, true).then((data) => {
        if (data && Array.isArray(data)) {
          setAttendances(data);
          setAttendanceLoaded(true);
          setLocalCache("gng_cached_attendances", data);
        }
      });

      // ── AC-03: Await ALL required core data loads before declaring DASHBOARD READY ──
      const allCoreLoads = [
        schoolLoad,
        classesLoad,
        feeConfigLoad,
        noticesLoad,
        transportLoad,
        concessionsLoad,
        studentsLoad,
        billingLoad,
        attendanceLoad,
      ];

      await Promise.allSettled(allCoreLoads);
      setCurrentStage("DASHBOARD READY");

      // 3. Lazy Secondary Data (Deferred to not block main thread or bandwidth)
      setTimeout(() => {
        if (role === "ADMIN" || role === "ACCOUNTANT") {
          apiFetch("/api/admissions", {}, 10000, false).then(
            (data) => data?.applications && setAdmissionApplications(data.applications)
          );
          apiFetch("/api/events", {}, 10000, true).then((data) => data && setEventsList(data));
        }

        if (role === "ADMIN") {
          apiFetch("/api/users", {}, 10000, true).then((data) => data && setUsersList(data));
          apiFetch("/api/audits", {}, 10000, false).then((data) => data && setAuditLogs(data));
        }

        if (role === "TEACHER" || role === "PARENT") {
          apiFetch("/api/homework", {}, 10000, true).then((data) => data && setHomeworks(data));
          apiFetch("/api/leave", {}, 10000, true).then((data) => data && setLeaveRequests(data));
        }
      }, 1000);
    } catch (err) {
      console.error("[AuthContext] refreshData EXCEPTION:", err);
    }
  // ── AC-06: Empty dependency array — user is accessed via userRef.current (stable ref),
  // so refreshData is defined once and never recreated when user state changes.
  }, []);

  const refreshFeeConfig = async () => {
    try {
      const feeRes = await fetch("/api/fee-config", { credentials: "include", cache: "no-store" });
      if (feeRes.ok) {
        const feeData = await feeRes.json();
        setFeeHeads(feeData.feeHeads);
        setFeeStructures(feeData.feeStructures);
        setLocalCache("gng_cached_feeHeads", feeData.feeHeads || []);
        setLocalCache("gng_cached_feeStructures", feeData.feeStructures || []);
      }
    } catch (err) {
      console.error("Fee config refresh failed:", err);
    }
  };


  const refreshStudents = async () => {
    clearApiCache("/api/students");
    const data = await apiFetch("/api/students");
    if (data && Array.isArray(data)) {
      setStudents(data);
      setStudentsLoaded(true);
      setLocalCache("gng_cached_students", data);
    }
  };

  const refreshBilling = async () => {
    clearApiCache("/api/billing");
    const data = await apiFetch("/api/billing");
    if (data) {
      setLedgerEntries(data.ledgerEntries || []);
      setReceipts(data.receipts || []);
      setDueItems(data.dueItems || []);
      setBillingLoaded(true);
      setLocalCache("gng_cached_dueItems", data.dueItems || []);
      setLocalCache("gng_cached_receipts", data.receipts || []);
      setLocalCache("gng_cached_ledgerEntries", data.ledgerEntries || []);
    }
  };

  // ── P-02: Fetch lightweight server-side calculated financial aggregates
  const fetchBillingSummary = async () => {
    return await apiFetch("/api/billing/summary", {}, 10000, true);
  };

  const refreshAttendance = async () => {
    const data = await apiFetch("/api/attendance");
    if (data) {
      setAttendances(data);
      setAttendanceLoaded(true);
    }
  };

  const refreshHomework = async () => {
    const data = await apiFetch("/api/homework");
    if (data) setHomeworks(data);
  };

  const refreshLeave = async () => {
    const data = await apiFetch("/api/leave");
    if (data) setLeaveRequests(data);
  };

  const refreshEvents = async () => {
    const data = await apiFetch("/api/events");
    if (data) setEventsList(data);
  };

  const refreshNotices = async () => {
    clearApiCache("/api/notice");
    const data = await apiFetch("/api/notice", {}, 10000, false);
    if (Array.isArray(data)) {
      setNotices(data);
      setLocalCache("gng_cached_notices", data);
    }
  };

  const refreshAdmissionApplications = async () => {
    const data = await apiFetch("/api/admissions");
    if (data && data.applications) setAdmissionApplications(data.applications);
  };

  const refreshSchool = async () => {
    clearApiCache("/api/school");
    const data = await apiFetch("/api/school", { cache: "no-store" }, 10000, false);
    if (data) {
      setSchoolInfo(data);
      setLocalCache("gng_cached_schoolInfo", data);
    }
  };

  const refreshUsers = async () => {
    const data = await apiFetch("/api/users");
    if (data) setUsersList(data);
  };

  const refreshAudits = async () => {
    const data = await apiFetch("/api/audits");
    if (data) setAuditLogs(data);
  };

  // Targeted refresh — only classes list (fast, avoids full reload)
  const refreshClasses = async () => {
    try {
      const classRes = await fetch("/api/classes", { credentials: "include", cache: "no-store" });
      if (classRes.ok) setClasses(await classRes.json());
    } catch (err) {
      console.error("Classes refresh failed:", err);
    }
  };

  const refreshTransportStops = async () => {
    try {
      const res = await fetch("/api/transport", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTransportStops(data.map((d: any) => ({ ...d, amount: d.amount / 100 })));
      }
    } catch (err) {
      console.error("Transport stops refresh failed:", err);
    }
  };

  const addTransportStop = async (name: string, amount: number) => {
    try {
      const res = await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount }),
      });
      if (res.ok) {
        await refreshTransportStops();
      }
    } catch (err) {
      console.error("Add transport stop failed:", err);
    }
  };

  const removeTransportStop = async (id: string) => {
    try {
      const res = await fetch("/api/transport", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await refreshTransportStops();
      }
    } catch (err) {
      console.error("Remove transport stop failed:", err);
    }
  };

  const refreshConcessions = async () => {
    try {
      const res = await fetch("/api/concessions", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        setConcessions(await res.json());
      }
    } catch (err) {
      console.error("Concessions refresh failed:", err);
    }
  };

  const addConcession = async (name: string, percentage: number, feeHeadName: string) => {
    try {
      // ── C-02: Parse percentage as float to preserve fractional values (e.g. 12.5, 33.33).
      // The schema stores Float; parseInt would silently truncate 12.5 → 12.
      const safePct = parseFloat(String(percentage));
      const res = await fetch("/api/concessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, percentage: safePct, feeHeadName }),
      });
      if (res.ok) {
        await refreshConcessions();
      }
    } catch (err) {
      console.error("Add concession failed:", err);
    }
  };

  const removeConcession = async (id: string) => {
    try {
      const res = await fetch("/api/concessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await refreshConcessions();
      }
    } catch (err) {
      console.error("Remove concession failed:", err);
    }
  };


  const toggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        await refreshUsers();
      }
    } catch (err) {
      console.error("Toggle user status failed:", err);
    }
  };

  const resetUserPassword = async (
    userId: string,
    newPassword: string,
    currentPassword?: string,
    adminPassword?: string
  ) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "RESET_PASSWORD", newPassword, currentPassword, adminPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUsers();
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to reset password" };
    } catch (err: any) {
      console.error("Reset user password failed:", err);
      return { success: false, error: err.message || "Failed to reset password" };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUsers();
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to delete user" };
    } catch (err: any) {
      console.error("Delete user failed:", err);
      return { success: false, error: err.message || "Failed to delete user" };
    }
  };

  const updateAdminProfile = async (userId: string, profileData: { name: string; username: string; email: string; phone?: string }) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "UPDATE_PROFILE", ...profileData }),
      });
      const data = await res.json();
      if (res.ok) {
        // Update user session in memory directly to reflect sidebar/header updates instantly
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }
        await refreshUsers();
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to update profile" };
    } catch (err: any) {
      console.error("Update admin profile failed:", err);
      return { success: false, error: err.message || "Failed to update profile" };
    }
  };

  const registerNewStaff = async (staffData: any) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffData),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUsers();
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to register staff" };
    } catch (err: any) {
      console.error("Register staff failed:", err);
      return { success: false, error: err.message || "Failed to register staff" };
    }
  };

  const updateSchoolInfo = async (info: Partial<MockSchoolInfo>) => {
    try {
      // ── SCH-02: Atomic update — merge `info` with the in-context schoolInfo state
      // rather than doing a GET→merge→POST sequence that is susceptible to lost-update
      // race conditions when two concurrent saves run simultaneously.
      // The backend upserts the merged payload in a single transaction.
      const mergedConfig = { ...schoolInfo, ...info };

      // Optimistic update for 0ms instantaneous UI feedback across all website components
      setSchoolInfo(mergedConfig);
      setLocalCache("gng_cached_schoolInfo", mergedConfig);
      clearApiCache("/api/school");

      const res = await fetch("/api/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedConfig),
      });

      if (res.ok) {
        await refreshSchool();
      }
    } catch (err) {
      console.error("Update school profile failed:", err);
    }
  };

  const markAttendance = async (studentId: string, date: string, status: AttendanceStatus) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, date, status }),
      });

      if (res.ok) {
        await refreshAttendance();
      }
    } catch (err) {
      console.error("Mark attendance failed:", err);
    }
  };

  const markBatchAttendance = async (records: { studentId: string; date: string; status: AttendanceStatus; expectedUpdatedAt?: string }[]) => {
    try {
      // Optimistically update attendances state immediately
      setAttendances((prev) => {
        const next = [...prev];
        for (const rec of records) {
          const idx = next.findIndex((a) => a.studentId === rec.studentId && a.date === rec.date);
          if (idx !== -1) {
            next[idx] = { ...next[idx], status: rec.status };
          } else {
            next.unshift({
              id: "temp-" + Math.random().toString(36).substring(2, 9),
              studentId: rec.studentId,
              date: rec.date,
              status: rec.status,
            });
          }
        }
        return next;
      });

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      if (res.status === 409) {
        // ── AT-04: Conflict detected — another user saved more recently. Refresh
        // to get the latest server state, then let the UI surface the conflict.
        await refreshAttendance();
        const body = await res.json().catch(() => ({}));
        throw Object.assign(
          new Error(body.error || "Attendance conflict: please refresh and try again."),
          { isConflict: true, conflicts: body.conflicts ?? [] }
        );
      }

      if (res.ok) {
        await refreshAttendance();
      }
    } catch (err) {
      console.error("Mark batch attendance failed:", err);
      throw err; // Re-throw so AttendanceConsole can show the error message
    }
  };

  const addHomework = async (
    classSection: string,
    subject: string,
    title: string,
    description: string,
    dueDate: string,
    file?: File | null
  ) => {
    try {
      const formData = new FormData();
      formData.append("classSection", classSection);
      formData.append("subject", subject);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("dueDate", dueDate);
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/homework", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await refreshHomework();
      }
    } catch (err) {
      console.error("Add homework failed:", err);
    }
  };

  const deleteHomework = async (id: string) => {
    try {
      const res = await fetch(`/api/homework?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await refreshHomework();
      }
    } catch (err) {
      console.error("Delete homework failed:", err);
    }
  };

  const applyLeave = async (
    studentId: string,
    startDate: string,
    endDate: string,
    reason: string,
    file?: File | null
  ) => {
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("reason", reason);
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/leave", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await refreshLeave();
      }
    } catch (err) {
      console.error("Apply leave failed:", err);
    }
  };

  const updateLeaveStatus = async (id: string, status: LeaveStatus, remarks: string) => {
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, remarks }),
      });

      if (res.ok) {
        await refreshLeave();
      }
    } catch (err) {
      console.error("Update leave status failed:", err);
    }
  };

  const addNotice = async (
    title: string,
    content: string,
    target: string,
    category?: string,
    isUrgent?: boolean,
    fileUrl?: string
  ) => {
    try {
      clearApiCache("/api/notice");
      const res = await fetch("/api/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, target, category, isUrgent, fileUrl }),
      });

      if (res.ok) {
        await refreshNotices();
      }
    } catch (err) {
      console.error("Add notice failed:", err);
    }
  };

  const updateNotice = async (
    id: string,
    data: {
      title?: string;
      content?: string;
      target?: string;
      category?: string;
      isUrgent?: boolean;
      isActive?: boolean;
      fileUrl?: string | null;
    }
  ): Promise<boolean> => {
    try {
      clearApiCache("/api/notice");
      const res = await fetch("/api/notice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });

      if (res.ok) {
        await refreshNotices();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Update notice failed:", err);
      return false;
    }
  };

  const deleteNotice = async (id: string): Promise<boolean> => {
    try {
      // Optimistically remove from state & localStorage immediately
      setNotices((prev) => {
        const next = prev.filter((n) => n.id !== id);
        if (typeof window !== "undefined") {
          localStorage.setItem("gng_cached_notices", JSON.stringify({ data: next, timestamp: Date.now() }));
        }
        return next;
      });
      clearApiCache("/api/notice");

      const res = await fetch("/api/notice", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        await refreshNotices();
        return true;
      }
      await refreshNotices();
      return false;
    } catch (err) {
      console.error("Delete notice failed:", err);
      await refreshNotices();
      return false;
    }
  };

  const createAdmissionApplication = async (formData: any): Promise<{ success: boolean; applicationNo?: string; error?: string }> => {
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshAdmissionApplications();
        return { success: true, applicationNo: data.applicationNo };
      }
      return { success: false, error: data.error || "Failed to submit application" };
    } catch (err: any) {
      console.error("Create admission application failed:", err);
      return { success: false, error: err.message || "Network error" };
    }
  };

  const updateAdmissionApplication = async (id: string, data: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await refreshAdmissionApplications();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Update admission application failed:", err);
      return false;
    }
  };

  const approveAdmissionApplication = async (id: string, approvalData?: any): Promise<{ success: boolean; message?: string; student?: any; error?: string }> => {
    try {
      const res = await fetch(`/api/admissions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalData || {}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshAdmissionApplications();
        await refreshStudents();
        await refreshBilling();
        return { success: true, message: data.message, student: data.student };
      }
      return { success: false, error: data.error || "Failed to approve admission" };
    } catch (err: any) {
      console.error("Approve admission application failed:", err);
      return { success: false, error: err.message || "Network error" };
    }
  };

  const rejectAdmissionApplication = async (id: string, reason: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason: reason }),
      });
      if (res.ok) {
        await refreshAdmissionApplications();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Reject admission application failed:", err);
      return false;
    }
  };

  const deleteAdmissionApplication = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admissions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await refreshAdmissionApplications();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Delete admission application failed:", err);
      return false;
    }
  };

  const recordItemizedPayment = async (
    studentId: string | null,
    items: { ledgerEntryId: string; payAmount: number; discountAmount: number }[],
    paymentMethod: string,
    transactionRef?: string,
    parentProfileId?: string,
    manualReceiptNo?: string
  ): Promise<{ success: boolean; receipt?: any; error?: string }> => {
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, parentProfileId, items, paymentMethod, transactionRef, manualReceiptNo }),
      });

      const data = await res.json();
      if (res.ok) {
        await refreshBilling().catch((err: any) => console.error("Billing refresh error:", err));
        return { success: true, receipt: data.receipt };
      }
      return { success: false, error: data.error || "Payment checkout failed." };
    } catch (err: any) {
      console.error("Record checkout payment failed:", err);
      return { success: false, error: err.message || "Network error during checkout." };
    }
  };

  const addStudent = async (
    studentData: {
      name: string;
      classVal: string;
      section: string;
      dob: string;
      aadhaar: string;
      disability: string;
      fatherName: string;
      motherName: string;
      fatherMobile: string;
      motherMobile: string;
      fatherAadhaar: string;
      address: string;
      parentEmail: string;
      category: string;
      religion: string;
      motherTongue: string;
      nationality: string;
      admissionDate: string;
      boardRegNo: string;
      prevSchoolName: string;
      prevClassPassed: string;
      tcNumber: string;
      parentOccupation: string;
      familyIncome: string;
      emergencyName: string;
      emergencyPhone: string;
      motherAadhaar: string;
      transportMode: string;
      busRoute: string;
      busStop: string;
      familyCode?: string;
      isRte?: boolean;
    },
    initialDues?: { name: string; amount: number }[]
  ): Promise<{ success: boolean; student?: any; error?: string }> => {
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...studentData,
          initialDues,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.success || data.student)) {
        await Promise.all([refreshStudents(), refreshBilling()]);
        return { success: true, student: data.student };
      }
      return { success: false, error: data.error || "Failed to create student record." };
    } catch (err: any) {
      console.error("Add student failed:", err);
      return { success: false, error: err.message || "Network error while creating student." };
    }
  };

  const bulkImportStudents = async (
    studentsList: any[],
    onProgress?: (processed: number, total: number, currentBatch: number, totalBatches: number) => void
  ): Promise<{ success: boolean; totalImported: number; error?: string }> => {
    try {
      const BATCH_SIZE = 50;
      const total = studentsList.length;
      const totalBatches = Math.ceil(total / BATCH_SIZE);
      let totalImported = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = studentsList.slice(i, i + BATCH_SIZE);
        const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;

        const res = await fetch("/api/students/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: batch }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed at batch ${currentBatchNum}`);
        }

        totalImported += data.importedCount || batch.length;
        if (onProgress) {
          onProgress(totalImported, total, currentBatchNum, totalBatches);
        }
      }

      await Promise.all([refreshStudents(), refreshBilling()]);
      return { success: true, totalImported };
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      return { success: false, totalImported: 0, error: err.message };
    }
  };

  const addFeeHead = async (name: string, frequency = "MONTHLY") => {
    try {
      const res = await fetch("/api/fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_HEAD", name, frequency }),
      });
      if (res.ok) {
        await refreshFeeConfig();
      }
    } catch (err) {
      console.error("Add fee head failed:", err);
    }
  };

  const removeFeeHead = async (name: string) => {
    try {
      const res = await fetch("/api/fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REMOVE_HEAD", name }),
      });
      if (res.ok) {
        await refreshFeeConfig();
      }
    } catch (err) {
      console.error("Remove fee head failed:", err);
    }
  };

  const addFeeStructure = async (name: string, frequency: string, total: number, className?: string, items?: { headName: string; amount: number }[]) => {
    try {
      const res = await fetch("/api/fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_STRUCTURE", name, frequency, total, className, items }),
      });
      if (res.ok) {
        await refreshFeeConfig();
      }
    } catch (err) {
      console.error("Add fee structure failed:", err);
    }
  };

  const addClass = async (name: string, section: string) => {
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, section }),
      });
      if (res.ok) {
        await refreshClasses();
      }
    } catch (err) {
      console.error("Add class failed:", err);
    }
  };

  const removeClass = async (id: string) => {
    try {
      const res = await fetch("/api/classes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await refreshClasses();
      }
    } catch (err) {
      console.error("Remove class failed:", err);
    }
  };

  const generateBills = async (academicYear: string) => {
    try {
      const res = await fetch("/api/billing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear }),
      });
      if (res.ok) {
        const data = await res.json();
        // ── AC-05: Reuse authoritative refreshBilling() instead of duplicate fetch ──
        await refreshBilling();
        return data;
      }
      return null;
    } catch (err) {
      console.error("Generate bills failed:", err);
      return null;
    }
  };

  const triggerAudit = async (action: string) => {
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        await refreshBilling();
      }
    } catch (err) {
      console.error("Trigger audit log failed:", err);
    }
  };

  const updateStudentStatus = async (studentId: string | string[], status: string) => {
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action: "updateStatus", data: { status } }),
      });
      if (res.ok) {
        await refreshStudents();
      }
    } catch (err) {
      console.error("Update student status failed:", err);
    }
  };

  const promoteStudent = async (studentId: string | string[], classVal: string, section: string) => {
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action: "promote", data: { classVal, section } }),
      });
      if (res.ok) {
        await refreshStudents();
      }
    } catch (err) {
      console.error("Promote student failed:", err);
    }
  };

  const editStudentDetails = async (studentId: string, studentData: any) => {
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action: "updateDetails", data: studentData }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshStudents();
        return { success: true, student: data.student };
      } else {
        return { success: false, error: data.error || "Failed to update student details" };
      }
    } catch (err: any) {
      console.error("Edit student details failed:", err);
      return { success: false, error: err.message || "Network error while saving details" };
    }
  };

  const addEvent = async (title: string, day: number, weekday: string) => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, day, weekday }),
      });
      if (res.ok) {
        await refreshEvents();
      }
    } catch (err) {
      console.error("Add event failed:", err);
    }
  };

  const cloneFeeStructure = async (fromClassName: string, toClassName: string) => {
    try {
      const res = await fetch("/api/fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLONE_STRUCTURE", fromClassName, toClassName }),
      });
      if (res.ok) {
        await refreshFeeConfig();
        await refreshBilling();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Clone fee structure failed:", err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        usersList,
        schoolInfo,
        students,
        dueItems,
        attendances,
        homeworks,
        leaveRequests,
        notices,
        admissionApplications,
        ledgerEntries,
        receipts,
        feeHeads,
        feeStructures,
        classes,
        auditLogs,
        switchRole,
        toggleUserStatus,
        resetUserPassword,
        deleteUser,
        updateAdminProfile,
        registerNewStaff,
        updateSchoolInfo,
        markAttendance,
        markBatchAttendance,
        addHomework,
        deleteHomework,
        applyLeave,
        updateLeaveStatus,
        addNotice,
        updateNotice,
        deleteNotice,
        createAdmissionApplication,
        updateAdmissionApplication,
        approveAdmissionApplication,
        rejectAdmissionApplication,
        deleteAdmissionApplication,
        recordItemizedPayment,
        addStudent,
        bulkImportStudents,
        addFeeHead,
        removeFeeHead,
        addFeeStructure,
        addClass,
        removeClass,
        generateBills,
        triggerAudit,
        updateStudentStatus,
        promoteStudent,
        editStudentDetails,
        activeTab,
        setActiveTab,
        eventsList,
        addEvent,
        cloneFeeStructure,
        transportStops,
        addTransportStop,
        removeTransportStop,
        refreshTransportStops,
        concessions,
        addConcession,
        removeConcession,
        refreshConcessions,
        login,
        logout,
        refreshData,
        refreshStudents,
        refreshBilling,
        fetchBillingSummary,
        refreshAttendance,
        refreshHomework,
        refreshLeave,
        refreshEvents,
        refreshNotices,
        refreshAdmissionApplications,
        refreshSchool,
        refreshUsers,
        refreshAudits,
        authLoading,
        currentStage,
        stageError,
        retryInitSession: initSession,
        studentsLoaded,
        billingLoaded,
        attendanceLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
