"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  Search,
  Calendar,
  Filter,
  Megaphone,
} from "lucide-react";

interface NoticeBoardViewProps {
  title?: string;
  subtitle?: string;
}

export default function NoticeBoardView({
  title = "Notice Board & Circulars",
  subtitle = "Official school announcements, circular bulletins, and event alerts.",
}: NoticeBoardViewProps) {
  const { notices } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [targetFilter, setTargetFilter] = useState("ALL");

  const filteredNotices = notices.filter((nt) => {
    const matchesSearch =
      nt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nt.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTarget =
      targetFilter === "ALL" || nt.target === targetFilter;

    return matchesSearch && matchesTarget;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12 font-sans">
      {/* Header Card */}
      <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
              <Megaphone className="h-3.5 w-3.5" /> Official Bulletin
            </h3>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
              {title}
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3.5 py-1.5 rounded-2xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100/60 shadow-2xs">
            {filteredNotices.length} Active {filteredNotices.length === 1 ? "Notice" : "Notices"}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search circulars, topics, holidays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[11px] font-extrabold py-2.5 pl-9 pr-4 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all shadow-2xs placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs w-full sm:w-auto"
          >
            <option value="ALL">All Audiences</option>
            <option value="PARENTS">Parents Only</option>
            <option value="TEACHERS">Teachers Only</option>
          </select>
        </div>
      </div>

      {/* Notice Cards List */}
      <div className="space-y-4">
        {filteredNotices.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-slate-400 space-y-2">
            <Bell className="h-10 w-10 mx-auto text-slate-300 mb-1 opacity-50" />
            <h4 className="text-sm font-black text-slate-700">No circulars found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no active notices matching your criteria. Check back later for new bulletins!
            </p>
          </div>
        ) : (
          filteredNotices.slice().reverse().map((nt) => {
            const isParents = nt.target === "PARENTS";
            const isTeachers = nt.target === "TEACHERS";

            return (
              <div
                key={nt.id}
                className="bg-white border border-slate-200/60 hover:border-indigo-200 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-3.5 transition-all duration-200"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-xl border shadow-2xs ${
                        isParents
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                          : isTeachers
                          ? "bg-amber-50 text-amber-800 border-amber-200/60"
                          : "bg-indigo-50 text-indigo-800 border-indigo-200/60"
                      }`}
                    >
                      Target: {nt.target || "ALL"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{nt.createdAt}</span>
                  </div>
                </div>

                {/* Notice Title & Content */}
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                    {nt.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-2 whitespace-pre-wrap">
                    {nt.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
