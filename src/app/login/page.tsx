"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Lock,
  User,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  ArrowLeft,
  GraduationCap,
  Phone,
  HelpCircle,
  CheckCircle2,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const { user, activeRole, login } = useAuth();
  const [activeTab, setActiveTab] = useState<"STAFF" | "PARENT">("STAFF");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Parent first-time activation state (SEC-06)
  const [isActivating, setIsActivating] = useState(false);
  const [activationAdmission, setActivationAdmission] = useState("");
  const [activationMobile, setActivationMobile] = useState("");
  const [activationPassword, setActivationPassword] = useState("");
  const [activationConfirmPassword, setActivationConfirmPassword] = useState("");
  const [showActivationPassword, setShowActivationPassword] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActivationSuccess(null);

    const cleanAdm = activationAdmission.trim();
    const cleanMob = activationMobile.replace(/\D/g, "");
    const cleanPass = activationPassword.trim();
    const cleanConfirm = activationConfirmPassword.trim();

    if (!cleanAdm || cleanMob.length < 10) {
      setError("Please enter a valid Admission Number and a 10-digit registered mobile number.");
      return;
    }

    if (cleanPass.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (cleanPass.length > 72) {
      setError("Password must not exceed 72 characters.");
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setError("Passwords do not match. Please verify and re-type.");
      return;
    }

    setActivationLoading(true);

    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber: cleanAdm,
          mobile: cleanMob,
          newPassword: cleanPass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Activation failed. Please check your details.");
      }

      setActivationSuccess(data.message || "Account activated successfully! Please sign in with your new password.");
      setUsername(cleanMob);
      setIsActivating(false);
      setActivationAdmission("");
      setActivationMobile("");
      setActivationPassword("");
      setActivationConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Activation failed. Please check your details.");
    } finally {
      setActivationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username/phone and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await login(username.trim(), password.trim(), activeTab);

      if (!result.success) {
        throw new Error(result.error || "Invalid credentials. Please verify and try again.");
      }

      window.location.replace("/?view=erp");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/60 bg-gradient-to-b from-indigo-50/40 via-slate-50 to-slate-100/80 flex flex-col justify-between items-center px-4 py-6 sm:py-8 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* ─── Ambient Glow Blobs (Clean & Subtle) ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-indigo-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[450px] h-[450px] bg-emerald-500/6 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-rose-500/6 rounded-full blur-3xl" />
      </div>

      {/* ─── Top Navigation Header ─── */}
      <header className="w-full max-w-lg mx-auto flex items-center justify-between z-10 mb-3 sm:mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white border border-slate-200/80 shadow-2xs backdrop-blur-md transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>School Website</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            UDISE: 09670707502
          </span>
        </div>
      </header>

      {/* ─── Center Login Container ─── */}
      <div className="w-full max-w-md mx-auto relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="relative mb-3 group">
            <div className="w-20 h-20 bg-white rounded-3xl p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/80 flex items-center justify-center transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="St. G.N.G. School"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            St. G.N.G. School
          </h1>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-150/60 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>School ERP & Finance OS</span>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            Salarpur, Rasulgarh, Varanasi • Academic Session 2026–27
          </p>
        </div>

        {/* Active Session Notification (If already logged in) */}
        {user && activeRole && (
          <div className="mb-5 p-4 rounded-3xl bg-indigo-50/90 border border-indigo-200/70 text-xs text-indigo-950 flex items-center justify-between gap-3 shadow-2xs backdrop-blur-sm animate-scale-in">
            <div className="space-y-0.5">
              <p className="font-extrabold flex items-center gap-1.5 text-indigo-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Active Session Detected
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                Logged in as <strong className="text-indigo-950">{user.name || user.username}</strong> ({activeRole})
              </p>
            </div>
            <Link
              href="/?view=erp"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shrink-0 shadow-sm flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <span>Open ERP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ─── Glassy Login Card ─── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          {/* Segmented Portal Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/70 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("STAFF");
                setError(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 active:outline-none select-none ${
                activeTab === "STAFF"
                  ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800 border border-transparent"
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${
                  activeTab === "STAFF" ? "text-indigo-600" : "text-slate-400"
                }`}
              />
              <span>Staff Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("PARENT");
                setError(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 active:outline-none select-none ${
                activeTab === "PARENT"
                  ? "bg-white text-rose-700 shadow-2xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800 border border-transparent"
              }`}
            >
              <UserCheck
                className={`w-4 h-4 ${
                  activeTab === "PARENT" ? "text-rose-600" : "text-slate-400"
                }`}
              />
              <span>Parent Portal</span>
            </button>
          </div>

          {/* Section Heading */}
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-slate-900">
              {activeTab === "STAFF"
                ? "Staff & Administration Sign In"
                : isActivating
                ? "First-Time Parent Activation"
                : "Parent & Student Portal Sign In"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeTab === "STAFF"
                ? "Enter your assigned staff username and password."
                : isActivating
                ? "Verify student Admission Number & registered mobile to set your password."
                : "Enter your registered 10-digit mobile number or Family ID."}
            </p>
          </div>

          {/* Success Message Box */}
          {activationSuccess && (
            <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 mb-5 animate-scale-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="space-y-0.5">
                <p className="font-extrabold">Account Activated</p>
                <p className="font-semibold text-emerald-700">{activationSuccess}</p>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {error && (
            <div className="bg-rose-50 border border-rose-200/80 text-rose-800 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 mb-5 animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-0.5">
                <p className="font-extrabold">Authentication Failed</p>
                <p className="font-semibold text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Form: First-Time Activation or Standard Sign In */}
          {isActivating && activeTab === "PARENT" ? (
            <form onSubmit={handleActivationSubmit} className="space-y-3.5">
              {/* Admission Number Input */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  Student Admission Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. ADM-2026-0001"
                    value={activationAdmission}
                    onChange={(e) => setActivationAdmission(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/15 focus:bg-white transition-all text-sm font-semibold shadow-2xs"
                  />
                </div>
              </div>

              {/* Registered Mobile Input */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={activationMobile}
                    onChange={(e) => setActivationMobile(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/15 focus:bg-white transition-all text-sm font-semibold shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  Create New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showActivationPassword ? "text" : "password"}
                    required
                    minLength={6}
                    maxLength={72}
                    placeholder="At least 6 characters"
                    value={activationPassword}
                    onChange={(e) => setActivationPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/15 focus:bg-white transition-all text-sm font-semibold shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActivationPassword(!showActivationPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer outline-none focus:outline-none"
                    title={showActivationPassword ? "Hide password" : "Show password"}
                  >
                    {showActivationPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <input
                    type={showActivationPassword ? "text" : "password"}
                    required
                    minLength={6}
                    maxLength={72}
                    placeholder="Repeat new password"
                    value={activationConfirmPassword}
                    onChange={(e) => setActivationConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/15 focus:bg-white transition-all text-sm font-semibold shadow-2xs"
                  />
                </div>
              </div>

              {/* Submit Activation Button */}
              <button
                type="submit"
                disabled={activationLoading}
                className="w-full py-3.5 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3 outline-none focus:outline-none bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
              >
                {activationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <span>Activate & Set Password</span>
                )}
              </button>

              {/* Back to Sign In Button */}
              <button
                type="button"
                onClick={() => {
                  setIsActivating(false);
                  setError(null);
                }}
                className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                ← Back to Parent Sign In
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username / Phone Input */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                    {activeTab === "STAFF"
                      ? "Staff Username / Email"
                      : "Registered Mobile / Family ID"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      {activeTab === "STAFF" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </span>
                    <input
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={
                        activeTab === "STAFF"
                          ? "e.g. admin, accountant, teacher"
                          : "e.g. 9876543210 or FAM-2026-0001"
                      }
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 focus:bg-white transition-all text-sm font-semibold shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 focus:bg-white transition-all text-sm font-semibold shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer outline-none focus:outline-none"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Helper Notice */}
                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 pt-0.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {activeTab === "STAFF"
                      ? "Access is restricted to authorized school personnel."
                      : "Parents can view fees, reports, and attendance records."}
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3 outline-none focus:outline-none ${
                    activeTab === "STAFF"
                      ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>
                      {activeTab === "STAFF"
                        ? "Access Staff Dashboard"
                        : "Sign In to Parent Portal"}
                    </span>
                  )}
                </button>
              </form>

              {/* First-Time Parent Activation Toggle Link */}
              {activeTab === "PARENT" && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsActivating(true);
                      setError(null);
                      setActivationSuccess(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer group"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                    <span>First-Time Login? Activate Parent Account</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Support & Copyright ─── */}
        <div className="mt-6 text-center space-y-1.5">
          <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
            <span>Helpdesk Support:</span>
            <a
              href="tel:9452824318"
              className="text-indigo-600 font-extrabold hover:underline"
            >
              +91 9452824318
            </a>
          </p>

          <p className="text-[11px] text-slate-400 font-medium">
            © 2026 St. G.N.G. School ERP • All Rights Reserved
          </p>
        </div>
      </div>
    </main>
  );
}


