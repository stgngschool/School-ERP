"use client";

import React, { useState } from "react";
import Navbar from "@/components/website/Navbar";
import AcademicsSection from "@/components/website/AcademicsSection";
import FacilitiesSection from "@/components/website/FacilitiesSection";
import Footer from "@/components/website/Footer";
import AdmissionModal from "@/components/website/AdmissionModal";
import PageHeader from "@/components/website/PageHeader";
import { BookOpen } from "lucide-react";

export default function AcademicsPage() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar onOpenEnquiryModal={() => setEnquiryModalOpen(true)} />

      <main className="flex-1">
        <PageHeader
          breadcrumb="Academics"
          badge="Curriculum & Wings (Nursery to 8th)"
          title="Academic Wings & Examination"
          description="Age-appropriate, value-centered schooling divided into Foundational Pre-Primary, Core Primary, and Upper Primary Middle wings with continuous CCE assessment."
          badgeIcon={<BookOpen className="w-3.5 h-3.5 text-emerald-600" />}
        />

        {/* Academics Wings */}
        <AcademicsSection />

        {/* Facilities & Computer Lab */}
        <FacilitiesSection />
      </main>

      <Footer />

      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
