"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import { ShieldAlert, Lock, Loader2, AlertOctagon, RotateCcw } from "lucide-react";

const DashboardLoading = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
    <Loader2 className="h-6 w-6 animate-spin" />
    <p className="text-xs font-bold uppercase tracking-widest">Loading dashboard module...</p>
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
  const { activeRole, user, authLoading, currentStage, stageError, retryInitSession } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // 10-Second Safety Loading Timeout Guard
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authLoading) {
      setTimedOut(false);
      timer = setTimeout(() => {
        console.error(`[IndexPage Timeout] Dashboard loading exceeded 10 seconds. Current stage: ${currentStage}`);
        setTimedOut(true);
      }, 10000);
    } else {
      setTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [authLoading, currentStage]);

  // Render Error & Retry Screen if dashboard loading exceeds 10 seconds
  if (timedOut && authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-md bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-rose-100 space-y-5 animate-scale-in">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-center text-rose-600 mx-auto shadow-sm">
            <AlertOctagon className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Dashboard loading failed.</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              The application exceeded the 10-second loading timeout limit.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs font-mono space-y-2.5">
            <div>
              <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block">Current Stage:</span>
              <span className="font-black text-indigo-600 block mt-0.5">{currentStage || "CHECKING SESSION"}</span>
            </div>
            <div>
              <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block">Error:</span>
              <span className="font-bold text-rose-600 break-words block mt-0.5">
                {stageError || "Network request timed out or session verification stalled."}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTimedOut(false);
              retryInitSession();
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Loading Dashboard</span>
          </button>
        </div>
      </main>
    );
  }

  // Show loading spinner while auth session is being verified (< 10 seconds)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="h-14 w-14 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50">
          <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Dashboard...</p>
        <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">{currentStage}</p>
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
