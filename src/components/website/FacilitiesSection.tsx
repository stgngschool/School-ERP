"use client";

import React from "react";
import {
  Monitor,
  FlaskConical,
  BookOpen,
  Palette,
  Trophy,
  ShieldCheck,
  Droplets,
  Zap,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function FacilitiesSection() {
  const facilities = [
    {
      icon: Monitor,
      title: "Computer Education Lab",
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      description:
        "Dedicated computer workstations equipped with essential software to teach basic computer literacy, typing, office applications, and digital awareness from early classes.",
    },
    {
      icon: FlaskConical,
      title: "Science Demonstration Lab",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      description:
        "Equipped with practical scientific apparatus, anatomical models, prisms, lenses, and microscopes to demonstrate key physics, chemistry, and biology concepts.",
    },
    {
      icon: BookOpen,
      title: "Library & Reading Corner",
      color: "bg-amber-50 text-amber-600 border-amber-100",
      description:
        "A quiet, resourceful reading room with textbooks, moral storybooks, encyclopedias, children's magazines, and newspapers to foster a lifelong reading habit.",
    },
    {
      icon: Palette,
      title: "Art, Craft & Cultural Room",
      color: "bg-rose-50 text-rose-600 border-rose-100",
      description:
        "A vibrant creative space for drawing, painting, clay craft, cultural rehearsals, debate preparation, and assembly presentations.",
    },
    {
      icon: Trophy,
      title: "Sports, Games & Daily Yoga",
      color: "bg-blue-50 text-blue-600 border-blue-100",
      description:
        "Open play areas for badminton, volleyball, athletics, table tennis, and carrom, alongside daily morning assembly yoga and physical drills for health.",
    },
    {
      icon: ShieldCheck,
      title: "24x7 CCTV Secured Campus",
      color: "bg-purple-50 text-purple-600 border-purple-100",
      description:
        "Comprehensive CCTV surveillance covering all main corridors, gates, and common areas to ensure 100% child safety, disciplined movement, and security.",
    },
    {
      icon: Droplets,
      title: "RO Filtered Drinking Water",
      color: "bg-cyan-50 text-cyan-600 border-cyan-100",
      description:
        "Commercial RO water purification units ensuring clean, chilled, and hygienic drinking water for students and staff throughout the day.",
    },
    {
      icon: Zap,
      title: "Power Backup & Airy Classrooms",
      color: "bg-orange-50 text-orange-600 border-orange-100",
      description:
        "Naturally ventilated, bright, and spacious classrooms with continuous inverter power backup to prevent any disruption in study hours.",
    },
  ];

  return (
    <section id="facilities" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Infrastructure</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Facilities Designed for Real Learning
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            We focus on clean, secure, and practical amenities that directly benefit students' daily academic growth and physical well-being.
          </p>
        </div>

        {/* 8 Facilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {facilities.map((fac) => {
            const Icon = fac.icon;
            return (
              <div
                key={fac.title}
                className="p-6 rounded-3xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${fac.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mb-2 leading-snug">
                    {fac.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {fac.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available for all students</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Image Feature Strip */}
        <div className="rounded-3xl bg-indigo-50/80 border border-indigo-100 p-6 sm:p-8 relative overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-2">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                Visit St. GNG School Campus
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Experience Our Disciplined & Caring School Environment
              </h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Parents are warmly invited to visit our campus during official school hours (8:00 AM – 1:30 PM) to
                interact with teachers, inspect classrooms, and learn more about our admission process.
              </p>
            </div>
            <div className="md:col-span-4 flex md:justify-end">
              <a
                href="#contact"
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all"
              >
                Get Campus Directions
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
