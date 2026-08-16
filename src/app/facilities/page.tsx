"use client";

import React, { useState } from "react";
import Navbar from "@/components/website/Navbar";
import FacilitiesSection from "@/components/website/FacilitiesSection";
import Footer from "@/components/website/Footer";
import AdmissionModal from "@/components/website/AdmissionModal";
import PageHeader from "@/components/website/PageHeader";
import { Building2 } from "lucide-react";

export default function FacilitiesPage() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar onOpenEnquiryModal={() => setEnquiryModalOpen(true)} />

      <main className="flex-1">
        <PageHeader
          breadcrumb="Facilities"
          badge="Campus Amenities & Infrastructure"
          title="School Campus Facilities"
          description="Explore our Computer Lab, Science Demonstration Corner, CCTV Security, RO Drinking Water, Sports Ground, and Activity Rooms."
          badgeIcon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
        />

        {/* Facilities Section */}
        <FacilitiesSection />
      </main>

      <Footer />

      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
