"use client";

import React, { useState, useEffect } from "react";
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
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState("");

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
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
      setUpdatingId(null);
    }
  };

  const handleSaveRemarks = async (id: string) => {
    setUpdatingId(id);
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
      setUpdatingId(null);
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead record?")) return;
    setDeletingId(id);
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
      setDeletingId(null);
    }
  };

  const filteredEnquiries = enquiries.filter((item) => {
    const matchesSearch =
      item.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mobile.includes(searchQuery) ||
      item.targetClass.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "CONTACTED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ADMITTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED":
        return "bg-slate-100 text-slate-600 border-slate-200";
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
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
              <UserPlus className="h-3.5 w-3.5" /> Website Admission Leads
            </h3>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
              Online Admission Enquiries
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Track, follow-up, and enroll prospective students who submitted inquiries on the public website.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchEnquiries}
            className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <span className="px-3.5 py-1.5 rounded-2xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100/60 shadow-2xs">
            {enquiries.length} Total {enquiries.length === 1 ? "Lead" : "Leads"}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Parent name, Student, Mobile number, Class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[11px] font-extrabold py-2.5 pl-9 pr-4 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all shadow-2xs placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New Inquiries</option>
            <option value="CONTACTED">Contacted / In Progress</option>
            <option value="ADMITTED">Admitted / Enrolled</option>
            <option value="REJECTED">Closed / Not Interested</option>
          </select>
        </div>
      </div>

      {/* Leads Table / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs font-bold text-slate-500">Loading online admission leads...</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-slate-400 space-y-2">
            <UserPlus className="h-10 w-10 mx-auto text-slate-300 mb-1 opacity-50" />
            <h4 className="text-sm font-black text-slate-700">No Admission Leads Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When prospective parents submit the online admission enquiry form on your school website, they will appear here instantly.
            </p>
          </div>
        ) : (
          filteredEnquiries.map((enquiry) => (
            <div
              key={enquiry.id}
              className="bg-white border border-slate-200/60 hover:border-indigo-200 p-5 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4 transition-all duration-200"
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
                    onClick={() => handleDeleteEnquiry(enquiry.id)}
                    disabled={deletingId === enquiry.id}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete lead"
                  >
                    {deletingId === enquiry.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Lead Details */}
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

              {/* Message Note */}
              {enquiry.message && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <strong>Parent's Query Note:</strong> {enquiry.message}
                </div>
              )}

              {/* Status Update & Follow-up Remarks */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Update Status:</span>
                  <select
                    value={enquiry.status}
                    onChange={(e) => handleUpdateStatus(enquiry.id, e.target.value)}
                    disabled={updatingId === enquiry.id}
                    className="text-xs font-bold py-1.5 px-3 border border-slate-200 rounded-xl outline-none bg-white hover:border-slate-300 focus:border-indigo-600 cursor-pointer shadow-2xs"
                  >
                    <option value="NEW">New Lead</option>
                    <option value="CONTACTED">Contacted / In Progress</option>
                    <option value="ADMITTED">Admitted / Enrolled</option>
                    <option value="REJECTED">Closed / Not Interested</option>
                  </select>
                </div>

                {/* Remarks */}
                <div className="flex-1 sm:max-w-md">
                  {editingRemarksId === enquiry.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Add follow-up notes (e.g. called on Monday, invited for test)..."
                        value={remarksInput}
                        onChange={(e) => setRemarksInput(e.target.value)}
                        className="w-full text-xs py-1 px-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                      />
                      <button
                        onClick={() => handleSaveRemarks(enquiry.id)}
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
  );
}
