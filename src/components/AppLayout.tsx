"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth, Role } from "@/context/AuthContext";
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
} from "lucide-react";
import AppsIntegrationModal from "@/components/AppsIntegrationModal";

interface AppLayoutProps {
  children: React.ReactNode;
}

export interface NavItem {
  category: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: string;
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
      ];
    case "TEACHER":
      return [
        { category: "Daily Academics", name: "Mark Attendance", shortName: "Attendance", icon: UserCheck, tab: "attendance" },
        { category: "Daily Academics", name: "Marks & Exam Roster", shortName: "Marks", icon: GraduationCap, tab: "marks" },
        { category: "Daily Academics", name: "Upload Homework", shortName: "Homework", icon: BookOpen, tab: "homework" },
        { category: "Daily Academics", name: "Leave Requests", shortName: "Leaves", icon: FileText, tab: "leaves" },
      ];
    case "ACCOUNTANT":
      return [
        { category: "Fee Transactions", name: "Fee Collection", shortName: "Collect", icon: CreditCard, tab: "collect" },
        { category: "Fee Transactions", name: "Fee Defaulters & Dues", shortName: "Dues", icon: AlertTriangle, tab: "defaulters" },
        { category: "Fee Transactions", name: "Receipts & Ledger Logs", shortName: "Ledger", icon: ArrowRightLeft, tab: "ledger" },
        { category: "Fee Management", name: "Fee Structure Setup", shortName: "Fee Setup", icon: Settings, tab: "structures" },
        { category: "Fee Management", name: "Marks & Exam Entry", shortName: "Marks", icon: GraduationCap, tab: "marks" },
      ];
    case "ADMIN":
      return [
        { category: "Overview", name: "Admin Dashboard", shortName: "Dashboard", icon: LayoutDashboard, tab: "dashboard" },
        { category: "Student & Academics", name: "Student Management", shortName: "Students", icon: Users, tab: "students" },
        { category: "Student & Academics", name: "Attendance Console", shortName: "Attendance", icon: UserCheck, tab: "attendance" },
        { category: "Student & Academics", name: "Marks & Exam Roster", shortName: "Marks", icon: GraduationCap, tab: "marks" },
        { category: "Student & Academics", name: "ID Cards & Photos", shortName: "ID Cards", icon: UserCheck, tab: "idcards" },
        { category: "Finance & Fees", name: "Fee Collection", shortName: "Collect", icon: CreditCard, tab: "collect" },
        { category: "Finance & Fees", name: "Fee Defaulters & Dues", shortName: "Dues", icon: AlertTriangle, tab: "defaulters" },
        { category: "Finance & Fees", name: "Receipts & Ledger", shortName: "Ledger", icon: ArrowRightLeft, tab: "ledger" },
        { category: "Finance & Fees", name: "Fee Structure Setup", shortName: "Fee Setup", icon: Settings, tab: "structures" },
        { category: "System & Communication", name: "Notices & Announcements", shortName: "Notices", icon: Bell, tab: "notices" },
        { category: "System & Communication", name: "User Access Control", shortName: "Users", icon: ShieldCheck, tab: "users" },
        { category: "System & Communication", name: "School Settings", shortName: "Settings", icon: Building2, tab: "school" },
        { category: "System & Communication", name: "System Audit Logs", shortName: "Audit", icon: FileSpreadsheet, tab: "audit" },
      ];
    default:
      return [];
  }
};

// How many items to show directly in bottom nav (rest go in "More")
const BOTTOM_NAV_VISIBLE = 4;

export default function AppLayout({ children }: AppLayoutProps) {
  const { activeRole, activeTab, setActiveTab, switchRole, user, students, notices, schoolInfo, logout } = useAuth();

  // Mobile states
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showNoticeSheet, setShowNoticeSheet] = useState(false);

  // Desktop states
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNoticeDropdown, setShowNoticeDropdown] = useState(false);
  const [sessionYear, setSessionYear] = useState("2026-27");
  const [showAppsModal, setShowAppsModal] = useState(false);

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
  };

  const navItems = getNavItems(activeRole || "");
  const bottomNavItems = navItems.slice(0, BOTTOM_NAV_VISIBLE);
  const moreNavItems = navItems.slice(BOTTOM_NAV_VISIBLE);
  const latestNotice = notices.length > 0 ? notices[notices.length - 1] : null;

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
  const roleBadgeColor = roleColors[activeRole || ""] || "bg-slate-500";

  // Active tab label for mobile header
  const activeNavItem = navItems.find((i) => i.tab === activeTab) || navItems[0];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full max-w-full overflow-hidden bg-slate-50 text-slate-800 font-sans">

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

        {/* User Profile Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-6 shrink-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${roleBadgeColor} text-white font-bold text-xs shrink-0`}>
            {user?.name?.slice(0, 1) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 truncate">{user?.name || "System User"}</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{activeRole}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 select-none">
          {navItems.map((item, idx) => {
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
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-indigo-100/80 font-extrabold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
        <div className="pt-3 border-t border-slate-100 space-y-2 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-rose-600" />
            <span>Logout Account</span>
          </button>
          <p className="text-[10px] font-semibold text-slate-400 text-center">Finance OS v1.0.0</p>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE TOP HEADER (below md)
      ════════════════════════════════════════ */}
      <header className="md:hidden mobile-page-header shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.png" alt="GNG" className="h-8 w-8 rounded-full object-contain border border-slate-100 bg-white shrink-0" />
          <div className="min-w-0">
            <p className="font-black text-[11px] text-slate-800 leading-tight truncate">
              {activeNavItem?.name || "Dashboard"}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">St. G.N.G. School</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Notices Bell */}
          <button
            onClick={() => setShowNoticeSheet(true)}
            className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 press-scale"
          >
            <Bell className="h-4 w-4" />
            {notices.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {notices.length > 9 ? "9+" : notices.length}
              </span>
            )}
          </button>

          {/* Active Role Badge */}
          <div className={`h-9 px-3 flex items-center gap-1.5 rounded-xl text-white text-[10px] font-black ${roleBadgeColor}`}>
            <Shield className="h-3.5 w-3.5" />
            <span>{activeRole}</span>
          </div>

          {/* Mobile Top Header Logout Button */}
          <button
            onClick={handleLogout}
            title="Logout"
            className="h-9 px-2.5 flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black press-scale"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-600" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════
          MAIN BODY AREA
      ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-slate-200 h-16 items-center justify-between px-6 shrink-0 relative z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
          <div className="flex items-center gap-6 flex-1 max-w-xl">
            {/* Mega Menu Toggle */}
            <div className="relative" ref={megaMenuRef}>
              <button
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className="flex items-center gap-1.5 text-[#15803d] hover:bg-slate-50 py-1.5 px-3 rounded-lg text-sm font-black transition-all cursor-pointer"
              >
                Menu <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${megaMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {megaMenuOpen && (
                <div className="absolute top-12 left-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl w-[680px] grid grid-cols-3 gap-6 z-50 animate-slide-down">
                  {/* Col 1: Admission */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-indigo-700 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Admission Management
                    </h5>
                    <div className="space-y-2">
                      {[
                        { name: "Create Admission", tab: "students" },
                        { name: "Online Admission", tab: "students" },
                        { name: "Update Students", tab: "students" },
                        { name: "Class-wise List", tab: "students" },
                        { name: "Bulk Updates", tab: "students" },
                      ].map((item, idx) => (
                        <button key={idx} onClick={() => { setActiveTab(item.tab); setMegaMenuOpen(false); }}
                          className="w-full text-left text-xs font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 py-1.5 px-2.5 rounded-lg transition-all">
                          + {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Col 2: Fee */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-emerald-700 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Fee Management
                    </h5>
                    <div className="space-y-2">
                      {[
                        { name: "Student Ledger", tab: "ledger" },
                        { name: "Fee Reminder", tab: "notices" },
                        { name: "Daily Report", tab: "ledger" },
                        { name: "Monthly Analytics", tab: "dashboard" },
                        { name: "Fee Dues Report", tab: "defaulters" },
                      ].map((item, idx) => (
                        <button key={idx} onClick={() => { setActiveTab(item.tab); setMegaMenuOpen(false); }}
                          className="w-full text-left text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 py-1.5 px-2.5 rounded-lg transition-all">
                          ■ {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Col 3: Attendance */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-amber-700 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-2">
                      <UserCheck className="h-4 w-4" /> Make Attendance
                    </h5>
                    <div className="space-y-2">
                      {[
                        { name: "Student", tab: "attendance" },
                        { name: "Employee", tab: "attendance" },
                        { name: "Daily Report", tab: "attendance" },
                        { name: "Monthly Report", tab: "attendance" },
                        { name: "Yearly Report", tab: "attendance" },
                      ].map((item, idx) => (
                        <button key={idx} onClick={() => { setActiveTab(item.tab); setMegaMenuOpen(false); }}
                          className="w-full text-left text-xs font-bold text-slate-600 hover:text-amber-700 hover:bg-amber-50/50 py-1.5 px-2.5 rounded-lg transition-all">
                          ● {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative flex-1" ref={searchRef}>
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Search students, admission no, family code... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-1.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 shadow-inner"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-block text-[9px] font-extrabold text-slate-400 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-2xs">Ctrl K</kbd>
              </div>
              {searchQuery && (
                <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200/90 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                  {students && students.filter(s =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
                  ).slice(0, 8).map((student) => (
                    <button key={student.id} onClick={() => { setActiveTab("students"); setSearchQuery(""); }}
                      className="w-full text-left flex justify-between items-center p-2 rounded-xl hover:bg-indigo-50/60 transition-all">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{student.admissionNo} • Class {student.class}</p>
                      </div>
                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">View</span>
                    </button>
                  ))}
                  {students && students.filter(s =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <p className="text-center py-4 text-xs font-semibold text-slate-400">No students found.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3.5">
            {/* Apps & Integrations Connector Button */}
            <button
              onClick={() => setShowAppsModal(true)}
              title="Apps & Integrations Connector Hub"
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-600/15"
            >
              <Layers className="h-4 w-4 text-indigo-200" />
              <span>Apps Hub</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 bg-indigo-50/80 border border-indigo-100/80 text-indigo-700 py-1.5 px-3 rounded-xl text-xs font-black">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>UDISE: {schoolInfo?.udiseCode || "09300302001"}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 py-1 px-2.5 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500 status-dot-pulse inline-block shrink-0" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider hidden sm:inline-block">Live:</span>
              <select value={sessionYear} onChange={(e) => setSessionYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 py-0.5 outline-none cursor-pointer">
                <option value="2026-27">2026 - 2027</option>
                <option value="2025-26">2025 - 2026</option>
              </select>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNoticeDropdown(!showNoticeDropdown)}
                className="h-9 w-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all cursor-pointer relative">
                <Bell className="h-4 w-4" />
                {notices.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
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

            {/* Desktop Top Header Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Logout from system"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              <span>Logout</span>
            </button>
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
        <main className="flex-1 p-2 sm:p-4 md:p-5 lg:p-6 xl:p-8 pb-28 md:pb-8 overflow-y-auto overflow-x-hidden min-w-0 max-w-full touch-scroll-y">
          {children}
        </main>
      </div>

      {/* ════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION BAR
      ════════════════════════════════════════ */}
      <nav className="mobile-bottom-nav md:hidden" role="navigation" aria-label="Main navigation">
        {bottomNavItems.map((item, idx) => {
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
        {moreNavItems.length > 0 && (
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
      {showMoreSheet && (
        <>
          <div className="bottom-sheet-overlay md:hidden" onClick={() => setShowMoreSheet(false)} />
          <div className="bottom-sheet md:hidden">
            <div className="bottom-sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800">All Sections</h3>
              <button onClick={() => setShowMoreSheet(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                const showCategoryHeader = idx === 0 || navItems[idx - 1].category !== item.category;
                return (
                  <React.Fragment key={item.tab + "-mobile-" + idx}>
                    {showCategoryHeader && item.category && (
                      <span className={`px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 block ${idx > 0 ? "mt-3 mb-1" : "mb-1"}`}>
                        {item.category}
                      </span>
                    )}
                    <button
                      onClick={() => handleTabChange(item.tab)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all press-scale ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-black"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold"
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span className="text-sm">{item.name}</span>
                      {!isActive && <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          MOBILE: NOTICES BOTTOM SHEET
      ════════════════════════════════════════ */}
      {showNoticeSheet && (
        <>
          <div className="bottom-sheet-overlay md:hidden" onClick={() => setShowNoticeSheet(false)} />
          <div className="bottom-sheet md:hidden">
            <div className="bottom-sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800">Notice Board</h3>
                {notices.length > 0 && (
                  <span className="h-5 w-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {notices.length}
                  </span>
                )}
              </div>
              <button onClick={() => setShowNoticeSheet(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
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
          </div>
        </>
      )}

      {/* Apps & Integrations Connector Modal */}
      <AppsIntegrationModal isOpen={showAppsModal} onClose={() => setShowAppsModal(false)} />
    </div>
  );
}
