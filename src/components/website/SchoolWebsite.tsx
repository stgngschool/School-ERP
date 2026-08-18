"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import AboutSection from "./AboutSection";
import AcademicsSection from "./AcademicsSection";
import FacilitiesSection from "./FacilitiesSection";
import AdmissionSection from "./AdmissionSection";
import NoticeBoardSection from "./NoticeBoardSection";
import GallerySection from "./GallerySection";
import ContactSection from "./ContactSection";
import PrincipalMessage from "./PrincipalMessage";
import ParentQuickDesk from "./ParentQuickDesk";
import Footer from "./Footer";
import AdmissionModal from "./AdmissionModal";
import PageHeader from "./PageHeader";
import {
  Bell,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Users,
  Play,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Tv,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  Building2,
  Image as ImageIcon,
  Camera,
} from "lucide-react";

interface SchoolWebsiteProps {
  user?: any;
  activeRole?: string | null;
  onGoToPortal?: () => void;
}

const YouTubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export type ActiveTabKey =
  | "HOME"
  | "ABOUT"
  | "ACADEMICS"
  | "NOTICES"
  | "FACILITIES"
  | "ADMISSIONS"
  | "GALLERY"
  | "CONTACT";

export default function SchoolWebsite({
  user,
  activeRole,
  onGoToPortal,
}: SchoolWebsiteProps) {
  const [activeTab, setActiveTab] = useState<ActiveTabKey>("HOME");
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const tabSequence: ActiveTabKey[] = [
    "HOME",
    "ABOUT",
    "ACADEMICS",
    "NOTICES",
    "FACILITIES",
    "ADMISSIONS",
    "GALLERY",
    "CONTACT",
  ];

  const [slideDir, setSlideDir] = useState<"right" | "left">("right");

  // Check URL params on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        let upper = tabParam.toUpperCase() as string;
        if (upper === "VIDEOS") upper = "GALLERY";
        if (tabSequence.includes(upper as ActiveTabKey)) {
          setActiveTab(upper as ActiveTabKey);
        }
      }
    }
  }, []);

  const handleTabSwitch = (tab: ActiveTabKey) => {
    if (tab === activeTab) return;
    const oldIdx = tabSequence.indexOf(activeTab);
    const newIdx = tabSequence.indexOf(tab);
    setSlideDir(newIdx >= oldIdx ? "right" : "left");
    setTransitioning(true);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "HOME") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab.toLowerCase());
      }
      window.history.pushState({}, "", url.toString());
    }

    setTimeout(() => {
      setTransitioning(false);
    }, 350);
  };

  // Top 3 Featured YouTube Videos
  const featuredVideos = [
    {
      id: "oW5tWtf7gwM",
      title: "Papa Kehte Hain Dance Performance | 26 January 2026",
      category: "Dance Performance",
      duration: "5:19",
      thumbnail: "https://i.ytimg.com/vi/oW5tWtf7gwM/hqdefault.jpg",
    },
    {
      id: "P27gveGTYXg",
      title: "Jhoom Barabar Jhoom Dance Performance 🔥 | 26 January 2026",
      category: "Group Dance",
      duration: "3:17",
      thumbnail: "https://i.ytimg.com/vi/P27gveGTYXg/hqdefault.jpg",
    },
    {
      id: "3pix6gpgPS0",
      title: "Apna Har Din Aise Jiyo Dance Performance 💫 | 26 January 2026",
      category: "Patriotic Dance",
      duration: "4:44",
      thumbnail: "https://i.ytimg.com/vi/3pix6gpgPS0/hqdefault.jpg",
    },
  ];

  // Dynamic Live Notices from ERP Database
  const [liveNotices, setLiveNotices] = useState<any[]>([
    {
      id: "fallback-1",
      category: "ADMISSION",
      title: "Admissions Open for Session 2026-2027 (Nursery to Class 8th)",
      createdAt: "Aug 2026",
      content: "Limited seats available per section. Collect form from office or submit online enquiry.",
      isUrgent: true,
    },
    {
      id: "fallback-2",
      category: "EXAM",
      title: "Half-Yearly Examination Datesheet & Syllabus Notification",
      createdAt: "Aug 2026",
      content: "Syllabus posted on the Parent Portal. Please ensure project notebooks are complete.",
      isUrgent: true,
    },
    {
      id: "fallback-3",
      category: "FEE",
      title: "Monthly Fee Dues Clearance Reminder (Counter & Online Portal)",
      createdAt: "Aug 2026",
      content: "Clear pending tuition fees at school counter or check dues on the Parent ERP Portal.",
      isUrgent: false,
    },
  ]);

  useEffect(() => {
    async function loadLatestNotices() {
      try {
        const res = await fetch("/api/notice?public=true&limit=3", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLiveNotices(data);
          }
        }
      } catch (e) {
        console.warn("Using offline notice fallback");
      }
    }
    loadLatestNotices();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar with Instant Liquid Tab Switching */}
      <Navbar
        onOpenEnquiryModal={() => setEnquiryModalOpen(true)}
        user={user}
        activeRole={activeRole}
        onGoToPortal={onGoToPortal}
        activeTabKey={activeTab}
        onTabSelect={(tab) => handleTabSwitch(tab)}
      />

      {/* ─── Main Dynamic iOS Liquid Content Body (Direction-Aware) ─── */}
      <main
        key={activeTab}
        className={`flex-1 ${
          slideDir === "right" ? "animate-ios-slide-right" : "animate-ios-slide-left"
        }`}
      >
        {/* 1. HOME VIEW */}
        {activeTab === "HOME" && (
          <div>
            <HeroSection onOpenEnquiry={() => setEnquiryModalOpen(true)} />

            {/* 4 Quick Explorer Pillars */}
            <section className="py-10 bg-slate-50 border-b border-slate-200/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <button
                    onClick={() => handleTabSwitch("NOTICES")}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col justify-between text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Notice Board
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        Latest exam circulars & updates
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-indigo-600">
                      <span>View Circulars</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabSwitch("ACADEMICS")}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group flex flex-col justify-between text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        Academics Wings
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        Classes Nursery to 8th Curriculum
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-emerald-600">
                      <span>Explore Wings</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabSwitch("ADMISSIONS")}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-300 transition-all group flex flex-col justify-between text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                        Admissions 2026-27
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        Process, Checklist & Online Form
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-amber-600">
                      <span>Apply Now</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabSwitch("GALLERY")}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-purple-300 transition-all group flex flex-col justify-between text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                        Gallery & Videos
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        YouTube Videos & Campus Photos
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-purple-600">
                      <span>Explore Gallery</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* Latest Notices Teaser */}
            <section className="py-14 bg-white border-b border-slate-200/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">
                      Official Circulars
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      Latest School Notices
                    </h2>
                  </div>
                  <button
                    onClick={() => handleTabSwitch("NOTICES")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all w-fit cursor-pointer"
                  >
                    <span>View All Notices & Circulars</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {liveNotices.map((n, i) => {
                    const cat = (n.category || "GENERAL").toUpperCase();
                    const badgeClass =
                      cat === "EXAM"
                        ? "bg-rose-100 text-rose-800"
                        : cat === "ADMISSION"
                        ? "bg-amber-100 text-amber-800"
                        : cat === "FEE"
                        ? "bg-emerald-100 text-emerald-800"
                        : cat === "HOLIDAY"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-indigo-100 text-indigo-800";

                    return (
                      <div
                        key={n.id || i}
                        onClick={() => handleTabSwitch("NOTICES")}
                        className={`p-5 rounded-2xl bg-slate-50 border ${
                          n.isUrgent ? "border-rose-300 ring-2 ring-rose-100/80 bg-white" : "border-slate-200/80 hover:bg-white"
                        } hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${badgeClass}`}>
                                {n.category || "General"}
                              </span>
                              {n.isUrgent && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">{n.createdAt}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug mb-1 line-clamp-2">
                            {n.title}
                          </h3>
                          <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-3">
                            {n.content || n.desc}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTabSwitch("NOTICES");
                          }}
                          className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline text-left cursor-pointer"
                        >
                          <span>Read Full Circular</span>
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* About Brief */}
            <section className="py-14 bg-slate-50 border-b border-slate-200/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-6 space-y-4">
                    <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
                      21+ Years of Recognized Service (Since 2005)
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
                      Value-Based Education Rooted in Indian Culture & Discipline
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                      Established in 2005 at Salarpur, Rasulgarh, Varanasi, <strong>St. G.N.G. School</strong> focuses
                      on foundational concepts from <strong>Nursery to Class 8th</strong>. We blend academic rigor
                      with moral character (Sanskar), computer literacy, and interactive learning.
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>U.P. Govt. Recognized</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>1:25 Student Attention</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => handleTabSwitch("ABOUT")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>Read About Us & Principal Message</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200">
                      <img
                        src="/images/classroom.jpg"
                        alt="Classroom learning"
                        className="w-full h-64 sm:h-80 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                        <div className="text-white">
                          <p className="text-xs font-bold text-amber-300">Modern Classroom Environment</p>
                          <p className="text-sm font-black">Empowering every child with knowledge & self-belief.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* YouTube Featured Teaser in Gallery */}
            <section className="py-14 bg-white border-b border-slate-200/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-black uppercase tracking-wider mb-1">
                      <YouTubeIcon className="w-3.5 h-3.5 text-red-600" />
                      <span>@stgngschool Channel</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                      Student Activities & Video Programs
                    </h2>
                  </div>
                  <button
                    onClick={() => handleTabSwitch("GALLERY")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-black transition-all w-fit cursor-pointer"
                  >
                    <span>View All in Media Gallery</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {featuredVideos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleTabSwitch("GALLERY")}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg transition-all group cursor-pointer"
                    >
                      <div className="relative h-44 bg-slate-900 overflow-hidden">
                        <img
                          src={v.thumbnail}
                          alt={v.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10">
                          <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                          {v.duration}
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase">
                          {v.category}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2 mt-0.5">
                          {v.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Parent Support Desk */}
            <section className="py-12 bg-slate-50 border-b border-slate-200/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Parent Self-Service Portal & Fee Dues
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Check monthly fee dues, download digital receipts, and view unit test marksheets online.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Link
                      href="/login"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      Parent Sign In
                    </Link>
                    <button
                      onClick={() => handleTabSwitch("CONTACT")}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Contact Office
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 2. ABOUT TAB VIEW */}
        {activeTab === "ABOUT" && (
          <div>
            <PageHeader
              breadcrumb="About Us"
              badge="Recognized Since 2005 (21+ Years)"
              title="About St. G.N.G. School"
              description="A 21-year legacy of government-recognized foundational schooling in Salarpur, Rasulgarh, Varanasi dedicated to discipline, moral values, and academic excellence."
              badgeIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
            />
            <AboutSection />
            <PrincipalMessage />
            <FacilitiesSection />
          </div>
        )}

        {/* 3. ACADEMICS TAB VIEW */}
        {activeTab === "ACADEMICS" && (
          <div>
            <PageHeader
              breadcrumb="Academics"
              badge="Curriculum & Wings (Nursery to 8th)"
              title="Academic Wings & Examination"
              description="Age-appropriate, value-centered schooling divided into Foundational Pre-Primary, Core Primary, and Upper Primary Middle wings with continuous CCE assessment."
              badgeIcon={<BookOpen className="w-3.5 h-3.5 text-emerald-600" />}
            />
            <AcademicsSection />
            <FacilitiesSection />
          </div>
        )}

        {/* 4. NOTICES TAB VIEW */}
        {activeTab === "NOTICES" && (
          <div>
            <PageHeader
              breadcrumb="Notice Board"
              badge="Official Circulars & Desk"
              title="Digital Notice Board"
              description="Read official administrative circulars, examination date sheets, holiday announcements, and parent-teacher meeting notices."
              badgeIcon={<Bell className="w-3.5 h-3.5 text-indigo-600" />}
            />
            <NoticeBoardSection />
          </div>
        )}

        {/* 5. FACILITIES TAB VIEW */}
        {activeTab === "FACILITIES" && (
          <div>
            <PageHeader
              breadcrumb="Facilities"
              badge="Campus Amenities & Infrastructure"
              title="School Campus Facilities"
              description="Explore our Computer Lab, Science Demonstration Corner, CCTV Security, RO Drinking Water, Sports Ground, and Activity Rooms."
              badgeIcon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
            />
            <FacilitiesSection />
          </div>
        )}

        {/* 6. ADMISSIONS TAB VIEW */}
        {activeTab === "ADMISSIONS" && (
          <div>
            <PageHeader
              breadcrumb="Admissions"
              badge="Admissions Open 2026-2027"
              title="School Admissions (KG to 8th)"
              description="Straightforward, transparent admission process with minimal documentation. Apply online via WhatsApp or visit our school counter."
              badgeIcon={<GraduationCap className="w-3.5 h-3.5 text-indigo-600" />}
            />
            <AdmissionSection />
            <ParentQuickDesk />
          </div>
        )}

        {/* 7. GALLERY & VIDEOS UNIFIED TAB VIEW */}
        {activeTab === "GALLERY" && (
          <div>
            <PageHeader
              breadcrumb="Gallery & Videos"
              badge="Campus Glimpses & YouTube Media"
              title="Photo Gallery & Official YouTube Videos"
              description="Explore authentic moments from our campus — student dance performances, Republic Day skits, classroom sessions, and official YouTube videos from @stgngschool."
              badgeIcon={<Camera className="w-3.5 h-3.5 text-purple-600" />}
            />
            <GallerySection />
          </div>
        )}

        {/* 8. CONTACT TAB VIEW */}
        {activeTab === "CONTACT" && (
          <div>
            <PageHeader
              breadcrumb="Contact Us"
              badge="Salarpur, Varanasi Campus"
              title="Contact & Location Helpdesk"
              description="Visit our campus in Salarpur, Rasulgarh, Varanasi or contact our administration directly via phone, email, or WhatsApp."
              badgeIcon={<MapPin className="w-3.5 h-3.5 text-emerald-600" />}
            />
            <ContactSection />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Fast Admission Enquiry Modal */}
      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
