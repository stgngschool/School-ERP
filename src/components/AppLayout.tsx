"use client";

import React, { useState } from "react";
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
  Menu,
  X,
  CreditCard,
  UserX,
  ArrowRightLeft,
  ChevronDown,
  LogOut,
  Search,
  Building2,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { activeRole, activeTab, setActiveTab, switchRole, user, students, notices } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRolePanel, setShowRolePanel] = useState(true);

  // Desktop header states
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNoticeDropdown, setShowNoticeDropdown] = useState(false);
  const [sessionYear, setSessionYear] = useState("2026-27");

  const getNavItems = () => {
    switch (activeRole) {
      case "PARENT":
        return [
          { name: "My Child's Dashboard", icon: LayoutDashboard, tab: "dashboard" },
          { name: "Academic Report Card", icon: FileText, tab: "reportcard" },
          { name: "Pay School Fees", icon: CreditCard, tab: "fees" },
          { name: "Homework & Assignments", icon: BookOpen, tab: "homework" },
          { name: "Attendance History", icon: Calendar, tab: "attendance" },
          { name: "Apply for Leave", icon: FileText, tab: "leave" },
        ];
      case "TEACHER":
        return [
          { name: "Mark Attendance", icon: UserCheck, tab: "attendance" },
          { name: "Feed Student Marks", icon: PlusCircle, tab: "marks" },
          { name: "Upload Homework", icon: BookOpen, tab: "homework" },
          { name: "Leave Requests", icon: FileText, tab: "leaves" },
        ];
      case "ACCOUNTANT":
        return [
          { name: "Collect Offline Fee", icon: CreditCard, tab: "collect" },
          { name: "Feed Student Marks", icon: PlusCircle, tab: "marks" },
          { name: "Dues Report", icon: AlertTriangle, tab: "defaulters" },
          { name: "Configure Fee Structures", icon: Settings, tab: "structures" },
          { name: "System Ledger Logs", icon: ArrowRightLeft, tab: "ledger" },
        ];
      case "ADMIN":
        return [
          { name: "Admin Dashboard", icon: LayoutDashboard, tab: "dashboard" },
          { name: "Collect Fees", icon: CreditCard, tab: "collect" },
          { name: "Feed Student Marks", icon: PlusCircle, tab: "marks" },
          { name: "Configure Fees", icon: Settings, tab: "structures" },
          { name: "Dues Report", icon: AlertTriangle, tab: "defaulters" },
          { name: "Receipts Ledger", icon: ArrowRightLeft, tab: "ledger" },
          { name: "User Status Control", icon: UserX, tab: "users" },
          { name: "Register Student", icon: PlusCircle, tab: "students" },
          { name: "ID Cards & Photos", icon: Users, tab: "idcards" },
          { name: "Create Notices", icon: Bell, tab: "notices" },
          { name: "System Config", icon: Settings, tab: "school" },
          { name: "System Audit Logs", icon: FileSpreadsheet, tab: "audit" },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const activeNavItem = navItems.find((item) => item.tab === activeTab) || navItems[0];
  const latestNotice = notices.length > 0 ? notices[notices.length - 1] : null;

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 bg-white p-5 shrink-0 select-none">
        {/* Institutional Branding */}
        <div className="flex items-center gap-2.5 pb-6 border-b border-slate-100 mb-6 shrink-0">
          <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-9 w-9 rounded-full object-contain border border-slate-100 bg-white" />
          <div>
            <h1 className="font-extrabold text-xs text-slate-900 leading-tight">St. G.N.G. School</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Varanasi</p>
          </div>
        </div>

        {/* User Identity Profile Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-6 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
            {user?.name?.slice(0, 1) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 truncate">{user?.name || "System User"}</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{activeRole}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          <span className="px-3 text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2">
            Features
          </span>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-650 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    : "text-slate-655 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* System Settings Footer */}
        <div className="pt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-405 text-center">
          Prototype Version 1.0.0
        </div>
      </aside>

      {/* 2. Mobile Top Navigation */}
      <header className="md:hidden bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3 shrink-0 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-8 w-8 rounded-full object-contain border border-slate-100 bg-white" />
          <div>
            <span className="font-extrabold text-xs text-slate-800 block leading-tight">St. G.N.G. School</span>
            <span className="text-[8px] font-bold text-slate-400 block tracking-widest uppercase">Varanasi</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-slate-655 hover:bg-slate-100 rounded-lg"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* 3. Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[49px] z-10 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white border-b border-slate-200 p-4 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                {user?.name?.slice(0, 1) || "U"}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">{user?.name}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{activeRole}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveTab(item.tab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-650"
                        : "text-slate-655 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* 4. Main Body Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-slate-200 h-16 items-center justify-between px-6 shrink-0 relative z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
          <div className="flex items-center gap-6 flex-1 max-w-xl">
            {/* Mega Menu Toggle */}
            <div className="relative">
              <button 
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className="flex items-center gap-1.5 text-[#15803d] hover:bg-slate-50 py-1.5 px-3 rounded-lg text-sm font-black transition-all cursor-pointer"
              >
                Menu <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${megaMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Mega Menu Dropdown */}
              {megaMenuOpen && (
                <div className="absolute top-12 left-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl w-[680px] grid grid-cols-3 gap-6 z-50 animate-fade-in">
                  {/* Column 1: Admission Management */}
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
                        { name: "Bulk Updates", tab: "students" }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveTab(item.tab);
                            setMegaMenuOpen(false);
                          }}
                          className="w-full text-left text-xs font-bold text-slate-655 hover:text-indigo-650 hover:bg-indigo-50/50 py-1.5 px-2.5 rounded-lg transition-all"
                        >
                          + {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Fee Management */}
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
                        { name: "Fee Dues Report", tab: "defaulters" }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveTab(item.tab);
                            setMegaMenuOpen(false);
                          }}
                          className="w-full text-left text-xs font-bold text-slate-655 hover:text-emerald-750 hover:bg-emerald-50/50 py-1.5 px-2.5 rounded-lg transition-all"
                        >
                          ■ {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Make Attendance */}
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
                        { name: "Yearly Report", tab: "attendance" }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (activeRole === "ADMIN" || activeRole === "TEACHER") {
                              setActiveTab("attendance");
                            } else {
                              alert("Attendance can only be marked by Admin or Teacher!");
                            }
                            setMegaMenuOpen(false);
                          }}
                          className="w-full text-left text-xs font-bold text-slate-655 hover:text-amber-750 hover:bg-amber-50/50 py-1.5 px-2.5 rounded-lg transition-all"
                        >
                          ● {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative flex-1">
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
              
              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                  {students && students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8).map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setActiveTab("students");
                        setSearchQuery("");
                      }}
                      className="w-full text-left flex justify-between items-center p-2 rounded-xl hover:bg-indigo-50/60 transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{student.admissionNo} • Class {student.class}</p>
                      </div>
                      <span className="text-[10px] font-black text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">View</span>
                    </button>
                  ))}
                  {students && students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <p className="text-center py-4 text-xs font-semibold text-slate-400">No students found.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            
            {/* UDISE Badge */}
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-[#4338ca] py-1.5 px-3.5 rounded-xl text-xs font-black">
              <Building2 className="h-4 w-4 text-indigo-500" />
              UDISE : 930303
            </div>

            {/* Session Selector / Live Session Badge */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mr-1">Live Session:</span>
              
              <select 
                value={sessionYear} 
                onChange={(e) => setSessionYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-1.5 px-2.5 rounded-xl outline-none focus:border-indigo-300 transition-all cursor-pointer"
              >
                <option value="2026-27">2026 - 2027</option>
                <option value="2025-26">2025 - 2026</option>
              </select>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNoticeDropdown(!showNoticeDropdown)}
                className="h-9 w-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer relative"
              >
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
                    <button 
                      onClick={() => {
                        setActiveTab("notices");
                        setShowNoticeDropdown(false);
                      }} 
                      className="text-[10px] text-indigo-650 font-black hover:underline"
                    >
                      All Notices
                    </button>
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

        {/* Notice Ticker Banner */}
        {latestNotice && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 text-xs font-semibold text-amber-800 shrink-0">
            <Bell className="h-3.5 w-3.5 text-amber-600 shrink-0 animate-pulse" />
            <span className="bg-amber-200 text-amber-900 text-[9px] font-black uppercase px-1.5 py-0.5 rounded leading-none">
              Notice:
            </span>
            <span className="truncate">{latestNotice.title} - {latestNotice.content}</span>
          </div>
        )}

        {/* Dynamic Viewport */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden min-w-0 max-w-full">
          {children}
        </main>
      </div>

      {/* 5. FLOATING EXPERT ROLE SWITCHER PANEL */}
      {showRolePanel ? (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-30 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xl sm:max-w-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Role Switcher</h4>
            </div>
            <button
              onClick={() => setShowRolePanel(false)}
              className="text-slate-400 hover:text-slate-655"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold leading-tight">
            Click roles below to test how the UI changes for different profiles in real-time.
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {(["PARENT", "TEACHER", "ACCOUNTANT", "ADMIN"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center border transition-all ${
                  activeRole === r
                    ? "bg-indigo-600 border-indigo-655 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowRolePanel(true)}
          className="fixed bottom-4 right-4 z-30 bg-indigo-600 text-white rounded-full p-3 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center justify-center cursor-pointer"
        >
          <ArrowRightLeft className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
