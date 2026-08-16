"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  LogIn,
  Menu,
  X,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  ArrowUpRight,
  Bell,
  Clock,
  BookOpen,
} from "lucide-react";
import { ActiveTabKey } from "./SchoolWebsite";

interface NavbarProps {
  onOpenEnquiryModal?: () => void;
  user?: any;
  activeRole?: string | null;
  onGoToPortal?: () => void;
  activeTabKey?: ActiveTabKey;
  onTabSelect?: (tab: ActiveTabKey) => void;
}

export default function Navbar({
  onOpenEnquiryModal,
  user,
  activeRole,
  onGoToPortal,
  activeTabKey = "HOME",
  onTabSelect,
}: NavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Sliding Liquid Pill State & Refs
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const navLinks: { name: string; href: string; key: ActiveTabKey }[] = [
    { name: "Home", href: "/", key: "HOME" },
    { name: "About Us", href: "/about", key: "ABOUT" },
    { name: "Academics", href: "/academics", key: "ACADEMICS" },
    { name: "Notice Board", href: "/notices", key: "NOTICES" },
    { name: "Facilities", href: "/facilities", key: "FACILITIES" },
    { name: "Admissions", href: "/admissions", key: "ADMISSIONS" },
    { name: "Gallery & Videos", href: "/gallery", key: "GALLERY" },
    { name: "Contact", href: "/contact", key: "CONTACT" },
  ];

  // Update Liquid Sliding Pill Position
  useEffect(() => {
    setMounted(true);

    const activeIndex = navLinks.findIndex((link) => {
      if (onTabSelect) {
        return activeTabKey === link.key;
      }
      return pathname === link.href;
    });

    if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
      const activeEl = itemRefs.current[activeIndex];
      if (activeEl) {
        setPillStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      }
    }
  }, [activeTabKey, pathname, onTabSelect]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      const activeIndex = navLinks.findIndex((link) => {
        if (onTabSelect) {
          return activeTabKey === link.key;
        }
        return pathname === link.href;
      });
      if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
        const activeEl = itemRefs.current[activeIndex];
        if (activeEl) {
          setPillStyle({
            left: activeEl.offsetLeft,
            width: activeEl.offsetWidth,
            opacity: 1,
          });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTabKey, pathname, onTabSelect]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleEnquiryClick = () => {
    if (onOpenEnquiryModal) {
      onOpenEnquiryModal();
    } else if (onTabSelect) {
      onTabSelect("ADMISSIONS");
    } else {
      window.location.href = "/admissions";
    }
  };

  const handleLinkClick = (e: React.MouseEvent, link: (typeof navLinks)[0]) => {
    if (onTabSelect) {
      e.preventDefault();
      onTabSelect(link.key);
      setMobileMenuOpen(false);
    }
  };

  const isLinkActive = (link: (typeof navLinks)[0]) => {
    if (onTabSelect) {
      return activeTabKey === link.key;
    }
    return pathname === link.href;
  };

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user && activeRole) {
      if (onGoToPortal) {
        onGoToPortal();
      } else {
        window.location.href = "/?view=erp";
      }
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-300 font-sans shadow-xs">
      {/* ─── Top Urgent Bulletin Strip ─── */}
      <div className="bg-slate-950 text-slate-200 text-xs py-1.5 px-4 sm:px-6 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Ticker / Alert */}
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider shrink-0 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Notice</span>
            </span>
            <Link
              href="/notices"
              onClick={(e) => {
                if (onTabSelect) {
                  e.preventDefault();
                  onTabSelect("NOTICES");
                }
              }}
              className="text-xs font-medium text-slate-300 truncate hover:text-white transition-colors"
            >
              Admissions Open 2026-27 (Nursery to 8th) • U.P. Govt. Recognized • UDISE: 09670707502
            </Link>
          </div>

          {/* Right: Quick Contact & Timings (Desktop) */}
          <div className="hidden md:flex items-center gap-6 text-[11px] font-semibold text-slate-400 shrink-0">
            <a
              href="tel:9452824318"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>+91 9452824318</span>
            </a>
            <a
              href="mailto:stgng2005@gmail.com"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>stgng2005@gmail.com</span>
            </a>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>7:30 AM - 2:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Logged-In User Banner ─── */}
      {mounted && user && activeRole && (
        <div className="bg-indigo-900 text-indigo-100 py-1.5 px-4 sm:px-6 text-xs font-medium border-b border-indigo-800 shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate text-xs">
                Logged in as <strong>{user.name || user.username}</strong> ({activeRole})
              </span>
            </div>
            {onGoToPortal ? (
              <button
                onClick={onGoToPortal}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>ERP Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                href="/?view=erp"
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>ERP Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ─── Main Navigation Bar with iOS Liquid Sliding Capsule ─── */}
      <nav
        className={`w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200/90 py-2 sm:py-2.5"
            : "bg-white border-b border-slate-200/80 py-2.5 sm:py-3"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* 1. Left: School Brand & Crest */}
          <Link
            href="/"
            onClick={(e) => {
              if (onTabSelect) {
                e.preventDefault();
                onTabSelect("HOME");
              }
            }}
            className="flex items-center gap-3 group shrink-0"
          >
            <img
              src="/logo.png"
              alt="St. GNG School Logo"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div className="flex flex-col justify-center">
              <span className="text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-tight">
                St. G.N.G. School
              </span>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-normal mt-0.5">
                Salarpur, Varanasi • Estd. 2005 (Nursery to 8th)
              </p>
            </div>
          </Link>

          {/* 2. Center: iOS Liquid Sliding Capsule Navigation Island */}
          <div className="hidden lg:flex items-center justify-center flex-1 mx-2 xl:mx-6">
            <div
              ref={navContainerRef}
              className="relative flex items-center p-1 rounded-2xl bg-slate-100/85 backdrop-blur-md border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              {/* 🌊 Pure Transparent Liquid Glass Bubble Capsule */}
              <div
                className="absolute top-1 bottom-1 rounded-xl pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-[transform,width]"
                style={{
                  transform: `translateX(${pillStyle.left}px)`,
                  width: `${pillStyle.width}px`,
                  opacity: pillStyle.opacity,
                  background:
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 246, 255, 0.88) 100%)",
                  boxShadow:
                    "inset 0 1.5px 1px 0 rgba(255, 255, 255, 1), 0 4px 14px -1px rgba(99, 102, 241, 0.16), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.95)",
                }}
              >
                {/* Liquid Glass Top Sheen & Rim Highlight */}
                <div className="absolute inset-x-2 top-0.5 h-[45%] rounded-t-lg bg-gradient-to-b from-white/90 to-transparent pointer-events-none opacity-90" />
              </div>

              {navLinks.map((link, idx) => {
                const active = isLinkActive(link);
                return (
                  <Link
                    key={link.name}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link)}
                    className={`relative z-10 px-2.5 xl:px-3.5 py-1.5 text-xs xl:text-[13px] font-bold rounded-xl transition-colors duration-200 whitespace-nowrap cursor-pointer select-none ${
                      active
                        ? "text-indigo-600 font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 3. Right: Action CTAs (Desktop) */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleEnquiryClick}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Enquiry</span>
            </button>

            <button
              onClick={handleLoginClick}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{mounted && user && activeRole ? "ERP Dashboard" : "Portal Login"}</span>
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            <button
              onClick={handleLoginClick}
              title={mounted && user && activeRole ? "ERP Dashboard" : "Portal Login"}
              className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center cursor-pointer hover:bg-indigo-100 transition-colors"
            >
              <LogIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ─── Mobile Slide-out Drawer ─── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-fade-in shadow-xl">
            <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-slate-100">
              {navLinks.map((link) => {
                const active = isLinkActive(link);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-between whitespace-nowrap cursor-pointer ${
                      active
                        ? "bg-indigo-50 text-indigo-700 font-black"
                        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    <span>{link.name}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </Link>
                );
              })}
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleEnquiryClick();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Apply for Admission 2026-27 (Nursery to 8th)</span>
              </button>

              <button
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleLoginClick(e);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{mounted && user && activeRole ? "Open School ERP Dashboard" : "School ERP & Parent Portal Login"}</span>
              </button>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex flex-col gap-1">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Salarpur, Rasulgarh, Varanasi - 221007</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Helpline: +91 9452824318</span>
              </p>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
