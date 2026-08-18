"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Clock,
  LogIn,
  ShieldCheck,
  Award,
  ChevronRight,
  ArrowUp,
} from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-slate-100 text-slate-800 pt-14 pb-10 border-t border-slate-200 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-slate-200">
          {/* Column 1: School Brand & Identity (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="St. GNG School Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">St. G.N.G. School</h3>
                <p className="text-[11px] font-bold text-indigo-700">Govt. Recognized • Salarpur, Varanasi</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-normal leading-relaxed">
              Recognized by the Uttar Pradesh State Government in 2005 (21+ Years of Service).
              Providing disciplined, value-oriented education from Pre-Primary (Nursery, KG) to Class 8th.
            </p>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Affiliation:</span>
                <strong className="text-emerald-700 font-bold">U.P. Govt. Recognized</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">UDISE Code:</span>
                <strong className="text-indigo-700 font-mono font-bold">09670707502</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Classes:</span>
                <span className="text-slate-900 font-bold">Nursery to Class 8th</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Medium:</span>
                <span className="text-slate-900 font-bold">English & Hindi</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-indigo-800 tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-xs font-bold text-slate-600">
              <li>
                <Link href="/" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>About School</span>
                </Link>
              </li>
              <li>
                <Link href="/academics" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Academic Wings</span>
                </Link>
              </li>
              <li>
                <Link href="/notices" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notice Board</span>
                </Link>
              </li>
              <li>
                <Link href="/facilities" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Facilities</span>
                </Link>
              </li>
              <li>
                <Link href="/admissions" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Admissions 2026-27</span>
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Gallery & Videos</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contact Us</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Parent Desk (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase text-indigo-800 tracking-wider">
              School Portal & ERP
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Direct online portal for parents, teachers, and staff to check student records, marks, and attendance.
            </p>

            <div className="space-y-2 pt-1">
              <Link
                href="/login"
                className="w-full py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-between shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Parent Portal Sign In</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/login"
                className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold transition-all flex items-center justify-between shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Staff & Teacher Login</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-[11px] text-slate-500 font-medium pt-1">
              Need help with login? Contact the school office helpline.
            </p>
          </div>

          {/* Column 4: Contact & Office (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase text-indigo-800 tracking-wider">
              School Campus Office
            </h4>

            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>Salarpur, Rasulgarh, Varanasi - 221007, Uttar Pradesh</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href="tel:9452824318" className="hover:text-indigo-600 font-bold text-slate-900">
                  +91 9452824318
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <a href="mailto:stgng2005@gmail.com" className="hover:text-indigo-600 font-bold text-slate-900">
                  stgng2005@gmail.com
                </a>
              </div>

              <div className="flex items-start gap-2 text-slate-600 pt-1">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p><strong>School:</strong> 07:30 AM – 02:00 PM</p>
                  <p><strong>Office Counter:</strong> 08:00 AM – 01:30 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Back to Top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-semibold">
          <div>
            © {new Date().getFullYear()} St. G.N.G. School, Varanasi • All Rights Reserved
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
