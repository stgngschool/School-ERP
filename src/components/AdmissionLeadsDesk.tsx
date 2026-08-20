"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  UserPlus,
  Phone,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Sparkles,
  RefreshCw,
  FileText,
  Printer,
  X,
  Check,
  Building2,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Copy,
  Bus,
  Tag,
  Eye,
} from "lucide-react";

interface EnquiryItem {
  id: string;
  parentName: string;
  studentName: string;
  mobile: string;
  targetClass: string;
  message: string;
  status: "NEW" | "CONTACTED" | "ADMITTED" | "REJECTED";
  remarks: string;
  createdAt: string;
}

export default function AdmissionLeadsDesk() {
  const {
    admissionApplications,
    refreshAdmissionApplications,
    approveAdmissionApplication,
    rejectAdmissionApplication,
    deleteAdmissionApplication,
    updateAdmissionApplication,
    classes,
    concessions,
    transportStops,
    setActiveTab,
    students,
  } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<"APPLICATIONS" | "LEADS">("APPLICATIONS");

  // --- Applications Filter State ---
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("ALL");
  const [appClassFilter, setAppClassFilter] = useState("ALL");
  const [appsLoading, setAppsLoading] = useState(false);

  // --- Selected Application for Review / Approval Modal ---
  const [selectedAppForView, setSelectedAppForView] = useState<any | null>(null);
  const [selectedAppForApprove, setSelectedAppForApprove] = useState<any | null>(null);
  const [approveSection, setApproveSection] = useState("A");
  const [customAdmNo, setCustomAdmNo] = useState("");
  const [customRollNo, setCustomRollNo] = useState("");
  const [selectedConcessionId, setSelectedConcessionId] = useState("");
  const [selectedTransportStopId, setSelectedTransportStopId] = useState("");
  const [startingMonth, setStartingMonth] = useState("April");
  const [approvingLoading, setApprovingLoading] = useState(false);
  const [approvalSuccessMessage, setApprovalSuccessMessage] = useState<string | null>(null);
  const [approvalErrorMessage, setApprovalErrorMessage] = useState<string | null>(null);

  // --- Reject Modal State ---
  const [selectedAppForReject, setSelectedAppForReject] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejectingLoading, setRejectingLoading] = useState(false);

  // --- Quick Enquiry Leads State ---
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("ALL");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState("");

  const classesList = [
    "Nursery / Playgroup",
    "L.K.G.",
    "U.K.G.",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
  ];

  const months = [
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "January",
    "February",
    "March",
  ];

  const fetchEnquiries = async () => {
    try {
      setLeadsLoading(true);
      const res = await fetch("/api/enquiries", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEnquiries(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch enquiries:", err);
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    refreshAdmissionApplications();
    fetchEnquiries();
  }, []);

  // Filtered Applications
  const filteredApplications = admissionApplications.filter((app) => {
    const q = appSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      app.applicationNo.toLowerCase().includes(q) ||
      app.studentName.toLowerCase().includes(q) ||
      app.fatherName.toLowerCase().includes(q) ||
      app.fatherMobile.includes(q) ||
      (app.motherName && app.motherName.toLowerCase().includes(q)) ||
      (app.aadhaar && app.aadhaar.includes(q)) ||
      app.classApplied.toLowerCase().includes(q);

    const matchesStatus = appStatusFilter === "ALL" || app.status === appStatusFilter;
    const matchesClass = appClassFilter === "ALL" || app.classApplied === appClassFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Summary counts
  const pendingCount = admissionApplications.filter((a) => a.status === "PENDING").length;
  const underReviewCount = admissionApplications.filter((a) => a.status === "UNDER_REVIEW").length;
  const approvedCount = admissionApplications.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = admissionApplications.filter((a) => a.status === "REJECTED").length;

  // Trigger Approval Modal
  const openApproveModal = (app: any) => {
    setSelectedAppForApprove(app);
    setApproveSection(app.assignedSection || "A");
    setCustomAdmNo("");
    setCustomRollNo("");
    setSelectedConcessionId("");
    setSelectedTransportStopId("");
    setStartingMonth("April");
    setApprovalSuccessMessage(null);
    setApprovalErrorMessage(null);
  };

  // Confirm Approval & Direct Enrollment to Student Table
  const handleConfirmApproval = async () => {
    if (!selectedAppForApprove) return;
    setApprovingLoading(true);
    setApprovalErrorMessage(null);

    const result = await approveAdmissionApplication(selectedAppForApprove.id, {
      assignedSection: approveSection || "A",
      customAdmissionNo: customAdmNo.trim() || undefined,
      customRollNo: customRollNo.trim() || undefined,
      concessionId: selectedConcessionId || undefined,
      transportStopId: selectedTransportStopId || undefined,
      startingFeeMonth: startingMonth,
      admissionDate: new Date().toISOString().split("T")[0],
    });

    setApprovingLoading(false);

    if (result.success) {
      setApprovalSuccessMessage(
        result.message || `Student ${selectedAppForApprove.studentName} has been enrolled successfully!`
      );
      setTimeout(() => {
        setSelectedAppForApprove(null);
        setApprovalSuccessMessage(null);
      }, 2500);
    } else {
      setApprovalErrorMessage(result.error || "Failed to approve admission application.");
    }
  };

  // Reject Application
  const handleConfirmReject = async () => {
    if (!selectedAppForReject) return;
    setRejectingLoading(true);
    const reason = rejectionReasonInput.trim() || "Application declined by school administration (seats full / criteria not met).";
    const ok = await rejectAdmissionApplication(selectedAppForReject.id, reason);
    setRejectingLoading(false);
    if (ok) {
      setSelectedAppForReject(null);
      setRejectionReasonInput("");
    }
  };

  // Update Status directly (e.g. mark UNDER_REVIEW or PENDING)
  const handleQuickStatusChange = async (appId: string, newStatus: string) => {
    await updateAdmissionApplication(appId, { status: newStatus });
  };

  // Delete Application
  const handleDeleteApplication = async (appId: string, appNo: string) => {
    if (!confirm(`Are you sure you want to permanently delete application ${appNo}?`)) return;
    await deleteAdmissionApplication(appId);
  };

  // --- Lead Handlers ---
  const handleUpdateLeadStatus = async (id: string, newStatus: string) => {
    setUpdatingLeadId(id);
    try {
      const res = await fetch("/api/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: newStatus as any } : e))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleSaveLeadRemarks = async (id: string) => {
    setUpdatingLeadId(id);
    try {
      const res = await fetch("/api/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, remarks: remarksInput }),
      });
      if (res.ok) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, remarks: remarksInput } : e))
        );
        setEditingRemarksId(null);
      }
    } catch (err) {
      console.error("Failed to save remarks:", err);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead record?")) return;
    setDeletingLeadId(id);
    try {
      const res = await fetch("/api/enquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setEnquiries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete enquiry:", err);
    } finally {
      setDeletingLeadId(null);
    }
  };

  const filteredEnquiries = enquiries.filter((item) => {
    const matchesSearch =
      item.parentName.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      item.studentName.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      item.mobile.includes(leadSearchQuery) ||
      item.targetClass.toLowerCase().includes(leadSearchQuery.toLowerCase());

    const matchesStatus = leadStatusFilter === "ALL" || item.status === leadStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
      case "NEW":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "UNDER_REVIEW":
      case "CONTACTED":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "APPROVED":
      case "ADMITTED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-800 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12 font-sans">
      {/* Header Card */}
      <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
              <GraduationCap className="h-3.5 w-3.5" /> Admissions Command Center
            </h3>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
              Online Admission Applications & Enrolment
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Review website admission forms, verify documents, and approve applicants directly into the student directory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              refreshAdmissionApplications();
              fetchEnquiries();
            }}
            className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh All Records"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <span className="px-3.5 py-1.5 rounded-2xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100/60 shadow-2xs">
            {admissionApplications.length} Online Applications
          </span>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-3">
        <button
          onClick={() => setActiveSubTab("APPLICATIONS")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "APPLICATIONS"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Online Admission Applications ({admissionApplications.length})</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 animate-pulse">
              {pendingCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("LEADS")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "LEADS"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Quick WhatsApp Enquiry Leads ({enquiries.length})</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 1: FULL ONLINE ADMISSION APPLICATIONS
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "APPLICATIONS" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Applications
              </span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">
                {admissionApplications.length}
              </strong>
            </div>

            <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-3xl shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block flex items-center justify-between">
                <span>Pending Review</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </span>
              <strong className="text-2xl font-black text-amber-950 mt-1 block">
                {pendingCount}
              </strong>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/60 p-4 rounded-3xl shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center justify-between">
                <span>Approved & Enrolled</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <strong className="text-2xl font-black text-emerald-950 mt-1 block">
                {approvedCount}
              </strong>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-3xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Under Verification / Rejected
              </span>
              <strong className="text-2xl font-black text-slate-700 mt-1 block">
                {underReviewCount + rejectedCount}
              </strong>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Student, Father, Mobile, App No..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="w-full text-xs font-semibold py-2.5 pl-9 pr-4 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <select
                  value={appStatusFilter}
                  onChange={(e) => setAppStatusFilter(e.target.value)}
                  className="text-xs font-bold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Review ({pendingCount})</option>
                  <option value="UNDER_REVIEW">Under Verification ({underReviewCount})</option>
                  <option value="APPROVED">Approved & Enrolled ({approvedCount})</option>
                  <option value="REJECTED">Rejected ({rejectedCount})</option>
                </select>
              </div>

              <select
                value={appClassFilter}
                onChange={(e) => setAppClassFilter(e.target.value)}
                className="text-xs font-bold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Classes</option>
                {classesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200/60 rounded-3xl shadow-xs text-slate-400 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-1 opacity-50" />
                <h4 className="text-sm font-black text-slate-700">No Admission Applications Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When parents fill out the online admission form on the website, their full application will appear here for one-click verification and enrollment.
                </p>
              </div>
            ) : (
              filteredApplications.map((app) => {
                const isApproved = app.status === "APPROVED";
                const isPending = app.status === "PENDING";
                const isRejected = app.status === "REJECTED";

                return (
                  <div
                    key={app.id}
                    className={`bg-white border ${
                      isPending ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200/60"
                    } p-5 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 transition-all`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{app.applicationNo}</span>
                        </span>

                        <span
                          className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-2xs ${getStatusBadge(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>

                        <span className="text-xs font-black text-slate-800">
                          Class: <strong className="text-indigo-600">{app.classApplied}</strong>
                        </span>

                        {app.isRte && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                            RTE Quota
                          </span>
                        )}

                        {app.transportRequired && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-[10px] font-bold flex items-center gap-1">
                            <Bus className="w-3 h-3 text-blue-600" />
                            <span>Bus Requested</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                        </span>

                        <button
                          onClick={() => handleDeleteApplication(app.id, app.applicationNo)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Applicant & Parent Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Student Name
                        </span>
                        <p className="font-black text-slate-900 text-sm">{app.studentName}</p>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {app.gender} • {app.category || "General"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Father / Guardian
                        </span>
                        <p className="font-extrabold text-slate-800 text-xs">{app.fatherName}</p>
                        <span className="text-[11px] text-slate-500 font-medium">{app.fatherOccupation || "—"}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Contact & Address
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${app.fatherMobile}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{app.fatherMobile}</span>
                          </a>
                          <a
                            href={`https://wa.me/91${app.fatherMobile}?text=${encodeURIComponent(
                              `Namaste ${app.fatherName}, this is regarding your admission application ${app.applicationNo} for ${app.studentName} at St. GNG School.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-colors"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-medium">{app.address}</p>
                      </div>

                      {/* Right Action Box */}
                      <div className="flex flex-col justify-center items-start md:items-end gap-2">
                        {isApproved ? (
                          <div className="text-right">
                            <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Admitted in {app.classApplied}-{app.assignedSection || "A"}
                            </span>
                            {app.enrolledStudent && (
                              <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                                ADM No: <strong>{app.enrolledStudent.admissionNumber}</strong>
                              </span>
                            )}
                          </div>
                        ) : isRejected ? (
                          <div className="flex flex-col items-start md:items-end gap-1.5">
                            <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-black flex items-center gap-1">
                              <X className="w-3.5 h-3.5" /> Rejected / Declined
                            </span>
                            {app.rejectionReason && (
                              <span className="text-[10px] font-medium text-rose-600 max-w-xs text-right line-clamp-2">
                                Reason: {app.rejectionReason}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <button
                                onClick={() => handleQuickStatusChange(app.id, "PENDING")}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold transition-colors cursor-pointer border border-amber-200"
                                title="Re-open this application back to Pending"
                              >
                                ↺ Re-open
                              </button>
                              <button
                                onClick={() => openApproveModal(app)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold transition-colors cursor-pointer border border-emerald-200"
                              >
                                Approve Anyway
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => openApproveModal(app)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Review & Approve</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAppForReject(app);
                                setRejectionReasonInput("Seats full in selected class");
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAppForView(app)}
                            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Full Details & Form</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 2: QUICK WHATSAPP LEADS / INQUIRIES
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "LEADS" && (
        <div className="space-y-6 animate-fade-in">
          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Parent, Student, Mobile number..."
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="w-full text-xs font-bold py-2.5 pl-9 pr-4 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="text-xs font-bold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-600 text-slate-700 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New Leads</option>
                <option value="CONTACTED">Contacted / In Progress</option>
                <option value="ADMITTED">Admitted / Enrolled</option>
                <option value="REJECTED">Closed / Not Interested</option>
              </select>
            </div>
          </div>

          {/* Leads List */}
          <div className="space-y-4">
            {leadsLoading ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-xs font-bold text-slate-500">Loading website enquiries...</p>
              </div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200/60 rounded-3xl shadow-xs text-slate-400 space-y-2">
                <UserPlus className="h-10 w-10 mx-auto text-slate-300 mb-1 opacity-50" />
                <h4 className="text-sm font-black text-slate-700">No Admission Leads Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When prospective parents submit the WhatsApp enquiry form on the website, they will appear here.
                </p>
              </div>
            ) : (
              filteredEnquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  className="bg-white border border-slate-200/60 hover:border-indigo-200 p-5 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-2xs ${getStatusBadge(
                          enquiry.status
                        )}`}
                      >
                        {enquiry.status}
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        Applying for: <strong className="text-indigo-600">{enquiry.targetClass}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {enquiry.createdAt}
                      </span>

                      <button
                        onClick={() => handleDeleteLead(enquiry.id)}
                        disabled={deletingLeadId === enquiry.id}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete lead"
                      >
                        {deletingLeadId === enquiry.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Parent / Guardian
                      </span>
                      <p className="font-extrabold text-slate-900 text-sm">{enquiry.parentName}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Prospective Student
                      </span>
                      <p className="font-extrabold text-indigo-700 text-sm">{enquiry.studentName}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Contact Actions
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${enquiry.mobile}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{enquiry.mobile}</span>
                        </a>
                        <a
                          href={`https://wa.me/91${enquiry.mobile}?text=${encodeURIComponent(
                            `Hello ${enquiry.parentName}, this is regarding your admission enquiry for ${enquiry.studentName} for ${enquiry.targetClass} at St. GNG School.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-colors"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {enquiry.message && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                      <strong>Parent&apos;s Query Note:</strong> {enquiry.message}
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                      <select
                        value={enquiry.status}
                        onChange={(e) => handleUpdateLeadStatus(enquiry.id, e.target.value)}
                        disabled={updatingLeadId === enquiry.id}
                        className="text-xs font-bold py-1.5 px-3 border border-slate-200 rounded-xl outline-none bg-white hover:border-slate-300 focus:border-indigo-600 cursor-pointer shadow-2xs"
                      >
                        <option value="NEW">New Lead</option>
                        <option value="CONTACTED">Contacted / In Progress</option>
                        <option value="ADMITTED">Admitted / Enrolled</option>
                        <option value="REJECTED">Closed / Not Interested</option>
                      </select>
                    </div>

                    <div className="flex-1 sm:max-w-md">
                      {editingRemarksId === enquiry.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Add follow-up notes..."
                            value={remarksInput}
                            onChange={(e) => setRemarksInput(e.target.value)}
                            className="w-full text-xs py-1 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                          />
                          <button
                            onClick={() => handleSaveLeadRemarks(enquiry.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRemarksId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="italic">
                            {enquiry.remarks ? `Note: ${enquiry.remarks}` : "No remarks added."}
                          </span>
                          <button
                            onClick={() => {
                              setEditingRemarksId(enquiry.id);
                              setRemarksInput(enquiry.remarks || "");
                            }}
                            className="text-indigo-600 font-bold hover:underline ml-2 cursor-pointer shrink-0"
                          >
                            {enquiry.remarks ? "Edit Note" : "+ Add Note"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ONE-CLICK REVIEW & APPROVAL (ENROL TO STUDENTS)
      ───────────────────────────────────────────────────────────── */}
      {selectedAppForApprove && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAppForApprove(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-emerald-100 text-emerald-800">
                Direct Enrolment Workflow
              </span>
              <span className="text-xs font-bold text-slate-400">
                App: {selectedAppForApprove.applicationNo}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Approve & Enrol: {selectedAppForApprove.studentName}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Confirming admission will automatically insert student into the active directory, assign family code, and configure fee schedule.
            </p>

            {approvalSuccessMessage && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-scale-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{approvalSuccessMessage}</span>
              </div>
            )}

            {approvalErrorMessage && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{approvalErrorMessage}</span>
              </div>
            )}

            {!approvalSuccessMessage && (
              <div className="mt-6 space-y-4 text-xs">
                {/* Applicant Summary Banner */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Class Applied:</span>
                    <strong className="text-indigo-700 font-black">{selectedAppForApprove.classApplied}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Father Name:</span>
                    <strong className="text-slate-800">{selectedAppForApprove.fatherName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Primary Mobile:</span>
                    <strong className="text-slate-800">{selectedAppForApprove.fatherMobile}</strong>
                  </div>
                </div>

                {/* Enrollment Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Assigned Section *
                    </label>
                    <select
                      value={approveSection}
                      onChange={(e) => setApproveSection(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Admission Number (Leave blank to auto-generate)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ADM-2026-0042"
                      value={customAdmNo}
                      onChange={(e) => setCustomAdmNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Roll Number (Leave blank to auto-calculate)
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. ${selectedAppForApprove.classApplied}-${approveSection}-01`}
                      value={customRollNo}
                      onChange={(e) => setCustomRollNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Starting Fee Month
                    </label>
                    <select
                      value={startingMonth}
                      onChange={(e) => setStartingMonth(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m} (Charge from {m})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transport Stop & Concession */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Transport Stop (Optional)
                    </label>
                    <select
                      value={selectedTransportStopId}
                      onChange={(e) => setSelectedTransportStopId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      <option value="">No School Transport</option>
                      {transportStops.map((ts) => (
                        <option key={ts.id} value={ts.id}>
                          {ts.name} (₹{ts.amount}/mo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fee Concession / Discount
                    </label>
                    <select
                      value={selectedConcessionId}
                      onChange={(e) => setSelectedConcessionId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      <option value="">Standard (No Discount)</option>
                      {concessions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.percentage}% on {c.feeHeadName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAppForApprove(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmApproval}
                    disabled={approvingLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {approvingLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enrolling Student in DB...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Admission & Enrol Student</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: REJECT APPLICATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedAppForReject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-scale-in">
            <button
              onClick={() => setSelectedAppForReject(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                Decline Application
              </span>
              <span className="text-xs font-bold text-slate-400">
                {selectedAppForReject.applicationNo}
              </span>
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Reject: {selectedAppForReject.studentName}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Select a reason below or customize the feedback note. This will be visible on the public tracker.
            </p>

            {/* Quick Reason Chips */}
            <div className="mt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                Quick Reasons:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Seats full in selected class",
                  "Age criteria not met",
                  "Incomplete / Missing documents",
                  "Outside transport route",
                  "Duplicate application",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReasonInput(reason)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      rejectionReasonInput === reason
                        ? "bg-rose-50 border-rose-300 text-rose-700 font-black shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Rejection Reason Note:
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter rejection reason or guidance for parent..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAppForReject(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={rejectingLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {rejectingLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Confirm Rejection</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: FULL OFFICIAL APPLICATION FORM & PRINTABLE VIEW
      ───────────────────────────────────────────────────────────── */}
      {selectedAppForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAppForView(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer no-print"
            >
              <X className="w-5 h-5" />
            </button>

            {/* School Header / Seal for Print */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                ST. G.N.G. CONVENT SCHOOL
              </h2>
              <p className="text-[11px] text-slate-600 font-semibold">
                Rasulgarh, Salarpur, Varanasi - 221003 • UDISE No: 09670707502
              </p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-black uppercase">
                <span>Admission Application Form (Session 2026-2027)</span>
              </div>
            </div>

            {/* Application Meta */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-4 pb-2 border-b border-slate-100">
              <span>
                Application Ref: <strong className="text-indigo-700 font-black">{selectedAppForView.applicationNo}</strong>
              </span>
              <span>
                Date: <strong>{new Date(selectedAppForView.createdAt).toLocaleDateString()}</strong>
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${getStatusBadge(selectedAppForView.status)}`}>
                {selectedAppForView.status}
              </span>
            </div>

            {/* Details Sections */}
            <div className="space-y-4 text-xs">
              {/* Section 1: Student */}
              <div>
                <h4 className="text-[11px] font-black text-indigo-700 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-1">
                  1. Student Personal Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Student Full Name:</span>
                    <strong className="text-slate-900">{selectedAppForView.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Class Seeking:</span>
                    <strong className="text-indigo-700">{selectedAppForView.classApplied}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Gender:</span>
                    <strong className="text-slate-900">{selectedAppForView.gender}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">DOB:</span>
                    <strong className="text-slate-900">
                      {selectedAppForView.dob ? new Date(selectedAppForView.dob).toLocaleDateString() : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Category:</span>
                    <strong className="text-slate-900">{selectedAppForView.category || "General"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Religion:</span>
                    <strong className="text-slate-900">{selectedAppForView.religion || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Aadhaar No:</span>
                    <strong className="text-slate-900">{selectedAppForView.aadhaar || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Blood Group:</span>
                    <strong className="text-slate-900">{selectedAppForView.bloodGroup || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Parents */}
              <div>
                <h4 className="text-[11px] font-black text-indigo-700 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-1">
                  2. Parent & Guardian Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Father&apos;s Name:</span>
                    <strong className="text-slate-900">{selectedAppForView.fatherName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Father Mobile:</span>
                    <strong className="text-slate-900">{selectedAppForView.fatherMobile}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Father Occupation:</span>
                    <strong className="text-slate-900">{selectedAppForView.fatherOccupation || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Mother&apos;s Name:</span>
                    <strong className="text-slate-900">{selectedAppForView.motherName || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Mother Mobile:</span>
                    <strong className="text-slate-900">{selectedAppForView.motherMobile || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Parent Email:</span>
                    <strong className="text-slate-900">{selectedAppForView.parentEmail || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Section 3: Address & Transport */}
              <div>
                <h4 className="text-[11px] font-black text-indigo-700 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-1">
                  3. Address & Additional Facilities
                </h4>
                <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Permanent Address:</span>
                    <strong className="text-slate-900 leading-snug">{selectedAppForView.address}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">School Transport:</span>
                      <strong className="text-slate-900">
                        {selectedAppForView.transportRequired
                          ? `Yes (Stop: ${selectedAppForView.busStop || "Requested"})`
                          : "Self / Private"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">RTE Quota Applicant:</span>
                      <strong className="text-slate-900">
                        {selectedAppForView.isRte ? "Yes (Right to Education Scheme)" : "No"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Enrolment Box if Enrolled */}
              {selectedAppForView.status === "APPROVED" && selectedAppForView.enrolledStudent && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">
                    🎉 Official Student Enrolment Record
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold text-emerald-950">
                    <div>
                      <span className="text-[10px] text-emerald-700 block">Admission Number:</span>
                      {selectedAppForView.enrolledStudent.admissionNumber}
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 block">Section Assigned:</span>
                      {selectedAppForView.enrolledStudent.class?.name} - {selectedAppForView.enrolledStudent.class?.section}
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 block">Family Code:</span>
                      {selectedAppForView.enrolledStudent.parentProfile?.familyCode || "Assigned"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between no-print mt-6">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Form</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedAppForView.status !== "APPROVED" && (
                  <button
                    onClick={() => {
                      const app = selectedAppForView;
                      setSelectedAppForView(null);
                      openApproveModal(app);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer shadow-md"
                  >
                    Approve & Enrol
                  </button>
                )}
                <button
                  onClick={() => setSelectedAppForView(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
