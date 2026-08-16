"use client";

import React, { useState } from "react";
import Navbar from "@/components/website/Navbar";
import AdmissionSection from "@/components/website/AdmissionSection";
import ParentQuickDesk from "@/components/website/ParentQuickDesk";
import Footer from "@/components/website/Footer";
import AdmissionModal from "@/components/website/AdmissionModal";
import PageHeader from "@/components/website/PageHeader";
import { GraduationCap } from "lucide-react";

export default function AdmissionsPage() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar onOpenEnquiryModal={() => setEnquiryModalOpen(true)} />

      <main className="flex-1">
        <PageHeader
          breadcrumb="Admissions"
          badge="Admissions Open 2026-2027"
          title="School Admissions (KG to 8th)"
          description="Straightforward, transparent admission process with minimal documentation. Apply online via WhatsApp or visit our school counter."
          badgeIcon={<GraduationCap className="w-3.5 h-3.5 text-indigo-600" />}
        />

        {/* Admission Form & Steps */}
        <AdmissionSection />

        {/* Parent Helpdesk */}
        <ParentQuickDesk />
      </main>

      <Footer />

      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
