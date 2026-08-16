"use client";

import React, { useState } from "react";
import Navbar from "@/components/website/Navbar";
import ContactSection from "@/components/website/ContactSection";
import Footer from "@/components/website/Footer";
import AdmissionModal from "@/components/website/AdmissionModal";
import PageHeader from "@/components/website/PageHeader";
import { MapPin } from "lucide-react";

export default function ContactPage() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar onOpenEnquiryModal={() => setEnquiryModalOpen(true)} />

      <main className="flex-1">
        <PageHeader
          breadcrumb="Contact Us"
          badge="Salarpur, Varanasi Campus"
          title="Contact & Location Helpdesk"
          description="Visit our campus in Salarpur, Rasulgarh, Varanasi or contact our administration directly via phone, email, or WhatsApp."
          badgeIcon={<MapPin className="w-3.5 h-3.5 text-emerald-600" />}
        />

        {/* Contact Section */}
        <ContactSection />
      </main>

      <Footer />

      {enquiryModalOpen && (
        <AdmissionModal onClose={() => setEnquiryModalOpen(false)} />
      )}
    </div>
  );
}
