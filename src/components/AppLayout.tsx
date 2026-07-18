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
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

// ─── Nav items per role ────────────────────────────────────────────────────
const getNavItems = (activeRole: string) => {
  switch (activeRole) {
    case "PARENT":
      return [
        { name: "My Child's Dashboard", shortName: "Home", icon: Home, tab: "dashboard" },
        { name: "Academic Report Card", shortName: "Reports", icon: FileText, tab: "reportcard" },
        { name: "Pay School Fees", shortName: "Fees", icon: CreditCard, tab: "fees" },
        { name: "Homework & Assignments", shortName: "Homework", icon: BookOpen, tab: "homework" },
        { name: "Attendance History", shortName: "Attendance", icon: Calendar, tab: "attendance" },
        { name: "Apply for Leave", shortName: "Leave", icon: FileText, tab: "leave" },
      ];
    case "TEACHER":
      return [
        { name: "Mark Attendance", shortName: "Attendance", icon: UserCheck, tab: "attendance" },
        { name: "Feed Student Marks", shortName: "Marks", icon: PlusCircle, tab: "marks" },
        { name: "Upload Homework", shortName: "Homework", icon: BookOpen, tab: "homework" },
        { name: "Leave Requests", shortName: "Leaves", icon: FileText, tab: "leaves" },
      ];
    case "ACCOUNTANT":
      return [
        { name: "Collect Offline Fee", shortName: "Collect", icon: CreditCard, tab: "collect" },
        { name: "Dues Report", shortName: "Dues", icon: AlertTriangle, tab: "defaulters" },
        { name: "Feed Student Marks", shortName: "Marks", icon: PlusCircle, tab: "marks" },
        { name: "Configure Fee Structures", shortName: "Fees", icon: Settings, tab: "structures" },
        { name: "System Ledger Logs", shortName: "Ledger", icon: ArrowRightLeft, tab: "ledger" },
      ];
    case "ADMIN":
      return [
        { name: "Admin Dashboard", shortName: "Dashboard", icon: LayoutDashboard, tab: "dashboard" },
        { name: "Collect Fees", shortName: "Collect", icon: CreditCard, tab: "collect" },
        { name: "Feed Student Marks", shortName: "Marks", icon: PlusCircle, tab: "marks" },
        { name: "Dues Report", shortName: "Dues", icon: AlertTriangle, tab: "defaulters" },
        { name: "Receipts Ledger", shortName: "Ledger", icon: ArrowRightLeft, tab: "ledger" },
        { name: "Configure Fees", shortName: "Fee Config", icon: Settings, tab: "structures" },
        { name: "Register Student", shortName: "Students", icon: Users, tab: "students" },
        { name: "User Status Control", shortName: "Users", icon: UserX, tab: "users" },
        { name: "ID Cards & Photos", shortName: "ID Cards", icon: Users, tab: "idcards" },
        { name: "Create Notices", shortName: "Notices", icon: Bell, tab: "notices" },
        { name: "System Config", shortName: "Config", icon: Settings, tab: "school" },
        { name: "System Audit Logs", shortName: "Audit", icon: FileSpreadsheet, tab: "audit" },
      ];
    default:
      return [];
  }
};

// How many items to show directly in bottom nav (rest go in "More")
const BOTTOM_NAV_VISIBLE = 4;

export default function AppLayout({ children }: AppLayoutProps) {
  const { activeRole, activeTab, setActiveTab, switchRole, user, students, notices } = useAuth();

  // Mobile states
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showNoticeSheet, setShowNoticeSheet] = useState(false);

  // Desktop states
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNoticeDropdown, setShowNoticeDropdown] = useState(false);
  const [sessionYear, setSessionYear] = useState("2026-27");
  const [showDesktopRolePanel, setShowDesktopRolePanel] = useState(true);

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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
    setShowRoleSwitcher(false);
    setShowNoticeSheet(false);
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowMoreSheet(false);
    setShowRoleSwitcher(false);
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
      <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 bg-white p-5 shrink-0 select-none">
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
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${roleBadgeColor} text-white font-bold text-xs`}>
            {user?.name?.slice(0, 1) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 truncate">{user?.name || "System User"}</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{activeRole}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <span className="px-3 text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2">Features</span>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-400 text-center">
          Finance OS v1.0.0
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

          {/* Role Switcher FAB trigger */}
          <button
            onClick={() => setShowRoleSwitcher(true)}
            className={`h-9 px-3 flex items-center gap-1.5 rounded-xl text-white text-[10px] font-black press-scale ${roleBadgeColor}`}
          >
            <Shield className="h-3.5 w-3.5" />
            {activeRole?.slice(0, 5)}
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
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
              {searchQuery && (
                <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 py-1.5 px-3.5 rounded-xl text-xs font-black">
              <Building2 className="h-4 w-4 text-indigo-500" />
              UDISE : 930303
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mr-1">Live Session:</span>
              <select value={sessionYear} onChange={(e) => setSessionYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-1.5 px-2.5 rounded-xl outline-none focus:border-indigo-300 transition-all cursor-pointer">
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
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden min-w-0 max-w-full touch-scroll-y">
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
            <div className="space-y-1.5">
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={idx}
                    onClick={() => handleTabChange(item.tab)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all press-scale ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span className="font-bold text-sm">{item.name}</span>
                    {!isActive && <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />}
                  </button>
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

      {/* ════════════════════════════════════════
          MOBILE: ROLE SWITCHER BOTTOM SHEET
      ════════════════════════════════════════ */}
      {showRoleSwitcher && (
        <>
          <div className="bottom-sheet-overlay md:hidden" onClick={() => setShowRoleSwitcher(false)} />
          <div className="bottom-sheet md:hidden">
            <div className="bottom-sheet-handle" />
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-black text-slate-800">Switch Role</h3>
              <button onClick={() => setShowRoleSwitcher(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-4">Tap a role to switch the dashboard view.</p>

            <div className="grid grid-cols-2 gap-3">
              {([
                { role: "PARENT" as Role, label: "Parent", desc: "View child's profile", color: "bg-rose-500", light: "bg-rose-50 border-rose-200" },
                { role: "TEACHER" as Role, label: "Teacher", desc: "Manage attendance & marks", color: "bg-amber-500", light: "bg-amber-50 border-amber-200" },
                { role: "ACCOUNTANT" as Role, label: "Accountant", desc: "Collect fees & reports", color: "bg-emerald-600", light: "bg-emerald-50 border-emerald-200" },
                { role: "ADMIN" as Role, label: "Admin", desc: "Full system control", color: "bg-indigo-600", light: "bg-indigo-50 border-indigo-200" },
              ]).map(({ role, label, desc, color, light }) => (
                <button
                  key={role}
                  onClick={() => { switchRole(role); setShowRoleSwitcher(false); }}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all press-scale ${
                    activeRole === role
                      ? `${color} border-transparent text-white shadow-lg`
                      : `${light} text-slate-700`
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    activeRole === role ? "bg-white/20" : "bg-white shadow-sm"
                  }`}>
                    <Shield className={`h-5 w-5 ${activeRole === role ? "text-white" : "text-slate-500"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-black ${activeRole === role ? "text-white" : "text-slate-800"}`}>{label}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${activeRole === role ? "text-white/70" : "text-slate-400"}`}>{desc}</p>
                  </div>
                  {activeRole === role && (
                    <span className="text-[9px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Active</span>
                  )}
                </button>
              ))}
            </div>

            {/* Current User Info */}
            <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full ${roleBadgeColor} flex items-center justify-center text-white font-black text-sm`}>
                {user?.name?.slice(0, 1) || "U"}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{user?.name || "System User"}</p>
                <p className="text-[10px] font-semibold text-slate-400">{user?.username}</p>
              </div>
              <span className={`ml-auto text-[10px] font-black px-2 py-1 rounded-lg text-white ${roleBadgeColor}`}>{activeRole}</span>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          DESKTOP: ROLE SWITCHER PANEL (unchanged)
      ════════════════════════════════════════ */}
      {showDesktopRolePanel ? (
        <div className="hidden md:flex fixed bottom-3 right-4 z-30 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xl max-w-xs flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Role Switcher</h4>
            </div>
            <button onClick={() => setShowDesktopRolePanel(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-tight">
            Click roles below to test the UI for different profiles.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {(["PARENT", "TEACHER", "ACCOUNTANT", "ADMIN"] as Role[]).map((r) => (
              <button key={r} onClick={() => switchRole(r)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center border transition-all ${
                  activeRole === r
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowDesktopRolePanel(true)}
          className="hidden md:flex fixed bottom-4 right-4 z-30 bg-indigo-600 text-white rounded-full p-3 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all items-center justify-center cursor-pointer"
        >
          <Shield className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
