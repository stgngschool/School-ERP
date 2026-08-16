"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  ShieldCheck,
  Award,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  LogIn,
  FileSpreadsheet,
  BookOpen,
} from "lucide-react";

interface HeroSectionProps {
  onOpenEnquiry: () => void;
}

export default function HeroSection({ onOpenEnquiry }: HeroSectionProps) {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 via-slate-50 to-white text-slate-900 pt-6 pb-12 sm:pt-10 sm:pb-16 lg:py-20 border-b border-slate-200/80"
    >
      {/* Subtle Light Dot Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Core Message & CTAs */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 text-[11px] sm:text-xs font-bold max-w-full text-left">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate sm:whitespace-normal">
                U.P. Govt. Recognized (मान्यता प्राप्त) • UDISE: 09670707502
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.2]">
              Nurturing Minds, <br className="hidden sm:inline" />
              <span className="text-indigo-600">
                Building Values & Character
              </span>{" "}
              Since 2005
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Welcome to <strong>St. G.N.G. School</strong>, Salarpur, Rasulgarh, Varanasi. We provide quality,
              value-based education from <strong>Pre-Primary (Nursery, KG) to Class 8th</strong> with
              disciplined teachers, modern classrooms, and individual student care.
            </p>

            {/* Key Value Points */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-1 max-w-xl mx-auto lg:mx-0 text-left">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Govt. Recognized</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Sanskar & Values</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Computer Classes</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">CCTV Campus</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Personal Care</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Affordable Fees</span>
              </div>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onOpenEnquiry}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Admission Enquiry 2026-27</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4 text-indigo-600" />
                <span>School ERP & Portal Login</span>
              </Link>
            </div>

            {/* Helper Notice */}
            <p className="text-[11px] text-slate-500 font-medium pt-1">
              Existing Parents & Students can log in directly to check fee dues, marksheets & attendance.
            </p>
          </div>

          {/* Right Column: Hero Visual */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Photo Frame */}
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 group">
                <img
                  src="/images/hero_school.jpg"
                  alt="St. GNG School Building & Students"
                  className="w-full h-64 sm:h-80 md:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />

                {/* Overlay Badge */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent p-4 sm:p-5 pt-10">
                  <div className="flex items-center justify-between text-white gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 truncate">
                        St. G.N.G. School Campus
                      </p>
                      <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                        Salarpur, Rasulgarh, Varanasi
                      </p>
                    </div>
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/20 backdrop-blur-md text-white border border-white/30 text-[9px] sm:text-[10px] font-black uppercase shrink-0">
                      Govt. Recognized
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Stat Card 1: 21+ Years Legacy */}
              <div className="absolute -bottom-4 left-2 sm:-bottom-6 sm:-left-6 bg-white text-slate-900 p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3.5 z-20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">21+ Years</div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500">Since 2005</div>
                </div>
              </div>

              {/* Floating Stat Card 2: Nursery to 8th */}
              <div className="absolute -top-3 right-2 sm:-top-4 sm:-right-6 bg-white text-slate-900 p-2.5 sm:p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2 sm:gap-3 z-20">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Nursery to 8th</div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-500">Classes KG - 8th</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4 Pillar Quick Counter Bar ─── */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 text-center">
          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-600">2005</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-800 mt-0.5">Recognition Year</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">21+ Years of Service</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-600">100%</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-800 mt-0.5">Moral Values</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Sanskar & Discipline</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600">KG - 8th</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-800 mt-0.5">Academic Wings</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Nursery to Middle</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-rose-600">1:25</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-800 mt-0.5">Teacher Ratio</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Individual Attention</p>
          </div>
        </div>
      </div>
    </section>
  );
}
