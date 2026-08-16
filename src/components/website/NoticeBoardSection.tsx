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
  category?: "ACADEMIC" | "EXAM" | "HOLIDAY" | "GENERAL";
  createdAt: string;
  isUrgent?: boolean;
}

const FALLBACK_NOTICES: NoticeItem[] = [
  {
    id: "not-1",
    title: "Admission Open for Session 2026-2027 (Nursery to Class 8th)",
    content:
      "Admissions are open for the academic session 2026-2027 for Classes Nursery to 8th. Parents are requested to collect the admission registration forms from the school office between 8:00 AM to 1:30 PM on working days or submit an online enquiry on the website. Limited seats are available per section to maintain individual teacher attention.",
    category: "GENERAL",
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
    target: "PARENTS",
    createdAt: "2026-08-05",
    isUrgent: true,
  },
  {
    id: "not-3",
    title: "Monthly Fee Dues Clearance Reminder",
    content:
      "Respected parents are kindly requested to clear pending monthly tuition fees up to August 2026 either at the school fee collection counter or online via the Parent ERP Portal. Digital fee receipts can be downloaded instantly from the portal.",
    category: "ACADEMIC",
    target: "PARENTS",
    createdAt: "2026-08-01",
    isUrgent: false,
  },
  {
    id: "not-4",
    title: "Parent-Teacher Meeting (PTM) & Progress Report Discussion",
    content:
      "The Parent-Teacher Meeting (PTM) will be held on the coming Saturday from 8:30 AM to 12:00 PM. Parents will have an opportunity to interact with class and subject teachers regarding student discipline, unit test marks, and handwriting improvement.",
    category: "ACADEMIC",
    target: "ALL",
    createdAt: "2026-07-28",
    isUrgent: false,
  },
  {
    id: "not-5",
    title: "Independence Day & Cultural Program Guidelines",
    content:
      "79th Independence Day will be celebrated with flag hoisting, patriotic songs, and march-past at the school campus. Students participating in cultural dances, drama, and speech competitions must report in clean formal school uniform by 7:15 AM sharp.",
    category: "HOLIDAY",
    target: "ALL",
    createdAt: "2026-07-20",
    isUrgent: false,
  },
];

export default function NoticeBoardSection() {
  const [notices, setNotices] = useState<NoticeItem[]>(FALLBACK_NOTICES);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Fetch live notices from backend API
  useEffect(() => {
    async function loadNotices() {
      try {
        const res = await fetch("/api/notice");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Merge with category tags
            const merged = data.map((item: any) => ({
              ...item,
              category: item.title.toLowerCase().includes("exam")
                ? "EXAM"
                : item.title.toLowerCase().includes("holiday") || item.title.toLowerCase().includes("celebration")
                ? "HOLIDAY"
                : "ACADEMIC",
            }));
            // If live notices exist, prepend them to fallback
            setNotices([...merged, ...FALLBACK_NOTICES]);
          }
        }
      } catch (err) {
        console.warn("Using offline notice board data");
      }
    }
    loadNotices();
  }, []);

  const categories = [
    { key: "ALL", label: "All Circulars" },
    { key: "EXAM", label: "Examinations & Datesheet" },
    { key: "ACADEMIC", label: "Academic & PTM" },
    { key: "HOLIDAY", label: "Events & Holidays" },
    { key: "GENERAL", label: "Admissions & General" },
  ];

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
      selectedCategory === "ALL" || nt.category === selectedCategory;
    const matchesSearch =
      nt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nt.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "EXAM":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ACADEMIC":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "HOLIDAY":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <section id="notices" className="py-16 bg-slate-50 border-b border-slate-200/80 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Digital Circular Desk</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Official School Notice Board
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            Stay up to date with official announcements, exam datesheets, fee reminders, and school circulars.
          </p>
        </div>

        {/* Filter & Search Bar with iOS Liquid Sliding Capsule */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category Tabs Container */}
          <div className="relative flex items-center p-1 rounded-xl bg-slate-100/85 backdrop-blur-md border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] overflow-x-auto w-full md:w-auto scrollbar-none">
            {/* 🌊 Pure Transparent Liquid Glass Bubble Capsule */}
            <div
              className="absolute top-1 bottom-1 rounded-lg pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-[transform,width]"
              style={{
                transform: `translateX(${catPill.left}px)`,
                width: `${catPill.width}px`,
                opacity: catPill.opacity,
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 246, 255, 0.88) 100%)",
                boxShadow:
                  "inset 0 1.5px 1px 0 rgba(255, 255, 255, 1), 0 4px 14px -1px rgba(99, 102, 241, 0.16), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Liquid Gloss Reflection */}
              <div className="absolute inset-x-2 top-0.5 h-[45%] rounded-t-md bg-gradient-to-b from-white/90 to-transparent pointer-events-none opacity-90" />
            </div>

            {categories.map((c, idx) => (
              <button
                key={c.key}
                ref={(el) => {
                  categoryRefs.current[idx] = el;
                }}
                onClick={() => setSelectedCategory(c.key)}
                className={`relative z-10 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                  selectedCategory === c.key
                    ? "text-indigo-600 font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search circulars by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Notices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotices.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold">No circulars match your search or filter.</p>
              <button
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredNotices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Category & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getCategoryBadge(
                        notice.category
                      )}`}
                    >
                      {notice.category || "GENERAL"}
                    </span>

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
            ))
          )}
        </div>
      </div>

      {/* ─── Notice Detail Popup Modal ─── */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedNotice(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
