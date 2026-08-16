"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth, Role } from "@/context/AuthContext";
import BottomSheet from "./BottomSheet";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  UserCheck,
  Calendar,
  BookOpen,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Bell,
  X,
  CreditCard,
  UserX,
  ArrowRightLeft,
  ChevronDown,
  Search,
  Building2,
  MoreHorizontal,
  Home,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Menu,
  Layers,
  Award,
  ShieldCheck,
  GraduationCap,
  Printer,
  Phone,
  Camera,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export interface NavItem {
  category: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: string;
  desktopOnly?: boolean;
}

// ─── Nav items per role ────────────────────────────────────────────────────
const getNavItems = (activeRole: string): NavItem[] => {
  switch (activeRole) {
    case "PARENT":
      return [
        { category: "Academic Portal", name: "Child's Dashboard", shortName: "Home", icon: Home, tab: "dashboard" },
        { category: "Academic Portal", name: "Academic Report Card", shortName: "Reports", icon: Award, tab: "reportcard" },
        { category: "Academic Portal", name: "Homework & Assignments", shortName: "Homework", icon: BookOpen, tab: "homework" },
        { category: "Academic Portal", name: "Attendance History", shortName: "Attendance", icon: Calendar, tab: "attendance" },
        { category: "Finance & Services", name: "Pay School Fees", shortName: "Fees", icon: CreditCard, tab: "fees" },
        { category: "Finance & Services", name: "Apply for Leave", shortName: "Leave", icon: FileText, tab: "leave" },
        { category: "Communication", name: "Notices & Circulars", shortName: "Notices", icon: Bell, tab: "notices" },
      ];
    case "TEACHER":
      return [
        { category: "Daily Academics", name: "Mark Attendance", shortName: "Attendance", icon: UserCheck, tab: "attendance" },
        { category: "Daily Academics", name: "Marks & Exam Roster", shortName: "Marks", icon: GraduationCap, tab: "marks" },
        { category: "Daily Academics", name: "Upload Homework", shortName: "Homework", icon: BookOpen, tab: "homework" },
        { category: "Daily Academics", name: "Fee Status & Dues", shortName: "Fee Dues", icon: AlertTriangle, tab: "defaulters" },
        { category: "Daily Academics", name: "Leave Requests", shortName: "Leaves", icon: FileText, tab: "leaves" },
        { category: "Communication", name: "Notices & Circulars", shortName: "Notices", icon: Bell, tab: "notices" },
      ];
    case "ACCOUNTANT":
      return [
        { category: "Fee Transactions", name: "Fee Collection", shortName: "Collect", icon: CreditCard, tab: "collect" },
        { category: "Fee Transactions", name: "Fee Defaulters & Dues", shortName: "Dues", icon: AlertTriangle, tab: "defaulters" },
        { category: "Fee Transactions", name: "Receipts & Ledger Logs", shortName: "Ledger", icon: ArrowRightLeft, tab: "ledger", desktopOnly: true },
        { category: "Communication", name: "Notices & Circulars", shortName: "Notices", icon: Bell, tab: "notices" },
      ];
    case "ADMIN":
      return [
        { category: "Overview", name: "Admin Dashboard", shortName: "Dashboard", icon: LayoutDashboard, tab: "dashboard" },
        { category: "Student & Academics", name: "Student Management", shortName: "Students", icon: Users, tab: "students" },
        { category: "Student & Academics", name: "Attendance Console", shortName: "Attendance", icon: UserCheck, tab: "attendance" },
        { category: "Student & Academics", name: "Marks & Exam Roster", shortName: "Marks", icon: GraduationCap, tab: "marks" },
        { category: "Student & Academics", name: "Print Marksheets", shortName: "Marksheets", icon: Printer, tab: "print_marksheets", desktopOnly: true },
        { category: "Student & Academics", name: "ID Cards & Photos", shortName: "ID Cards", icon: UserCheck, tab: "idcards", desktopOnly: true },
        { category: "Finance & Fees", name: "Fee Collection", shortName: "Collect", icon: CreditCard, tab: "collect" },
        { category: "Finance & Fees", name: "Fee Defaulters & Dues", shortName: "Dues", icon: AlertTriangle, tab: "defaulters" },
        { category: "Finance & Fees", name: "Receipts & Ledger", shortName: "Ledger", icon: ArrowRightLeft, tab: "ledger", desktopOnly: true },
        { category: "Finance & Fees", name: "Fee Structure Setup", shortName: "Fee Setup", icon: Settings, tab: "structures", desktopOnly: true },
        { category: "System & Communication", name: "Website Photos & Media", shortName: "Media", icon: Camera, tab: "website_media", desktopOnly: true },
        { category: "System & Communication", name: "Notices & Announcements", shortName: "Notices", icon: Bell, tab: "notices" },
        { category: "System & Communication", name: "User Access Control", shortName: "Users", icon: ShieldCheck, tab: "users", desktopOnly: true },
        { category: "System & Communication", name: "School Settings", shortName: "Settings", icon: Building2, tab: "school", desktopOnly: true },
        { category: "System & Communication", name: "System Audit Logs", shortName: "Audit", icon: FileSpreadsheet, tab: "audit", desktopOnly: true },
      ];
    default:
      return [];
  }
};

// How many items to show directly in bottom nav (rest go in "More")
const BOTTOM_NAV_VISIBLE = 4;

interface MegaMenuCategory {
  title: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: any;
  items: {
    name: string;
    tab: string;
    mode?: "directory" | "single" | "bulk";
  }[];
}

const getMegaMenuData = (activeRole: string): MegaMenuCategory[] => {
  switch (activeRole) {
    case "ADMIN":
      return [
        {
          title: "Student & Academics",
          textColor: "text-indigo-600",
          bgColor: "bg-indigo-50",
          borderColor: "border-indigo-100",
          icon: Users,
          items: [
            { name: "Student Directory", tab: "students", mode: "directory" },
            { name: "New Admission", tab: "students", mode: "single" },
            { name: "Bulk Import (CSV)", tab: "students", mode: "bulk" },
            { name: "Attendance Console", tab: "attendance" },
            { name: "Marks & Exam Roster", tab: "marks" },
            { name: "Print Marksheets", tab: "print_marksheets" },
            { name: "ID Cards & Photos", tab: "idcards" },
          ]
        },
        {
          title: "Finance & Fees",
          textColor: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-100",
          icon: CreditCard,
          items: [
            { name: "Fee Collection Counter", tab: "collect" },
            { name: "Fee Structures Setup", tab: "structures" },
            { name: "Defaulters & Dues List", tab: "defaulters" },
            { name: "Transactions Ledger", tab: "ledger" },
          ]
        },
        {
          title: "System & Management",
          textColor: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-100",
          icon: Settings,
          items: [
            { name: "Post Notices & Alerts", tab: "notices" },
            { name: "User Accounts Control", tab: "users" },
            { name: "School Profile Setup", tab: "school" },
            { name: "System Audit Logs", tab: "audit" },
          ]
        }
      ];
    case "ACCOUNTANT":
      return [
        {
          title: "Fee Transactions",
          textColor: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-100",
          icon: CreditCard,
          items: [
            { name: "Collect Fees Counter", tab: "collect" },
            { name: "Outstanding Dues Ledger", tab: "defaulters" },
            { name: "All Receipts Ledger", tab: "ledger" },
          ]
        },
        {
          title: "Announcements",
          textColor: "text-indigo-600",
          bgColor: "bg-indigo-50",
          borderColor: "border-indigo-100",
          icon: Bell,
          items: [
            { name: "Notices & Circulars", tab: "notices" },
          ]
        }
      ];
    case "TEACHER":
      return [
        {
          title: "Academics Console",
          textColor: "text-indigo-600",
          bgColor: "bg-indigo-50",
          borderColor: "border-indigo-100",
          icon: Award,
          items: [
            { name: "Mark Daily Attendance", tab: "attendance" },
            { name: "Exams & Marks Entry", tab: "marks" },
            { name: "Upload Homework Files", tab: "homework" },
            { name: "Class Fee Status & Dues", tab: "defaulters" },
            { name: "My Leave Requests", tab: "leaves" },
          ]
        },
        {
          title: "Bulletins",
          textColor: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-100",
          icon: Bell,
          items: [
            { name: "Notices & Circulars", tab: "notices" },
          ]
        }
      ];
    case "PARENT":
      return [
        {
          title: "Student Academic Portal",
          textColor: "text-indigo-600",
          bgColor: "bg-indigo-50",
          borderColor: "border-indigo-100",
          icon: GraduationCap,
          items: [
            { name: "Academic Report Card", tab: "reportcard" },
            { name: "Homework & Assignments", tab: "homework" },
            { name: "Attendance Calendar", tab: "attendance" },
          ]
        },
        {
          title: "Fee Payments & Notices",
          textColor: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-100",
          icon: CreditCard,
          items: [
            { name: "Pay School Fees Online", tab: "fees" },
            { name: "Apply for Leave", tab: "leave" },
            { name: "Notices & Circulars", tab: "notices" },
          ]
        }
      ];
    default:
      return [];
  }
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { activeRole, activeTab, setActiveTab, switchRole, user, students, notices, schoolInfo, logout } = useAuth();

  // Mobile states
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showNoticeSheet, setShowNoticeSheet] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Desktop states
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNoticeDropdown, setShowNoticeDropdown] = useState(false);
  const [sessionYear, setSessionYear] = useState("2026-2027");
  const [sessions, setSessions] = useState<{ id: string; name: string; isCurrent: boolean }[]>([]);
  const [showAppsModal, setShowAppsModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;

    fetch("/api/sessions")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSessions(data);
          const current = data.find(s => s.isCurrent);
          if (current) setSessionYear(current.name);
        }
      })
      .catch(err => console.error("Failed to load sessions", err));
  }, [user]);

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
  };

  const navItems = getNavItems(activeRole || "");
  // On mobile, hide desktop-only sections entirely
  const mobileNavItems = navItems.filter(item => !item.desktopOnly);
  const bottomNavItems = mobileNavItems.slice(0, BOTTOM_NAV_VISIBLE);
  const moreNavItems = mobileNavItems.slice(BOTTOM_NAV_VISIBLE);
  const latestNotice = notices.length > 0 ? notices[notices.length - 1] : null;
  // Desktop-only tab list (for guard)
  const desktopOnlyTabs = navItems.filter(i => i.desktopOnly).map(i => i.tab);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close sheets on tab change
  useEffect(() => {
    setShowMoreSheet(false);
    setShowNoticeSheet(false);
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowMoreSheet(false);
  };

  const roleColors: Record<string, string> = {
    ADMIN: "bg-indigo-600",
    ACCOUNTANT: "bg-emerald-600",
    TEACHER: "bg-amber-500",
    PARENT: "bg-rose-500",
  };
  const roleBadgeColor = mounted ? (roleColors[activeRole || ""] || "bg-slate-500") : "bg-slate-500";

  // Active tab label for mobile header
  const activeNavItem = navItems.find((i) => i.tab === activeTab) || navItems[0];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full max-w-full overflow-hidden bg-white md:bg-slate-50 text-slate-800 font-sans">

      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR (md and above)
      ════════════════════════════════════════ */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 bg-white p-5 shrink-0 select-none no-print">
        {/* Branding */}
        <div className="flex items-center gap-2.5 pb-6 border-b border-slate-100 mb-6 shrink-0">
          <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-9 w-9 rounded-full object-contain border border-slate-100 bg-white" />
          <div>
            <h1 className="font-extrabold text-xs text-slate-900 leading-tight">St. G.N.G. School</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Varanasi</p>
          </div>
        </div>

        {/* User Profile Card moved to bottom */}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 select-none">
          {mounted && navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            const showCategoryHeader = idx === 0 || navItems[idx - 1].category !== item.category;

            return (
              <React.Fragment key={item.tab + "-" + idx}>
                {showCategoryHeader && item.category && (
                  <span className={`px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 block ${idx > 0 ? "mt-4 mb-1.5" : "mb-1.5"}`}>
                    {item.category}
                  </span>
                )}
                <button
                  onClick={() => setActiveTab(item.tab)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer focus:outline-none ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-indigo-100/80 font-extrabold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="truncate">{item.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="pt-3 border-t border-slate-100 shrink-0 mt-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${roleBadgeColor} text-white font-bold text-xs shrink-0`}>
              {mounted ? (user?.name?.slice(0, 1) || "U") : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-800 truncate">{mounted ? (user?.name || "System User") : "System User"}</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{mounted ? activeRole : ""}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE TOP HEADER (below md)
      ════════════════════════════════════════ */}
      <header className="md:hidden mobile-page-header shrink-0 px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="GNG" className="h-9 w-9 rounded-full object-contain border border-slate-100 bg-slate-50 shrink-0" />
          <div className="min-w-0">
            <p className="font-black text-sm text-slate-800 leading-tight truncate">
              St. G.N.G. School
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
              {mounted ? activeRole : "School"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notices Bell */}
          <button
            onClick={() => setShowNoticeSheet(true)}
            className="relative h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 border border-slate-200/60 press-scale"
          >
            <Bell className="h-4 w-4" />
            {notices.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {notices.length > 9 ? "9+" : notices.length}
              </span>
            )}
          </button>
          
          {/* User Avatar */}
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${roleBadgeColor} text-white font-bold text-xs shrink-0 shadow-sm border-2 border-white`}>
            {mounted ? (user?.name?.slice(0, 1) || "U") : "U"}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          MAIN BODY AREA
      ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white/95 backdrop-blur-md border-b border-slate-200/60 h-16 items-center justify-between px-6 shrink-0 relative z-20 shadow-[0_2px_12px_rgba(0,0,0,0.015)] select-none">
          <div className="flex items-center gap-6 flex-1 max-w-xl">
            {/* Mega Menu Toggle */}
            <div className="relative" ref={megaMenuRef}>
              <button
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100/40 py-2 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-[0_2px_4px_rgba(16,185,129,0.04)] active:scale-95 duration-100"
              >
                Menu <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {megaMenuOpen && (() => {
                const megaMenuData = getMegaMenuData(activeRole || "ADMIN");
                return (
                  <div className={`absolute top-12 left-0 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl z-50 animate-slide-down grid gap-6 ${
                    megaMenuData.length === 3 ? "w-[720px] grid-cols-3" :
                    megaMenuData.length === 2 ? "w-[500px] grid-cols-2" :
                    "w-[280px] grid-cols-1"
                  }`}>
                    {megaMenuData.map((category, catIdx) => {
                      const Icon = category.icon;
                      return (
                        <div key={catIdx} className="space-y-3.5 select-none text-left">
                          <h5 className={`text-[10px] font-black uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2 ${category.textColor}`}>
                            <Icon className="h-4 w-4" /> {category.title}
                          </h5>
                          <div className="space-y-1">
                            {category.items.map((item, itemIdx) => (
                              <button
                                key={itemIdx}
                                onClick={() => {
                                  if (item.mode) {
                                    localStorage.setItem("students_import_mode", item.mode);
                                  }
                                  setActiveTab(item.tab);
                                  setMegaMenuOpen(false);
                                }}
                                className="w-full text-left text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-2 px-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 block shrink-0" />
                                <span>{item.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Search Bar or Parent Support Bar */}
            {!mounted ? (
              <div className="flex-1" />
            ) : activeRole === "PARENT" ? (
              <div className="flex items-center gap-3 flex-1">
                {schoolInfo?.phone && (
                  <a
                    href={`tel:${schoolInfo.phone}`}
                    className="flex items-center gap-2 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/60 text-emerald-800 py-2 px-3.5 rounded-2xl text-xs font-black transition-all shadow-2xs cursor-pointer group"
                    title="Click to call school helpdesk"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-600 group-hover:rotate-12 transition-transform shrink-0" />
                    <span>Helpdesk: {schoolInfo.phone}</span>
                  </a>
                )}

                <div className="hidden lg:flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 text-indigo-800 py-2 px-3.5 rounded-2xl text-xs font-black shadow-2xs">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>
                    {students && students.length > 0
                      ? `${students[0].name} (Cl ${students[0].class}-${students[0].section})`
                      : "Parent Academic Portal"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative flex-1" ref={searchRef}>
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Search students, admission no, family code... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-14 py-2 bg-slate-100/50 border border-slate-200/50 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] placeholder:text-slate-400"
                />
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
                  <kbd className="hidden sm:inline-block text-[9px] font-black text-slate-500 bg-slate-200/60 border border-transparent rounded-lg px-2 py-0.5">Ctrl K</kbd>
                </div>
                {searchQuery && (
                  <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200/90 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                    {students && students.filter(s =>
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (s.rollNo && String(s.rollNo).toLowerCase().includes(searchQuery.toLowerCase()))
                    ).slice(0, 8).map((student) => (
                      <button key={student.id} onClick={() => { setActiveTab("students"); setSearchQuery(""); }}
                        className="w-full text-left flex justify-between items-center p-2 rounded-xl hover:bg-indigo-50/60 transition-all">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">Roll: {student.rollNo || "--"} • {student.admissionNo} • Class {student.class}</p>
                        </div>
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">View</span>
                      </button>
                    ))}
                    {students && students.filter(s =>
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (s.rollNo && String(s.rollNo).toLowerCase().includes(searchQuery.toLowerCase()))
                    ).length === 0 && (
                      <p className="text-center py-4 text-xs font-semibold text-slate-400">No students found.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3.5">

            <div className="hidden lg:flex items-center gap-2 bg-indigo-50/70 border border-indigo-100/40 text-indigo-700 py-2 px-3.5 rounded-2xl text-xs font-black shadow-[0_2px_4px_rgba(99,102,241,0.02)]">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>UDISE: {schoolInfo?.udiseCode || "09300302001"}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 py-1 px-3 rounded-2xl shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-dot-pulse inline-block shrink-0" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider hidden sm:inline-block">Live:</span>
              <select value={sessionYear} onChange={(e) => setSessionYear(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-700 py-0.5 outline-none cursor-pointer">
                {sessions.length > 0 ? (
                  sessions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                ) : (
                  <>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                  </>
                )}
              </select>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNoticeDropdown(!showNoticeDropdown)}
                className="h-9 w-9 bg-slate-50 border border-slate-200/50 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-indigo-600 hover:shadow-sm transition-all cursor-pointer relative active:scale-95 duration-100">
                <Bell className="h-4 w-4" />
                {notices.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4.5 w-4.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {notices.length}
                  </span>
                )}
              </button>
              {showNoticeDropdown && (
                <div className="absolute top-11 right-0 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Notice Board</h4>
                    <button onClick={() => { setActiveTab("notices"); setShowNoticeDropdown(false); }}
                      className="text-[10px] text-indigo-700 font-black hover:underline">All Notices</button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {notices.slice().reverse().map((n) => (
                      <div key={n.id} className="p-2 bg-slate-50 rounded-xl space-y-1">
                        <p className="text-xs font-bold text-slate-800 leading-tight">{n.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{n.content}</p>
                        <span className="text-[9px] text-slate-400 font-bold block mt-1">{n.createdAt}</span>
                      </div>
                    ))}
                    {notices.length === 0 && (
                      <p className="text-center py-6 text-xs text-slate-400 font-semibold">No active notices.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>


        {/* Notice Ticker */}
        {latestNotice && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 text-xs font-semibold text-amber-800 shrink-0">
            <Bell className="h-3.5 w-3.5 text-amber-600 shrink-0 animate-pulse" />
            <span className="bg-amber-200 text-amber-900 text-[9px] font-black uppercase px-1.5 py-0.5 rounded leading-none">Notice:</span>
            <span className="truncate">{latestNotice.title} - {latestNotice.content}</span>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 px-3 pt-3 pb-28 sm:p-4 md:p-5 lg:p-6 xl:p-8 md:pb-8 overflow-y-auto overflow-x-hidden min-w-0 max-w-full touch-scroll-y  bg-white md:bg-transparent">
          {/* Desktop-Only Guard — shown only on mobile for restricted tabs */}
          {mounted && typeof window !== 'undefined' && isMobile && desktopOnlyTabs.includes(activeTab) ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-5">
                <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                </svg>
              </div>
              <h2 className="text-base font-black text-slate-800 mb-2">Desktop Required</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs">
                This section is designed for larger screens. Please open it on a laptop or desktop computer for the best experience.
              </p>
              <div className="mt-6 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl">
                🖥️ Use Desktop / Laptop
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* ════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION BAR
      ════════════════════════════════════════ */}
      <nav className="mobile-bottom-nav md:hidden" role="navigation" aria-label="Main navigation">
        {mounted && bottomNavItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={idx}
              onClick={() => handleTabChange(item.tab)}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="nav-icon-wrap">
                <Icon className="h-5 w-5" />
              </div>
              <span className="nav-label">{item.shortName}</span>
            </button>
          );
        })}

        {/* "More" button if there are extra nav items */}
        {mounted && moreNavItems.length > 0 && (
          <button
            onClick={() => setShowMoreSheet(!showMoreSheet)}
            className={`bottom-nav-item ${moreNavItems.some(i => i.tab === activeTab) ? "active" : ""}`}
            aria-label="More options"
          >
            <div className={`nav-icon-wrap ${moreNavItems.some(i => i.tab === activeTab) ? "bg-indigo-50 w-10" : ""}`}>
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="nav-label">More</span>
          </button>
        )}
      </nav>

      {/* ════════════════════════════════════════
          MOBILE: "MORE" BOTTOM SHEET
      ════════════════════════════════════════ */}
      <BottomSheet
        isOpen={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        title="All Sections"
      >
        <nav className="space-y-1 mt-2">
          {mounted && mobileNavItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            const showCategoryHeader = idx === 0 || mobileNavItems[idx - 1].category !== item.category;
            return (
              <React.Fragment key={item.tab + "-mobile-" + idx}>
                {showCategoryHeader && item.category && (
                  <span className={`px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 block ${idx > 0 ? "mt-3 mb-1" : "mb-1"}`}>
                    {item.category}
                  </span>
                )}
                <button
                  onClick={() => handleTabChange(item.tab)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all press-scale focus:outline-none ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-black border border-transparent"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold border border-transparent"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="text-sm">{item.name}</span>
                  {!isActive && <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />}
                </button>
              </React.Fragment>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-sm font-black transition-all press-scale"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </BottomSheet>

      {/* ════════════════════════════════════════
          MOBILE: NOTICES BOTTOM SHEET
      ════════════════════════════════════════ */}
      <BottomSheet
        isOpen={showNoticeSheet}
        onClose={() => setShowNoticeSheet(false)}
        title={
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">Notice Board</h3>
            {notices.length > 0 && (
              <span className="h-5 w-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {notices.length}
              </span>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {notices.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No active notices</p>
            </div>
          ) : notices.slice().reverse().map((n) => (
            <div key={n.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-800 leading-tight">{n.title}</p>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full shrink-0">Notice</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{n.content}</p>
              <span className="text-[10px] text-slate-400 font-bold block">{n.createdAt}</span>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Apps & Integrations Connector Modal */}

    </div>
  );
}
