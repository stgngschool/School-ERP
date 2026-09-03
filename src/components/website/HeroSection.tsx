"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getOptimizedImageUrl } from "@/lib/cloudinary";
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
  const [heroImage, setHeroImage] = useState<string>("/images/hero_school.jpg");

  useEffect(() => {
    fetch("/api/website-media")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hero?.bannerImage) {
          setHeroImage(data.hero.bannerImage);
        }
      })
      .catch(() => {});
  }, []);
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-slate-100/80 via-slate-50 to-white text-slate-900 pt-6 pb-12 sm:pt-10 sm:pb-16 lg:py-20 border-b border-slate-200/90"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Core Grounded Message & CTAs */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
            {/* Government Official Recognition Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-xs text-emerald-900 text-[11px] sm:text-xs font-bold max-w-full text-left">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
              <span className="truncate sm:whitespace-normal">
                उत्तर प्रदेश बेसिक शिक्षा परिषद से मान्यता प्राप्त (Govt. Recognized) • UDISE: 09670707502
              </span>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.25]">
                संस्कार, अनुशासन और आधुनिक शिक्षा का <br className="hidden sm:inline" />
                <span className="text-indigo-950 underline decoration-amber-400 decoration-4 underline-offset-4">
                  21 वर्षों से विश्वसनीय केंद्र
                </span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base font-extrabold text-slate-700 tracking-wide mt-2.5">
                St. G.N.G. School — Salarpur, Rasulgarh, Varanasi (Estd. 2005)
              </p>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              सलारपुर, रसूलगढ़ एवं वाराणसी के आसपास के क्षेत्रों के बच्चों के सर्वांगीण विकास हेतु समर्पित।
              <strong> Nursery से कक्षा 8वीं</strong> तक व्यक्तिगत मार्गदर्शन, कम्प्यूटर शिक्षा,
              सुरक्षित वैन परिवहन और भारतीय संस्कारों के साथ गुणवत्तापूर्ण बुनियादी शिक्षा।
            </p>

            {/* Grounded School Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-1 max-w-xl mx-auto lg:mx-0 text-left">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">बेसिक शिक्षा परिषद मान्यता</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">कम्प्यूटर एवं स्मार्ट क्लासेज</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">सुरक्षित वैन सुविधा (All Routes)</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">सीसीटीवी सुरक्षित परिसर</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">किफायती एवं पारदर्शी फीस</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="truncate">अनुभवी व स्नेहशील शिक्षक</span>
              </div>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onOpenEnquiry}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-900 hover:bg-indigo-950 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-950/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>प्रवेश पूछताछ सत्र 2026-27 (Admission Enquiry)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4 text-indigo-700" />
                <span>School ERP & Portal Login</span>
              </Link>
            </div>

            {/* Helper Route Notice */}
            <p className="text-[11px] text-slate-500 font-semibold pt-1">
              📍 सलारपुर, रसूलगढ़, सारनाथ एवं आशापुर मार्ग पर वैन सुविधा उपलब्ध • सत्र 2026-27 प्रवेश सीमित सीटों पर जारी
            </p>
          </div>

          {/* Right Column: Hero Visual with Real School Trust Stamps */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Photo Frame */}
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 group">
                <img
                  src={getOptimizedImageUrl(heroImage, 1200)}
                  alt="St. GNG School Building & Students"
                  className="w-full h-64 sm:h-80 md:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/hero_school.jpg";
                  }}
                />

                {/* Overlay Badge */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-transparent p-4 sm:p-5 pt-12">
                  <div className="flex items-center justify-between text-white gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 truncate">
                        St. G.N.G. School Campus
                      </p>
                      <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                        Salarpur, Rasulgarh, Varanasi
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400/40 text-[9px] sm:text-[10px] font-black uppercase shrink-0">
                      U.P. Govt. Recognized
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Stat Card 1: 21+ Years Legacy */}
              <div className="absolute -bottom-4 left-2 sm:-bottom-5 sm:-left-5 bg-white text-slate-900 p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-2.5 sm:gap-3 z-20">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black text-slate-900 leading-tight">21+ Years</div>
                  <div className="text-[10px] font-bold text-slate-500">Established 2005</div>
                </div>
              </div>

              {/* Floating Stat Card 2: Nursery to 8th */}
              <div className="absolute -top-3 right-2 sm:-top-4 sm:-right-4 bg-white text-slate-900 p-2.5 sm:p-3 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-2 sm:gap-2.5 z-20">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Nursery to 8th</div>
                  <div className="text-[9px] font-bold text-slate-500">Basic Shiksha Parishad</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4 Pillar Quick Counter Bar ─── */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-200/90 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 text-center">
          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-900">2005</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">स्थापना वर्ष (Estd.)</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">21+ वर्षों की अनवरत सेवा</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-600">KG - 8th</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">शैक्षणिक विंग्स</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">मजबूत बुनियादी शिक्षा</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700">1:25</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">शिक्षक-छात्र अनुपात</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">प्रत्येक बच्चे पर व्यक्तिगत ध्यान</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">500+</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">संतुष्ट स्थानीय परिवार</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">सलारपुर, रसूलगढ़ व सारनाथ</p>
          </div>
        </div>
      </div>
    </section>
  );
}
