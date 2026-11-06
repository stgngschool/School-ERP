"use client";

import MonthlyCollectionChart from "@/components/admin/MonthlyCollectionChart";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { 
  Sparkles, EyeOff, Eye, TrendingUp, Users, AlertTriangle, 
  UserCheck, CreditCard, PlusCircle, Megaphone, Printer, 
  ArrowRight, Phone, Gift, X 
} from "lucide-react";
import { formatP } from "@/lib/currency";
import { generateFeeReminderWhatsAppUrl, isDueUpToCurrentMonth } from "@/lib/whatsapp";
import type { DashboardBilling } from "@/lib/dashboardBilling";
import { getISTDateString, getTodayIST, formatCanonicalDOBIso, MONTHS_CANONICAL } from "@/lib/dateUtils";

interface DashboardOverviewTabProps {
  user: any;
  students: any[];
  dueItems: any[];
  receipts: any[];
  ledgerEntries: any[];
  schoolInfo: any;
  classes: any[];
  usersList: any[];
  billingSummary: any;
  studentsLoaded: boolean;
  billingLoaded: boolean;
  attendanceLoaded: boolean;
  attendances: any[];
  updateSchoolInfo: (info: any) => void;
  showToast?: (type: any, title?: any, message?: any) => void;
  setActiveTab: (tab: any) => void;
  eventsList: any[];
  addEvent: (title: string, day: number, weekday: string) => Promise<void> | void;
  setSelectedStudentId: (id: string) => void;
}

export default function DashboardOverviewTab({
  user,
  students,
  ledgerEntries,
  schoolInfo,
  classes,
  usersList,
  studentsLoaded,
  attendanceLoaded,
  attendances,
  updateSchoolInfo,
  showToast,
  setActiveTab,
  eventsList,
  addEvent,
  setSelectedStudentId
}: DashboardOverviewTabProps) {

  const { dashboardBilling, dashboardBillingLoaded, refreshDashboardBilling } = useAuth();
  const billingLoaded = dashboardBillingLoaded && dashboardBilling !== null;

  const reminderRequests = useRef(new Set<string>());
  const [loadingReminders, setLoadingReminders] = useState<Record<string, boolean>>({});

  const openFeeReminder = async (def: DashboardBilling["topDefaulters"][number]) => {
    if (reminderRequests.current.has(def.id)) return;
    reminderRequests.current.add(def.id);
    setLoadingReminders(prev => ({ ...prev, [def.id]: true }));
    // Open during the click so the browser can keep the fresh reminder in a separate tab.
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      if (!popup) throw new Error("Allow pop-ups to open the WhatsApp reminder.");
      const response = await fetch(`/api/billing?studentId=${encodeURIComponent(def.id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.dueItems)) throw new Error(data.error || "Unable to load current fee dues.");
      const unpaidDues = data.dueItems.filter((due: any) =>
        due.studentId === def.id && due.status === "UNPAID" && due.amount > 0 && isDueUpToCurrentMonth(due)
      );
      if (unpaidDues.length === 0) throw new Error("This student no longer has overdue fees. Refresh the dashboard.");
      const student = students.find(item => item.id === def.id);
      const url = generateFeeReminderWhatsAppUrl({
        student: {
          id: def.id, name: def.name, class: student?.class || def.classSection.split("-")[0] || "",
          section: student?.section || def.classSection.split("-")[1] || "",
          admissionNo: def.admNo, rollNo: student?.rollNo,
          fatherName: student?.fatherName || student?.parentName,
          fatherMobile: def.phone,
        },
        unpaidDues, schoolInfo, senderRole: "ADMIN",
      });
      popup.location.href = url;
    } catch (error) {
      popup?.close();
      showToast?.("error", "Reminder unavailable", error instanceof Error ? error.message : "Unable to prepare the fee reminder.");
    } finally {
      reminderRequests.current.delete(def.id);
      setLoadingReminders(prev => ({ ...prev, [def.id]: false }));
    }
  };

  // Redesigned Dashboard State
  const [notes, setNotes] = useState<string[]>([]);
  const [newNoteText, setNewNoteText] = useState("");

  // ── Privacy / Masking Mode for Sensitive Financial Figures (Default to PROTECTED / HIDDEN)
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_privacy_mode");
      return saved !== null ? saved === "true" : true; // Default true (hidden)
    }
    return true;
  });

  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  const toggleCardPrivacy = (cardKey: string) => {
    setRevealedCards((prev) => ({
      ...prev,
      [cardKey]: !(prev[cardKey] ?? !privacyMode),
    }));
  };

  const toggleGlobalPrivacy = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_privacy_mode", String(next));
      }
      setRevealedCards({});
      return next;
    });
  };

  const isCardMasked = (cardKey: string) => {
    return !(revealedCards[cardKey] ?? !privacyMode);
  };

  const PrivacyEyeButton = ({
    cardKey,
    title = "Amount",
    className = "",
  }: {
    cardKey: string;
    title?: string;
    className?: string;
  }) => {
    const masked = isCardMasked(cardKey);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleCardPrivacy(cardKey);
        }}
        title={masked ? `Reveal ${title}` : `Hide ${title}`}
        className={`p-1 rounded-lg transition-all cursor-pointer hover:bg-slate-100 active:scale-90 ${
          masked ? "text-slate-400 hover:text-slate-700" : "text-indigo-600 hover:text-indigo-800 bg-indigo-50/70"
        } ${className}`}
        aria-label={masked ? `Reveal ${title}` : `Hide ${title}`}
        aria-pressed={!masked}
      >
        {masked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    );
  };

  // ── M-03: Hydrate notes from DB schoolInfo (PostgreSQL) with localStorage cache fallback
  useEffect(() => {
    const dbNotes = (schoolInfo as any)?.adminNotes;
    if (Array.isArray(dbNotes)) {
      setNotes(dbNotes);
    } else if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_dashboard_notes");
      if (saved) {
        try {
          setNotes(JSON.parse(saved));
        } catch (e) {
          console.error("Error loading notes", e);
        }
      }
    }
  }, [(schoolInfo as any)?.adminNotes]);

  const addNote = () => {
    if (!newNoteText.trim()) return;
    const updated = [...notes, newNoteText.trim()];
    setNotes(updated);
    setNewNoteText("");
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_dashboard_notes", JSON.stringify(updated));
    }
    updateSchoolInfo({ adminNotes: updated });
  };

  const deleteNote = (index: number) => {
    const updated = notes.filter((_, i) => i !== index);
    setNotes(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_dashboard_notes", JSON.stringify(updated));
    }
    updateSchoolInfo({ adminNotes: updated });
  };

  // Interactive Dashboard States
  const [showStudentCurve, setShowStudentCurve] = useState(true);
  const [showTeacherCurve, setShowTeacherCurve] = useState(true);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [financeInterval, setFinanceInterval] = useState<"weekly" | "monthly">("weekly");
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("9");

  if (!dashboardBilling || !dashboardBillingLoaded) {
    return (
      <div role="status" aria-busy={!dashboardBillingLoaded} className="space-y-4 sm:space-y-6">
        <p className="text-sm font-semibold text-slate-500">
          {dashboardBillingLoaded ? "Dashboard figures could not be loaded." : "Loading dashboard figures…"}
        </p>
        <div aria-hidden="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4 motion-safe:animate-pulse">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-40 rounded-2xl bg-slate-100" />)}
        </div>
        {dashboardBillingLoaded && <button type="button" onClick={() => void refreshDashboardBilling()} className="rounded-xl px-4 py-2 text-sm font-bold text-indigo-700 bg-indigo-50">Retry dashboard</button>}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 font-sans mobile-edge-grid w-full max-w-full overflow-x-hidden text-left">
      {/* ─── Header shown only on Dashboard Overview ─── */}
      <div className="flex items-center justify-between gap-2 border-b-0 sm:border-b sm:border-slate-100 pb-1 sm:pb-5 mb-0.5 sm:mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              Welcome back, {user?.name || "Admin"} 👋
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
              Session Active
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5 truncate">
            {schoolInfo.name || "School ERP"} • <span className="text-emerald-600 font-bold">System Live</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-700">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operational Control</p>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              System Live
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6 animate-fade-in font-sans">
        {(() => {
          const girlsFirstNames = ["diya", "anya", "ananya", "kiara", "priya", "sneha", "pooja", "neha", "riya", "simran", "kajal", "preeti", "shalini", "deepika", "kiran", "aisha", "jyoti", "meera", "geeta", "rekha", "sunita", "anita", "kavita", "mamta", "babita", "sapna", "poonam", "usha"];
          const totalStudents = students.length;
          const girlsCount = students.filter(s => {
            const g = (s.gender || "").trim().toUpperCase();
            if (g.startsWith("FEM") || g === "GIRL" || g === "F") return true;
            if (g === "MALE" || g === "BOY" || g === "M") return false;
            const firstName = s.name.split(" ")[0].toLowerCase();
            return girlsFirstNames.includes(firstName);
          }).length;
          const boysCount = totalStudents - girlsCount;
          const girlsPct = totalStudents > 0 ? Math.round((girlsCount / totalStudents) * 100) : 0;
          const boysPct = totalStudents > 0 ? 100 - girlsPct : 0;

          const currentYear = new Date().getFullYear();
          const sessionStartYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
          const sessionStartDate = new Date(`${sessionStartYear}-04-01`);

          const newAdmissionsCount = students.filter(s => {
            if (s.admissionDate) {
              const d = new Date(s.admissionDate);
              if (!isNaN(d.getTime())) return d >= sessionStartDate;
            }
            if ((s as any).createdAt) {
              const d = new Date((s as any).createdAt);
              if (!isNaN(d.getTime())) return d >= sessionStartDate;
            }
            return false;
          }).length;
          const oldStudentsCount = totalStudents - newAdmissionsCount;

          // All dashboard finances come from the complete, session-scoped aggregate.
          const {
            totalEarnings, currentOverdueAmount, futureUnbilledAmount, totalDues,
            cashTally, upiTally, bankTally, todayCash, todayUpi, todayBank,
            todayTotal, monthlyTotal, collectorsList, topDefaulters, overdueCount,
          } = dashboardBilling;
          const currentTotalDemand = totalEarnings + currentOverdueAmount;
          const currentCollectionEfficiency = currentTotalDemand > 0 ? Math.round((totalEarnings / currentTotalDemand) * 100) : 0;
          const totalSales = totalEarnings + totalDues;
          const fullYearCollectionEfficiency = totalSales > 0 ? Math.round((totalEarnings / totalSales) * 100) : 0;
          const collectionEfficiency = currentCollectionEfficiency;
          const staffUsers = usersList.filter(u => u.role === "ADMIN" || u.role === "ACCOUNTANT" || u.role === "TEACHER");
          const staffUsersCount = staffUsers.length || 1;

          // Date-wise rolling birthday window: excludes past days, celebrates today, and looks ahead 30 days
          const todayISTStrForBday = getTodayIST(); // "YYYY-MM-DD"
          const [bYearCurStr, bMonthCurStr, bDayCurStr] = todayISTStrForBday.split("-");
          const curCalYear = parseInt(bYearCurStr, 10);
          const curCalMonthIdx = parseInt(bMonthCurStr, 10) - 1;
          const curCalDay = parseInt(bDayCurStr, 10);
          const todayCalMidnight = new Date(curCalYear, curCalMonthIdx, curCalDay);

          const allComputedBirthdays = students
            .map(s => {
              if (!s.dob) return null;
              const iso = formatCanonicalDOBIso(s.dob);
              if (!iso) return null;
              const parts = iso.split("-");
              if (parts.length < 3) return null;
              const birthYear = parseInt(parts[0], 10);
              const bMonthIdx = parseInt(parts[1], 10) - 1;
              const bDay = parseInt(parts[2], 10);

              const bDateThisYear = new Date(curCalYear, bMonthIdx, bDay);
              let diffTime = bDateThisYear.getTime() - todayCalMidnight.getTime();
              let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

              // If birthday has already passed this calendar year (diffDays < 0), calculate for next year
              if (diffDays < 0) {
                const bDateNextYear = new Date(curCalYear + 1, bMonthIdx, bDay);
                diffDays = Math.round((bDateNextYear.getTime() - todayCalMidnight.getTime()) / (1000 * 60 * 60 * 24));
              }

              const turningAge = (diffDays === 0 || bMonthIdx >= curCalMonthIdx)
                ? curCalYear - birthYear
                : curCalYear + 1 - birthYear;

              const monthName = MONTHS_CANONICAL[bMonthIdx] || "Jan";

              return {
                id: s.id,
                name: s.name,
                class: s.class || "",
                section: s.section || "",
                classSection: `${s.class || ""}${s.section ? `-${s.section}` : ""}`,
                day: bDay,
                month: monthName,
                monthIdx: bMonthIdx,
                birthYear,
                formattedDob: `${bDay} ${monthName} ${birthYear}`,
                diffDays,
                turningAge: turningAge > 0 && turningAge < 35 ? turningAge : null,
                phone: s.fatherMobile || s.motherMobile || s.parentPhone || "",
              };
            })
            .filter(Boolean) as Array<{
              id: string;
              name: string;
              class: string;
              section: string;
              classSection: string;
              day: number;
              month: string;
              monthIdx: number;
              birthYear: number;
              formattedDob: string;
              diffDays: number;
              turningAge: number | null;
              phone: string;
            }>;

          allComputedBirthdays.sort((a, b) => a.diffDays - b.diffDays);
          const todayBirthdays = allComputedBirthdays.filter(b => b.diffDays === 0);
          const upcomingBirthdays = allComputedBirthdays.filter(b => b.diffDays > 0 && b.diffDays <= 30).slice(0, 10);

          const todayDateStr = getTodayIST();
          const todayAttendances = attendances.filter(a => getISTDateString(a.date) === todayDateStr);
          const hasTodayAttendance = todayAttendances.length > 0;
          const activeAttendanceList = hasTodayAttendance ? todayAttendances : attendances;
          const totalAttendance = activeAttendanceList.length;
          const presentCount = activeAttendanceList.filter(a => a.status === "PRESENT").length;
          const absentCount = activeAttendanceList.filter(a => a.status === "ABSENT").length;
          const lateCount = activeAttendanceList.filter(a => a.status === "LATE").length;
          const leaveCount = activeAttendanceList.filter(a => a.status === "LEAVE").length;
          const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
          const latestRecordedDate = !hasTodayAttendance && attendances.length > 0 ? getISTDateString(attendances[0].date) : null;

          const monthlyRevenue = dashboardBilling.monthlyRevenue;
          const monthsOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
          const currentMonthShort = new Date().toLocaleString("en-US", { month: "short" });
          
          // Doughnut Chart Setup
          const doughnutRadius = 45;
          const doughnutCirc = 2 * Math.PI * doughnutRadius;
          const doughnutOffset = doughnutCirc - (collectionEfficiency / 100) * doughnutCirc;

          const recentReceipts = dashboardBilling.recentReceipts;
          const classCollectionsList = dashboardBilling.classCollectionsList.slice(0, 5);

          // Doughnut sizes helper
          const rSize = 140;
          const radius = 50;
          const strokeW = 12;
          const center = rSize / 2;
          const circ = doughnutCirc;

          return (
            <div className="space-y-4 sm:space-y-6">
              
              {/* ─── Quick Actions Command Hub ─── */}
              <div className="bg-transparent sm:bg-white rounded-2xl sm:rounded-3xl border-0 sm:border sm:border-slate-200/80 p-0 sm:p-4 sm:shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between px-0.5 sm:px-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span className="text-[11px] sm:text-xs font-black text-slate-700 sm:text-slate-800 uppercase tracking-wider">
                      Quick Command Hub
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold sm:hidden">Swipe →</span>
                </div>
                <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none no-scrollbar">
                  <button
                    onClick={() => setActiveTab("collect")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white sm:bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-slate-200/80 sm:border-emerald-200/60 text-xs font-bold transition-all cursor-pointer shadow-xs sm:shadow-2xs shrink-0 active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fee Counter</span>
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem("students_import_mode", "single");
                      setActiveTab("students");
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white sm:bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-slate-200/80 sm:border-indigo-200/60 text-xs font-bold transition-all cursor-pointer shadow-xs sm:shadow-2xs shrink-0 active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>New Admission</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("attendance")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white sm:bg-blue-50 hover:bg-blue-100 text-blue-800 border border-slate-200/80 sm:border-blue-200/60 text-xs font-bold transition-all cursor-pointer shadow-xs sm:shadow-2xs shrink-0 active:scale-95"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Attendance</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("notices")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white sm:bg-amber-50 hover:bg-amber-100 text-amber-800 border border-slate-200/80 sm:border-amber-200/60 text-xs font-bold transition-all cursor-pointer shadow-xs sm:shadow-2xs shrink-0 active:scale-95"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>Post Circular</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("defaulters")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white sm:bg-rose-50 hover:bg-rose-100 text-rose-800 border border-slate-200/80 sm:border-rose-200/60 text-xs font-bold transition-all cursor-pointer shadow-xs sm:shadow-2xs shrink-0 active:scale-95"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Defaulters List</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("print_marksheets")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white sm:bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 sm:border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs sm:shadow-2xs shrink-0 active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Marksheets</span>
                  </button>
                  <button
                    onClick={toggleGlobalPrivacy}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs sm:shadow-2xs shrink-0 active:scale-95 ${
                      privacyMode
                        ? "bg-white sm:bg-amber-50 hover:bg-amber-100 text-amber-900 border border-slate-200/80 sm:border-amber-200/80"
                        : "bg-white sm:bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-slate-200/80 sm:border-emerald-200/80"
                    }`}
                    title={
                      privacyMode
                        ? "Privacy Mode is ON (Financial numbers protected). Click to reveal all."
                        : "Privacy Mode is OFF (Financial numbers visible). Click to protect all."
                    }
                  >
                    {privacyMode ? (
                      <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>{privacyMode ? "Privacy: Hidden" : "Privacy: Visible"}</span>
                  </button>
                  <div className="w-2 shrink-0 sm:hidden" />
                </div>
              </div>

              {/* ─── Metric Cards Grid (2x2 on mobile, 4-col on desktop) ─── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
                {/* Revenue Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Revenue</span>
                        <PrivacyEyeButton cardKey="revenue" title="Collected Revenue" />
                      </div>
                      <span className="p-1.5 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl shrink-0">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      </span>
                    </div>
                    {!billingLoaded ? (
                      <div className="mt-3 sm:mt-4 animate-pulse">
                        <div className="h-6 sm:h-8 w-20 sm:w-28 bg-slate-200/70 rounded-xl" />
                      </div>
                    ) : (
                      <h3 className="text-base sm:text-2xl font-black text-slate-800 tracking-tight mt-2 sm:mt-4 truncate">
                        {isCardMasked("revenue") ? (
                          <span className="font-mono tracking-widest text-slate-400 select-none">₹••••</span>
                        ) : (
                          formatP(totalEarnings)
                        )}
                      </h3>
                    )}
                  </div>
                  <div className="mt-3 sm:mt-5 pt-2.5 sm:pt-4 border-t border-slate-100/80">
                    {!billingLoaded ? (
                      <div className="space-y-1.5 sm:space-y-2 animate-pulse">
                        <div className="h-2.5 sm:h-3 w-full bg-slate-100 rounded-full" />
                        <div className="h-2 w-16 sm:w-24 bg-slate-100 rounded-md mt-1" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1 sm:mb-1.5">
                          <span className="text-slate-400 font-semibold truncate">Collected</span>
                          <span className="text-indigo-600 font-black">{collectionEfficiency}%</span>
                        </div>
                        <div className="w-full h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${collectionEfficiency}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 sm:mt-2.5 text-[9px] sm:text-[10px] text-slate-400 font-medium">
                          <span className="truncate">This mo: <strong className="text-slate-600">+{isCardMasked("revenue") ? "₹••" : formatP(monthlyTotal)}</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Enrolled Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Students</span>
                      <span className="p-1.5 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl shrink-0">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      </span>
                    </div>
                    {!studentsLoaded ? (
                      <button type="button" onClick={() => setActiveTab("attendance")} className="mt-3 min-h-11 text-sm font-bold text-indigo-700 underline underline-offset-4">
                        Open Attendance
                      </button>
                    ) : (
                      <h3 className="text-base sm:text-2xl font-black text-slate-800 tracking-tight mt-2 sm:mt-4">{totalStudents}</h3>
                    )}
                  </div>
                  <div className="mt-3 sm:mt-5 pt-2.5 sm:pt-4 border-t border-slate-100/80">
                    {!studentsLoaded ? (
                      <div className="space-y-1.5 sm:space-y-2 animate-pulse">
                        <div className="h-2.5 sm:h-3 w-full bg-slate-100 rounded-full" />
                        <div className="h-2 w-16 sm:w-24 bg-slate-100 rounded-md mt-1" />
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-[10px] sm:text-xs mb-1 sm:mb-1.5 font-semibold">
                          <span className="text-blue-600 truncate">{boysCount} B ({boysPct}%)</span>
                          <span className="text-pink-500 truncate">{girlsCount} G ({girlsPct}%)</span>
                        </div>
                        <div className="w-full h-1 sm:h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${boysPct}%` }}></div>
                          <div className="h-full bg-pink-400" style={{ width: `${girlsPct}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 sm:mt-2.5 text-[9px] sm:text-[10px] text-slate-400 font-medium">
                          <span className="truncate">New: <strong className="text-slate-600">{newAdmissionsCount}</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Dues Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Pending Dues</span>
                        <PrivacyEyeButton cardKey="dues" title="Pending Dues" />
                      </div>
                      <span className="p-1.5 sm:p-2.5 bg-rose-50 text-rose-600 rounded-xl sm:rounded-2xl shrink-0">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </span>
                    </div>
                    {!billingLoaded ? (
                      <div className="mt-3 sm:mt-4 animate-pulse">
                        <div className="h-6 sm:h-8 w-20 sm:w-28 bg-slate-200/70 rounded-xl" />
                      </div>
                    ) : (
                      <div className="mt-2 sm:mt-4">
                        <h3 className="text-base sm:text-2xl font-black text-rose-600 tracking-tight truncate">
                          {isCardMasked("dues") ? (
                            <span className="font-mono tracking-widest text-slate-400 select-none">₹••••</span>
                          ) : (
                            formatP(currentOverdueAmount)
                          )}
                        </h3>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                          Full Year: <span className="text-slate-600 font-extrabold">{isCardMasked("dues") ? "₹••" : formatP(totalDues)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100/80">
                    {!billingLoaded ? (
                      <div className="space-y-1.5 sm:space-y-2 animate-pulse">
                        <div className="h-2.5 sm:h-3 w-full bg-slate-100 rounded-full" />
                        <div className="h-2 w-16 sm:w-20 bg-slate-100 rounded-md mt-1" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1 sm:mb-1.5">
                          <span className="text-slate-400 font-semibold truncate">Overdue</span>
                          <span className="text-rose-600 font-black">{100 - collectionEfficiency}%</span>
                        </div>
                        <div className="w-full h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${100 - collectionEfficiency}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 sm:mt-2.5 text-[9px] sm:text-[10px] text-slate-400 font-medium">
                          <span className="truncate">{overdueCount} overdue</span>
                          <button onClick={() => setActiveTab("defaulters")} className="text-indigo-600 hover:underline font-bold cursor-pointer shrink-0">List</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Attendance Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Attendance</span>
                      <span className={`p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 ${hasTodayAttendance ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                      </span>
                    </div>
                    {!attendanceLoaded ? (
                      <div className="mt-3 sm:mt-4 animate-pulse">
                        <div className="h-6 sm:h-8 w-16 sm:w-20 bg-slate-200/70 rounded-xl" />
                      </div>
                    ) : (
                      <div className="mt-2 sm:mt-4">
                        <div className="flex items-baseline gap-1 sm:gap-2">
                          <h3 className={`text-base sm:text-2xl font-black tracking-tight ${hasTodayAttendance ? "text-emerald-600" : "text-amber-600"}`}>
                            {hasTodayAttendance ? `${attendanceRate}%` : "Pending"}
                          </h3>
                          {!hasTodayAttendance && latestRecordedDate && (
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate">
                              ({attendanceRate}%)
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5 truncate">
                          {hasTodayAttendance ? "Today Live" : "Not marked"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100/80">
                    {!attendanceLoaded ? (
                      <p className="text-xs text-slate-600">Load attendance for a class and date in the Attendance screen.</p>
                    ) : hasTodayAttendance ? (
                      <div className="grid grid-cols-4 gap-0.5 sm:gap-1 text-center text-[9px] sm:text-[10px] font-bold text-slate-500">
                        <div className="bg-emerald-50 text-emerald-700 py-0.5 sm:py-1 rounded">
                          <p className="text-[7px] sm:text-[8px] uppercase">P</p>
                          <p>{presentCount}</p>
                        </div>
                        <div className="bg-rose-50 text-rose-700 py-0.5 sm:py-1 rounded">
                          <p className="text-[7px] sm:text-[8px] uppercase">A</p>
                          <p>{absentCount}</p>
                        </div>
                        <div className="bg-amber-50 text-amber-700 py-0.5 sm:py-1 rounded">
                          <p className="text-[7px] sm:text-[8px] uppercase">L</p>
                          <p>{lateCount}</p>
                        </div>
                        <div className="bg-blue-50 text-blue-700 py-0.5 sm:py-1 rounded">
                          <p className="text-[7px] sm:text-[8px] uppercase">Lv</p>
                          <p>{leaveCount}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-500 bg-amber-50/70 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-amber-100">
                        <span className="text-amber-800 font-semibold truncate">Not taken</span>
                        <button onClick={() => setActiveTab("attendance")} className="text-indigo-600 hover:underline font-extrabold cursor-pointer shrink-0">Mark</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Visualizations Section (SVG Charts) ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {/* Monthly collection trend */}
                <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6 relative flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Monthly Fee Collection Analysis</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Session 2026-27 • 12-Month Cashflow</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-100">
                        Total: {isCardMasked("chart") ? "₹••••••" : formatP(totalEarnings)}
                      </span>
                      <PrivacyEyeButton cardKey="chart" title="Chart Revenue" />
                    </div>
                  </div>

                  <MonthlyCollectionChart months={monthsOrder} values={monthlyRevenue} masked={isCardMasked("chart")} currentMonth={currentMonthShort} />

                </div>

                {/* Collection efficiency Doughnut */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Collection Efficiency</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Collected vs Pending Target</p>
                    </div>
                    <PrivacyEyeButton cardKey="efficiency" title="Efficiency Breakdown" />
                  </div>

                  <div className="flex items-center justify-center my-3 sm:my-4 relative">
                    <svg width={rSize} height={rSize} viewBox={`0 0 ${rSize} ${rSize}`} className="transform -rotate-90">
                      {/* Track circle */}
                      <circle 
                        cx={center} 
                        cy={center} 
                        r={radius} 
                        fill="transparent" 
                        stroke="#f1f5f9" 
                        strokeWidth={strokeW} 
                      />
                      {/* Progress circle */}
                      <circle 
                        cx={center} 
                        cy={center} 
                        r={radius} 
                        fill="transparent" 
                        stroke="#4f46e5" 
                        strokeWidth={strokeW} 
                        strokeDasharray={doughnutCirc}
                        strokeDashoffset={doughnutOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Percent Center Label */}
                    <div className="absolute text-center">
                      <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{collectionEfficiency}%</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Recovered</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100/80 pt-3 sm:pt-4 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block shrink-0" />
                        <span className="text-slate-500 truncate">Collected Revenue</span>
                      </div>
                      <span className="text-slate-800 font-black shrink-0">{isCardMasked("efficiency") ? "₹••••••" : formatP(totalEarnings)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block shrink-0" />
                        <span className="text-slate-500 truncate">Overdue (Till Now)</span>
                      </div>
                      <span className="text-rose-600 font-black shrink-0">{isCardMasked("efficiency") ? "₹••••••" : formatP(currentOverdueAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100/60 text-[11px]">
                      <span className="text-slate-400 truncate">Full Year Target</span>
                      <span className="text-slate-600 font-bold shrink-0">{isCardMasked("efficiency") ? "₹••••••" : formatP(totalSales)} ({fullYearCollectionEfficiency}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Collection & Activities Feed ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {/* Recent Collections Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">Recent Fee Collections</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Last 5 counter payments</p>
                      </div>
                      <PrivacyEyeButton cardKey="recent" title="Recent Receipts" />
                    </div>
                    <button onClick={() => setActiveTab("ledger")} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">All Vouchers</button>
                  </div>

                  {/* Mobile View: High density card list */}
                  <div className="block sm:hidden divide-y divide-slate-100 px-4">
                    {recentReceipts.map((rec) => (
                      <div key={rec.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-xs truncate">{rec.studentName}</span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                              rec.method === "CASH"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}>
                              {rec.method}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                            {rec.receiptNo} • {rec.classSection} • {rec.createdAt}
                          </p>
                        </div>
                        <span className="font-black text-slate-900 text-xs shrink-0">
                          {isCardMasked("recent") ? "₹••••" : formatP(rec.amount)}
                        </span>
                      </div>
                    ))}
                    {recentReceipts.length === 0 && (
                      <div className="py-6 text-center text-[10px] text-slate-400 font-semibold italic">
                        No collection receipts found.
                      </div>
                    )}
                  </div>

                  {/* Desktop View: Table (>= sm) */}
                  <div className="hidden sm:block overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200/50 text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                          <th className="py-3 px-6">Voucher</th>
                          <th className="py-3 px-6">Student</th>
                          <th className="py-3 px-6">Date</th>
                          <th className="py-3 px-6">Mode</th>
                          <th className="py-3 px-6 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-xs font-semibold text-slate-700">
                        {recentReceipts.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3.5 px-6 font-black text-indigo-600">{rec.receiptNo}</td>
                            <td className="py-3.5 px-6">
                              <p className="font-extrabold text-slate-800">{rec.studentName}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{rec.classSection}</p>
                            </td>
                            <td className="py-3.5 px-6 text-slate-500 text-[10px] font-bold">{rec.createdAt}</td>
                            <td className="py-3.5 px-6">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                rec.method === "CASH"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-blue-50 text-blue-700 border-blue-100"
                              }`}>
                                {rec.method}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right font-black text-slate-900">
                              {isCardMasked("recent") ? "₹••••••" : formatP(rec.amount)}
                            </td>
                          </tr>
                        ))}
                        {recentReceipts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[10px] text-slate-400 font-semibold italic">
                              No collection receipts found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Today's Collection summary */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Today's Collections</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Tally by payment modes</p>
                    </div>
                    <PrivacyEyeButton cardKey="today" title="Today's Collections" />
                  </div>

                  <div className="space-y-2.5 sm:space-y-3.5 my-3.5 sm:my-5">
                    <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" />
                        <span className="text-xs font-semibold text-slate-600">Cash Counter</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{isCardMasked("today") ? "₹••••••" : formatP(todayCash)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />
                        <span className="text-xs font-semibold text-slate-600">UPI Smart Pay</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{isCardMasked("today") ? "₹••••••" : formatP(todayUpi)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block" />
                        <span className="text-xs font-semibold text-slate-600">Bank / Online / Cheques</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{isCardMasked("today") ? "₹••••••" : formatP(todayBank)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/75 border border-indigo-100/50">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Total Collected Today</span>
                    <span className="text-lg sm:text-xl font-black text-indigo-700">{isCardMasked("today") ? "₹••••••" : formatP(todayTotal)}</span>
                  </div>
                </div>
              </div>

              {/* ─── Detailed analytics (Class breakdown + Top Collectors + Notes) ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6">
                
                {/* Class breakdown */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Class-wise Revenue</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Top 5 classes by collection</p>
                    </div>
                    <PrivacyEyeButton cardKey="classes" title="Class Revenue" />
                  </div>

                  <div className="space-y-3 sm:space-y-4 my-3.5 sm:my-5 flex-1 justify-center flex flex-col">
                    {classCollectionsList.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-700">Class {item.className} <span className="text-[10px] text-slate-400 font-medium">({item.count} std)</span></span>
                          <span className="text-slate-800 font-black">{isCardMasked("classes") ? "₹••••" : formatP(item.collected)} <span className="text-[9px] text-rose-500 font-medium ml-1">({isCardMasked("classes") ? "₹••••" : formatP(item.dues)} due)</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="bg-indigo-500 h-full rounded-l-full" style={{ width: `${item.efficiency}%` }} />
                          <div className="bg-rose-200 h-full rounded-r-full" style={{ width: `${100 - item.efficiency}%` }} />
                        </div>
                      </div>
                    ))}
                    {classCollectionsList.length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-6 italic">No classes available.</p>
                    )}
                  </div>

                  <button onClick={() => setActiveTab("structures")} className="w-full text-center text-xs font-bold text-indigo-600 hover:underline border-t border-slate-100 pt-3 sm:pt-4 cursor-pointer">Fee Structures & Classes</button>
                </div>

                {/* Top collectors */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Staff Collectors Ledger</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Aggregate logs by users</p>
                    </div>
                    <PrivacyEyeButton cardKey="collectors" title="Staff Totals" />
                  </div>

                  <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin my-3 sm:my-4 space-y-1">
                    {collectorsList.map((col, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs border border-slate-200/40">
                            {col.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">
                              {col.name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{col.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-800">{isCardMasked("collectors") ? "₹••••••" : formatP(col.total)}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">{col.count} Vouchers</p>
                        </div>
                      </div>
                    ))}
                    {collectorsList.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400 italic">No collectors recorded today.</div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 sm:pt-4">
                    <button onClick={() => setActiveTab("users")} className="w-full text-center text-xs font-bold text-indigo-600 hover:underline cursor-pointer">Manage Staff Accounts</button>
                  </div>
                </div>

                {/* Notes Scratchpad */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight">Admin Scratchpad</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Quick reminders & notes</p>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[160px] my-3 sm:my-4 pr-1 scrollbar-thin space-y-2">
                    {notes.map((note, index) => (
                      <div key={index} className="flex justify-between items-start gap-2 p-2.5 rounded-xl sm:rounded-2xl border border-amber-100 bg-amber-50/40 text-xs font-semibold text-slate-700 shadow-2xs">
                        <p className="flex-1 leading-relaxed">{note}</p>
                        <button 
                          onClick={() => deleteNote(index)}
                          className="p-1 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400 italic">
                        No notes. Write reminders below!
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 sm:pt-4 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add quick reminder..." 
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addNote();
                      }}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 bg-slate-50/50"
                    />
                    <button 
                      onClick={addNote}
                      className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl transition-colors cursor-pointer text-xs font-bold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Top Critical Defaulters Alert Widget ─── */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 sm:mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight">
                        Critical Fee Defaulters Alert
                      </h4>
                      <PrivacyEyeButton cardKey="defaulters" title="Defaulter Amounts" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      Top outstanding accounts requiring administrative follow-up
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab("defaulters")}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Full Defaulters Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* ─── MOBILE VIEW: High-Density Cards (< sm) ─── */}
                <div className="block sm:hidden divide-y divide-slate-100">
                  {topDefaulters.map((def) => (
                    <div key={def.id} className="py-3 sm:py-3.5 space-y-2 sm:space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{def.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-bold">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">Class {def.classSection}</span>
                            {def.admNo && <span>ADM: {def.admNo}</span>}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-700 font-black text-[10px] shrink-0">
                          {def.count} {def.count === 1 ? "Bill" : "Bills"}
                        </span>
                      </div>

                      {def.phone ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <a href={`tel:${def.phone}`} className="text-indigo-600 hover:underline">
                            {def.phone}
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Phone not registered</span>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Overdue</span>
                          <span className="text-sm font-black text-rose-600">
                            {isCardMasked("defaulters") ? "₹••••••" : formatP(def.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {def.phone && (
                            <button
                              type="button"
                              onClick={() => void openFeeReminder(def)}
                              disabled={loadingReminders[def.id]}
                              title="Send WhatsApp Reminder"
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all shadow-xs flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 text-white shrink-0" />
                              <span>{loadingReminders[def.id] ? "Preparing…" : "WhatsApp"}</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStudentId(def.id);
                              setActiveTab("collect");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            Collect Fee
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {topDefaulters.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 font-semibold italic">
                      🎉 Excellent! No fee defaulters recorded in the system.
                    </div>
                  )}
                </div>

                {/* ─── DESKTOP VIEW: Table (>= sm) ─── */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200/50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Student & Roll / ADM</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Parent Phone</th>
                        <th className="py-3 px-4 text-center">Unpaid Months</th>
                        <th className="py-3 px-4 text-right">Total Overdue</th>
                        <th className="py-3 px-4 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {topDefaulters.map((def) => (
                        <tr key={def.id} className="hover:bg-rose-50/20 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-extrabold text-slate-900">{def.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">ADM: {def.admNo || "N/A"}</p>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700">
                            Class {def.classSection}
                          </td>
                          <td className="py-3 px-4">
                            {def.phone ? (
                              <a
                                href={`tel:${def.phone}`}
                                className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{def.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Not registered</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-700 font-black text-[10px]">
                              {def.count} {def.count === 1 ? "Bill" : "Bills"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600">
                            {isCardMasked("defaulters") ? "₹••••••" : formatP(def.amount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {def.phone && (
                            <button
                              type="button"
                              onClick={() => void openFeeReminder(def)}
                              disabled={loadingReminders[def.id]}
                              title="Send WhatsApp Reminder"
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all shadow-xs flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 text-white shrink-0" />
                              <span>{loadingReminders[def.id] ? "Preparing…" : "WhatsApp"}</span>
                            </button>
                          )}
                          <button
                                onClick={() => {
                                  setSelectedStudentId(def.id);
                                  setActiveTab("collect");
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                Collect Fee
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {topDefaulters.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-semibold italic">
                            🎉 Excellent! No fee defaulters recorded in the system.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── Student Birthdays Hub (Date-Wise Rolling Window + Today's Hero Celebration) ─── */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="p-2 sm:p-2.5 bg-gradient-to-br from-pink-500 to-amber-500 text-white rounded-xl sm:rounded-2xl shadow-sm">
                      <Gift className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Student Birthdays Hub</h4>
                        {todayBirthdays.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-100 text-pink-700 border border-pink-200 animate-pulse">
                            🎉 {todayBirthdays.length} {todayBirthdays.length === 1 ? "Birthday" : "Birthdays"} Today!
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Live calendar • Today & next 30 days
                      </p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-3 py-1 rounded-xl border border-slate-200">
                      Total: {allComputedBirthdays.length} Recorded
                    </span>
                  </div>
                </div>

                {/* ── Today's Birthdays (Hero Mode) ── */}
                {todayBirthdays.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-black text-pink-500 uppercase tracking-wider">
                      Today's Celebrations
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {todayBirthdays.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-pink-100 bg-gradient-to-r from-pink-50 to-white shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-base sm:text-lg border-2 border-pink-200">
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{s.name}</p>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                Class {s.classSection} • Turning {s.turningAge || "?"}
                              </p>
                            </div>
                          </div>
                          {s.phone && (
                            <a
                              href={`https://wa.me/91${s.phone}?text=Dear%20Parent,%20Wishing%20a%20very%20Happy%20Birthday%20to%20${encodeURIComponent(s.name)}!%20May%20this%20special%20day%20bring%20lots%20of%20joy%20and%20success.%20-%20From%20${encodeURIComponent(schoolInfo.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                              <span>Wish</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Upcoming Birthdays (Next 30 Days) ── */}
                <div className="space-y-2.5">
                  {todayBirthdays.length > 0 && (
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Coming Up Next
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    {upcomingBirthdays.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-xs transition-all group"
                      >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white border border-slate-200/60 text-slate-800 flex flex-col items-center justify-center font-black shadow-2xs group-hover:border-indigo-300 transition-colors shrink-0">
                          <span className="text-[11px] sm:text-xs font-black leading-none">{s.day}</span>
                          <span className="text-[7px] sm:text-[8px] text-indigo-600 uppercase font-black">{s.month}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{s.name}</p>
                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-0.5">
                            <span className="truncate">Class {s.classSection}</span>
                            <span className={`px-1.5 py-0.5 rounded font-black shrink-0 ${
                              s.diffDays === 1
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200/70 text-slate-600"
                            }`}>
                              {s.diffDays === 1 ? "Tomorrow" : `In ${s.diffDays}d`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {todayBirthdays.length === 0 && upcomingBirthdays.length === 0 && (
                      <p className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold italic">
                        🎉 No upcoming birthdays in the next 30 days.
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>
    </div>
  );
}
