"use client";

import React, { useState } from "react";
import {
  Bell,
  Megaphone,
  Search,
  Edit,
  Trash2,
  Loader2,
  ArrowUpRight,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";

interface Notice {
  id: string;
  title: string;
  content: string;
  target: "ALL" | "TEACHERS" | "PARENTS";
  category?: string;
  isUrgent?: boolean;
  isActive?: boolean;
  fileUrl?: string;
  createdAt?: string;
}

interface NoticesTabProps {
  notices: any[];
  addNotice: (...args: any[]) => Promise<any> | any;
  updateNotice: (...args: any[]) => Promise<any> | any;
  deleteNotice: (...args: any[]) => Promise<any> | any;
  showToast: (type: any, title: string, message: string) => void;
}

export default function NoticesTab({
  notices,
  addNotice,
  updateNotice,
  deleteNotice,
  showToast,
}: NoticesTabProps) {
  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [noticeTarget, setNoticeTarget] = useState<"ALL" | "TEACHERS" | "PARENTS">("ALL");
  const [noticeCategory, setNoticeCategory] = useState<string>("GENERAL");
  const [noticeIsUrgent, setNoticeIsUrgent] = useState(false);
  const [noticeFileUrl, setNoticeFileUrl] = useState("");
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [noticeSearch, setNoticeSearch] = useState("");
  const [noticeCategoryFilter, setNoticeCategoryFilter] = useState("ALL");
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeContent) return;

    setNoticeLoading(true);
    try {
      await addNotice(
        noticeTitle,
        noticeContent,
        noticeTarget,
        noticeCategory,
        noticeIsUrgent,
        noticeFileUrl || undefined
      );
      setNoticeTitle("");
      setNoticeContent("");
      setNoticeCategory("GENERAL");
      setNoticeIsUrgent(false);
      setNoticeFileUrl("");
      showToast("success", "Notice Broadcasted", "Circular posted live across ERP portals and website.");
    } catch (err) {
      console.error(err);
    } finally {
      setNoticeLoading(false);
    }
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !editingNotice.title || !editingNotice.content) return;

    setNoticeLoading(true);
    try {
      await updateNotice(editingNotice.id, {
        title: editingNotice.title,
        content: editingNotice.content,
        target: editingNotice.target,
        category: editingNotice.category,
        isUrgent: editingNotice.isUrgent,
        isActive: editingNotice.isActive,
        fileUrl: editingNotice.fileUrl,
      });
      setEditingNotice(null);
      showToast("success", "Notice Updated", "Circular updated successfully.");
    } catch (err) {
      console.error("Update notice error:", err);
      showToast("error", "Update Failed", "Could not update notice. Please retry.");
    } finally {
      setNoticeLoading(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    setDeletingNoticeId(id);
    try {
      await deleteNotice(id);
      showToast("info", "Notice Removed", "Circular has been deleted.");
    } catch (err) {
      console.error("Delete notice error:", err);
      showToast("error", "Deletion Failed", "Could not delete notice.");
    } finally {
      setDeletingNoticeId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Notice Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
                <Megaphone className="h-3.5 w-3.5" /> Broadcast New Circular
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Post announcements directly onto ERP desks and the live school website.
              </p>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Circular Title *
                </label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Half-Yearly Exam Datesheet & Syllabus"
                  className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Category *
                  </label>
                  <select
                    value={noticeCategory}
                    onChange={(e) => setNoticeCategory(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="GENERAL">General Bulletin</option>
                    <option value="EXAM">Examinations</option>
                    <option value="ACADEMIC">Academic & PTM</option>
                    <option value="ADMISSION">Admissions</option>
                    <option value="HOLIDAY">Holiday & Events</option>
                    <option value="FEE">Fee & Accounts Circular</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Audience *
                  </label>
                  <select
                    value={noticeTarget}
                    onChange={(e) => setNoticeTarget(e.target.value as any)}
                    className="w-full text-xs font-bold py-2.5 px-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="ALL">All (Public Website & Portal)</option>
                    <option value="PARENTS">Parents Only</option>
                    <option value="TEACHERS">Teachers Only</option>
                  </select>
                </div>
              </div>

              {/* Urgent Flag Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Mark as Urgent</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Highlighted with urgent badge on website
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noticeIsUrgent}
                    onChange={(e) => setNoticeIsUrgent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Attachment File URL (Optional)
                </label>
                <input
                  type="url"
                  value={noticeFileUrl}
                  onChange={(e) => setNoticeFileUrl(e.target.value)}
                  placeholder="https://... (PDF or Image link)"
                  className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Circular Content *
                </label>
                <textarea
                  required
                  rows={4}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Type circular details, schedule, timings, guidelines..."
                  className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={noticeLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                {noticeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {noticeLoading ? "Publishing Circular..." : "Publish Live Notice"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live History Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Circulars & Notices Registry ({notices.length})
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Active bulletins live on website and ERP portal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={noticeCategoryFilter}
                  onChange={(e) => setNoticeCategoryFilter(e.target.value)}
                  className="text-[11px] font-bold py-1.5 px-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="GENERAL">General</option>
                  <option value="EXAM">Examinations</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="ADMISSION">Admissions</option>
                  <option value="HOLIDAY">Holidays</option>
                  <option value="FEE">Fees</option>
                </select>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search published notices by title or content..."
                value={noticeSearch}
                onChange={(e) => setNoticeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>

            {/* Notice Items List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {notices.length === 0 ? (
                <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">No circulars published yet.</p>
                  <p className="text-[10px]">Create your first notice using the form on the left.</p>
                </div>
              ) : (
                notices
                  .filter((nt) => {
                    const matchesSearch =
                      nt.title.toLowerCase().includes(noticeSearch.toLowerCase()) ||
                      nt.content.toLowerCase().includes(noticeSearch.toLowerCase());
                    const matchesCat =
                      noticeCategoryFilter === "ALL" ||
                      (nt.category || "GENERAL") === noticeCategoryFilter;
                    return matchesSearch && matchesCat;
                  })
                  .slice()
                  .reverse()
                  .map((nt) => (
                    <div
                      key={nt.id}
                      className={`p-4 border ${
                        nt.isUrgent ? "border-rose-200 bg-rose-50/30" : "border-slate-200/80 bg-white"
                      } rounded-2xl hover:border-indigo-300 transition-all space-y-2.5 shadow-2xs`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {nt.category || "GENERAL"}
                          </span>
                          {nt.isUrgent && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-500 text-white">
                              Urgent
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              nt.target === "TEACHERS"
                                ? "bg-amber-100 text-amber-800"
                                : nt.target === "PARENTS"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            Target: {nt.target || "ALL"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {nt.createdAt}
                          </span>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingNotice(JSON.parse(JSON.stringify(nt)))}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit Notice"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(nt.id)}
                            disabled={deletingNoticeId === nt.id}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Notice"
                          >
                            {deletingNoticeId === nt.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                        {nt.title}
                      </h4>
                      <p className="text-xs text-slate-600 font-normal leading-relaxed whitespace-pre-wrap">
                        {nt.content}
                      </p>

                      {nt.fileUrl && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
                          <span>Attached Document / PDF</span>
                          <a
                            href={nt.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-0.5"
                          >
                            <span>View File</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Edit Notice Modal ─── */}
      {editingNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Edit Published Notice</h3>
              </div>
              <button
                onClick={() => setEditingNotice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateNotice} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editingNotice.title}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, title: e.target.value })
                  }
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                    Category
                  </label>
                  <select
                    value={editingNotice.category || "GENERAL"}
                    onChange={(e) =>
                      setEditingNotice({ ...editingNotice, category: e.target.value })
                    }
                    className="w-full text-xs font-bold py-2 px-2 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white"
                  >
                    <option value="GENERAL">General Bulletin</option>
                    <option value="EXAM">Examinations</option>
                    <option value="ACADEMIC">Academic & PTM</option>
                    <option value="ADMISSION">Admissions</option>
                    <option value="HOLIDAY">Holiday & Events</option>
                    <option value="FEE">Fee & Accounts Circular</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                    Target Audience
                  </label>
                  <select
                    value={editingNotice.target || "ALL"}
                    onChange={(e) =>
                      setEditingNotice({ ...editingNotice, target: e.target.value })
                    }
                    className="w-full text-xs font-bold py-2 px-2 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white"
                  >
                    <option value="ALL">All Users</option>
                    <option value="PARENTS">Parents Only</option>
                    <option value="TEACHERS">Teachers Only</option>
                  </select>
                </div>
              </div>

              {/* Urgent Toggle in Modal */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Urgent Notice</span>
                <input
                  type="checkbox"
                  checked={Boolean(editingNotice.isUrgent)}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, isUrgent: e.target.checked })
                  }
                  className="h-4 w-4 text-indigo-600 rounded"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                  Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={editingNotice.content}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, content: e.target.value })
                  }
                  className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingNotice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={noticeLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {noticeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
