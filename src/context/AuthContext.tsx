"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "ADMIN" | "ACCOUNTANT" | "TEACHER" | "PARENT";
export type UserStatus = "ACTIVE" | "BLOCKED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MockUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: UserStatus;
  email?: string;
  phone?: string;
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
  marks?: any[];
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
}

export interface MockAttendance {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
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
  target: string;
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
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  createdAt: string;
  items: { name: string; amount: number }[];
  studentName?: string;
  classSection?: string;
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

interface AuthContextType {
  user: MockUser | null;
  activeRole: Role;
  usersList: MockUser[];
  schoolInfo: MockSchoolInfo;
  students: MockStudent[];
  dueItems: MockDueItem[];
  attendances: MockAttendance[];
  homeworks: MockHomework[];
  leaveRequests: MockLeaveRequest[];
  notices: MockNotice[];
  ledgerEntries: MockLedgerEntry[];
  receipts: MockReceipt[];
  feeHeads: { name: string; frequency: string }[];
  feeStructures: { name: string; frequency: string; total: number; className: string; items?: { headName: string; amount: number }[] }[];
  classes: { id: string; name: string; section: string }[];
  auditLogs: MockAuditLog[];
  switchRole: (role: Role) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateAdminProfile: (userId: string, data: { name: string; username: string; email: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  registerNewStaff: (data: any) => Promise<{ success: boolean; error?: string }>;
  updateSchoolInfo: (info: MockSchoolInfo) => Promise<void>;
  markAttendance: (studentId: string, date: string, status: AttendanceStatus) => Promise<void>;
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
  addNotice: (title: string, content: string, target: string) => Promise<void>;
  recordItemizedPayment: (
    studentId: string | null,
    items: { ledgerEntryId: string; payAmount: number; discountAmount: number }[],
    paymentMethod: string,
    transactionRef?: string,
    parentProfileId?: string
  ) => Promise<boolean>;
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
    },
    initialDues?: { name: string; amount: number }[]
  ) => Promise<void>;
  bulkImportStudents: (studentsList: any[]) => Promise<boolean>;
  addFeeHead: (name: string, frequency?: string) => Promise<void>;
  removeFeeHead: (name: string) => Promise<void>;
  addFeeStructure: (name: string, frequency: string, total: number, className?: string, items?: { headName: string; amount: number }[]) => Promise<void>;
  addClass: (name: string, section: string) => Promise<void>;
  removeClass: (id: string) => Promise<void>;
  generateBills: (academicYear: string) => Promise<{ success: boolean; totalGenerated: number; totalSkipped: number; message: string } | null>;
  triggerAudit: (action: string) => Promise<void>;
  updateStudentStatus: (studentId: string | string[], status: string) => Promise<void>;
  promoteStudent: (studentId: string | string[], classVal: string, section: string) => Promise<void>;
  editStudentDetails: (studentId: string, studentData: any) => Promise<void>;
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
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRole] = useState<Role>("PARENT");
  const [user, setUser] = useState<MockUser | null>(null);
  const [usersList, setUsersList] = useState<MockUser[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (activeRole === "PARENT") setActiveTab("dashboard");
    if (activeRole === "TEACHER") setActiveTab("attendance");
    if (activeRole === "ACCOUNTANT") setActiveTab("collect");
    if (activeRole === "ADMIN") setActiveTab("dashboard");
  }, [activeRole]);

  // Database states
  const [schoolInfo, setSchoolInfo] = useState<MockSchoolInfo>({
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
  const [students, setStudents] = useState<MockStudent[]>([]);
  const [dueItems, setDueItems] = useState<MockDueItem[]>([]);
  const [attendances, setAttendances] = useState<MockAttendance[]>([]);
  const [homeworks, setHomeworks] = useState<MockHomework[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<MockLeaveRequest[]>([]);
  const [notices, setNotices] = useState<MockNotice[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<MockLedgerEntry[]>([]);
  const [receipts, setReceipts] = useState<MockReceipt[]>([]);
  const [feeHeads, setFeeHeads] = useState<{ name: string; frequency: string }[]>([]);
  const [feeStructures, setFeeStructures] = useState<{ name: string; frequency: string; total: number; className: string; items?: { headName: string; amount: number }[] }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([]);
  const [auditLogs, setAuditLogs] = useState<MockAuditLog[]>([]);
  const [eventsList, setEventsList] = useState<MockCalendarEvent[]>([]);
  const [transportStops, setTransportStops] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [concessions, setConcessions] = useState<{ id: string; name: string; percentage: number; feeHeadName: string }[]>([]);

  // Load user session and database records on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setActiveRole(data.user.role);
        }
      } catch (err) {
        console.error("Session load failed:", err);
      }
    };

    initSession();
  }, []);

  // Fetch live database records scoped by user role & needs
  const refreshData = async () => {
    try {
      const isStaff = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";

      // Fire core requests in parallel for fast initial load
      const corePromises: Promise<Response>[] = [
        fetch("/api/school"),
        fetch("/api/students"),
        fetch("/api/attendance"),
        fetch("/api/homework"),
        fetch("/api/leave"),
        fetch("/api/notice"),
        fetch("/api/billing"),
        fetch("/api/fee-config"),
        fetch("/api/classes"),
        fetch("/api/events"),
        fetch("/api/transport"),
        fetch("/api/concessions"),
      ];

      // Only fetch staff administrative records if user is staff
      if (isStaff) {
        corePromises.push(fetch("/api/users"));
        corePromises.push(fetch("/api/audits"));
      }

      const results = await Promise.all(corePromises);
      const [
        schoolRes,
        studentsRes,
        attendanceRes,
        homeworkRes,
        leaveRes,
        noticeRes,
        billingRes,
        feeRes,
        classRes,
        eventsRes,
        transportRes,
        concessionsRes,
        usersRes,
        auditRes,
      ] = results;

      if (schoolRes?.ok) setSchoolInfo(await schoolRes.json());
      if (studentsRes?.ok) setStudents(await studentsRes.json());
      if (attendanceRes?.ok) setAttendances(await attendanceRes.json());
      if (homeworkRes?.ok) setHomeworks(await homeworkRes.json());
      if (leaveRes?.ok) setLeaveRequests(await leaveRes.json());
      if (noticeRes?.ok) setNotices(await noticeRes.json());
      if (eventsRes?.ok) setEventsList(await eventsRes.json());
      if (billingRes?.ok) {
        const billingData = await billingRes.json();
        setLedgerEntries(billingData.ledgerEntries || []);
        setReceipts(billingData.receipts || []);
        setDueItems(billingData.dueItems || []);
      }
      if (feeRes?.ok) {
        const feeData = await feeRes.json();
        setFeeHeads(feeData.feeHeads || []);
        setFeeStructures(feeData.feeStructures || []);
      }
      if (classRes?.ok) setClasses(await classRes.json());
      if (transportRes?.ok) {
        const transData = await transportRes.json();
        setTransportStops(transData.map((d: any) => ({ ...d, amount: d.amount / 100 })));
      }
      if (concessionsRes?.ok) setConcessions(await concessionsRes.json());
      if (usersRes?.ok) setUsersList(await usersRes.json());
      if (auditRes?.ok) setAuditLogs(await auditRes.json());
    } catch (err) {
      console.error("Data refresh failed:", err);
    }
  };

  // Targeted refresh — only fee config (fast, avoids full reload)
  const refreshFeeConfig = async () => {
    try {
      const feeRes = await fetch("/api/fee-config");
      if (feeRes.ok) {
        const feeData = await feeRes.json();
        setFeeHeads(feeData.feeHeads);
        setFeeStructures(feeData.feeStructures);
      }
    } catch (err) {
      console.error("Fee config refresh failed:", err);
    }
  };

  // Targeted refresh — only classes list (fast, avoids full reload)
  const refreshClasses = async () => {
    try {
      const classRes = await fetch("/api/classes");
      if (classRes.ok) setClasses(await classRes.json());
    } catch (err) {
      console.error("Classes refresh failed:", err);
    }
  };

  const refreshTransportStops = async () => {
    try {
      const res = await fetch("/api/transport");
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
      const res = await fetch("/api/concessions");
      if (res.ok) {
        setConcessions(await res.json());
      }
    } catch (err) {
      console.error("Concessions refresh failed:", err);
    }
  };

  const addConcession = async (name: string, percentage: number, feeHeadName: string) => {
    try {
      const res = await fetch("/api/concessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, percentage, feeHeadName }),
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

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  // Action methods calling Next.js API routes

  const login = async (usernameVal: string, passwordVal: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameVal, password: passwordVal }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Invalid username/phone or password." };
      }

      setUser(data.user);
      setActiveRole(data.user.role);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Login failed. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.href = "/login";
    }
  };

  const switchRole = async (role: Role) => {
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setActiveRole(role);
        window.location.reload();
      }
    } catch (err) {
      console.error("Switch role failed:", err);
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
        await refreshData();
      }
    } catch (err) {
      console.error("Toggle user status failed:", err);
    }
  };

  const resetUserPassword = async (userId: string, newPassword: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "RESET_PASSWORD", newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshData();
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
        await refreshData();
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
        await refreshData();
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
        await refreshData();
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
      const currentRes = await fetch("/api/school");
      const currentConfig = await currentRes.json();
      const mergedConfig = { ...currentConfig, ...info };

      const res = await fetch("/api/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedConfig),
      });

      if (res.ok) {
        await refreshData();
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
        await refreshData();
      }
    } catch (err) {
      console.error("Mark attendance failed:", err);
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
        await refreshData();
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
        await refreshData();
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
        await refreshData();
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
        await refreshData();
      }
    } catch (err) {
      console.error("Update leave status failed:", err);
    }
  };

  const addNotice = async (title: string, content: string, target: string) => {
    try {
      const res = await fetch("/api/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, target }),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error("Add notice failed:", err);
    }
  };

  const recordItemizedPayment = async (
    studentId: string | null,
    items: { ledgerEntryId: string; payAmount: number; discountAmount: number }[],
    paymentMethod: string,
    transactionRef?: string,
    parentProfileId?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, parentProfileId, items, paymentMethod, transactionRef }),
      });

      if (res.ok) {
        // Run refreshData in background without blocking receipt modal generation
        refreshData().catch((err) => console.error("Background refresh error:", err));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Record checkout payment failed:", err);
      return false;
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
  ) => {
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...studentData,
          initialDues,
        }),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error("Add student failed:", err);
    }
  };

  const bulkImportStudents = async (
    studentsList: any[]
  ) => {
    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: studentsList }),
      });

      if (res.ok) {
        await refreshData();
      }
      return res.ok;
    } catch (err) {
      console.error("Bulk import students failed:", err);
      return false;
    }
  };

  const addFeeHead = async (name: string, frequency?: string) => {
    try {
      const res = await fetch("/api/fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_HEAD", name, frequency: frequency || "monthly" }),
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
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_HEAD", name }),
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
        body: JSON.stringify({ action: "ADD_STRUCTURE", name, frequency, total, className: className || "All", items: items || [] }),
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
        // Refresh billing data after generation
        const billingRes = await fetch("/api/billing");
        if (billingRes.ok) {
          const billingData = await billingRes.json();
          setLedgerEntries(billingData.ledgerEntries);
          setReceipts(billingData.receipts);
          setDueItems(billingData.dueItems);
        }
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
        await refreshData();
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
        await refreshData();
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
        await refreshData();
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
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error("Edit student details failed:", err);
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
        await refreshData();
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
        await refreshData();
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
        addHomework,
        deleteHomework,
        applyLeave,
        updateLeaveStatus,
        addNotice,
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
