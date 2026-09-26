"use client";

import React, { useState } from "react";
import {
  Search,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";

interface UsersSecurityTabProps {
  usersList: any[];
  user: any;
  toggleUserStatus: (id: string) => Promise<any> | any;
  resetUserPassword: (id: string, newPw: string, currPw?: string, adminPw?: string) => Promise<any> | any;
  deleteUser: (id: string) => Promise<any> | any;
  registerNewStaff: (data: any) => Promise<any> | any;
  refreshUsers?: () => Promise<any> | any;
  filteredSortedClasses: any[];
  itemsPerPage?: number;
  showToast: (type: any, title: string, message: string) => void;
}

export default function UsersSecurityTab({
  usersList,
  user,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
  registerNewStaff,
  refreshUsers,
  filteredSortedClasses,
  itemsPerPage = 50,
  showToast,
}: UsersSecurityTabProps) {
  // User Security Tab States
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [securityTabMode, setSecurityTabMode] = useState<"staff" | "parents">("staff");
  const [parentsCurrentPage, setParentsCurrentPage] = useState(1);

  // Password Reset Modal States
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUserName, setResetUserName] = useState("");
  const [resetCurrentPassword, setResetCurrentPassword] = useState("");
  const [resetAdminPassword, setResetAdminPassword] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetModalError, setResetModalError] = useState("");
  const [resetModalSuccess, setResetModalSuccess] = useState("");
  const [resetModalLoading, setResetModalLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Add Staff Modal States
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
  const [newStaffClassId, setNewStaffClassId] = useState("");

  // Assign Class Teacher Modal States
  const [showAssignClassModal, setShowAssignClassModal] = useState(false);
  const [assignClassUserId, setAssignClassUserId] = useState("");
  const [assignClassUserName, setAssignClassUserName] = useState("");
  const [selectedClassIdForTeacher, setSelectedClassIdForTeacher] = useState("");
  const [assignClassLoading, setAssignClassLoading] = useState(false);
  const [assignClassError, setAssignClassError] = useState("");
  const [assignClassSuccess, setAssignClassSuccess] = useState("");

  return (
    <div className="space-y-6 animate-fade-in text-left">
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
          School Staff Directory
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
          Parents & Guardians Directory
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
            👥
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
            ✓
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
            🔒
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
            + Register Staff Account
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
                const itemsPerPageLocal = securityTabMode === "parents" ? 10 : itemsPerPage;
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
                             <div className="space-y-1">
                               <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded border ${roleColors}`}>
                                 {usr.role}
                               </span>
                               {usr.role === "TEACHER" && (
                                 <div className="text-[10px] text-slate-500 font-semibold leading-tight">
                                   Class: {usr.teacherProfile?.classes && usr.teacherProfile.classes.length > 0 
                                     ? `${usr.teacherProfile.classes[0].name}-${usr.teacherProfile.classes[0].section}` 
                                     : "None"}
                                 </div>
                               )}
                             </div>
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
                              {usr.id === user?.id ? (
                                <span
                                  title="You cannot lock your own active administrator account"
                                  className="py-1 px-2.5 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center gap-1"
                                >
                                  🔒 Protected
                                </span>
                              ) : (
                                <button
                                  onClick={() => toggleUserStatus(usr.id)}
                                  title={isBlocked ? "Unlock Account" : "Lock Account"}
                                  className={`py-1 px-2.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    !isBlocked
                                      ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-150"
                                      : "bg-green-50 hover:bg-green-100 text-green-600 border-green-150"
                                  }`}
                                >
                                  {isBlocked ? "🔓 Unlock" : "🔒 Lock"}
                                </button>
                              )}

                              {/* 2. Reset Password Modal Trigger */}
                              <button
                                onClick={() => {
                                  setResetUserId(usr.id);
                                  setResetUserName(usr.name);
                                  setResetCurrentPassword("");
                                  setResetAdminPassword("");
                                  setResetNewPassword("");
                                  setResetConfirmPassword("");
                                  setResetModalError("");
                                  setResetModalSuccess("");
                                  setShowCurrentPassword(false);
                                  setShowNewPassword(false);
                                  setShowConfirmPassword(false);
                                  setShowPasswordResetModal(true);
                                }}
                                title={usr.id === user?.id ? "Change My Password" : "Reset User Password"}
                                className="py-1 px-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
                              >
                                🔑 {usr.id === user?.id ? "Change PW" : "Reset PW"}
                              </button>

                              {/* 3. Delete User Trigger */}
                              {usr.id === user?.id ? (
                                <span
                                  title="You cannot delete your own active administrator account"
                                  className="py-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed inline-flex items-center gap-1"
                                >
                                  🗑️ Self
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const confirmMsg = 
                                      usr.role === "PARENT"
                                        ? `CAUTION: Are you sure you want to permanently delete parent account "${usr.name}"? This will ALSO delete their registered children, dues, fee invoices, ledger transactions, and attendance logs. This action CANNOT be undone.`
                                        : `Are you sure you want to permanently delete staff account "${usr.name}"? This action CANNOT be undone.`;
                                    
                                    if (confirm(confirmMsg)) {
                                      const res = await deleteUser(usr.id);
                                      if (res?.success) {
                                        showToast("success", "Account Deleted", `User account "${usr.name}" deleted successfully.`);
                                      } else {
                                        showToast("error", "Deletion Failed", res?.error || "Could not delete user account.");
                                      }
                                    }
                                  }}
                                  title="Delete User Account"
                                  className="py-1 px-2 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-150 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                                >
                                  🗑️ Delete
                                </button>
                              )}

                              {/* 4. Assign Class Teacher */}
                              {usr.role === "TEACHER" && (
                                <button
                                  onClick={() => {
                                    setAssignClassUserId(usr.id);
                                    setAssignClassUserName(usr.name);
                                    const currentClass = usr.teacherProfile?.classes?.[0]?.id || "";
                                    setSelectedClassIdForTeacher(currentClass);
                                    setAssignClassError("");
                                    setAssignClassSuccess("");
                                    setShowAssignClassModal(true);
                                  }}
                                  title="Assign Class Teacher"
                                  className="py-1 px-2.5 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                                >
                                  🏫 Class
                                </button>
                              )}
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
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] mt-4 text-xs font-bold text-slate-500 gap-3">
            <div>
              Showing <span className="text-slate-800 font-extrabold">{((parentsCurrentPage - 1) * itemsPerPageLocal) + 1}</span> to{" "}
              <span className="text-slate-800 font-extrabold">
                {Math.min(parentsCurrentPage * itemsPerPageLocal, totalItems)}
              </span>{" "}
              of <span className="text-slate-800 font-black">{totalItems}</span> parents
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
                      className={`h-7 w-7 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                        parentsCurrentPage === item
                          ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
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

      {/* Password Reset Modal */}
      {showPasswordResetModal && (() => {
        const isSelfReset = resetUserId === user?.id;

        return (
          <div className="fixed inset-0 z-45 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 text-left animate-fade-in">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${isSelfReset ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">
                      {isSelfReset ? "Change My Password" : `Reset Password: ${resetUserName}`}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                      {isSelfReset
                        ? "Verify current password to securely set a new password"
                        : "Requires Admin authorization password to prevent unauthorized changes"
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setResetUserId("");
                    setResetUserName("");
                    setResetCurrentPassword("");
                    setResetAdminPassword("");
                    setResetNewPassword("");
                    setResetConfirmPassword("");
                    setResetModalError("");
                    setResetModalSuccess("");
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {resetModalError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100 text-xs font-bold flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{resetModalError}</span>
                </div>
              )}

              {resetModalSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{resetModalSuccess}</span>
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setResetModalError("");
                  setResetModalSuccess("");

                  if (isSelfReset && !resetCurrentPassword.trim()) {
                    setResetModalError("Please enter your current password.");
                    return;
                  }
                  if (!isSelfReset && !resetAdminPassword.trim()) {
                    setResetModalError("Please enter your Admin authorization password.");
                    return;
                  }
                  if (resetNewPassword !== resetConfirmPassword) {
                    setResetModalError("New passwords do not match!");
                    return;
                  }
                  if (resetNewPassword.length < 6) {
                    setResetModalError("New password must be at least 6 characters long.");
                    return;
                  }

                  setResetModalLoading(true);
                  try {
                    const res = await resetUserPassword(
                      resetUserId,
                      resetNewPassword,
                      isSelfReset ? resetCurrentPassword : undefined,
                      !isSelfReset ? resetAdminPassword : undefined
                    );

                    if (res?.success) {
                      setResetModalSuccess(isSelfReset ? "Your password has been changed successfully!" : "User password has been updated successfully.");
                      setResetCurrentPassword("");
                      setResetAdminPassword("");
                      setResetNewPassword("");
                      setResetConfirmPassword("");
                      setTimeout(() => {
                        setShowPasswordResetModal(false);
                        setResetUserId("");
                        setResetUserName("");
                        setResetModalSuccess("");
                      }, 1800);
                    } else {
                      setResetModalError(res?.error || "Failed to reset password.");
                    }
                  } catch (err: any) {
                    setResetModalError(err.message || "An unexpected error occurred.");
                  } finally {
                    setResetModalLoading(false);
                  }
                }}
                className="space-y-3.5"
              >
                {/* 1. Identity Verification Field */}
                {isSelfReset ? (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Current Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={resetCurrentPassword}
                        onChange={(e) => setResetCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full text-xs font-bold py-2.5 pl-3 pr-10 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-indigo-500" />
                      Admin Authorization Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={resetAdminPassword}
                        onChange={(e) => setResetAdminPassword(e.target.value)}
                        placeholder="Enter your Master Admin password"
                        className="w-full text-xs font-bold py-2.5 pl-3 pr-10 border border-indigo-200 rounded-xl outline-none bg-indigo-50/30 focus:bg-white focus:border-indigo-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1 block">
                      Confirms that you are the authorized school administrator.
                    </span>
                  </div>
                )}

                {/* 2. New Password */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full text-xs font-bold py-2.5 pl-3 pr-10 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Confirm New Password */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full text-xs font-bold py-2.5 pl-3 pr-10 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    disabled={resetModalLoading}
                    onClick={() => {
                      setShowPasswordResetModal(false);
                      setResetUserId("");
                      setResetUserName("");
                      setResetCurrentPassword("");
                      setResetAdminPassword("");
                      setResetNewPassword("");
                      setResetConfirmPassword("");
                      setResetModalError("");
                      setResetModalSuccess("");
                    }}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetModalLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {resetModalLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>{isSelfReset ? "Update My Password" : "Save User Password"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Register New Staff Account Modal */}
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
                  setNewStaffClassId("");
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
                ⚠️ {addStaffError}
              </div>
            )}

            {addStaffSuccess && (
              <div className="bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-100 text-[10px] font-bold">
                ✓ {addStaffSuccess}
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
                  employeeId: newStaffEmployeeId || undefined,
                  classId: newStaffRole === "TEACHER" ? (newStaffClassId || undefined) : undefined
                });

                if (res?.success) {
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
                    setNewStaffClassId("");
                    setAddStaffSuccess("");
                  }, 1500);
                } else {
                  setAddStaffError(res?.error || "Failed to register staff account.");
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

              {newStaffRole === "TEACHER" && (
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assign Class Teacher of (Optional)</label>
                  <select
                    value={newStaffClassId}
                    onChange={(e) => setNewStaffClassId(e.target.value)}
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="">No Class (Subject Teacher)</option>
                    {filteredSortedClasses.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        Class {cls.name}-{cls.section}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                    setNewStaffClassId("");
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

      {/* Assign Class Teacher Modal */}
      {showAssignClassModal && (
        <div className="fixed inset-0 z-45 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-left animate-fade-in animate-duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Assign Class Teacher</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Assign class teacher responsibilities for {assignClassUserName}.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAssignClassModal(false);
                  setAssignClassUserId("");
                  setAssignClassUserName("");
                  setSelectedClassIdForTeacher("");
                  setAssignClassError("");
                  setAssignClassSuccess("");
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {assignClassError && (
              <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-100 text-[10px] font-bold">
                ⚠️ {assignClassError}
              </div>
            )}

            {assignClassSuccess && (
              <div className="bg-green-50 text-green-700 p-2.5 rounded-lg border border-green-100 text-[10px] font-bold">
                ✓ {assignClassSuccess}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAssignClassLoading(true);
                setAssignClassError("");
                setAssignClassSuccess("");

                try {
                  const res = await fetch("/api/users", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userId: assignClassUserId,
                      action: "ASSIGN_CLASS",
                      classId: selectedClassIdForTeacher || null
                    })
                  });

                  const data = await res.json();
                  if (res.ok && data.success) {
                    setAssignClassSuccess("Class assigned successfully!");
                    if (refreshUsers) {
                      await refreshUsers();
                    }
                    setTimeout(() => {
                      setShowAssignClassModal(false);
                      setAssignClassUserId("");
                      setAssignClassUserName("");
                      setSelectedClassIdForTeacher("");
                      setAssignClassSuccess("");
                    }, 1500);
                  } else {
                    setAssignClassError(data.error || "Failed to assign class.");
                  }
                } catch (err: any) {
                  setAssignClassError(err.message || "Failed to assign class.");
                } finally {
                  setAssignClassLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Class</label>
                <select
                  value={selectedClassIdForTeacher}
                  onChange={(e) => setSelectedClassIdForTeacher(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">No Class (Subject Teacher)</option>
                  {filteredSortedClasses.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.name}-{cls.section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignClassModal(false);
                    setAssignClassUserId("");
                    setAssignClassUserName("");
                    setSelectedClassIdForTeacher("");
                    setAssignClassError("");
                    setAssignClassSuccess("");
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignClassLoading}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  {assignClassLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Assign Class</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
