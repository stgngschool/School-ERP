"use client";

import React, { useState } from "react";
import Navbar from "@/components/website/Navbar";
import GallerySection from "@/components/website/GallerySection";
import Footer from "@/components/website/Footer";
import AdmissionModal from "@/components/website/AdmissionModal";
import PageHeader from "@/components/website/PageHeader";
import { Camera } from "lucide-react";

export default function GalleryPage() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar onOpenEnquiryModal={() => setEnquiryModalOpen(true)} />

      <main className="flex-1">
        <PageHeader
          breadcrumb="Gallery & Videos"
          badge="Campus Glimpses & YouTube Media"
          title="Photo Gallery & Official YouTube Videos"
          description="Vibrant photographic moments and authentic student performance videos from our official YouTube channel @stgngschool."
          badgeIcon={<Camera className="w-3.5 h-3.5 text-purple-600" />}
        />

        {/* Unified Gallery & Video Hub */}
        <GallerySection />
      </main>

      <Footer />

      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
