"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  Phone,
  Send,
  Sparkles,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";

interface AdmissionSectionProps {
  onSuccessEnquiry?: (formData: any) => void;
}

export default function AdmissionSection({ onSuccessEnquiry }: AdmissionSectionProps) {
  const [formData, setFormData] = useState({
    parentName: "",
    studentName: "",
    mobile: "",
    targetClass: "Class 1",
    locality: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const classesList = [
    "Nursery / Playgroup",
    "L.K.G.",
    "U.K.G.",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parentName || !formData.studentName || !formData.mobile) {
      alert("Please fill in your name, student's name, and contact mobile number.");
      return;
    }

    setLoading(true);

    // Prepare WhatsApp message payload
    const text = `*New Admission Enquiry — St. GNG School (Session 2026-27)*
• *Parent Name:* ${formData.parentName}
• *Student Name:* ${formData.studentName}
• *Applying For Class:* ${formData.targetClass}
• *Mobile Number:* ${formData.mobile}
• *Address / Locality:* ${formData.locality || "Varanasi"}
• *Message:* ${formData.message || "Interested in taking admission."}`;

    const waUrl = `https://wa.me/919452824318?text=${encodeURIComponent(text)}`;

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      if (onSuccessEnquiry) onSuccessEnquiry(formData);
      // Open WhatsApp in new tab for direct reach
      window.open(waUrl, "_blank");
    }, 600);
  };

  const steps = [
    {
      num: "01",
      title: "Enquiry & Registration",
      desc: "Submit an online enquiry or visit the school office to obtain the admission registration form.",
    },
    {
      num: "02",
      title: "Student Interaction",
      desc: "An informal, friendly interaction with the child and parents to understand learning readiness.",
    },
    {
      num: "03",
      title: "Document Verification",
      desc: "Submit copy of Birth Certificate, Aadhaar cards, previous class marksheet & TC (if applicable).",
    },
    {
      num: "04",
      title: "Admission Confirmation",
      desc: "Deposit the admission & monthly tuition fee at the counter or via UPI to receive the admission number.",
    },
  ];

  return (
    <section id="admissions" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Admissions 2026-2027</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Join St. G.N.G. School (Nursery to Class 8th)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            Simple, transparent, and hassle-free admission procedure for all classes from Nursery to 8th.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Process & Documents */}
          <div className="lg:col-span-6 space-y-8">
            {/* 4 Steps */}
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <span>Admission Procedure</span>
                <span className="text-xs font-bold text-slate-400">4 Easy Steps</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {steps.map((s) => (
                  <div key={s.num} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center">
                        {s.num}
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-900">{s.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Checklist */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Documents Required at the Time of Admission</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Student Birth Certificate</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Student Aadhaar Card Copy</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Father & Mother Aadhaar Copies</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>4 Passport Size Photos of Student</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 sm:col-span-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Previous School Transfer Certificate (TC) & Report Card (For Class 2 onwards)</span>
                </div>
              </div>
            </div>

            {/* Fee Note & RTE Support */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 font-medium flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold">Right to Education (RTE) & Sibling Benefits:</strong>
                <p className="mt-0.5 text-amber-800">
                  Eligible RTE students receive 100% tuition fee waiver as per state government norms.
                  Special fee consideration is also provided for multiple siblings enrolled from the same family.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Online Admission Enquiry Form */}
          <div className="lg:col-span-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl relative">
              <div className="mb-6">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Online Registration Desk
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Admission Enquiry Form</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Fill out this quick form and our school office will contact you immediately.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-black text-emerald-900">Enquiry Submitted Successfully!</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Thank you, <strong>{formData.parentName}</strong>. We have received your admission enquiry for{" "}
                    <strong>{formData.studentName}</strong> ({formData.targetClass}). We have also opened your WhatsApp
                    to connect directly with our admissions desk.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        parentName: "",
                        studentName: "",
                        mobile: "",
                        targetClass: "Class 1",
                        locality: "",
                        message: "",
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Parent Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Parent / Guardian Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    {/* Student Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Student's Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Kumar"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mobile Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        WhatsApp / Mobile No. *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    {/* Class */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Admission Seeking For (KG to 8th) *
                      </label>
                      <select
                        value={formData.targetClass}
                        onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      >
                        {classesList.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Locality / Address */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Residential Area / Village in Varanasi
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Salarpur, Rasulgarh, Shivpur, Varanasi"
                      value={formData.locality}
                      onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  {/* Any Message / Query */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Any Specific Query (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ask any question about syllabus, timings, or previous school transfer..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? "Submitting..." : "Send Admission Enquiry (Connect on WhatsApp)"}</span>
                  </button>
                </form>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Direct Helpline: 9452824318
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Office: 8:00 AM - 1:30 PM
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
