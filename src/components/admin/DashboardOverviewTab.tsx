"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, EyeOff, Eye, TrendingUp, Users, AlertTriangle, 
  UserCheck, CreditCard, PlusCircle, Megaphone, Printer, 
  ArrowRight, Phone, Gift, X 
} from "lucide-react";
import { formatP } from "@/lib/currency";
import { getISTDateString, getTodayIST, formatCanonicalDOBIso, MONTHS_CANONICAL } from "@/lib/dateUtils";
import { 
  generateFeeReminderWhatsAppUrl, 
  isDueUpToCurrentMonth 
} from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

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
  dueItems,
  receipts,
  ledgerEntries,
  schoolInfo,
  classes,
  usersList,
  billingSummary,
  studentsLoaded,
  billingLoaded,
  attendanceLoaded,
  attendances,
  updateSchoolInfo,
  showToast,
  setActiveTab,
  eventsList,
  addEvent,
  setSelectedStudentId
}: DashboardOverviewTabProps) {

  // Redesigned Dashboard State
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
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
      [cardKey]: !prev[cardKey],
    }));
  };

  const toggleGlobalPrivacy = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_privacy_mode", String(next));
      }
      if (next) {
        setRevealedCards({});
      } else {
        setRevealedCards({
          revenue: true,
          dues: true,
          chart: true,
          efficiency: true,
          today: true,
          recent: true,
          classes: true,
          collectors: true,
          defaulters: true,
          ledger: true,
          audit: true,
        });
      }
      return next;
    });
  };

  const isCardMasked = (cardKey: string) => {
    if (!privacyMode) return false;
    return !revealedCards[cardKey];
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

  const studentByIdMap = useMemo(() => {
    const map = new Map<string, any>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  return (
    <div className="space-y-6 font-sans mobile-edge-grid w-full max-w-full overflow-x-hidden text-left">
      {/* ─── Header shown only on Dashboard Overview ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Welcome back, {user?.name || "Admin"} 👋
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
              Session Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage operations and finance for <span className="font-bold text-slate-700">{schoolInfo.name || "School ERP"}</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-700">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operational Control</p>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              System Live
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-fade-in font-sans">
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

          const activeReceipts = receipts.filter(r => r.status !== "REVERSED");
          const totalEarnings = activeReceipts.reduce((sum, r) => sum + r.amount, 0);

          // Dues Segregation: Current Overdue (due up to current month) vs Future Academic Year Target
          const currentDueItems = dueItems.filter(d => d.status === "UNPAID" && isDueUpToCurrentMonth(d));
          const currentOverdueAmount = currentDueItems.reduce((sum, d) => sum + d.amount, 0);
          const futureUnbilledItems = dueItems.filter(d => d.status === "UNPAID" && !isDueUpToCurrentMonth(d));
          const futureUnbilledAmount = futureUnbilledItems.reduce((sum, d) => sum + d.amount, 0);
          const totalDues = dueItems.reduce((sum, d) => sum + d.amount, 0);

          // Collection Efficiency:
          // 1. Current Recovery Rate (Collected vs total due demand up to current month)
          const currentTotalDemand = totalEarnings + currentOverdueAmount;
          const currentCollectionEfficiency = currentTotalDemand > 0 ? Math.round((totalEarnings / currentTotalDemand) * 100) : 0;

          // 2. Full Session Annual Realization (Collected vs full 12-month budget target)
          const totalSales = totalEarnings + totalDues;
          const fullYearCollectionEfficiency = totalSales > 0 ? Math.round((totalEarnings / totalSales) * 100) : 0;
          const collectionEfficiency = currentCollectionEfficiency;

          const cashTally = activeReceipts.filter(r => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
          const upiTally = activeReceipts.filter(r => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);
          const bankTally = activeReceipts.filter(r => r.method === "BANK_TRANSFER" || r.method === "CHEQUE" || r.method === "ONLINE").reduce((sum, r) => sum + r.amount, 0);

          const todayStr = getTodayIST();
          const todayReceipts = activeReceipts.filter(r => r.createdAt === todayStr);
          const todayCash = todayReceipts.filter(r => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
          const todayUpi = todayReceipts.filter(r => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);
          const todayBank = todayReceipts.filter(r => r.method === "BANK_TRANSFER" || r.method === "CHEQUE" || r.method === "ONLINE").reduce((sum, r) => sum + r.amount, 0);
          const todayTotal = todayReceipts.reduce((sum, r) => sum + r.amount, 0);

          const currentMonthStr = todayStr.slice(0, 7);
          const monthlyReceipts = activeReceipts.filter(r => r.createdAt.startsWith(currentMonthStr));
          const monthlyTotal = monthlyReceipts.reduce((sum, r) => sum + r.amount, 0);

          const staffUsers = usersList.filter(u => u.role === "ADMIN" || u.role === "ACCOUNTANT" || u.role === "TEACHER");
          const staffUsersCount = staffUsers.length || 1;

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

          // Compute high-priority defaulters (due up to current month)
          interface TopDefaulterRecord {
            id: string;
            student?: any;
            name: string;
            classSection: string;
            amount: number;
            count: number;
            phone: string;
            admNo: string;
            dues: any[];
          }
          const studentDueMap: { [stdId: string]: TopDefaulterRecord } = {};
          dueItems.forEach(d => {
            if (d.status === "UNPAID" && isDueUpToCurrentMonth(d)) {
              if (!studentDueMap[d.studentId]) {
                const std = studentByIdMap.get(d.studentId);
                const phoneNum = std?.fatherMobile || std?.motherMobile || std?.parentPhone || "";
                studentDueMap[d.studentId] = {
                  id: d.studentId,
                  student: std,
                  name: std?.name || "Student",
                  classSection: std ? (std.section ? `${std.class}-${std.section}` : std.class) : "N/A",
                  amount: 0,
                  count: 0,
                  phone: phoneNum,
                  admNo: std?.admissionNo || "",
                  dues: []
                };
              }
              studentDueMap[d.studentId].amount += d.amount;
              studentDueMap[d.studentId].count += 1;
              studentDueMap[d.studentId].dues.push(d);
            }
          });
          const topDefaulters: TopDefaulterRecord[] = Object.values(studentDueMap)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

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

          const monthlyRevenue: { [key: string]: number } = {
            "Apr": 0, "May": 0, "Jun": 0, "Jul": 0, "Aug": 0, "Sep": 0,
            "Oct": 0, "Nov": 0, "Dec": 0, "Jan": 0, "Feb": 0, "Mar": 0
          };
          const monthMapping: { [key: string]: string } = {
            "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep",
            "10": "Oct", "11": "Nov", "12": "Dec", "01": "Jan", "02": "Feb", "03": "Mar"
          };
          activeReceipts.forEach(r => {
            const parts = r.createdAt.split("-");
            const yearKey = parseInt(parts[0], 10);
            const monthKey = parts[1];
            const monthName = monthMapping[monthKey];
            const expectedYear = parseInt(monthKey, 10) >= 4 ? sessionStartYear : sessionStartYear + 1;
            if (monthName && (!yearKey || yearKey === expectedYear)) {
              monthlyRevenue[monthName] += r.amount;
            }
          });
          const monthsOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
          const currentMonthShort = new Date().toLocaleString("en-US", { month: "short" });
          
          // Custom SVG Line Chart Coordinates
          const maxRev = Math.max(...Object.values(monthlyRevenue), 1000);
          const chartWidth = 600;
          const chartHeight = 220;
          const paddingLeft = 55;
          const paddingRight = 20;
          const paddingTop = 20;
          const paddingBottom = 30;
          
          const activeWidth = chartWidth - paddingLeft - paddingRight;
          const activeHeight = chartHeight - paddingTop - paddingBottom;
          
          const points = monthsOrder.map((m, idx) => {
            const val = monthlyRevenue[m] || 0;
            const x = paddingLeft + (idx / (monthsOrder.length - 1)) * activeWidth;
            const y = chartHeight - paddingBottom - (val / maxRev) * activeHeight;
            return { x, y, month: m, val };
          });
          
          let linePath = "";
          let areaPath = "";
          if (points.length > 0) {
            linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
            areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;
          }

          // Doughnut Chart Setup
          const doughnutRadius = 45;
          const doughnutCirc = 2 * Math.PI * doughnutRadius;
          const doughnutOffset = doughnutCirc - (collectionEfficiency / 100) * doughnutCirc;

          // Recent Transactions
          const recentReceipts = [...receipts]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
            .slice(0, 5);

          // Class-wise collections
          const classCollections: { [key: string]: { collected: number; dues: number; count: number } } = {};
          if (classes && Array.isArray(classes)) {
            classes.forEach(c => {
              classCollections[c.name] = { collected: 0, dues: 0, count: 0 };
            });
          }
          if (students && Array.isArray(students)) {
            students.forEach(s => {
              if (s.class) {
                if (!classCollections[s.class]) {
                  classCollections[s.class] = { collected: 0, dues: 0, count: 0 };
                }
                classCollections[s.class].count += 1;
              }
            });
          }
          if (receipts && Array.isArray(receipts)) {
            receipts.forEach(r => {
              let cls = "";
              if (r.studentId && students && Array.isArray(students)) {
                const s = students.find(std => std.id === r.studentId);
                if (s) cls = s.class;
              }
              if (!cls && r.classSection) {
                const match = r.classSection.match(/(?:Class\s+)?([^\s-]+)/i);
                if (match) cls = match[1];
              }
              if (cls) {
                if (!classCollections[cls]) {
                  classCollections[cls] = { collected: 0, dues: 0, count: 0 };
                }
                classCollections[cls].collected += r.amount || 0;
              }
            });
          }
          if (dueItems && Array.isArray(dueItems)) {
            dueItems.forEach(d => {
              let cls = "";
              if (d.studentId && students && Array.isArray(students)) {
                const s = students.find(std => std.id === d.studentId);
                if (s) cls = s.class;
              }
              if (cls) {
                if (!classCollections[cls]) {
                  classCollections[cls] = { collected: 0, dues: 0, count: 0 };
                }
                classCollections[cls].dues += d.amount || 0;
              }
            });
          }
          const classCollectionsList = Object.entries(classCollections)
            .map(([className, stats]) => {
              const total = stats.collected + stats.dues;
              return {
                className,
                collected: stats.collected,
                dues: stats.dues,
                count: stats.count,
                total,
                efficiency: total > 0 ? Math.round((stats.collected / total) * 100) : 0
              };
            })
            .sort((a, b) => b.collected - a.collected)
            .slice(0, 5);

          // Doughnut sizes helper
          const rSize = 140;
          const radius = 50;
          const strokeW = 12;
          const center = rSize / 2;
          const circ = doughnutCirc;

          return (
            <div className="space-y-6">
              
              {/* ─── Quick Actions Command Hub ─── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Quick Command Hub:
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setActiveTab("collect")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fee Counter</span>
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem("students_import_mode", "single");
                      setActiveTab("students");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>New Admission</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("attendance")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Attendance</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("notices")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>Post Circular</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("defaulters")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/60 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Defaulters List</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("print_marksheets")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Marksheets</span>
                  </button>
                  <button
                    onClick={toggleGlobalPrivacy}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
                      privacyMode
                        ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/80"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80"
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
                </div>
              </div>

              {/* ─── Metric Cards Grid ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue Card */}
                <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.035)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</span>
                        <PrivacyEyeButton cardKey="revenue" title="Collected Revenue" />
                      </div>
                      <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <TrendingUp className="w-5 h-5" />
                      </span>
                    </div>
                    {!billingLoaded ? (
                      <div className="mt-4 animate-pulse">
                        <div className="h-8 w-28 bg-slate-200/70 rounded-xl" />
                      </div>
                    ) : (
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">
                        {isCardMasked("revenue") ? (
                          <span className="font-mono tracking-widest text-slate-400 select-none">₹••••••</span>
                        ) : (
                          formatP(totalEarnings)
                        )}
                      </h3>
                    )}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100/80">
                    {!billingLoaded ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3 w-full bg-slate-100 rounded-full" />
                        <div className="h-2.5 w-24 bg-slate-100 rounded-md mt-1" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-400 font-semibold">Collected Ratio</span>
                          <span className="text-indigo-600 font-black">{collectionEfficiency}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${collectionEfficiency}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-400 font-medium">
                          <span>This month: <strong className="text-slate-600">+{isCardMasked("revenue") ? "₹••••" : formatP(monthlyTotal)}</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Enrolled Card */}
                <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.035)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
                      <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                        <Users className="w-5 h-5" />
                      </span>
                    </div>
                    {!studentsLoaded ? (
                      <div className="mt-4 animate-pulse">
                        <div className="h-8 w-20 bg-slate-200/70 rounded-xl" />
                      </div>
                    ) : (
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-4">{totalStudents}</h3>
                    )}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100/80">
                    {!studentsLoaded ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3 w-full bg-slate-100 rounded-full" />
                        <div className="h-2.5 w-24 bg-slate-100 rounded-md mt-1" />
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                          <span className="text-blue-600">{boysCount} Boys ({boysPct}%)</span>
                          <span className="text-pink-500">{girlsCount} Girls ({girlsPct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${boysPct}%` }}></div>
                          <div className="h-full bg-pink-400" style={{ width: `${girlsPct}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-400 font-medium">
                          <span>New admissions: <strong className="text-slate-600">{newAdmissionsCount}</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Dues Card */}
                <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.035)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Dues</span>
                        <PrivacyEyeButton cardKey="dues" title="Pending Dues" />
                      </div>
                      <span className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                        <AlertTriangle className="w-5 h-5" />
                      </span>
                    </div>
                    {!billingLoaded ? (
                      <div className="mt-4 animate-pulse">
                        <div className="h-8 w-28 bg-slate-200/70 rounded-xl" />
                      </div>
                    ) : (
                      <div className="mt-4">
                        <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                          {isCardMasked("dues") ? (
                            <span className="font-mono tracking-widest text-slate-400 select-none">₹••••••</span>
                          ) : (
                            formatP(currentOverdueAmount)
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Full Year Target: <span className="text-slate-600 font-extrabold">{isCardMasked("dues") ? "₹••••••" : formatP(totalDues)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100/80">
                    {!billingLoaded ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3 w-full bg-slate-100 rounded-full" />
                        <div className="h-2.5 w-20 bg-slate-100 rounded-md mt-1" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-400 font-semibold">Overdue Ratio</span>
                          <span className="text-rose-600 font-black">{100 - collectionEfficiency}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${100 - collectionEfficiency}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-400 font-medium">
                          <span>Invoices: <strong className="text-slate-600">{currentDueItems.length} overdue</strong> <span className="text-slate-400">({dueItems.filter(d => d.status === "UNPAID").length} total)</span></span>
                          <button onClick={() => setActiveTab("defaulters")} className="text-indigo-600 hover:underline font-bold cursor-pointer">View List</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Attendance Card */}
                <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.035)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                      <span className={`p-2.5 rounded-2xl ${hasTodayAttendance ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        <UserCheck className="w-5 h-5" />
                      </span>
                    </div>
                    {!attendanceLoaded ? (
                      <div className="mt-4 animate-pulse">
                        <div className="h-8 w-20 bg-slate-200/70 rounded-xl" />
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <h3 className={`text-2xl font-black tracking-tight ${hasTodayAttendance ? "text-emerald-600" : "text-amber-600"}`}>
                            {hasTodayAttendance ? `${attendanceRate}%` : "Pending"}
                          </h3>
                          {!hasTodayAttendance && latestRecordedDate && (
                            <span className="text-[10px] font-bold text-slate-400">
                              (Last: {attendanceRate}%)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {hasTodayAttendance ? "Today's Live Roll Call" : "Today not marked yet"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100/80">
                    {!attendanceLoaded ? (
                      <div className="h-8 w-full bg-slate-100 rounded-xl animate-pulse" />
                    ) : hasTodayAttendance ? (
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold text-slate-500">
                        <div className="bg-emerald-50 text-emerald-700 py-1 rounded">
                          <p className="text-[8px] uppercase">Pres</p>
                          <p>{presentCount}</p>
                        </div>
                        <div className="bg-rose-50 text-rose-700 py-1 rounded">
                          <p className="text-[8px] uppercase">Abs</p>
                          <p>{absentCount}</p>
                        </div>
                        <div className="bg-amber-50 text-amber-700 py-1 rounded">
                          <p className="text-[8px] uppercase">Late</p>
                          <p>{lateCount}</p>
                        </div>
                        <div className="bg-blue-50 text-blue-700 py-1 rounded">
                          <p className="text-[8px] uppercase">Lv</p>
                          <p>{leaveCount}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 bg-amber-50/70 px-2.5 py-1.5 rounded-xl border border-amber-100">
                        <span className="text-amber-800 font-semibold">Roll call not taken</span>
                        <button onClick={() => setActiveTab("attendance")} className="text-indigo-600 hover:underline font-extrabold cursor-pointer">Mark Now</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Visualizations Section (SVG Charts) ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Curve Chart (Modern Rounded Bar Chart with Growth Analytics) */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 relative flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
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

                  <div className="relative w-full h-[210px] flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2 px-1">
                    {monthsOrder.map((m) => {
                      const valPaise = monthlyRevenue[m] || 0;
                      const valRupees = Math.round(valPaise / 100);
                      const heightPct = maxRev > 0 ? Math.max((valPaise / maxRev) * 100, valPaise > 0 ? 8 : 3) : 3;
                      const isCurrentMonth = m.toLowerCase() === currentMonthShort.toLowerCase();
                      const isHighest = valPaise === Math.max(...Object.values(monthlyRevenue)) && valPaise > 0;

                      return (
                        <div 
                          key={m} 
                          className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                        >
                          {/* Hover Tooltip Popup */}
                          <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-xl whitespace-nowrap z-20">
                            <span className="text-slate-300">{m}: </span>
                            <span className="text-amber-300 font-black">{isCardMasked("chart") ? "₹••••••" : `₹${valRupees.toLocaleString('en-IN')}`}</span>
                          </div>

                          {/* Top value label for active months */}
                          {valRupees > 0 && (
                            <span className="text-[9px] font-black text-slate-700 mb-1.5 tracking-tight group-hover:text-indigo-600">
                              {isCardMasked("chart") ? "••••" : (valRupees >= 100000 ? `₹${(valRupees / 100000).toFixed(1)}L` : valRupees >= 1000 ? `₹${(valRupees / 1000).toFixed(valRupees % 1000 === 0 ? 0 : 1)}k` : `₹${valRupees}`)}
                            </span>
                          )}

                          {/* Bar Cylinder */}
                          <div className="w-full max-w-[34px] bg-slate-100/90 rounded-2xl p-0.5 flex flex-col justify-end h-full max-h-[140px]">
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-xl transition-all duration-500 relative ${
                                isHighest
                                  ? "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-500/30"
                                  : valRupees > 0
                                  ? "bg-gradient-to-t from-indigo-500 to-indigo-300"
                                  : "bg-slate-200/50"
                              } group-hover:brightness-110`}
                            >
                              {isCurrentMonth && valRupees > 0 && (
                                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 border border-white animate-ping" />
                              )}
                            </div>
                          </div>

                          {/* Month Label */}
                          <span className={`text-[10px] font-extrabold mt-2 uppercase tracking-wider ${
                            isCurrentMonth ? "text-indigo-600 font-black" : "text-slate-400 group-hover:text-slate-700"
                          }`}>
                            {m}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collection efficiency Doughnut */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Collection Efficiency</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Collected vs Pending Target</p>
                    </div>
                    <PrivacyEyeButton cardKey="efficiency" title="Efficiency Breakdown" />
                  </div>

                  <div className="flex items-center justify-center my-4 relative">
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
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{collectionEfficiency}%</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Recovered</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100/80 pt-4 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block" />
                        <span className="text-slate-500">Collected Revenue</span>
                      </div>
                      <span className="text-slate-800 font-black">{isCardMasked("efficiency") ? "₹••••••" : formatP(totalEarnings)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                        <span className="text-slate-500">Overdue (Till Now)</span>
                      </div>
                      <span className="text-rose-600 font-black">{isCardMasked("efficiency") ? "₹••••••" : formatP(currentOverdueAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100/60 text-[11px]">
                      <span className="text-slate-400">Full Year Target</span>
                      <span className="text-slate-600 font-bold">{isCardMasked("efficiency") ? "₹••••••" : formatP(totalSales)} ({fullYearCollectionEfficiency}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Collection & Activities Feed ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Collections Table */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden flex flex-col justify-between">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">Recent Fee Collections</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Last 5 counter payments</p>
                      </div>
                      <PrivacyEyeButton cardKey="recent" title="Recent Receipts" />
                    </div>
                    <button onClick={() => setActiveTab("ledger")} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">All Vouchers</button>
                  </div>

                  <div className="overflow-x-auto flex-1">
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
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Today's Collections</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Tally by payment modes</p>
                    </div>
                    <PrivacyEyeButton cardKey="today" title="Today's Collections" />
                  </div>

                  <div className="space-y-3.5 my-5">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" />
                        <span className="text-xs font-semibold text-slate-600">Cash Counter</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{isCardMasked("today") ? "₹••••••" : formatP(todayCash)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />
                        <span className="text-xs font-semibold text-slate-600">UPI Smart Pay</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{isCardMasked("today") ? "₹••••••" : formatP(todayUpi)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block" />
                        <span className="text-xs font-semibold text-slate-600">Bank / Online / Cheques</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{isCardMasked("today") ? "₹••••••" : formatP(todayBank)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/75 border border-indigo-100/50">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Total Collected Today</span>
                    <span className="text-xl font-black text-indigo-700">{isCardMasked("today") ? "₹••••••" : formatP(todayTotal)}</span>
                  </div>
                </div>
              </div>

              {/* ─── Detailed analytics (Class breakdown + Top Collectors + Notes) ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Class breakdown */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Class-wise Revenue</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Top 5 classes by collection</p>
                    </div>
                    <PrivacyEyeButton cardKey="classes" title="Class Revenue" />
                  </div>

                  <div className="space-y-4 my-5 flex-1 justify-center flex flex-col">
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

                  <button onClick={() => setActiveTab("structures")} className="w-full text-center text-xs font-bold text-indigo-600 hover:underline border-t border-slate-100 pt-4 cursor-pointer">Fee Structures & Classes</button>
                </div>

                {/* Top collectors */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Staff Collectors Ledger</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Aggregate logs by users</p>
                    </div>
                    <PrivacyEyeButton cardKey="collectors" title="Staff Totals" />
                  </div>

                  <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin my-4 space-y-1">
                    {collectorsList.map((col, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3.5 hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs border border-slate-200/40">
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

                  <div className="border-t border-slate-100 pt-4">
                    <button onClick={() => setActiveTab("users")} className="w-full text-center text-xs font-bold text-indigo-600 hover:underline cursor-pointer">Manage Staff Accounts</button>
                  </div>
                </div>

                {/* Notes Scratchpad */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight">Admin Scratchpad</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Quick reminders & notes</p>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[160px] my-4 pr-1 scrollbar-thin space-y-2">
                    {notes.map((note, index) => (
                      <div key={index} className="flex justify-between items-start gap-2 p-2.5 rounded-2xl border border-amber-100 bg-amber-50/40 text-xs font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
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

                  <div className="border-t border-slate-100 pt-4 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add quick reminder..." 
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addNote();
                      }}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 bg-slate-50/50"
                    />
                    <button 
                      onClick={addNote}
                      className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-colors cursor-pointer text-xs font-bold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Top Critical Defaulters Alert Widget ─── */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
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
                    <div key={def.id} className="py-3.5 space-y-2.5">
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
                            <a
                              href={generateFeeReminderWhatsAppUrl({
                                student: def.student ? {
                                  id: def.student.id,
                                  name: def.student.name,
                                  class: def.student.class,
                                  section: def.student.section,
                                  rollNo: def.student.rollNo,
                                  admissionNo: def.student.admissionNo,
                                  fatherName: def.student.fatherName || def.student.parentName,
                                  fatherMobile: def.student.fatherMobile,
                                  motherMobile: def.student.motherMobile,
                                  parentPhone: def.student.parentPhone,
                                } : {
                                  id: def.id,
                                  name: def.name,
                                  class: def.classSection.split("-")[0] || "",
                                  section: def.classSection.split("-")[1] || "",
                                  admissionNo: def.admNo,
                                  fatherMobile: def.phone,
                                  parentPhone: def.phone,
                                },
                                unpaidDues: def.dues.length > 0 ? def.dues : [{ id: "due", name: "Outstanding School Fee", amount: def.amount, dueDate: new Date().toISOString() }],
                                schoolInfo,
                                senderRole: "ADMIN",
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Send WhatsApp Reminder"
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all shadow-xs flex items-center gap-1 active:scale-95"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 text-white shrink-0" />
                              <span>WhatsApp</span>
                            </a>
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
                                <a
                                  href={generateFeeReminderWhatsAppUrl({
                                    student: def.student ? {
                                      id: def.student.id,
                                      name: def.student.name,
                                      class: def.student.class,
                                      section: def.student.section,
                                      rollNo: def.student.rollNo,
                                      admissionNo: def.student.admissionNo,
                                      fatherName: def.student.fatherName || def.student.parentName,
                                      fatherMobile: def.student.fatherMobile,
                                      motherMobile: def.student.motherMobile,
                                      parentPhone: def.student.parentPhone,
                                    } : {
                                      id: def.id,
                                      name: def.name,
                                      class: def.classSection.split("-")[0] || "",
                                      section: def.classSection.split("-")[1] || "",
                                      admissionNo: def.admNo,
                                      fatherMobile: def.phone,
                                      parentPhone: def.phone,
                                    },
                                    unpaidDues: def.dues.length > 0 ? def.dues : [{ id: "due", name: "Outstanding School Fee", amount: def.amount, dueDate: new Date().toISOString() }],
                                    schoolInfo,
                                    senderRole: "ADMIN",
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Send WhatsApp Reminder"
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all shadow-xs flex items-center gap-1 active:scale-95"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 text-white shrink-0" />
                                  <span>WhatsApp</span>
                                </a>
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
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-gradient-to-br from-pink-500 to-amber-500 text-white rounded-2xl shadow-sm">
                      <Gift className="w-5 h-5 animate-bounce" />
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
                          className="flex items-center justify-between p-4 rounded-2xl border-2 border-pink-100 bg-gradient-to-r from-pink-50 to-white shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-lg border-2 border-pink-200">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {upcomingBirthdays.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-xs transition-all group"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/60 text-slate-800 flex flex-col items-center justify-center font-black shadow-2xs group-hover:border-indigo-300 transition-colors shrink-0">
                          <span className="text-xs font-black leading-none">{s.day}</span>
                          <span className="text-[8px] text-indigo-600 uppercase font-black">{s.month}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{s.name}</p>
                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-0.5">
                            <span>Class {s.classSection} • {s.birthYear}</span>
                            <span className={`px-1.5 py-0.5 rounded font-black ${
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
