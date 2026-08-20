"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  Phone,
  Send,
  Sparkles,
  Clock,
  Printer,
  Search,
  User,
  Users,
  MapPin,
  Bus,
  ShieldCheck,
  FileText,
  AlertCircle,
  Calendar,
  Check,
  ChevronRight,
  ArrowLeft,
  X,
  Building2,
  Copy,
} from "lucide-react";

interface AdmissionSectionProps {
  onSuccessEnquiry?: (formData: any) => void;
}

export default function AdmissionSection({ onSuccessEnquiry }: AdmissionSectionProps) {
  const [activeTab, setActiveTab] = useState<"APPLY" | "TRACK" | "ENQUIRY">("APPLY");
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);

  // --- Comprehensive Admission Form State ---
  const [formData, setFormData] = useState({
    // Student Info
    studentName: "",
    classApplied: "Class 1",
    gender: "MALE",
    dob: "",
    aadhaar: "",
    category: "GENERAL",
    religion: "Hindu",
    motherTongue: "Hindi",
    nationality: "Indian",
    bloodGroup: "",
    photoUrl: "",

    // Parents Info
    fatherName: "",
    fatherMobile: "",
    fatherOccupation: "",
    fatherAadhaar: "",
    motherName: "",
    motherMobile: "",
    motherOccupation: "",
    motherAadhaar: "",
    parentEmail: "",
    address: "",
    emergencyName: "",
    emergencyPhone: "",
    familyIncome: "",

    // Previous School & Transport
    prevSchoolName: "",
    prevClassPassed: "",
    tcNumber: "",
    transportRequired: false,
    busStop: "",
    isRte: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    applicationNo: string;
    application: any;
  } | null>(null);
  const [formError, setFormError] = useState("");
  const [copiedAppNo, setCopiedAppNo] = useState(false);

  // --- Track Application State ---
  const [trackAppNo, setTrackAppNo] = useState("");
  const [trackMobile, setTrackMobile] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedApp, setTrackedApp] = useState<any | null>(null);
  const [trackError, setTrackError] = useState("");

  // --- Quick Enquiry State ---
  const [enquiryData, setEnquiryData] = useState({
    parentName: "",
    studentName: "",
    mobile: "",
    targetClass: "Class 1",
    locality: "",
    message: "",
  });
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);

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

  // Validate step before proceeding
  const handleNextStep = () => {
    setFormError("");
    if (formStep === 1) {
      if (!formData.studentName.trim()) {
        setFormError("Please enter the student's full name.");
        return;
      }
      if (!formData.classApplied) {
        setFormError("Please select the class applied for.");
        return;
      }
    } else if (formStep === 2) {
      if (!formData.fatherName.trim()) {
        setFormError("Father's Name is required.");
        return;
      }
      if (!formData.fatherMobile.trim() || formData.fatherMobile.trim().length < 10) {
        setFormError("Please enter a valid 10-digit primary mobile number.");
        return;
      }
      if (!formData.address.trim()) {
        setFormError("Full residential address is required.");
        return;
      }
    }
    setFormStep((prev) => (prev < 4 ? ((prev + 1) as any) : prev));
  };

  // Submit full admission application
  const handleFullAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissionResult({
          applicationNo: data.applicationNo,
          application: data.application,
        });
      } else {
        setFormError(data.error || "Failed to submit admission application. Please try again.");
      }
    } catch (err: any) {
      setFormError(err.message || "Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // Status tracker
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError("");
    setTrackedApp(null);
    if (!trackAppNo.trim() || !trackMobile.trim()) {
      setTrackError("Please provide both Application Number and Mobile Number.");
      return;
    }

    setTrackingLoading(true);
    try {
      const res = await fetch(
        `/api/admissions?applicationNo=${encodeURIComponent(trackAppNo.trim())}&mobile=${encodeURIComponent(
          trackMobile.trim()
        )}`
      );
      const data = await res.json();
      if (res.ok && data.success && data.application) {
        setTrackedApp(data.application);
      } else {
        setTrackError(data.error || "No application record found with these credentials.");
      }
    } catch (err: any) {
      setTrackError("Unable to track application. Please check your internet connection.");
    } finally {
      setTrackingLoading(false);
    }
  };

  // Quick Enquiry Submit (WhatsApp)
  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryData.parentName || !enquiryData.studentName || !enquiryData.mobile) {
      alert("Please fill in your name, student's name, and contact mobile number.");
      return;
    }

    const text = `*New Admission Enquiry — St. GNG School (Session 2026-27)*
• *Parent Name:* ${enquiryData.parentName}
• *Student Name:* ${enquiryData.studentName}
• *Applying For Class:* ${enquiryData.targetClass}
• *Mobile Number:* ${enquiryData.mobile}
• *Address / Locality:* ${enquiryData.locality || "Varanasi"}
• *Message:* ${enquiryData.message || "Interested in taking admission."}`;

    const waUrl = `https://wa.me/919452824318?text=${encodeURIComponent(text)}`;
    setEnquirySubmitted(true);
    if (onSuccessEnquiry) onSuccessEnquiry(enquiryData);
    window.open(waUrl, "_blank");
  };

  const steps = [
    {
      num: "01",
      title: "Online Application Form",
      desc: "Fill in the complete student and parent details directly through this portal.",
    },
    {
      num: "02",
      title: "ERP Review & Verification",
      desc: "Our principal and admissions team review and verify eligibility on the school ERP.",
    },
    {
      num: "03",
      title: "Approval & Enrolment",
      desc: "On approval, student is automatically registered with Admission No. & Roll No.",
    },
    {
      num: "04",
      title: "Welcome to St. GNG School",
      desc: "Collect ID Card, syllabus booklet, and access the student & parent digital portal.",
    },
  ];

  return (
    <section id="admissions" className="py-16 bg-slate-50 border-b border-slate-200/80 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Session 2026-2027</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            School Admission & Registration Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            Apply online for Classes Nursery to 8th. Direct integration with school ERP for instant verification and enrollment.
          </p>
        </div>

        {/* Navigation Tabs Pill Bar */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-200/80 backdrop-blur-sm border border-slate-300/80 shadow-inner max-w-full overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab("APPLY");
                setSubmissionResult(null);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === "APPLY"
                  ? "bg-white text-indigo-700 shadow-md scale-100"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Online Admission Form</span>
            </button>

            <button
              onClick={() => setActiveTab("TRACK")}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === "TRACK"
                  ? "bg-white text-indigo-700 shadow-md scale-100"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Application Status</span>
            </button>

            <button
              onClick={() => setActiveTab("ENQUIRY")}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === "ENQUIRY"
                  ? "bg-white text-indigo-700 shadow-md scale-100"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Quick WhatsApp Query</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: FULL ONLINE ADMISSION FORM ─── */}
        {activeTab === "APPLY" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Guidelines & Documents Checklist */}
            <div className="lg:col-span-4 space-y-6">
              {/* 4 Step Process */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center justify-between">
                  <span>How Admission Works</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    Direct ERP Flow
                  </span>
                </h3>
                <div className="space-y-3">
                  {steps.map((s) => (
                    <div key={s.num} className="flex gap-3 items-start">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {s.num}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Required */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Documents for Verification</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Birth Certificate copy</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Student Aadhaar Card copy</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Father & Mother Aadhaar copies</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>4 Passport size photographs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Previous class TC & marksheet (Class 2 onwards)</span>
                  </li>
                </ul>
              </div>

              {/* RTE Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 font-medium flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold">Right to Education (RTE):</strong>
                  <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                    100% tuition waiver for eligible RTE applicants. Check the RTE checkbox in the form below.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Multi-Step Interactive Form */}
            <div className="lg:col-span-8">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl relative">
                {/* When Form is successfully submitted */}
                {submissionResult ? (
                  <div className="text-center py-6 space-y-5 animate-scale-in">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>

                    <div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                        Application Successfully Submitted
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                        Welcome to St. G.N.G. School Admissions!
                      </h3>
                      <p className="text-xs text-slate-600 font-medium max-w-md mx-auto mt-1">
                        Your admission form has been registered in the school ERP database. Please save your Application Number for tracking.
                      </p>
                    </div>

                    {/* Application Slip Badge */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                        <span className="text-xs font-extrabold text-slate-500">Application Number:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {submissionResult.applicationNo}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(submissionResult.applicationNo);
                              setCopiedAppNo(true);
                              setTimeout(() => setCopiedAppNo(false), 2000);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title="Copy Application Number"
                          >
                            {copiedAppNo ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px]">Student Name:</span>
                          <strong className="text-slate-800">{formData.studentName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px]">Class Applied:</span>
                          <strong className="text-slate-800">{formData.classApplied}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px]">Father&apos;s Name:</span>
                          <strong className="text-slate-800">{formData.fatherName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px]">Mobile:</span>
                          <strong className="text-slate-800">{formData.fatherMobile}</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Status:</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black uppercase text-[10px]">
                          Pending ERP Verification
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => window.print()}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Application Slip</span>
                      </button>

                      <button
                        onClick={() => {
                          setTrackAppNo(submissionResult.applicationNo);
                          setTrackMobile(formData.fatherMobile);
                          setActiveTab("TRACK");
                        }}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Search className="w-4 h-4" />
                        <span>Track Application Live</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFullAdmissionSubmit} className="space-y-6">
                    {/* Step Indicator */}
                    <div className="border-b border-slate-100 pb-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                          Step {formStep} of 4:{" "}
                          <span className="text-indigo-600">
                            {formStep === 1
                              ? "Student Personal Details"
                              : formStep === 2
                              ? "Parents & Contact Details"
                              : formStep === 3
                              ? "Academic History & Transport"
                              : "Review & Final Submission"}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-slate-400">{formStep * 25}% Completed</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${formStep * 25}%` }}
                        />
                      </div>
                    </div>

                    {formError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-shake">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* ──── STEP 1: STUDENT DETAILS ──── */}
                    {formStep === 1 && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Student Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Aarav Sharma"
                              value={formData.studentName}
                              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Class Applying For *
                            </label>
                            <select
                              value={formData.classApplied}
                              onChange={(e) => setFormData({ ...formData, classApplied: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                            >
                              {classesList.map((cls) => (
                                <option key={cls} value={cls}>
                                  {cls}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Gender *
                            </label>
                            <select
                              value={formData.gender}
                              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                            >
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Date of Birth (DOB)
                            </label>
                            <input
                              type="date"
                              value={formData.dob}
                              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Category
                            </label>
                            <select
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                            >
                              <option value="GENERAL">General</option>
                              <option value="OBC">OBC</option>
                              <option value="SC">SC</option>
                              <option value="ST">ST</option>
                              <option value="EWS">EWS</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Student Aadhaar Number
                            </label>
                            <input
                              type="text"
                              maxLength={12}
                              placeholder="12-digit Aadhaar"
                              value={formData.aadhaar}
                              onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Religion
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Hindu, Muslim, Sikh"
                              value={formData.religion}
                              onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Blood Group (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. B+, O+, A+"
                              value={formData.bloodGroup}
                              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ──── STEP 2: PARENTS & GUARDIAN DETAILS ──── */}
                    {formStep === 2 && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Father Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Father&apos;s Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Rajesh Sharma"
                              value={formData.fatherName}
                              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Primary Mobile / WhatsApp *
                            </label>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              placeholder="10-digit Mobile"
                              value={formData.fatherMobile}
                              onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Father&apos;s Occupation
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Business, Govt Service"
                              value={formData.fatherOccupation}
                              onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Mother Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Mother&apos;s Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Sunita Sharma"
                              value={formData.motherName}
                              onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Mother&apos;s Mobile
                            </label>
                            <input
                              type="tel"
                              maxLength={10}
                              placeholder="Secondary Mobile"
                              value={formData.motherMobile}
                              onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Parent Email (Optional)
                            </label>
                            <input
                              type="email"
                              placeholder="e.g. parent@gmail.com"
                              value={formData.parentEmail}
                              onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Address */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Permanent Residential Address (Varanasi) *
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder="e.g. H.No 45, Salarpur, Rasulgarh, Near Shiv Mandir, Varanasi - 221003"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                          />
                        </div>

                        {/* Emergency Contact & Family Income */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Emergency Contact Person & Phone
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Uncle: 9876543210"
                              value={formData.emergencyPhone}
                              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Annual Family Income (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. ₹ 2,50,000 / year"
                              value={formData.familyIncome}
                              onChange={(e) => setFormData({ ...formData, familyIncome: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ──── STEP 3: PREVIOUS ACADEMICS & TRANSPORT ──── */}
                    {formStep === 3 && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Previous School Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Previous School Attended (if any)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Sunbeam / Little Flower"
                              value={formData.prevSchoolName}
                              onChange={(e) => setFormData({ ...formData, prevSchoolName: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Previous Class Passed
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. UKG / Class 1"
                              value={formData.prevClassPassed}
                              onChange={(e) => setFormData({ ...formData, prevClassPassed: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Transfer Certificate (TC) No.
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. TC-2026/89"
                              value={formData.tcNumber}
                              onChange={(e) => setFormData({ ...formData, tcNumber: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Transport Option */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.transportRequired}
                              onChange={(e) => setFormData({ ...formData, transportRequired: e.target.checked })}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-800">
                              School Bus / Transport Required?
                            </span>
                          </label>

                          {formData.transportRequired && (
                            <div className="pt-2">
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Preferred Bus Stop / Pickup Location
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Salarpur Chauraha, Rasulgarh, Ring Road"
                                value={formData.busStop}
                                onChange={(e) => setFormData({ ...formData, busStop: e.target.value })}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* RTE Checkbox */}
                        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isRte}
                              onChange={(e) => setFormData({ ...formData, isRte: e.target.checked })}
                              className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                            />
                            <span className="text-xs font-black text-amber-900">
                              Applying under Right to Education (RTE) Scheme?
                            </span>
                          </label>
                          <p className="text-[11px] text-amber-700 font-medium pl-6">
                            Check this if applying under the 25% reserved quota for economically weaker sections.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ──── STEP 4: REVIEW & CONFIRM ──── */}
                    {formStep === 4 && (
                      <div className="space-y-4 animate-fade-in text-xs">
                        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
                          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-indigo-950 font-black">Please review your information carefully</strong>
                            <p className="text-[11px] text-indigo-700 mt-0.5">
                              Once submitted, this application will be sent directly to the St. GNG School admissions desk on the ERP system for review.
                            </p>
                          </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Student Name:</span>
                              <span className="font-extrabold text-slate-900">{formData.studentName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Class:</span>
                              <span className="font-extrabold text-indigo-700">{formData.classApplied}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Gender:</span>
                              <span className="font-extrabold text-slate-900">{formData.gender}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">DOB:</span>
                              <span className="font-extrabold text-slate-900">{formData.dob || "Not provided"}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Father&apos;s Name:</span>
                              <span className="font-extrabold text-slate-900">{formData.fatherName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Primary Mobile:</span>
                              <span className="font-extrabold text-slate-900">{formData.fatherMobile}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Mother&apos;s Name:</span>
                              <span className="font-extrabold text-slate-900">{formData.motherName || "—"}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200">
                            <span className="text-[10px] text-slate-400 font-bold block">Address:</span>
                            <span className="font-medium text-slate-800 leading-snug">{formData.address}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Transport Mode:</span>
                              <span className="font-bold text-slate-800">
                                {formData.transportRequired ? `School Bus (${formData.busStop || "Requested"})` : "Self / Private"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">RTE Scheme:</span>
                              <span className="font-bold text-slate-800">{formData.isRte ? "Yes (RTE Applicant)" : "Standard"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step Navigation Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      {formStep > 1 ? (
                        <button
                          type="button"
                          onClick={() => setFormStep((prev) => ((prev - 1) as any))}
                          className="px-4 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Previous Step</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {formStep < 4 ? (
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <span>Continue to Step {formStep + 1}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{submitting ? "Submitting Application..." : "Submit Admission Application"}</span>
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: TRACK APPLICATION LIVE ─── */}
        {activeTab === "TRACK" && (
          <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider">
                Application Tracker Desk
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Check Admission Application Status
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Enter your Application Reference Number (e.g. ADM-2026-0001) and registered mobile number.
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Application Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ADM-2026-0001"
                    value={trackAppNo}
                    onChange={(e) => setTrackAppNo(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 tracking-wider focus:bg-white focus:border-indigo-600 uppercase focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Registered Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={trackMobile}
                    onChange={(e) => setTrackMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {trackError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={trackingLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{trackingLoading ? "Searching ERP Database..." : "Track Status Now"}</span>
              </button>
            </form>

            {/* Track Result Card */}
            {trackedApp && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-scale-in">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Application Number</span>
                    <strong className="text-sm font-black text-indigo-700">{trackedApp.applicationNo}</strong>
                  </div>
                  <div>
                    {trackedApp.status === "APPROVED" ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Admitted & Enrolled
                      </span>
                    ) : trackedApp.status === "UNDER_REVIEW" ? (
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black uppercase">
                        Under Verification
                      </span>
                    ) : trackedApp.status === "REJECTED" ? (
                      <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase">
                        Action Required / Rejected
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase">
                        Submitted • Pending Review
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Applicant Name:</span>
                    <strong className="text-slate-800">{trackedApp.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Class Applied:</span>
                    <strong className="text-slate-800">{trackedApp.classApplied}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Father&apos;s Name:</span>
                    <strong className="text-slate-800">{trackedApp.fatherName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Submitted Date:</span>
                    <strong className="text-slate-800">{new Date(trackedApp.createdAt).toLocaleDateString()}</strong>
                  </div>
                </div>

                {/* Enrolled Details if Approved */}
                {trackedApp.status === "APPROVED" && trackedApp.enrolledStudent && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                    <div className="font-black text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Official Enrolment Details:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-emerald-800 font-semibold">
                      <div>
                        <span className="text-[10px] text-emerald-600 block">Admission Number:</span>
                        <strong className="text-xs text-emerald-950 font-black">{trackedApp.enrolledStudent.admissionNumber}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block">Assigned Section:</span>
                        <strong className="text-xs text-emerald-950 font-black">
                          {trackedApp.enrolledStudent.class?.name} - {trackedApp.enrolledStudent.class?.section}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block">Roll Number:</span>
                        <strong className="text-xs text-emerald-950 font-black">
                          {trackedApp.enrolledStudent.rollNumber || "Assigned in Class"}
                        </strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-2">
                      Please visit the school fee desk to collect the student ID card, academic calendar, and uniform kit.
                    </p>
                  </div>
                )}

                {trackedApp.status === "REJECTED" && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                    <strong>School Remarks:</strong>
                    <p>{trackedApp.rejectionReason || "Please contact the school office regarding missing documents or age criteria."}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: QUICK WHATSAPP QUERY ─── */}
        {activeTab === "ENQUIRY" && (
          <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                Direct WhatsApp Helpline
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">Quick Admission Enquiry</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Have a quick question about fee structure or documents? Send a direct message to our admissions desk.
              </p>
            </div>

            {enquirySubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-black text-emerald-900">Connected to WhatsApp!</h4>
                <p className="text-xs text-emerald-700 font-medium">
                  We have opened your WhatsApp chat with our admission officer. You can also call us directly at <strong>9452824318</strong>.
                </p>
                <button
                  onClick={() => setEnquirySubmitted(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Send Another Query
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Parent Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={enquiryData.parentName}
                      onChange={(e) => setEnquiryData({ ...enquiryData, parentName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Student Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Kumar"
                      value={enquiryData.studentName}
                      onChange={(e) => setEnquiryData({ ...enquiryData, studentName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp Mobile *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={enquiryData.mobile}
                      onChange={(e) => setEnquiryData({ ...enquiryData, mobile: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Class *</label>
                    <select
                      value={enquiryData.targetClass}
                      onChange={(e) => setEnquiryData({ ...enquiryData, targetClass: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                    >
                      {classesList.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Area / Locality in Varanasi</label>
                  <input
                    type="text"
                    placeholder="e.g. Salarpur, Rasulgarh, Shivpur"
                    value={enquiryData.locality}
                    onChange={(e) => setEnquiryData({ ...enquiryData, locality: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Question / Message</label>
                  <textarea
                    rows={2}
                    placeholder="Ask any question about syllabus, fee, or bus route..."
                    value={enquiryData.message}
                    onChange={(e) => setEnquiryData({ ...enquiryData, message: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Send WhatsApp Message</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
