"use client";

import React from "react";
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  FileCheck,
  Award,
} from "lucide-react";

export default function AcademicsSection() {
  const wings = [
    {
      title: "Pre-Primary Wing",
      subtitle: "Nursery, L.K.G. & U.K.G.",
      tag: "Foundational Stage",
      color: "border-amber-200 bg-amber-50/50 text-amber-900",
      badgeColor: "bg-amber-100 text-amber-800",
      description:
        "Joyful, play-based learning designed to build foundational phonics, motor skills, social habits, and curiosity.",
      features: [
        "Phonics & English letter sound recognition",
        "Number readiness & basic counting concepts",
        "Picture stories, rhymes & recitation",
        "Coloring, clay modeling & motor games",
        "Safe, cheerful, and caring classrooms",
      ],
    },
    {
      title: "Primary Wing",
      subtitle: "Classes 1st to 5th",
      tag: "Core Fundamentals",
      color: "border-indigo-200 bg-indigo-50/50 text-indigo-900",
      badgeColor: "bg-indigo-100 text-indigo-800",
      description:
        "Building strong conceptual mastery in language, arithmetic, environmental studies, and computer literacy.",
      features: [
        "English grammar, writing & reading fluency",
        "Mental mathematics & tables problem solving",
        "Environmental Studies (EVS) & Science basics",
        "Hindi literature & Matra writing practice",
        "Hands-on Computer Education & creative art",
      ],
    },
    {
      title: "Upper Primary Wing",
      subtitle: "Classes 6th to 8th",
      tag: "Middle Schooling",
      color: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
      badgeColor: "bg-emerald-100 text-emerald-800",
      description:
        "In-depth subject understanding, regular unit testing, scientific demonstration, and character development.",
      features: [
        "General Science & practical demonstration",
        "Mathematics, Algebra & Geometry foundations",
        "Social Sciences: History, Civics & Geography",
        "Computer Applications & typing practice",
        "Continuous evaluation & scholastic testing",
      ],
    },
  ];

  return (
    <section id="academics" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Classes Nursery to 8th</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Academic Wings (KG to 8th Standard)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            A structured, age-appropriate curriculum crafted to foster confidence, critical thinking, and strong character.
          </p>
        </div>

        {/* 3 Academic Wings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {wings.map((wing, index) => (
            <div
              key={wing.title}
              className={`p-6 sm:p-7 rounded-3xl border bg-white shadow-sm hover:shadow-lg transition-all flex flex-col justify-between`}
            >
              <div>
                {/* Tag & Subtitle */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${wing.badgeColor}`}>
                    {wing.tag}
                  </span>
                  <span className="text-xs font-extrabold text-slate-400">Wing 0{index + 1}</span>
                </div>

                <h3 className="text-xl font-black text-slate-900">{wing.title}</h3>
                <p className="text-xs font-extrabold text-indigo-600 mb-3">{wing.subtitle}</p>

                <p className="text-xs text-slate-600 font-normal leading-relaxed mb-6">
                  {wing.description}
                </p>

                {/* Features List */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  {wing.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Badge */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Medium: English & Hindi</span>
                <span className="text-indigo-600 font-black">All Subjects</span>
              </div>
            </div>
          ))}
        </div>

        {/* Evaluation & Examination Framework */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 space-y-2">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                Examination System
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Continuous & Comprehensive Evaluation (CCE)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                To eliminate exam fear and promote regular study habits, student performance is assessed continuously
                through four systematic evaluation cycles per academic year.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <div className="text-xs font-black text-indigo-600 uppercase">Quarter 1</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Unit Test 1</div>
                <p className="text-[10px] text-slate-500 mt-1">July Cycle • 20 Marks (Written + Note Book + Project)</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-center">
                <div className="text-xs font-black text-indigo-700 uppercase">Term 1 Exam</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Half Yearly</div>
                <p className="text-[10px] text-slate-600 mt-1">October Cycle • 80 Marks Descriptive Assessment</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <div className="text-xs font-black text-indigo-600 uppercase">Quarter 3</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Unit Test 2</div>
                <p className="text-[10px] text-slate-500 mt-1">December Cycle • 20 Marks Formative Review</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
                <div className="text-xs font-black text-emerald-700 uppercase">Final Exam</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Annual Exam</div>
                <p className="text-[10px] text-slate-600 mt-1">March Cycle • 80 Marks Cumulative Evaluation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
