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
  MapPin,
  Bus,
} from "lucide-react";

interface HeroSectionProps {
  onOpenEnquiry: () => void;
}

export default function HeroSection({ onOpenEnquiry }: HeroSectionProps) {
  const [heroImage, setHeroImage] = useState<string>(
    "https://res.cloudinary.com/ec4srd3k/image/upload/v1788449371/school_website/hmwpzxl2utdpplrtzbwe.jpg"
  );

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
      className="relative overflow-hidden bg-gradient-to-b from-slate-100/90 via-slate-50 to-white text-slate-900 pt-6 pb-12 sm:pt-10 sm:pb-16 lg:py-16 border-b border-slate-200/90"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Core Grounded School Message & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            {/* Government Official Recognition Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300/80 shadow-xs text-emerald-900 text-[11px] sm:text-xs font-black max-w-full text-left">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
              <span className="truncate sm:whitespace-normal">
                उत्तर प्रदेश बेसिक शिक्षा परिषद से मान्यता प्राप्त • UDISE: 09670707502
              </span>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.18]">
                संस्कार, अनुशासन और <br />
                <span className="text-[#0f285a]">आधुनिक शिक्षा</span> का 21 वर्षों से केंद्र
              </h1>
              <div className="flex items-center justify-center lg:justify-start gap-2 pt-2 text-slate-700 font-extrabold text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>St. G.N.G. School — सलारपुर, रसूलगढ़, वाराणसी (Estd. 2005)</span>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              सलारपुर और वाराणसी के स्थानीय परिवारों का 21 वर्षों से अटूट विश्वास।
              <strong> नर्सरी से कक्षा 8वीं</strong> तक अनुभवी शिक्षकों द्वारा व्यक्तिगत देखभाल, कम्प्यूटर शिक्षा,
              सुरक्षित वैन परिवहन और भारतीय संस्कारों के साथ मजबूत बुनियादी शिक्षा।
            </p>

            {/* 3 Prominent Institutional Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-left max-w-xl mx-auto lg:mx-0">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center mb-2 font-black border border-indigo-100">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900">Nursery to 8th</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">बेसिक शिक्षा परिषद पाठ्यक्रम</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-2 font-black border border-emerald-100">
                  <Bus className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900">सुरक्षित वैन सेवा</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">सलारपुर, रसूलगढ़, सारनाथ</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-2 font-black border border-amber-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900">CCTV व संस्कार</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">सुरक्षित व अनुशासित परिसर</p>
              </div>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onOpenEnquiry}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0f285a] hover:bg-[#091b3d] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>प्रवेश पूछताछ सत्र 2026-27 (Admission Enquiry)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4 text-indigo-900" />
                <span>School ERP & Portal Login</span>
              </Link>
            </div>

            {/* Helper Route Notice */}
            <p className="text-[11px] text-slate-500 font-bold pt-1">
              📍 सलारपुर, रसूलगढ़, सारनाथ एवं आशापुर मार्ग पर वैन सुविधा उपलब्ध • सत्र 2026-27 प्रवेश प्रारंभ
            </p>
          </div>

          {/* Right Column: Real School Building Showcase (Full Height) */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Photo Frame showcasing the real green building */}
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-900 group">
                <img
                  src={getOptimizedImageUrl(heroImage, 1400)}
                  alt="St. G.N.G. School Building Salarpur Varanasi"
                  className="w-full h-[460px] sm:h-[520px] lg:h-[580px] object-cover object-top sm:object-center group-hover:scale-102 transition-transform duration-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/st_gng_school_building.jpg";
                  }}
                />

                {/* Top Glass Badge */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-xl bg-slate-950/75 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-wider border border-white/20">
                    🏛️ Estd. 2005
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-700/85 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                    Govt. Recognized
                  </span>
                </div>

                {/* Bottom Overlay Badge with School Details */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-5 pt-16 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                        St. G.N.G. School
                      </p>
                      <p className="text-sm font-extrabold text-white truncate mt-0.5">
                        सलारपुर, रसूलगढ़ (वाराणसी)
                      </p>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        21+ वर्षों से सलारपुर में शिक्षा एवं संस्कारों की अनवरत सेवा
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase border border-white/30">
                        Nursery to 8th
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4 Pillar Quick Counter Bar ─── */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-200/90 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 text-center">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-[#0f285a]">2005</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">स्थापना वर्ष (Estd.)</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">21+ वर्षों की अनवरत सेवा</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-600">KG - 8th</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">शैक्षणिक विंग्स</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">मजबूत बुनियादी शिक्षा</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700">1:25</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">शिक्षक-छात्र अनुपात</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">प्रत्येक बच्चे पर व्यक्तिगत ध्यान</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">500+</div>
            <div className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">संतुष्ट स्थानीय परिवार</div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">सलारपुर, रसूलगढ़ व सारनाथ</p>
          </div>
        </div>
      </div>
    </section>
  );
}
