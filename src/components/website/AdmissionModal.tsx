"use client";

import React, { useState } from "react";
import { X, GraduationCap, CheckCircle2, Send, Phone, Clock } from "lucide-react";

interface AdmissionModalProps {
  onClose: () => void;
}

export default function AdmissionModal({ onClose }: AdmissionModalProps) {
  const [modalForm, setModalForm] = useState({
    parentName: "",
    studentName: "",
    mobile: "",
    targetClass: "Class 1",
    message: "",
  });
  const [submittedModal, setSubmittedModal] = useState(false);

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

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.parentName || !modalForm.studentName || !modalForm.mobile) {
      alert("Please fill in parent name, student name, and mobile number.");
      return;
    }

    try {
      // Save lead directly to ERP database
      await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName: modalForm.parentName,
          studentName: modalForm.studentName,
          mobile: modalForm.mobile,
          targetClass: modalForm.targetClass,
          message: modalForm.message,
        }),
      });
    } catch (err) {
      console.warn("Could not record lead into database offline");
    }

    const text = `*New Admission Enquiry — St. GNG School (Session 2026-27)*
• *Parent Name:* ${modalForm.parentName}
• *Student Name:* ${modalForm.studentName}
• *Class Applying For:* ${modalForm.targetClass}
• *Mobile Number:* ${modalForm.mobile}
• *Note:* ${modalForm.message || "Interested in school admission."}`;

    const waUrl = `https://wa.me/919452824318?text=${encodeURIComponent(text)}`;

    setSubmittedModal(true);
    setTimeout(() => {
      window.open(waUrl, "_blank");
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </span>
          <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">
            Session 2026-27
          </span>
        </div>

        <h3 className="text-xl font-black text-slate-900 leading-snug">
          Admission Enquiry Desk
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5 mb-6">
          St. G.N.G. School, Salarpur, Varanasi • Classes Nursery to 8th
        </p>

        {submittedModal ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="text-base font-black text-emerald-900">Enquiry Submitted!</h4>
            <p className="text-xs text-emerald-700 font-medium">
              We have received your enquiry and initiated direct WhatsApp contact with our school desk.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleModalSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Parent / Guardian Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={modalForm.parentName}
                onChange={(e) => setModalForm({ ...modalForm, parentName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Kumar"
                  value={modalForm.studentName}
                  onChange={(e) => setModalForm({ ...modalForm, studentName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Class (KG to 8th) *
                </label>
                <select
                  value={modalForm.targetClass}
                  onChange={(e) => setModalForm({ ...modalForm, targetClass: e.target.value })}
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

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                WhatsApp / Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={modalForm.mobile}
                onChange={(e) => setModalForm({ ...modalForm, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Query / Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Previous school transfer, fee details, bus timing"
                value={modalForm.message}
                onChange={(e) => setModalForm({ ...modalForm, message: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <Send className="w-4 h-4" />
              <span>Connect on WhatsApp</span>
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            9452824318
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Office: 8:00 AM - 1:30 PM
          </span>
        </div>
      </div>
    </div>
  );
}
