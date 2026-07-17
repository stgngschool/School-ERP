"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { School, Lock, User, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md mb-3">
            <School className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">School Finance OS</h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold">Management & Billing Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-5">Sign In</h2>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-xl flex items-start gap-2.5 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            {/* Username Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. parent, teacher, accountant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Access Portal</span>
              )}
            </button>
          </form>

          {/* Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Demo Credentials (Password: username + 123)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-50 p-2 border border-slate-100 rounded-lg flex flex-col">
                <span className="font-bold text-slate-700">Admin</span>
                <span className="text-slate-400">admin / admin123</span>
              </div>
              <div className="bg-slate-50 p-2 border border-slate-100 rounded-lg flex flex-col">
                <span className="font-bold text-slate-700">Accountant</span>
                <span className="text-slate-400">accountant / accountant123</span>
              </div>
              <div className="bg-slate-50 p-2 border border-slate-100 rounded-lg flex flex-col">
                <span className="font-bold text-slate-700">Teacher</span>
                <span className="text-slate-400">teacher / teacher123</span>
              </div>
              <div className="bg-slate-50 p-2 border border-slate-100 rounded-lg flex flex-col">
                <span className="font-bold text-slate-700">Parent</span>
                <span className="text-slate-400">parent / parent123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
