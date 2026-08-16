"use client";

import React from "react";
import {
  Award,
  HeartHandshake,
  BookOpen,
  Target,
  Sparkles,
  CheckCircle2,
  Users,
  Compass,
  GraduationCap,
} from "lucide-react";

export default function AboutSection() {
  return (
    <section id="about" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Tag & Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Govt. Recognized Institution (मान्यता प्राप्त)</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            About St. G.N.G. School
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-3 leading-relaxed">
            Recognized by the Uttar Pradesh State Government in <strong>2005</strong>, St. G.N.G. School has
            completed <strong>21+ years (2 decades)</strong> of dedicated educational service in Salarpur, Rasulgarh, Varanasi,
            providing high-standard foundational education from <strong>Nursery to Class 8th</strong>.
          </p>
        </div>

        {/* 2-Column Story & Image */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          {/* Left Column: Visual Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-100">
              <img
                src="/images/classroom.jpg"
                alt="Classroom at St. GNG School"
                className="w-full h-80 sm:h-96 object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                    Our Classroom Environment
                  </div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">
                    Interactive, joyful, and focused on every child's strengths.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom floating badge */}
            <div className="absolute -bottom-5 -right-4 sm:-right-6 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-300">Affiliated Status</p>
                <p className="text-sm font-black text-white">U.P. Govt. Recognized</p>
              </div>
            </div>
          </div>

          {/* Right Column: Mission & Core Vision */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
              <Compass className="w-4 h-4" />
              <span>Our Guiding Philosophy</span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
              Building Strong Foundations in Children (Classes Nursery to 8th)
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
              At St. G.N.G. School, we believe that early and middle childhood education is the most critical
              phase of human development. Since receiving government recognition in 2005, our focus has remained on
              strong conceptual fundamentals in Hindi, English, Mathematics, Science, and Social Studies.
            </p>

            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
              Our faculty members work closely with parents to identify each student’s unique talents, providing
              remedial support where needed and encouraging them to participate in morning assembly speeches, science
              exhibitions, and sports competitions.
            </p>

            {/* 4 Pillars Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-black text-xs">
                  01
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Academic Rigor</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Regular unit assessments, homework follow-ups, and concept clarity.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-black text-xs">
                  02
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Moral Character (Sanskar)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Instilling respect for elders, honesty, cleanliness, and self-discipline.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-xs">
                  03
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Bilingual Fluency</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Strengthening English communication alongside deep Hindi literature roots.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-black text-xs">
                  04
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Affordable Quality</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Transparent fee structure making high-grade education reachable for all.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
