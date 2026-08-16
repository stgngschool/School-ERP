"use client";

import React, { useState } from "react";
import Navbar from "@/components/website/Navbar";
import AboutSection from "@/components/website/AboutSection";
import PrincipalMessage from "@/components/website/PrincipalMessage";
import FacilitiesSection from "@/components/website/FacilitiesSection";
import Footer from "@/components/website/Footer";
import AdmissionModal from "@/components/website/AdmissionModal";
import PageHeader from "@/components/website/PageHeader";
import { Sparkles } from "lucide-react";

export default function AboutPage() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar onOpenEnquiryModal={() => setEnquiryModalOpen(true)} />

      <main className="flex-1">
        <PageHeader
          breadcrumb="About Us"
          badge="Recognized Since 2005 (21+ Years)"
          title="About St. G.N.G. School"
          description="A 21-year legacy of government-recognized foundational schooling in Salarpur, Rasulgarh, Varanasi dedicated to discipline, moral values, and academic excellence."
          badgeIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
        />

        {/* Core About */}
        <AboutSection />

        {/* Message from Principal */}
        <PrincipalMessage />

        {/* Campus Facilities */}
        <FacilitiesSection />
      </main>

      <Footer />

      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
