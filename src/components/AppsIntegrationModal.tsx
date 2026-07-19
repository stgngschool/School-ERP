"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  Search,
  Lock,
  QrCode,
  Mail,
  Check,
  AlertTriangle,
  Key,
} from "lucide-react";

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  status: "CONNECTED" | "DISCONNECTED";
  autoSync: boolean;
  lastSynced: string | null;
  config?: Record<string, string>;
  account?: string;
  target?: string;
  docUrl?: string;
}

interface AppsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppsIntegrationModal({ isOpen, onClose }: AppsIntegrationModalProps) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "connected" | "unconnected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  // Wizard Connect States
  const [authWizardItem, setAuthWizardItem] = useState<IntegrationItem | null>(null);
  const [wizardInputs, setWizardInputs] = useState<Record<string, string>>({});
  const [isAuthorizedConsent, setIsAuthorizedConsent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [wizardError, setWizardError] = useState("");

  const [showUpiQrModal, setShowUpiQrModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
    }
  }, [isOpen]);

  // Listen for Google OAuth Popup postMessage events
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "GOOGLE_OAUTH_SUCCESS") {
        const email = event.data.email;
        setWizardInputs((prev) => ({ ...prev, accountEmail: email }));
        showToast(`✅ Google Sign-In Successful as ${email}`);
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (e) {
      console.error("Failed to load integrations:", e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Launch REAL Google OAuth Popup Window
  const launchGoogleOAuthPopup = () => {
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    window.open(
      "/auth/google-oauth",
      "Google OAuth 2.0 Sign In",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
    );
  };

  const openConnectWizard = (item: IntegrationItem) => {
    setAuthWizardItem(item);
    setWizardInputs({
      accountEmail: item.config?.accountEmail || "shubham.admin@gngschool.edu.in",
      spreadsheetId: item.config?.spreadsheetId || "",
      folderId: item.config?.folderId || "",
      phone: item.config?.phone || "+919876543210",
      upiId: item.config?.upiId || "gngschool@upi",
      botToken: item.config?.botToken || "",
      chatId: item.config?.chatId || "",
      smtpHost: item.config?.smtpHost || "smtp.gmail.com",
    });
    setIsAuthorizedConsent(true);
    setWizardError("");
  };

  const handleVerifyAndConnect = async () => {
    if (!authWizardItem) return;

    if (!isAuthorizedConsent) {
      setWizardError("You must check the authorization consent box to proceed.");
      return;
    }

    setIsVerifying(true);
    setWizardError("");

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_AND_CONNECT",
          id: authWizardItem.id,
          config: wizardInputs,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((item) => (item.id === authWizardItem.id ? data.integration : item))
        );
        setAuthWizardItem(null);
        showToast(`✅ ${data.message}`);
      } else {
        setWizardError(data.error || "Connection authorization failed.");
      }
    } catch (e: any) {
      setWizardError("Failed to connect: Network or API authorization timeout.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISCONNECT", id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((item) => (item.id === id ? data.integration : item))
        );
        showToast(`ℹ️ ${data.message}`);
      }
    } catch (e) {
      showToast("❌ Failed to disconnect integration.");
    }
  };

  const handleToggleAutoSync = async (id: string) => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_AUTO_SYNC", id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((item) => (item.id === id ? data.integration : item))
        );
      }
    } catch (e) {
      console.error("Failed to toggle auto sync", e);
    }
  };

  const handleSyncNow = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_NOW", id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((item) => (item.id === id ? data.integration : item))
        );
        showToast(`⚡ ${data.message}`);

        if (data.downloadUrl) {
          const a = document.createElement("a");
          a.href = data.downloadUrl;
          a.download = "";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } catch (e) {
      showToast("❌ Execution failed.");
    } finally {
      setSyncingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredIntegrations = integrations.filter((item) => {
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "connected"
        ? item.status === "CONNECTED"
        : item.status === "DISCONNECTED";

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const getIconBadge = (iconType: string) => {
    switch (iconType) {
      case "sheets":
        return (
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 shrink-0 shadow-sm">
            📊
          </div>
        );
      case "drive":
        return (
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center font-bold text-amber-600 shrink-0 shadow-sm">
            📁
          </div>
        );
      case "whatsapp":
        return (
          <div className="h-10 w-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center font-bold text-green-600 shrink-0 shadow-sm">
            💬
          </div>
        );
      case "email":
        return (
          <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center font-bold text-rose-600 shrink-0 shadow-sm">
            ✉️
          </div>
        );
      case "upi":
        return (
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 shrink-0 shadow-sm">
            💳
          </div>
        );
      case "calendar":
        return (
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0 shadow-sm">
            📅
          </div>
        );
      case "telegram":
        return (
          <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center font-bold text-sky-600 shrink-0 shadow-sm">
            ✈️
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0 shadow-sm">
            🔌
          </div>
        );
    }
  };

  const connectedCount = integrations.filter((i) => i.status === "CONNECTED").length;
  const currentUpiId = integrations.find((i) => i.id === "dynamic_upi")?.config?.upiId || "gngschool@upi";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[120] bg-slate-900 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2.5 animate-bounce">
          <Zap className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* UPI QR Modal */}
      {showUpiQrModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-800">Dynamic UPI Payment QR</h4>
              <button onClick={() => setShowUpiQrModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(
                  currentUpiId
                )}%26pn=St.%20G.N.G.%20School`}
                alt="UPI QR Code"
                className="w-48 h-48 rounded-xl border border-slate-200 shadow-inner"
              />
              <p className="text-xs font-black text-slate-800 mt-3">{currentUpiId}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                St. G.N.G. School Official Account
              </p>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Scan with PhonePe, GPay, Paytm, or BHIM UPI app to complete instant fee payments.
            </p>
            <button
              onClick={() => setShowUpiQrModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ════════════════════════════════════════════════════════════════
            REAL GOOGLE OAUTH 2.0 & PERMISSION VERIFICATION WIZARD
        ════════════════════════════════════════════════════════════════ */}
        {authWizardItem && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-slate-800">
              
              {/* Wizard Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {getIconBadge(authWizardItem.icon)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">Authorize {authWizardItem.name}</h3>
                      <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-150">
                        OAuth 2.0
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">
                      St. G.N.G. School Integration Security Access
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAuthWizardItem(null)}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Error Banner */}
              {wizardError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{wizardError}</span>
                </div>
              )}

              {/* Google OAuth Login Trigger Button */}
              {authWizardItem.id.startsWith("google") && (
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <div>
                      <p className="text-xs font-black">Google Account Authorization</p>
                      <p className="text-[9px] text-slate-400 font-bold">Sign in with Google OAuth popup window</p>
                    </div>
                  </div>
                  <button
                    onClick={launchGoogleOAuthPopup}
                    className="py-1.5 px-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0"
                  >
                    Sign In with Google
                  </button>
                </div>
              )}

              {/* Requested Scope Permissions */}
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Requested Security Permissions
                </span>
                <ul className="text-xs font-semibold text-slate-700 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 font-black shrink-0" />
                    <span>Read & Sync PostgreSQL student records and fee ledger data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 font-black shrink-0" />
                    <span>Authorize automated background tasks for {authWizardItem.name}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 font-black shrink-0" />
                    <span>Offline access & refresh token storage</span>
                  </li>
                </ul>
              </div>

              {/* Specific Credential Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Connected Account Email ID
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="shubham.admin@gngschool.edu.in"
                      value={wizardInputs.accountEmail || ""}
                      onChange={(e) => setWizardInputs({ ...wizardInputs, accountEmail: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {authWizardItem.id === "google_sheets" && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Target Google Spreadsheet URL or ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Paste link: https://docs.google.com/spreadsheets/d/1BxiMVs..."
                      value={wizardInputs.spreadsheetId || ""}
                      onChange={(e) => setWizardInputs({ ...wizardInputs, spreadsheetId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                    <span className="text-[9px] font-semibold text-slate-400 block mt-1">
                      Paste your Google Spreadsheet URL. System will verify with Google servers before connecting.
                    </span>
                  </div>
                )}

                {authWizardItem.id === "google_drive" && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Google Drive Backup Folder ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1a2b3c4d5e6f7g..."
                      value={wizardInputs.folderId || ""}
                      onChange={(e) => setWizardInputs({ ...wizardInputs, folderId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {authWizardItem.id === "whatsapp_alerts" && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      WhatsApp Business Sender Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={wizardInputs.phone || ""}
                      onChange={(e) => setWizardInputs({ ...wizardInputs, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {authWizardItem.id === "telegram_bot" && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                        Telegram Bot API Token <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="123456789:ABCdefGhIJKlmNoPQ..."
                        value={wizardInputs.botToken || ""}
                        onChange={(e) => setWizardInputs({ ...wizardInputs, botToken: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                        Target Chat / Group ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="-100123456789"
                        value={wizardInputs.chatId || ""}
                        onChange={(e) => setWizardInputs({ ...wizardInputs, chatId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {authWizardItem.id === "dynamic_upi" && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      School Merchant UPI VPA ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="gngschool@upi"
                      value={wizardInputs.upiId || ""}
                      onChange={(e) => setWizardInputs({ ...wizardInputs, upiId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Consent Checkbox */}
              <label className="flex items-start gap-2 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAuthorizedConsent}
                  onChange={(e) => setIsAuthorizedConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] font-bold text-slate-600 leading-tight">
                  I authorize St. G.N.G. School Finance OS to link and exchange data with {authWizardItem.name}.
                </span>
              </label>

              {/* Wizard Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={handleVerifyAndConnect}
                  disabled={isVerifying}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Connection with Google Servers...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-indigo-200" /> Verify & Authorize Connection
                    </>
                  )}
                </button>
                <button
                  onClick={() => setAuthWizardItem(null)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Left Sidebar Menu */}
        <div className="w-full md:w-64 bg-slate-900 text-white p-5 flex flex-col justify-between shrink-0 select-none">
          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">Apps & Connectors</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Live Integration Hub</p>
              </div>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sliders className="h-4 w-4" /> All Connectors
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-extrabold">
                  {integrations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("connected")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "connected"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Authorized Apps
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full font-extrabold border border-emerald-800/40">
                  {connectedCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("unconnected")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "unconnected"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-400" /> Available Apps
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-extrabold">
                  {integrations.length - connectedCount}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Google OAuth 2.0 Verified</span>
          </div>
        </div>

        {/* Right Main Panel */}
        <div className="flex-1 flex flex-col bg-slate-50 min-h-0 overflow-hidden">
          {/* Header Bar */}
          <div className="bg-white border-b border-slate-200/80 p-4 flex items-center justify-between gap-4 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search connectors (Sheets, WhatsApp, UPI, Telegram)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-bold text-slate-500">Loading Integration Connectors...</p>
              </div>
            ) : filteredIntegrations.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200/60 rounded-2xl p-6">
                <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No integration connectors found</p>
                <p className="text-[10px] text-slate-400 mt-1">Try resetting your search query or switching tabs.</p>
              </div>
            ) : (
              filteredIntegrations.map((item) => {
                const isConnected = item.status === "CONNECTED";
                const isSyncing = syncingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                      isConnected ? "border-emerald-200/80 bg-emerald-50/10" : "border-slate-200/70"
                    }`}
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getIconBadge(item.icon)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-slate-800">{item.name}</h4>
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          {isConnected ? (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Authorized
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md">
                              Not Authorized
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] font-semibold text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>

                        {isConnected && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-3 text-[10px] font-bold text-slate-400 flex-wrap">
                            <span>Target: <strong className="text-slate-700 font-extrabold">{item.target}</strong></span>
                            <span>•</span>
                            <span>Account: <strong className="text-indigo-600 font-extrabold">{item.account}</strong></span>
                            {item.lastSynced && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold">
                                  Verified: {new Date(item.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons & Toggles */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 flex-wrap">
                      {item.id === "dynamic_upi" && (
                        <button
                          onClick={() => setShowUpiQrModal(true)}
                          className="py-1.5 px-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5" /> View QR
                        </button>
                      )}

                      {isConnected ? (
                        <>
                          {/* Re-Configure / Permissions Button */}
                          <button
                            onClick={() => openConnectWizard(item)}
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer"
                          >
                            Permissions
                          </button>

                          {/* Auto Sync Toggle */}
                          <div className="flex items-center gap-1 mr-1" title="Toggle automatic background sync">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Auto</span>
                            <button
                              onClick={() => handleToggleAutoSync(item.id)}
                              className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                item.autoSync ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-sm ${
                                  item.autoSync ? "translate-x-3.5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Execute Sync Now Button */}
                          <button
                            onClick={() => handleSyncNow(item.id)}
                            disabled={isSyncing}
                            className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-500/20"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                            {isSyncing ? "Syncing..." : "Sync / Execute"}
                          </button>

                          {/* Disconnect Button */}
                          <button
                            onClick={() => handleDisconnect(item.id)}
                            className="py-1.5 px-2 text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        /* Clicking CONNECT opens the explicit OAuth & Permission Wizard! */
                        <button
                          onClick={() => openConnectWizard(item)}
                          className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-slate-900/10 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Key className="h-3.5 w-3.5 text-indigo-400" /> Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-white border-t border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 font-semibold shrink-0">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Connections require explicit Google OAuth Sign-In & live Google server endpoint verification.</span>
            </div>
            <a
              href="https://google.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
            >
              Request Custom Connector Integration <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
