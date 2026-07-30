"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import { ShieldAlert, Lock, Loader2 } from "lucide-react";

const DashboardLoading = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
    <p className="text-xs font-bold uppercase tracking-widest">Loading dashboard...</p>
  </div>
);

const ParentDashboard = dynamic(() => import("@/components/ParentDashboard"), {
  loading: DashboardLoading,
  ssr: false,
});
const TeacherDashboard = dynamic(() => import("@/components/TeacherDashboard"), {
  loading: DashboardLoading,
  ssr: false,
});
const AccountantDashboard = dynamic(() => import("@/components/AccountantDashboard"), {
  loading: DashboardLoading,
  ssr: false,
});
const AdminDashboard = dynamic(() => import("@/components/AdminDashboard"), {
  loading: DashboardLoading,
  ssr: false,
});

export default function IndexPage() {
  const { activeRole, user, authLoading } = useAuth();

  // Redirect to login ONLY when session check has finished (authLoading === false) and user is unauthenticated
  useEffect(() => {
    if (!authLoading && (!user || !activeRole)) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
  }, [authLoading, user, activeRole]);

  // If loading, show loader inside AppLayout
  if (authLoading) {
    return (
      <AppLayout>
        <DashboardLoading />
      </AppLayout>
    );
  }

  // If not loading and still unauthenticated, the useEffect will redirect. Show empty to prevent flash.
  if (!user || !activeRole) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  // Locked Account View
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
              Your profile ({user?.name}) has been locked by Administrator.
            </p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-left text-xs font-semibold text-amber-800">
            <div className="flex gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Contact Administrator</p>
                <p className="mt-0.5">Please contact school administration to restore access.</p>
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
        return <AdminDashboard />;
    }
  };

  return <AppLayout>{renderDashboard()}</AppLayout>;
}
