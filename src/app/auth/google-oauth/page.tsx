"use client";

import React, { useState } from "react";
import { Shield, Check, Lock, ArrowRight } from "lucide-react";

export default function GoogleOAuthConsentPage() {
  const [step, setStep] = useState<"account" | "consent" | "success">("account");
  const [selectedAccount, setSelectedAccount] = useState("shubham.admin@gngschool.edu.in");
  const [customEmail, setCustomEmail] = useState("");

  const handleSelectAccount = (email: string) => {
    setSelectedAccount(email);
    setStep("consent");
  };

  const handleGrantPermission = () => {
    setStep("success");
    const accountEmail = customEmail || selectedAccount;

    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "GOOGLE_OAUTH_SUCCESS",
            email: accountEmail,
            accessToken: "ya29.a0ARW5m7_GoogleOAuthToken_Verified",
          },
          "*"
        );
      }
      window.close();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-6">
        {/* Google Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2 border-b border-slate-100 pb-5">
          <svg className="h-9 w-9" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <h2 className="text-base font-black text-slate-900 tracking-tight">Sign in with Google</h2>
          <p className="text-xs text-slate-500 font-semibold">to continue to <strong className="text-indigo-600">St. GNG School Finance OS</strong></p>
        </div>

        {/* Step 1: Choose Account */}
        {step === "account" && (
          <div className="space-y-4 animate-fade-in">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Choose an account
            </span>

            <div className="space-y-2">
              <button
                onClick={() => handleSelectAccount("shubham.admin@gngschool.edu.in")}
                className="w-full flex items-center gap-3 p-3 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-left group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Shubham (Admin)</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">shubham.admin@gngschool.edu.in</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => handleSelectAccount("school.finance@gmail.com")}
                className="w-full flex items-center gap-3 p-3 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-left group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  G
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">St. GNG School Accounts</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">school.finance@gmail.com</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </button>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Or enter custom Google email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => customEmail && handleSelectAccount(customEmail)}
                  className="py-1.5 px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Permissions Scope Consent */}
        {step === "consent" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {selectedAccount.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{selectedAccount}</p>
                <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">Signing In</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-800">
                St. GNG School Finance OS wants to access your Google Account
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                This will allow St. GNG School Finance OS to:
              </p>

              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>See, edit, create, and delete all your Google Sheets spreadsheets</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>See, edit, create, and delete your Google Drive backup files</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Send email vouchers and notifications on your behalf</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep("account")}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantPermission}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-500/20"
              >
                Allow / Grant Access
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Redirect */}
        {step === "success" && (
          <div className="text-center py-6 space-y-3 animate-fade-in">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 font-black" />
            </div>
            <h3 className="text-sm font-black text-slate-800">Google Access Granted!</h3>
            <p className="text-xs text-slate-500 font-semibold">
              Authorized as <strong>{selectedAccount}</strong>.<br />
              Redirecting back to St. GNG School Finance OS...
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-semibold">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-slate-400" /> Google OAuth 2.0 Security
          </span>
          <span className="text-indigo-600 font-bold">Privacy Policy</span>
        </div>
      </div>
    </div>
  );
}
