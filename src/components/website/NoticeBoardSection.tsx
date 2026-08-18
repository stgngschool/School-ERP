"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Calendar,
  Search,
  FileText,
  ExternalLink,
  Download,
  Printer,
  X,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Tag,
  Clock,
} from "lucide-react";

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  target?: string;
  category?: string;
  createdAt: string;
  isUrgent?: boolean;
  fileUrl?: string | null;
}

const FALLBACK_NOTICES: NoticeItem[] = [
  {
    id: "not-1",
    title: "Admission Open for Session 2026-2027 (Nursery to Class 8th)",
    content:
      "Admissions are open for the academic session 2026-2027 for Classes Nursery to 8th. Parents are requested to collect the admission registration forms from the school office between 8:00 AM to 1:30 PM on working days or submit an online enquiry on the website. Limited seats are available per section to maintain individual teacher attention.",
    category: "ADMISSION",
    target: "ALL",
    createdAt: "2026-08-10",
    isUrgent: true,
  },
  {
    id: "not-2",
    title: "Half-Yearly Examination Datesheet & Syllabus Notification",
    content:
      "All students and parents are hereby notified that the Half-Yearly Examinations for Classes 1st to 8th are scheduled to commence from next month. Complete subject-wise syllabus and date sheet have been posted on the Parent Portal. Students must ensure their notebooks and practical activities are checked before exam commencement.",
    category: "EXAM",
    target: "ALL",
    createdAt: "2026-08-05",
    isUrgent: true,
  },
  {
    id: "not-3",
    title: "Parent-Teacher Meeting (PTM) & First Term Evaluation Review",
    content:
      "Respected parents are invited to attend the Parent-Teacher Meeting on Saturday between 8:30 AM to 12:30 PM. Teachers will discuss student academic progress, unit test marks, and handwriting improvement. Parent attendance is mandatory.",
    category: "ACADEMIC",
    target: "ALL",
    createdAt: "2026-08-04",
    isUrgent: false,
  },
  {
    id: "not-4",
    title: "Independence Day Celebrations & Cultural Program Schedule",
    content:
      "St. GNG School will celebrate 15th August Independence Day with great enthusiasm. Flag hoisting ceremony will take place at 8:00 AM sharp, followed by patriotic songs, speech competitions, and prize distribution. Regular classes will remain suspended on the occasion.",
    category: "HOLIDAY",
    target: "ALL",
    createdAt: "2026-08-03",
    isUrgent: false,
  },
  {
    id: "not-5",
    title: "Monthly Fee Dues Clearance Reminder & Online Receipts",
    content:
      "Respected parents are kindly requested to clear pending monthly tuition fees either at the school fee collection counter or online via the Parent ERP Portal. Instant digital receipts can be downloaded directly from your login dashboard.",
    category: "FEE",
    target: "PARENTS",
    createdAt: "2026-08-01",
    isUrgent: false,
  },
  {
    id: "not-6",
    title: "School Uniform, Morning Assembly & Discipline Guidelines",
    content:
      "All students must adhere strictly to the prescribed school uniform code including black polished shoes and student ID cards. Morning assembly starts at 7:30 AM sharp; late entries will not be permitted. Parents are requested to ensure punctuality.",
    category: "GENERAL",
    target: "ALL",
    createdAt: "2026-07-28",
    isUrgent: false,
  },
];

export default function NoticeBoardSection() {
  const [notices, setNotices] = useState<NoticeItem[]>(FALLBACK_NOTICES);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Fetch live notices from backend API (connected to ERP database)
  const fetchLiveNotices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notice?public=true", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNotices(data);
        }
      }
    } catch (err) {
      console.warn("Using offline notice board data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveNotices();
  }, []);

  const categories = [
    { key: "ALL", label: "All Circulars" },
    { key: "EXAM", label: "Examinations & Datesheet" },
    { key: "ACADEMIC", label: "Academic & PTM" },
    { key: "ADMISSION", label: "Admissions" },
    { key: "HOLIDAY", label: "Events & Holidays" },
    { key: "FEE", label: "Fee Counter" },
    { key: "GENERAL", label: "General Alerts" },
  ];

  const getCategoryCount = (catKey: string) => {
    if (catKey === "ALL") return notices.length;
    return notices.filter((n) => (n.category || "GENERAL") === catKey).length;
  };

  const categoryRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [catPill, setCatPill] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const idx = categories.findIndex((c) => c.key === selectedCategory);
    if (idx !== -1 && categoryRefs.current[idx]) {
      const el = categoryRefs.current[idx];
      if (el) {
        setCatPill({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1,
        });
      }
    }
  }, [selectedCategory]);

  const filteredNotices = notices.filter((nt) => {
    const matchesCategory =
      selectedCategory === "ALL" || (nt.category || "GENERAL") === selectedCategory;
    const matchesSearch =
      nt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nt.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (cat?: string) => {
    switch (cat?.toUpperCase()) {
      case "EXAM":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ACADEMIC":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ADMISSION":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "HOLIDAY":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "FEE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <section id="notices" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Official School Circulars Desk</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Notice Board & Announcements
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            Stay updated with official notifications, datesheets, examination schedules, and holidays directly from the school administration.
          </p>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Category Tabs */}
          <div className="relative flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            {/* Sliding Liquid Background Pill */}
            <span
              className="absolute top-1 bottom-1 rounded-xl bg-indigo-50 border border-indigo-200 transition-all duration-300 pointer-events-none"
              style={{
                left: `${catPill.left}px`,
                width: `${catPill.width}px`,
                opacity: catPill.opacity,
              }}
            />

            {categories.map((cat, idx) => {
              const count = getCategoryCount(cat.key);
              return (
                <button
                  key={cat.key}
                  ref={(el) => {
                    categoryRefs.current[idx] = el;
                  }}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`relative z-10 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat.key
                      ? "text-indigo-700 font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      selectedCategory === cat.key
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search circulars by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Notices Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium text-xs">
            Loading official notices...
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500 max-w-lg mx-auto space-y-3 shadow-xs animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6 opacity-60" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">
                No circulars under &ldquo;{categories.find((c) => c.key === selectedCategory)?.label || selectedCategory}&rdquo;
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? "Try searching for a different keyword or check spelling."
                  : "No notices have been published in this category yet. You can view all notices or create new circulars from ERP."}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>View All Circulars ({notices.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className={`bg-white p-5 rounded-2xl border ${
                  notice.isUrgent ? "border-rose-200 ring-2 ring-rose-100" : "border-slate-200"
                } shadow-xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group`}
              >
                <div>
                  {/* Category, Urgent Badge & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getCategoryBadge(
                          notice.category
                        )}`}
                      >
                        {notice.category || "GENERAL"}
                      </span>
                      {notice.isUrgent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                          Urgent
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{notice.createdAt}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2 leading-snug">
                    {notice.title}
                  </h3>

                  {/* Snippet */}
                  <p className="text-xs text-slate-600 line-clamp-3 font-normal leading-relaxed">
                    {notice.content}
                  </p>
                </div>

                {/* Footer action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                  <span className="group-hover:underline">Read Full Circular</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Notice Detail Popup Modal ─── */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedNotice(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase border ${getCategoryBadge(
                  selectedNotice.category
                )}`}
              >
                {selectedNotice.category || "GENERAL"}
              </span>
              {selectedNotice.isUrgent && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-rose-500 text-white">
                  Urgent Notice
                </span>
              )}
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date: {selectedNotice.createdAt}</span>
              </span>
            </div>

            {/* Notice Title */}
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug mb-4">
              {selectedNotice.title}
            </h3>

            {/* School Seal Sub-banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 mb-5 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div>
                <strong>Issued by:</strong> Office of the Principal, St. GNG School
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                Official Circular
              </span>
            </div>

            {/* Full Body Text */}
            <div className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed whitespace-pre-line mb-6 bg-white p-4 rounded-xl border border-slate-100">
              {selectedNotice.content}
            </div>

            {/* Attachment Download if present */}
            {selectedNotice.fileUrl && (
              <div className="mb-6 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Official Circular Attachment / PDF</span>
                </div>
                <a
                  href={selectedNotice.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400 font-medium">
                UDISE No: 09670707502 • St. GNG School Varanasi
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
