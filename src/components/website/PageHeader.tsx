"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home, Sparkles } from "lucide-react";

interface PageHeaderProps {
  badge: string;
  title: string;
  description: string;
  breadcrumb: string;
  badgeIcon?: React.ReactNode;
}

export default function PageHeader({
  badge,
  title,
  description,
  breadcrumb,
  badgeIcon,
}: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-slate-50/80 to-white text-slate-900 pt-8 pb-10 sm:pt-12 sm:pb-14 border-b border-slate-200/80">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 mb-3">
          <Link href="/" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-indigo-600 font-extrabold">{breadcrumb}</span>
        </div>

        {/* Badge Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs text-indigo-700 text-[11px] font-black uppercase tracking-wider mb-2.5">
          {badgeIcon || <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          <span>{badge}</span>
        </div>

        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          {title}
        </h1>

        {/* Subtitle Description */}
        <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl mx-auto mt-2 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
