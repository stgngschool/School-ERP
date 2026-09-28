"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, Globe, User, Database, Award, Megaphone, RotateCcw, 
  Phone, Mail, Clock, GraduationCap, CheckCircle, PlusCircle, CreditCard, 
  Trash2, AlertTriangle, Key, Loader2, FileSpreadsheet, TrendingUp, Lock, Unlock,
  Receipt, Sparkles
} from "lucide-react";
import { SchoolUpiAccount } from "@/context/AuthContext";

// Minimal local icon for WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

interface SchoolSetupTabProps {
  schoolInfo: any;
  updateSchoolInfo: (updates: any) => Promise<any>;
  showToast: (type: "success" | "error" | "info" | "warning", title: string, message: string) => void;
  user: any;
  updateAdminProfile?: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>;
}

export default function SchoolSetupTab({
  schoolInfo,
  updateSchoolInfo,
  showToast,
  user,
  updateAdminProfile
}: SchoolSetupTabProps) {
  // Google Cloud Integration states
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState("");
  const [googleFolderId, setGoogleFolderId] = useState("");
  const [syncingStudents, setSyncingStudents] = useState(false);
  const [syncingFeeRegister, setSyncingFeeRegister] = useState(false);
  const [syncingReceipts, setSyncingReceipts] = useState(false);
  const [syncingLedger, setSyncingLedger] = useState(false);
  const [syncingMarks, setSyncingMarks] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [serviceJsonInput, setServiceJsonInput] = useState("");
  const [savingJsonLoading, setSavingJsonLoading] = useState(false);
  const [savedClientEmail, setSavedClientEmail] = useState<string | null>(null);
  const [googleAutoSync, setGoogleAutoSync] = useState<boolean>(false);
  const [showJsonBox, setShowJsonBox] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ── M-04: Load Google integration state from PostgreSQL schoolInfo with localStorage fallback
  useEffect(() => {
    const dbSheetId = (schoolInfo as any)?.googleSpreadsheetId;
    const dbFolderId = (schoolInfo as any)?.googleFolderId;
    if ((schoolInfo as any)?.googleAutoSync !== undefined) {
      setGoogleAutoSync(!!(schoolInfo as any).googleAutoSync);
    }

    if (dbSheetId) {
      setGoogleSpreadsheetId(dbSheetId);
    } else if (typeof window !== "undefined") {
      setGoogleSpreadsheetId(localStorage.getItem("g_sheet_id") || "");
    }

    if (dbFolderId) {
      setGoogleFolderId(dbFolderId);
    } else if (typeof window !== "undefined") {
      setGoogleFolderId(localStorage.getItem("g_drive_folder_id") || "");
    }

    fetch("/api/google")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasCredentials && data.clientEmail) {
          setSavedClientEmail(data.clientEmail);
        }
      })
      .catch(() => {});
  }, [schoolInfo]);

  const handleSaveGoogleCredentials = async () => {
    if (!serviceJsonInput.trim()) {
      setGoogleStatus({ type: "error", msg: "Please paste your Google Service Account JSON text first." });
      return;
    }
    setSavingJsonLoading(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SAVE_CREDENTIALS", serviceAccountJson: serviceJsonInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save credentials.");
      setSavedClientEmail(data.clientEmail);
      setServiceJsonInput("");
      setShowJsonBox(false);
      setGoogleStatus({ type: "success", msg: `✓ Service Account credentials active for: ${data.clientEmail}` });
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Failed to save JSON credentials." });
    } finally {
      setSavingJsonLoading(false);
    }
  };

  const handleSpreadsheetIdChange = (val: string) => {
    setGoogleSpreadsheetId(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("g_sheet_id", val);
    }
    updateSchoolInfo({ googleSpreadsheetId: val });
  };

  const handleFolderIdChange = (val: string) => {
    setGoogleFolderId(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("g_drive_folder_id", val);
    }
    updateSchoolInfo({ googleFolderId: val });
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
        body: JSON.stringify({ action: "SYNC_DIRECTORY", spreadsheetId: googleSpreadsheetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({ type: "success", msg: `Successfully synced ${data.count} student master profiles to "Student Directory" tab!` });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to sync student directory." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to sync." });
    } finally {
      setSyncingStudents(false);
    }
  };

  const triggerSyncFeeRegister = async () => {
    if (!googleSpreadsheetId.trim()) {
      setGoogleStatus({ type: "error", msg: "Please enter a valid Google Spreadsheet ID first." });
      return;
    }
    setSyncingFeeRegister(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_FEE_REGISTER", spreadsheetId: googleSpreadsheetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({ type: "success", msg: `Successfully synced ${data.count} student fee records to "Student Fee Register" tab!` });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to sync student fee register." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to sync." });
    } finally {
      setSyncingFeeRegister(false);
    }
  };

  const triggerSyncReceipts = async () => {
    if (!googleSpreadsheetId.trim()) {
      setGoogleStatus({ type: "error", msg: "Please enter a valid Google Spreadsheet ID first." });
      return;
    }
    setSyncingReceipts(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_RECEIPTS", spreadsheetId: googleSpreadsheetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({ type: "success", msg: `Successfully synced ${data.count} fee receipts to "Fee Receipts Register" tab!` });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to sync fee receipts." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to sync." });
    } finally {
      setSyncingReceipts(false);
    }
  };

  const triggerSyncMarks = async () => {
    if (!googleSpreadsheetId.trim()) {
      setGoogleStatus({ type: "error", msg: "Please enter a valid Google Spreadsheet ID first." });
      return;
    }
    setSyncingMarks(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_MARKS", spreadsheetId: googleSpreadsheetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({ type: "success", msg: `Successfully synced ${data.count} student marks to "Examination Marks" tab!` });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to sync examination marks." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to sync." });
    } finally {
      setSyncingMarks(false);
    }
  };

  const triggerSyncAll = async () => {
    if (!googleSpreadsheetId.trim()) {
      setGoogleStatus({ type: "error", msg: "Please enter a valid Google Spreadsheet ID first." });
      return;
    }
    setSyncingAll(true);
    setGoogleStatus(null);
    try {
      const res = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_ALL", spreadsheetId: googleSpreadsheetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleStatus({
          type: "success",
          msg: `Complete Sync Successful! Synchronized ${data.studentsCount} Student Profiles, ${data.feeRegisterCount || data.studentsCount} Fee Records, ${data.receiptsCount} Receipts, and ${data.marksCount} Exam Marks across 4 Google Sheets tabs.`,
        });
      } else {
        setGoogleStatus({ type: "error", msg: data.error || "Failed to sync all modules." });
      }
    } catch (err: any) {
      setGoogleStatus({ type: "error", msg: err.message || "Network error. Failed to sync." });
    } finally {
      setSyncingAll(false);
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

  // School Customizer Settings Form State
  const [activeSchoolSubTab, setActiveSchoolSubTab] = useState<"profile" | "website" | "admin" | "sync" | "exams">("profile");

  // School Customizer Settings Form State
  const [schoolName, setSchoolName] = useState(schoolInfo?.name || "");
  const [schoolAddress, setSchoolAddress] = useState(schoolInfo?.address || "");
  const [schoolPhone, setSchoolPhone] = useState(schoolInfo?.phone || "");
  const [schoolAlternatePhone, setSchoolAlternatePhone] = useState(schoolInfo?.alternatePhone || "");
  const [schoolWhatsapp, setSchoolWhatsapp] = useState(schoolInfo?.whatsappNumber || "");
  const [schoolTimings, setSchoolTimings] = useState(schoolInfo?.schoolTimings || "8:00 AM - 1:30 PM (Mon - Sat)");
  const [schoolAdmissionSession, setSchoolAdmissionSession] = useState(schoolInfo?.admissionSession || "2026-2027");
  const [schoolAdmissionStatus, setSchoolAdmissionStatus] = useState(schoolInfo?.admissionStatus || "OPEN");
  const [schoolAdmissionClasses, setSchoolAdmissionClasses] = useState(schoolInfo?.admissionClasses || "Nursery to 8th");
  const [schoolMarqueeText, setSchoolMarqueeText] = useState(schoolInfo?.marqueeText || "Admissions Open for Session 2026-2027 (Nursery to Class 8th) • U.P. Govt. Recognized • UDISE: 09670707502");
  const [schoolGoogleMapsUrl, setSchoolGoogleMapsUrl] = useState(schoolInfo?.googleMapsUrl || "");
  const [schoolYoutubeUrl, setSchoolYoutubeUrl] = useState(schoolInfo?.youtubeUrl || "");
  const [schoolEmail, setSchoolEmail] = useState(schoolInfo?.email || "");
  const [schoolUdiseCode, setSchoolUdiseCode] = useState(schoolInfo?.udiseCode || "09300302001");
  const [schoolUpiId, setSchoolUpiId] = useState(schoolInfo?.upiId || "");
  const [schoolUpiMerchantName, setSchoolUpiMerchantName] = useState(schoolInfo?.upiMerchantName || "");
  const [schoolUpiAccounts, setSchoolUpiAccounts] = useState<SchoolUpiAccount[]>(() => {
    if (schoolInfo?.upiAccounts && schoolInfo?.upiAccounts.length > 0) {
      return schoolInfo.upiAccounts;
    }
    if (schoolInfo?.upiId) {
      return [{
        id: "acc-primary",
        label: "Primary School A/C",
        upiId: schoolInfo.upiId,
        merchantName: schoolInfo.upiMerchantName || schoolInfo.name || "St. GNG School",
        isDefault: true,
      }];
    }
    return [];
  });
  const [schoolSuccess, setSchoolSuccess] = useState(false);
  const [schoolExams, setSchoolExams] = useState<string[]>([]);
  const [newExamInput, setNewExamInput] = useState("");
  const [savingExams, setSavingExams] = useState(false);
  const [schoolExamConfig, setSchoolExamConfig] = useState<any>({});
  const [selectedConfigExam, setSelectedConfigExam] = useState<string>("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompMax, setNewCompMax] = useState("");
  const [schoolEnablePublicResults, setSchoolEnablePublicResults] = useState(true);
  const [schoolAllowedPublicExams, setSchoolAllowedPublicExams] = useState<string[]>(["Unit-1"]);
  const [schoolLockedExams, setSchoolLockedExams] = useState<string[]>([]);

  // Admin Profile States
  const [adminFormName, setAdminFormName] = useState(user?.name || "");
  const [adminFormUsername, setAdminFormUsername] = useState(user?.username || "");
  const [adminFormEmail, setAdminFormEmail] = useState(user?.email || "");
  const [adminFormPhone, setAdminFormPhone] = useState(user?.phone || "");
  const [adminProfileError, setAdminProfileError] = useState("");
  const [adminProfileSuccess, setAdminProfileSuccess] = useState("");

  // Sync settings form states when schoolInfo loads
  useEffect(() => {
    if (schoolInfo && schoolInfo.name !== "Loading School Profile...") {
      setSchoolName(schoolInfo.name);
      setSchoolAddress(schoolInfo.address);
      setSchoolPhone(schoolInfo.phone);
      setSchoolAlternatePhone(schoolInfo.alternatePhone || "");
      setSchoolWhatsapp(schoolInfo.whatsappNumber || "");
      setSchoolTimings(schoolInfo.schoolTimings || "8:00 AM - 1:30 PM (Mon - Sat)");
      setSchoolAdmissionSession(schoolInfo.admissionSession || "2026-2027");
      setSchoolAdmissionStatus(schoolInfo.admissionStatus || "OPEN");
      setSchoolAdmissionClasses(schoolInfo.admissionClasses || "Nursery to 8th");
      setSchoolMarqueeText(schoolInfo.marqueeText || "Admissions Open for Session 2026-2027 (Nursery to Class 8th) • U.P. Govt. Recognized • UDISE: 09670707502");
      setSchoolGoogleMapsUrl(schoolInfo.googleMapsUrl || "");
      setSchoolYoutubeUrl(schoolInfo.youtubeUrl || "");
      setSchoolEmail(schoolInfo.email);
      setSchoolUdiseCode(schoolInfo.udiseCode || "09300302001");
      setSchoolUpiId(schoolInfo.upiId || "");
      setSchoolUpiMerchantName(schoolInfo.upiMerchantName || "");
      if (schoolInfo.upiAccounts && schoolInfo.upiAccounts.length > 0) {
        setSchoolUpiAccounts(schoolInfo.upiAccounts);
      } else if (schoolInfo.upiId) {
        setSchoolUpiAccounts([{
          id: "acc-primary",
          label: "Primary School A/C",
          upiId: schoolInfo.upiId,
          merchantName: schoolInfo.upiMerchantName || schoolInfo.name || "St. GNG School",
          isDefault: true,
        }]);
      } else {
        setSchoolUpiAccounts([]);
      }
      const defaultExams = schoolInfo.exams || ["Unit-1", "Half Yearly", "Unit-2", "Annual"];
      setSchoolExams(defaultExams);
      if (defaultExams.length > 0) {
        setSelectedConfigExam(defaultExams[0]);
      }
      setSchoolExamConfig(schoolInfo.examConfig || {
        "Unit-1": { 
          "isSplit": true, 
          "maxMarks": 20,
          "components": [
            { "name": "Note Book", "max": 5 },
            { "name": "Sub. Enrich.", "max": 5 },
            { "name": "Pr. Act.", "max": 10 }
          ]
        },
        "Unit-2": { 
          "isSplit": true, 
          "maxMarks": 20,
          "components": [
            { "name": "Note Book", "max": 5 },
            { "name": "Sub. Enrich.", "max": 5 },
            { "name": "Pr. Act.", "max": 10 }
          ]
        },
        "Half Yearly": {
          "isSplit": false,
          "maxMarks": 80
        },
        "Annual": { 
          "isSplit": false, 
          "maxMarks": 80
        }
      });
      setSchoolEnablePublicResults(schoolInfo.enablePublicResults ?? true);
      setSchoolAllowedPublicExams(
        Array.isArray(schoolInfo.allowedPublicExams) && schoolInfo.allowedPublicExams.length > 0
          ? schoolInfo.allowedPublicExams
          : ["Unit-1"]
      );
      setSchoolLockedExams(
        Array.isArray(schoolInfo.lockedExams) ? schoolInfo.lockedExams : []
      );
    }
  }, [schoolInfo]);

  // Sync admin profile states when user info loads
  useEffect(() => {
    if (user) {
      setAdminFormName(user.name || "");
      setAdminFormUsername(user.username || "");
      setAdminFormEmail(user.email || "");
      setAdminFormPhone(user.phone || "");
    }
  }, [user]);

  // Multi-UPI Account Management Handlers
  const handleAddUpiAccount = () => {
    const newId = `acc-${Date.now()}`;
    const isFirst = schoolUpiAccounts.length === 0;
    setSchoolUpiAccounts([
      ...schoolUpiAccounts,
      {
        id: newId,
        label: `Secondary A/C ${schoolUpiAccounts.length + 1}`,
        upiId: "",
        merchantName: schoolName || "St. GNG School",
        isDefault: isFirst,
      },
    ]);
  };

  const handleUpdateUpiAccount = (id: string, updates: Partial<SchoolUpiAccount>) => {
    setSchoolUpiAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc))
    );
  };

  const handleDeleteUpiAccount = (id: string) => {
    setSchoolUpiAccounts((prev) => {
      const remaining = prev.filter((acc) => acc.id !== id);
      if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
  };

  const handleSetDefaultUpiAccount = (id: string) => {
    setSchoolUpiAccounts((prev) =>
      prev.map((acc) => ({
        ...acc,
        isDefault: acc.id === id,
      }))
    );
  };

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSchoolInfo({
        ...schoolInfo,
        name: schoolName,
        address: schoolAddress,
        phone: schoolPhone,
        alternatePhone: schoolAlternatePhone,
        whatsappNumber: schoolWhatsapp,
        schoolTimings: schoolTimings,
        admissionSession: schoolAdmissionSession,
        admissionStatus: schoolAdmissionStatus,
        admissionClasses: schoolAdmissionClasses,
        marqueeText: schoolMarqueeText,
        googleMapsUrl: schoolGoogleMapsUrl,
        youtubeUrl: schoolYoutubeUrl,
        email: schoolEmail,
        udiseCode: schoolUdiseCode,
        upiId: (schoolUpiAccounts.find((a) => a.isDefault) || schoolUpiAccounts[0])?.upiId || schoolUpiId,
        upiMerchantName: (schoolUpiAccounts.find((a) => a.isDefault) || schoolUpiAccounts[0])?.merchantName || schoolUpiMerchantName,
        upiAccounts: schoolUpiAccounts,
      });
      showToast("success", "Settings Saved", "School configuration and website details updated successfully.");
      setSchoolSuccess(true);
      setTimeout(() => setSchoolSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      showToast("error", "Save Failed", err?.message || "Failed to update school settings.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Settings Category Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-3 no-print">
        {[
          { id: "profile", label: "School Profile", icon: Building2, activeClass: "bg-indigo-50 border-indigo-150 text-indigo-700 shadow-2xs" },
          { id: "website", label: "Website & Admissions Info", icon: Globe, activeClass: "bg-sky-50 border-sky-150 text-sky-700 shadow-2xs" },
          { id: "admin", label: "Admin Credentials", icon: User, activeClass: "bg-emerald-50 border-emerald-150 text-emerald-700 shadow-2xs" },
          { id: "sync", label: "Google Cloud Sync", icon: Database, activeClass: "bg-amber-50 border-amber-150 text-amber-700 shadow-2xs" },
          { id: "exams", label: "Exams & Grading", icon: Award, activeClass: "bg-rose-50 border-rose-150 text-rose-700 shadow-2xs" },
        ].map((subTab) => {
          const Icon = subTab.icon;
          const isActive = activeSchoolSubTab === subTab.id;
          return (
            <button
              key={subTab.id}
              type="button"
              onClick={() => setActiveSchoolSubTab(subTab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 border rounded-2xl text-xs font-black transition-all cursor-pointer ${
                isActive ? subTab.activeClass : "bg-white border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {subTab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Panels */}
      <div className={`w-full transition-all duration-300 ${activeSchoolSubTab === "exams" ? "max-w-6xl" : "max-w-2xl"}`}>
        {activeSchoolSubTab === "website" && (
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5 animate-scale-in">
            <div>
              <h3 className="text-xs font-black uppercase text-sky-700 bg-sky-50 border border-sky-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                <Globe className="h-3.5 w-3.5" /> Website Content & Admissions Desk
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Control public website contact details, admission status, announcements, and office timings.
              </p>
            </div>

            <form onSubmit={handleUpdateSchool} className="space-y-5">
              {/* 1. Dedicated Box for Top Announcement / Notice */}
              <div className="p-4 sm:p-5 bg-amber-50/40 border border-amber-200/80 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                      <Megaphone className="w-3.5 h-3.5" />
                    </span>
                    <span>Website Top Bar Notice / Urgent Announcement (अलग बॉक्स)</span>
                  </label>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live on Header
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Yeh notice website ke sabse upar black strip (<strong>● NOTICE</strong>) mein scroll/display hota hai. Aap yahan se apna custom urgent alert ya admission notice change kar sakte hain.
                </p>

                {/* Exact Website Top Bar Live Preview */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Website Top Bar Live Preview:
                  </span>
                  <div className="bg-slate-950 text-slate-200 text-xs py-2 px-3.5 rounded-xl border border-slate-800 flex items-center gap-2.5 overflow-hidden shadow-inner">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider shrink-0 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>Notice</span>
                    </span>
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {schoolMarqueeText.trim() || (
                        <span className="text-slate-500 italic">Notice message khali hai... yahan type karein</span>
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Notice Text Content
                  </label>
                  <textarea
                    rows={3}
                    value={schoolMarqueeText}
                    onChange={(e) => setSchoolMarqueeText(e.target.value)}
                    placeholder="e.g. Admissions Open for Session 2026-2027 (Nursery to Class 8th) • U.P. Govt. Recognized • UDISE: 09670707502"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-300 rounded-xl outline-none bg-white focus:border-indigo-600 resize-none shadow-2xs leading-relaxed"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {schoolMarqueeText.length} characters
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSchoolMarqueeText(
                          "Admissions Open for Session 2026-2027 (Nursery to Class 8th) • U.P. Govt. Recognized • UDISE: 09670707502"
                        )
                      }
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset to Default Notice</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Dedicated Boxes for Number, Email, and Timings */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <span>Website Header & Top Bar Contact Details (नंबर, ईमेल और समय)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    Website ke top strip aur header par dikhne wale official phone number, email aur school timings ke alag-alag boxes:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Official Calling Number */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Official Calling Number</span>
                    </label>
                    <input
                      type="text"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      placeholder="9452824318"
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">
                      Website top bar call link (+91)
                    </span>
                  </div>

                  {/* Official Email */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Official School Email</span>
                    </label>
                    <input
                      type="email"
                      value={schoolEmail}
                      onChange={(e) => setSchoolEmail(e.target.value)}
                      placeholder="stgng2005@gmail.com"
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">
                      Website top bar email link
                    </span>
                  </div>

                  {/* School & Office Timings */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>School & Office Timings</span>
                    </label>
                    <input
                      type="text"
                      value={schoolTimings}
                      onChange={(e) => setSchoolTimings(e.target.value)}
                      placeholder="8:00 AM - 1:30 PM"
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">
                      Website top bar aur footer timings
                    </span>
                  </div>

                  {/* WhatsApp Helpline */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Helpline Number</span>
                    </label>
                    <input
                      type="text"
                      value={schoolWhatsapp}
                      onChange={(e) => setSchoolWhatsapp(e.target.value)}
                      placeholder="9452824318"
                      className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">
                      WhatsApp floating button aur direct chat
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Admissions Desk Details */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </span>
                  <span>Admissions Desk Configuration</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Admission Session
                    </label>
                    <input
                      type="text"
                      value={schoolAdmissionSession}
                      onChange={(e) => setSchoolAdmissionSession(e.target.value)}
                      placeholder="2026-2027"
                      className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Admission Status
                    </label>
                    <select
                      value={schoolAdmissionStatus}
                      onChange={(e) => setSchoolAdmissionStatus(e.target.value)}
                      className="w-full text-xs font-bold py-2.5 px-2.5 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 cursor-pointer shadow-2xs"
                    >
                      <option value="OPEN">Admissions Open</option>
                      <option value="CLOSING_SOON">Closing Soon</option>
                      <option value="CLOSED">Admissions Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Classes Offered
                    </label>
                    <input
                      type="text"
                      value={schoolAdmissionClasses}
                      onChange={(e) => setSchoolAdmissionClasses(e.target.value)}
                      placeholder="Nursery to 8th"
                      className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Social Media & Maps */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-sky-600 text-white shadow-xs">
                    <Globe className="w-3.5 h-3.5" />
                  </span>
                  <span>Google Maps & Social Media Links</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Google Maps Location URL
                    </label>
                    <input
                      type="url"
                      value={schoolGoogleMapsUrl}
                      onChange={(e) => setSchoolGoogleMapsUrl(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      YouTube Channel URL
                    </label>
                    <input
                      type="url"
                      value={schoolYoutubeUrl}
                      onChange={(e) => setSchoolYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/@stgngschool"
                      className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Website & Top Bar Settings</span>
                </button>
                {schoolSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Saved successfully!
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
        {activeSchoolSubTab === "profile" && (
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5 animate-scale-in">
            <div>
              <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                <Building2 className="h-3.5 w-3.5" /> School Institutional Profile
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Update primary contact variables displayed across ledger invoice receipts.
              </p>
            </div>

            <form onSubmit={handleUpdateSchool} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">School Name</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Institutional Address</label>
                <input
                  type="text"
                  required
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Accounts Email</label>
                  <input
                    type="email"
                    required
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">School UDISE Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09300302001"
                    value={schoolUdiseCode}
                    onChange={(e) => setSchoolUdiseCode(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 font-mono shadow-2xs"
                  />
                </div>
              </div>

              {/* Multi-UPI Accounts Configuration */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Institutional UPI Receiving Accounts
                    </label>
                    <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                      Configure 1 to 3+ school UPI accounts. The cashier can choose the destination account when collecting fees.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddUpiAccount}
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200/80 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Account
                  </button>
                </div>

                {schoolUpiAccounts.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1.5">
                    <CreditCard className="w-5 h-5 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">No UPI accounts configured yet</p>
                    <button
                      type="button"
                      onClick={handleAddUpiAccount}
                      className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer"
                    >
                      + Click here to add your first school UPI ID
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {schoolUpiAccounts.map((acc, idx) => (
                      <div
                        key={acc.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          acc.isDefault
                            ? "bg-indigo-50/40 border-indigo-200/90 shadow-2xs"
                            : "bg-slate-50/60 border-slate-200"
                        } space-y-2`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                              type="text"
                              placeholder="Account Label (e.g. Primary School A/C)"
                              value={acc.label}
                              onChange={(e) => handleUpdateUpiAccount(acc.id, { label: e.target.value })}
                              className="text-xs font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white px-1.5 py-0.5 rounded outline-none w-full max-w-[220px]"
                            />
                            {acc.isDefault && (
                              <span className="text-[8px] font-black uppercase text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                                Default Account
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!acc.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultUpiAccount(acc.id)}
                                className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-white px-2 py-0.5 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                Set Default
                              </button>
                            )}
                            {schoolUpiAccounts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUpiAccount(acc.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                              UPI ID / VPA
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 8423926608@upi"
                              value={acc.upiId}
                              onChange={(e) => handleUpdateUpiAccount(acc.id, { upiId: e.target.value })}
                              className="w-full text-xs font-bold py-1.5 px-2.5 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-2xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Payee / Merchant Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. St GNG School"
                              value={acc.merchantName}
                              onChange={(e) => handleUpdateUpiAccount(acc.id, { merchantName: e.target.value })}
                              className="w-full text-xs font-bold py-1.5 px-2.5 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-600 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-500/25 active:scale-98 cursor-pointer mt-2">
                Save Institutional Settings
              </button>
            </form>
          </div>
        )}

        {activeSchoolSubTab === "admin" && (
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5 animate-scale-in">
            <div>
              <h3 className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                <User className="h-3.5 w-3.5" /> Administrator Profile Settings
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Update your system login profile name, username, email address, and phone number.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAdminProfileError("");
                setAdminProfileSuccess("");
                if (!user || !updateAdminProfile) return;

                const res = await updateAdminProfile(user.id, {
                  name: adminFormName,
                  username: adminFormUsername,
                  email: adminFormEmail,
                  phone: adminFormPhone,
                });

                if (res.success) {
                  showToast("success", "Profile Updated", "Admin profile details updated successfully!");
                } else {
                  showToast("error", "Update Failed", res.error || "Failed to update profile details.");
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
                  className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={adminFormUsername}
                  onChange={(e) => setAdminFormUsername(e.target.value)}
                  className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={adminFormEmail}
                    onChange={(e) => setAdminFormEmail(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={adminFormPhone}
                    onChange={(e) => setAdminFormPhone(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-500/25 active:scale-98 cursor-pointer mt-2">
                Save Profile Details
              </button>
            </form>
          </div>
        )}

        {activeSchoolSubTab === "sync" && (
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5 animate-scale-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase text-amber-700 bg-amber-50 border border-amber-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                  <Database className="h-3.5 w-3.5" /> Google Cloud Integration Panel
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                  Synchronize student master records, monthly fee registers, payment vouchers, and examination marks to your Google Sheet.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Auto-Sync: 00:00 Midnight (Daily)</span>
              </div>
            </div>

            {googleStatus && (
              <div className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs font-bold ${
                googleStatus.type === "success" 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}>
                {googleStatus.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />}
                <span className="leading-relaxed">{googleStatus.msg}</span>
              </div>
            )}

            {/* Credentials JSON Pastbox */}
            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-600 text-white shadow-xs">
                      <Key className="w-3.5 h-3.5" />
                    </span>
                    <span>Google Service Account Credentials</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    {savedClientEmail ? (
                      <span className="text-emerald-700 font-mono font-bold">✓ Connected: {savedClientEmail}</span>
                    ) : (
                      "Google Cloud Console Service Account JSON credentials required for spreadsheet sync."
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJsonBox(!showJsonBox)}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer shrink-0 transition-all active:scale-95"
                >
                  {showJsonBox ? "Close" : savedClientEmail ? "Update Credentials Key" : "Paste JSON Key"}
                </button>
              </div>

              {showJsonBox && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60 animate-fade-in">
                  <textarea
                    rows={5}
                    placeholder='Paste credentials.json text here e.g. { "type": "service_account", "private_key": "...", ... }'
                    value={serviceJsonInput}
                    onChange={(e) => setServiceJsonInput(e.target.value)}
                    className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-amber-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handleSaveGoogleCredentials}
                    disabled={savingJsonLoading}
                    className="py-2 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
                  >
                    {savingJsonLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Save Service Account Key
                  </button>
                </div>
              )}
            </div>

            {/* Google Sheets Sync Box */}
            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </span>
                  <span>Google Sheets Multi-Tab Synchronization</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Clean backup of 4 essential school registers with zero clutter. Human-readable and ready for audits.
                </p>
              </div>

              {/* 4 Clean Tabs Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Tab 1</span>
                  </div>
                  <p className="text-xs font-black text-slate-800">Student Directory</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Master profiles, contacts, parent phone, address & Aadhaar</p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Tab 2</span>
                  </div>
                  <p className="text-xs font-black text-slate-800">Student Fee Register</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Monthly fees rate, Paid Up To, Baki Mahine & April-March breakdown</p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Tab 3</span>
                  </div>
                  <p className="text-xs font-black text-slate-800">Fee Receipts Register</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Every counter payment voucher, date, mode & cashier</p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">Tab 4</span>
                  </div>
                  <p className="text-xs font-black text-slate-800">Examination Marks</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Exam terms, subject marks, percentages & CBSE grades</p>
                </div>
              </div>

              {/* Google Spreadsheet ID Input */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Spreadsheet ID (from URL)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1PChbL59jTTj8w9kKMer7Esg4kClZrurJFiMi2jchxak"
                  value={googleSpreadsheetId}
                  onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                  className="w-full text-xs font-mono font-bold py-2.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-emerald-600"
                />
                <p className="text-[9.5px] text-slate-400 font-medium">
                  Share your Google Sheet with: <code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold select-all">{savedClientEmail || "school-finance-connector@school-finance-os.iam.gserviceaccount.com"}</code> (Editor role).
                </p>
              </div>

              {/* Master Sync Button */}
              <button
                type="button"
                onClick={triggerSyncAll}
                disabled={syncingAll}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-slate-900/10 active:scale-98"
              >
                {syncingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Syncing All 4 Tabs to Google Sheet...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>Sync All Data to Google Sheet (4 Tabs)</span>
                  </>
                )}
              </button>

              {/* Individual Tab Sync Buttons */}
              <div>
                <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Or Sync Individual Registers:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={triggerSyncStudents}
                    disabled={syncingStudents}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {syncingStudents ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" /> : <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />}
                    Student Directory
                  </button>
                  <button
                    type="button"
                    onClick={triggerSyncFeeRegister}
                    disabled={syncingFeeRegister}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {syncingFeeRegister ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                    Fee Register
                  </button>
                  <button
                    type="button"
                    onClick={triggerSyncReceipts}
                    disabled={syncingReceipts}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {syncingReceipts ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> : <Receipt className="h-3.5 w-3.5 text-amber-600" />}
                    Fee Receipts
                  </button>
                  <button
                    type="button"
                    onClick={triggerSyncMarks}
                    disabled={syncingMarks}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {syncingMarks ? <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" /> : <Award className="h-3.5 w-3.5 text-rose-600" />}
                    Exam Marks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSchoolSubTab === "exams" && (
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5 animate-scale-in">
            <div>
              <h3 className="text-xs font-black uppercase text-rose-700 bg-rose-50 border border-rose-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                <Award className="h-3.5 w-3.5" /> Academic Examination Customizer
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Configure custom exam terms (e.g. Unit-1, Half Yearly, Annual) used for student grading.
              </p>
            </div>

            <div className="space-y-4">
              {/* Add New Exam Inline Form */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    New Exam Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unit-3, Weekly Test 1"
                    value={newExamInput}
                    onChange={(e) => setNewExamInput(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-rose-600 shadow-2xs"
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
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  Add Exam
                </button>
              </div>

              {/* List of current Exams */}
              <div className="space-y-2 pt-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Configured Exams (Select an exam to configure its parameters)
                </label>
                {schoolExams.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {schoolExams.map((exam, idx) => {
                      const isActive = selectedConfigExam === exam;
                      return (
                        <div key={exam} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedConfigExam(exam)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-wider transition-all cursor-pointer ${
                              isActive 
                                ? "bg-rose-600 border-rose-600 text-white shadow-sm" 
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                            }`}
                          >
                            {exam}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSchoolExams((prev) => prev.filter((e) => e !== exam));
                              setSchoolExamConfig((prev: any) => {
                                const next = { ...prev };
                                delete next[exam];
                                return next;
                              });
                              if (selectedConfigExam === exam) {
                                setSelectedConfigExam("");
                              }
                            }}
                            className="p-1.5 bg-rose-50 text-rose-600 border border-rose-150 rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
                            title="Delete Exam"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-slate-400 italic">No exams configured yet.</p>
                )}
              </div>

              {/* 2-Column Responsive Layout: Left = Exam Breakdown & Config, Right = Marks Entry Lock & Public Portal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* LEFT COLUMN: Exam Breakdown / Split Config */}
                <div className="space-y-4">
                  {selectedConfigExam && (() => {
                    const config = schoolExamConfig[selectedConfigExam] || { isSplit: false, maxMarks: 100, components: [] };
                    return (
                      <div className="border border-slate-200/70 rounded-2xl p-4.5 bg-slate-50/40 space-y-4 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                          <div>
                            <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight">
                              Configuration for {selectedConfigExam}
                            </h4>
                            <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">
                              Set max marks or split breakdown components
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl">
                            <span className="text-[9px] text-rose-600 font-black uppercase">Total Marks:</span>
                            <span className="text-xs font-black text-rose-700">
                              {config.maxMarks}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/70">
                          <input
                            type="checkbox"
                            id="isSplitCheckbox"
                            checked={config.isSplit}
                            onChange={(e) => {
                              setSchoolExamConfig((prev: any) => ({
                                ...prev,
                                [selectedConfigExam]: {
                                  ...config,
                                  isSplit: e.target.checked,
                                  components: e.target.checked ? config.components : []
                                }
                              }));
                            }}
                            className="h-4 w-4 accent-rose-600 rounded cursor-pointer"
                          />
                          <label htmlFor="isSplitCheckbox" className="text-xs font-extrabold text-slate-700 cursor-pointer">
                            Enable Marks Breakdown/Split (e.g. Written, Practical, Notebook)
                          </label>
                        </div>

                        {!config.isSplit ? (
                          <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200/70">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Max Examination Marks</label>
                            <input
                              type="number"
                              placeholder="100"
                              value={config.maxMarks}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setSchoolExamConfig((prev: any) => ({
                                  ...prev,
                                  [selectedConfigExam]: { ...config, maxMarks: val }
                                }));
                              }}
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-white focus:border-rose-500 shadow-2xs"
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Component List */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Configured Components</label>
                              {config.components && config.components.length > 0 ? (
                                <div className="divide-y divide-slate-100 bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-2xs">
                                  {config.components.map((comp: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-50">
                                      <div>
                                        <span className="text-xs font-extrabold text-slate-800">{comp.name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold ml-1.5">(Weight: {comp.max} marks)</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSchoolExamConfig((prev: any) => {
                                            const comps = (config.components || []).filter((_: any, i: number) => i !== idx);
                                            const total = comps.reduce((sum: number, c: any) => sum + (c.max || 0), 0);
                                            return {
                                              ...prev,
                                              [selectedConfigExam]: { ...config, components: comps, maxMarks: total }
                                            };
                                          });
                                        }}
                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                        title="Delete Component"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] font-bold text-slate-400 italic">No breakdown components added yet.</p>
                              )}
                            </div>

                            {/* Add Component inline */}
                            <div className="flex gap-2 items-end pt-1 bg-white p-3 rounded-xl border border-slate-200/60">
                              <div className="flex-1">
                                <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                  Component Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Notebook, Practical"
                                  value={newCompName}
                                  onChange={(e) => setNewCompName(e.target.value)}
                                  className="w-full text-xs font-semibold py-1.5 px-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500"
                                />
                              </div>
                              <div className="w-24">
                                <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                  Max Marks
                                </label>
                                <input
                                  type="number"
                                  placeholder="10"
                                  value={newCompMax}
                                  onChange={(e) => setNewCompMax(e.target.value)}
                                  className="w-full text-xs font-semibold py-1.5 px-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500"
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
                                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* RIGHT COLUMN: Marks Entry Lock Management Controls */}
                <div className="space-y-4">
                  {/* 🔒 1. MARKS ENTRY LOCK MANAGEMENT CONTROLS */}
                  <div className="border border-slate-200/70 rounded-2xl p-4.5 bg-slate-50/40 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-rose-600" />
                          Marks Entry Lock
                        </h4>
                        <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">
                          Freeze exams to prevent teachers from editing marks
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            setSchoolLockedExams([...schoolExams]);
                            try {
                              await updateSchoolInfo({ lockedExams: [...schoolExams] });
                              showToast("info", "All Exams Locked", "All exams have been frozen from teacher marks entry.");
                            } catch (err) {
                              console.error("Lock all err:", err);
                              showToast("error", "Action Failed", "Could not lock all exams. Please retry.");
                            }
                          }}
                          className="text-[9.5px] font-bold px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Lock all exams from editing"
                        >
                          Lock All
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setSchoolLockedExams([]);
                            try {
                              await updateSchoolInfo({ lockedExams: [] });
                              showToast("success", "All Exams Unlocked", "All exams are now open for teacher marks entry.");
                            } catch (err) {
                              console.error("Unlock all err:", err);
                              showToast("error", "Action Failed", "Could not unlock exams. Please retry.");
                            }
                          }}
                          className="text-[9.5px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Unlock all exams"
                        >
                          Unlock All
                        </button>
                      </div>
                    </div>

                    {/* List of Lockable Exams */}
                    <div className="space-y-2">
                      {schoolExams.length > 0 ? (
                        schoolExams.map((exam) => {
                          const isLocked = schoolLockedExams.some(
                            (e) => e.trim().toLowerCase() === exam.trim().toLowerCase()
                          );
                          return (
                            <div
                              key={exam}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isLocked
                                  ? "bg-rose-50/40 border-rose-200 shadow-2xs"
                                  : "bg-white border-slate-200/70 hover:border-slate-300 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                    isLocked
                                      ? "bg-rose-100 text-rose-700 border-rose-200"
                                      : "bg-slate-100 text-slate-400 border-slate-200"
                                  }`}
                                >
                                  {isLocked ? (
                                    <Lock className="h-3.5 w-3.5 text-rose-600" />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-black uppercase tracking-tight text-slate-800 truncate">
                                    {exam}
                                  </p>
                                  <p className="text-[9.5px] font-semibold text-slate-400">
                                    {isLocked ? "Locked • Marks cannot be edited" : "Open • Editable by teachers"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                    isLocked
                                      ? "bg-rose-100/80 text-rose-700 border-rose-250"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {isLocked ? "Locked" : "Open"}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isLocked}
                                    onChange={async (e) => {
                                      const checked = e.target.checked;
                                      const updated = checked
                                        ? [...schoolLockedExams.filter((ex) => ex.trim().toLowerCase() !== exam.trim().toLowerCase()), exam]
                                        : schoolLockedExams.filter(
                                            (ex) => ex.trim().toLowerCase() !== exam.trim().toLowerCase()
                                          );
                                      setSchoolLockedExams(updated);
                                      try {
                                        await updateSchoolInfo({ lockedExams: updated });
                                        if (checked) {
                                          showToast("info", "Exam Locked", `${exam} is now locked. Teachers cannot edit marks.`);
                                        } else {
                                          showToast("success", "Exam Unlocked", `${exam} is now unlocked and open for marks entry.`);
                                        }
                                      } catch (err) {
                                        console.error("Auto lock err:", err);
                                        showToast("error", "Update Failed", "Could not update exam lock state.");
                                      }
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                                </label>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] font-bold text-slate-400 italic">No exams configured yet.</p>
                      )}
                    </div>
                  </div>

                  {/* 🌐 2. ONLINE EXAMINATION RESULTS PORTAL CONTROLS */}
                  <div className="border border-slate-200/70 rounded-2xl p-4.5 bg-slate-50/40 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-indigo-600" />
                          Online Results Portal
                        </h4>
                        <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">
                          Allow students and parents to view published report cards online
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            schoolEnablePublicResults
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {schoolEnablePublicResults ? "Live" : "Offline"}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={schoolEnablePublicResults}
                            onChange={(e) => setSchoolEnablePublicResults(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Public Published Exams Checkboxes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider">
                          Published On Website
                        </label>
                        <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                          {schoolAllowedPublicExams.length} Published
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {schoolExams.map((exam) => {
                          const isPublished = schoolAllowedPublicExams.includes(exam);
                          return (
                            <button
                              key={exam}
                              type="button"
                              onClick={() => {
                                if (isPublished) {
                                  setSchoolAllowedPublicExams((prev) => prev.filter((e) => e !== exam));
                                } else {
                                  setSchoolAllowedPublicExams((prev) => [...prev, exam]);
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                                isPublished
                                  ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-bold"
                                  : "bg-white border-slate-200/70 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                                    isPublished
                                      ? "bg-indigo-600 text-white"
                                      : "border border-slate-300 text-transparent"
                                  }`}
                                >
                                  ✓
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-tight truncate">
                                  {exam}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-semibold hidden sm:block">
                  Exam configurations and lock permissions are synchronized live across all teacher consoles
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    setSavingExams(true);
                    try {
                      await updateSchoolInfo({
                        ...schoolInfo,
                        exams: schoolExams,
                        examConfig: schoolExamConfig,
                        enablePublicResults: schoolEnablePublicResults,
                        allowedPublicExams: schoolAllowedPublicExams,
                        lockedExams: schoolLockedExams,
                      });
                      showToast(
                        "success",
                        "Exam & Lock Settings Saved",
                        "Exam parameters and lock status have been updated successfully."
                      );
                    } catch (err: any) {
                      console.error(err);
                      showToast(
                        "error",
                        "Failed to Save",
                        err?.message || "Could not save exam settings. Please try again."
                      );
                    } finally {
                      setSavingExams(false);
                    }
                  }}
                  disabled={savingExams}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-55 active:scale-95"
                >
                  {savingExams ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Settings...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Save Exam & Lock Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
