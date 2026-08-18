"use client";

import React, { useState, useEffect } from "react";
import { Quote, Award, Sparkles, CheckCircle } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

export default function PrincipalMessage() {
  const [principalInfo, setPrincipalInfo] = useState<{
    name: string;
    designation: string;
    photoUrl: string;
    message: string;
  }>({
    name: "S. N. Tripathi",
    designation: "Principal & Educational Director",
    photoUrl: "",
    message:
      "Since our inception in 2005 at Salarpur, Varanasi, St. G.N.G. School has remained steadfast in its commitment to providing an inspiring learning atmosphere where academic discipline meets traditional Indian cultural values (Sanskar).",
  });

  useEffect(() => {
    fetch("/api/website-media")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.principal) {
          setPrincipalInfo((prev) => ({ ...prev, ...data.principal }));
        }
      })
      .catch(() => {});
  }, []);
  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-slate-900 shadow-xl border border-slate-200/90 relative overflow-hidden">
          {/* Subtle Decorative Accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/80 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left: Quote & Message */}
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider">
                <Quote className="w-3.5 h-3.5 text-amber-600" />
                <span>Message from the Leadership</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
                "Our mission is to empower every child with knowledge, character, and self-belief."
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                Dear Parents, Students, and Well-Wishers,
                <br /><br />
                Since our inception in 2005 at Salarpur, Varanasi, <strong>St. G.N.G. School</strong> has remained
                steadfast in its commitment to providing an inspiring learning atmosphere where academic
                discipline meets traditional Indian cultural values (Sanskar).
              </p>

              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                We believe that every child is blessed with infinite potential. Our teachers do not merely teach
                from textbooks—they mentor, encourage, and guide our students to become confident, polite, and
                responsible citizens of India. We thank our parents for their unwavering faith in St. GNG School.
              </p>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-base font-extrabold text-indigo-700">{principalInfo.name}</div>
                  <div className="text-xs text-slate-500 font-medium">{principalInfo.designation}</div>
                </div>

                <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Serving Education Since 2005</span>
                </div>
              </div>
            </div>

            {/* Right: Principal / Badge Card */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              {principalInfo.photoUrl ? (
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-md">
                  <img
                    src={getOptimizedImageUrl(principalInfo.photoUrl, 400)}
                    alt={principalInfo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <img
                  src="/logo.png"
                  alt="School Logo"
                  className="h-20 w-20 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              )}

              <h4 className="text-sm font-black text-slate-900">{principalInfo.name}</h4>
              <p className="text-[11px] font-bold text-slate-500">{principalInfo.designation}</p>

              <div className="w-full pt-3 border-t border-slate-200 text-left space-y-1.5 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Personal Attention to Every Student</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Daily Attendance & Performance Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Digital Parent Portal Integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
