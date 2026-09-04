"use client";

import React from "react";
import Navbar from "@/components/website/Navbar";
import PageHeader from "@/components/website/PageHeader";
import Footer from "@/components/website/Footer";
import PublicResultSection from "@/components/website/PublicResultSection";
import { FileSpreadsheet } from "lucide-react";

export default function Unit1ResultPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between">
      <div>
        <Navbar activeTabKey="RESULTS" />
        <PageHeader
          breadcrumb="Examination Results"
          badge="Academic Session 2026-2027"
          title="Student Examination Results Portal"
          description="Official institutional portal for parents to securely verify academic performance, unit evaluation marks, and printable progress cards."
          badgeIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />}
        />
        <PublicResultSection />
      </div>
      <Footer />
    </div>
  );
}
