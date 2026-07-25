"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import ParentDashboard from "@/components/ParentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import AccountantDashboard from "@/components/AccountantDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import { ShieldAlert, Lock, Loader2 } from "lucide-react";

export default function IndexPage() {
  const { activeRole, user, authLoading } = useAuth();

  // Show loading spinner while auth session is being verified
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="h-14 w-14 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50">
          <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !activeRole) {
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Redirecting to login...</p>
      </div>
    );
  }

  // If mock user status is blocked, show custom locked account screen
  const isBlocked = user?.status === "BLOCKED";

  const renderDashboard = () => {
    if (isBlocked) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-4">
          <div className="h-16 w-16 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center text-rose-600 shadow-md">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Account Locked</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Your profile **({user?.name})** has been locked by the School Administrator.
            </p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-left text-xs font-semibold text-amber-800">
            <div className="flex gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Contact Administrator</p>
                <p className="mt-0.5">
                  Your account has been locked. Please contact the school administration to restore access.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (activeRole) {
      case "PARENT":
        return <ParentDashboard />;
      case "TEACHER":
        return <TeacherDashboard />;
      case "ACCOUNTANT":
        return <AccountantDashboard />;
      case "ADMIN":
        return <AdminDashboard />;
      default:
        return (
          <div className="text-center py-12 text-slate-400 font-medium">
            Loading dashboard...
          </div>
        );
    }
  };

  return <AppLayout>{renderDashboard()}</AppLayout>;
}
