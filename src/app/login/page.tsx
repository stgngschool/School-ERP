"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock, User, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, UserCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<"STAFF" | "PARENT">("STAFF");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(username, password);

      if (!result.success) {
        throw new Error(result.error || "Invalid username/phone or password. Please try again.");
      }

      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 bg-gradient-to-b from-indigo-50/50 via-slate-50 to-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Subtle Background Glow Spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-14 h-14 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50 mb-3.5">
            <img src="/logo.png" alt="School Logo" className="w-10 h-10 object-contain rounded-full bg-slate-50 p-0.5" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">St. G.N.G. School</h1>
          <p className="text-indigo-600 text-xs mt-1 font-extrabold uppercase tracking-widest">School ERP & Finance OS</p>
        </div>

        {/* Light Theme Login Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60">
          {/* Portal Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab("STAFF"); setError(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "STAFF"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Staff Login</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("PARENT"); setError(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "PARENT"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Parent Portal</span>
            </button>
          </div>

          <div className="mb-5">
            <h2 className="text-base font-extrabold text-slate-900">
              {activeTab === "STAFF" ? "Staff & Administration Sign In" : "Parent & Student Portal Sign In"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeTab === "STAFF"
                ? "Enter your assigned staff username and password."
                : "Enter your registered mobile phone number or username."}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200/80 text-rose-700 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 mb-5 animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="font-bold leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            {/* Username Input */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                {activeTab === "STAFF" ? "Username" : "Parent Username / Phone Number"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder={activeTab === "STAFF" ? "e.g. admin, accountant, teacher" : "e.g. parent or 9876543210"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all text-sm font-semibold"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 text-white font-extrabold text-sm rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === "STAFF"
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{activeTab === "STAFF" ? "Access Staff Dashboard" : "Sign In to Parent Portal"}</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 font-semibold mt-6">
          © 2026 St. G.N.G. School ERP • All Rights Reserved
        </p>
      </div>
    </main>
  );
}


