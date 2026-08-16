"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import SchoolWebsite from "@/components/website/SchoolWebsite";
import { ShieldAlert, Lock, Loader2, Globe, LayoutDashboard } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"WEBSITE" | "ERP">("WEBSITE");
  const [isClient, setIsClient] = useState(false);
  const [isPwaMode, setIsPwaMode] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get("view");
      const isPwaSource = params.get("source") === "pwa";
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      if (isPwaSource || isStandalone) {
        setIsPwaMode(true);
        if (user && activeRole) {
          setViewMode("ERP");
        } else if (!authLoading && !user) {
          // If launched from installed standalone PWA on phone and not logged in, take to Login
          window.location.replace("/login?source=pwa");
        }
      } else if (requestedView === "erp") {
        if (user && activeRole) {
          setViewMode("ERP");
        }
      }
    }
  }, [user, activeRole, authLoading]);

  // Account locked view
  const isBlocked = user?.status === "BLOCKED";

  const renderDashboardContent = () => {
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

  // If in PWA standalone mode and still checking auth, show clean loading
  if (isPwaMode && authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Opening School ERP App...
        </p>
      </div>
    );
  }

  // If user is in ERP mode and authenticated, render the ERP Layout
  const isERPActive = (viewMode === "ERP" || isPwaMode) && !!user && !!activeRole;

  if (isERPActive) {
    return (
      <div>
        {/* Quick Floating Switcher to view Public Website (hidden in standalone PWA app) */}
        {!isPwaMode && (
          <div className="fixed bottom-4 right-4 z-50">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("view");
                  window.history.pushState({}, "", url.toString());
                }
                setViewMode("WEBSITE");
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 text-white hover:bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-md text-xs font-extrabold cursor-pointer transition-all hover:scale-105"
              title="View Public School Website"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>View Public Website</span>
            </button>
          </div>
        )}

        <AppLayout>{renderDashboardContent()}</AppLayout>
      </div>
    );
  }

  // Otherwise, render the Official Public School Website (for all web browser visitors)
  return (
    <SchoolWebsite
      user={user}
      activeRole={activeRole}
      onGoToPortal={() => {
        if (user && activeRole) {
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("view", "erp");
            window.history.pushState({}, "", url.toString());
          }
          setViewMode("ERP");
        } else {
          window.location.href = "/login";
        }
      }}
    />
  );
}
