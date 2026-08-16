"use client";

import React, { useState } from "react";
import Navbar from "@/components/website/Navbar";
import NoticeBoardSection from "@/components/website/NoticeBoardSection";
import Footer from "@/components/website/Footer";
import AdmissionModal from "@/components/website/AdmissionModal";
import PageHeader from "@/components/website/PageHeader";
import { Bell } from "lucide-react";

export default function NoticesPage() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar onOpenEnquiryModal={() => setEnquiryModalOpen(true)} />

      <main className="flex-1">
        <PageHeader
          breadcrumb="Notice Board"
          badge="Official Circulars & Desk"
          title="Digital Notice Board"
          description="Read official administrative circulars, examination date sheets, holiday announcements, and parent-teacher meeting notices."
          badgeIcon={<Bell className="w-3.5 h-3.5 text-indigo-600" />}
        />

        {/* Full Notice Board */}
        <NoticeBoardSection />
      </main>

      <Footer />

      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
