"use client";

import React, { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Navigation,
} from "lucide-react";

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `*Website Contact Inquiry — St. GNG School*
• *Name:* ${formData.name}
• *Phone:* ${formData.phone}
• *Subject:* ${formData.subject || "General Query"}
• *Message:* ${formData.message}`;

    const waUrl = `https://wa.me/919452824318?text=${encodeURIComponent(text)}`;
    setSent(true);
    window.open(waUrl, "_blank");
  };

  return (
    <section id="contact" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>Campus Location & Contact</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Get in Touch with St. G.N.G. School
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
            We are always here to assist you with admissions, syllabus, fee schedules, or visiting the school campus.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Official Contact Details Cards */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Address Card */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    School Campus Address
                  </h3>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    St. G.N.G. School
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Salarpur, Rasulgarh, Varanasi - 221007, Uttar Pradesh, India
                  </p>
                  <a
                    href="https://maps.google.com/?q=St+GNG+School+Salarpur+Rasulgarh+Varanasi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline mt-2"
                  >
                    <span>Open in Google Maps</span>
                    <Navigation className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Phone Card */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Official Helplines
                  </h3>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    <a href="tel:9452824318" className="hover:text-emerald-600 transition-colors">
                      +91 9452824318
                    </a>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Available for admission queries & parent guidance
                  </p>
                </div>
              </div>

              {/* Email Card */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Official Email
                  </h3>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    <a href="mailto:stgng2005@gmail.com" className="hover:text-amber-600 transition-colors">
                      stgng2005@gmail.com
                    </a>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official communications & certificate inquiries
                  </p>
                </div>
              </div>

              {/* Timings Card */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    School & Office Hours
                  </h3>
                  <p className="text-xs font-black text-slate-900 mt-1">
                    School Hours: 07:30 AM – 02:00 PM (Mon to Sat)
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Office & Fee Counter: 08:00 AM – 01:30 PM
                  </p>
                  <p className="text-[11px] text-rose-600 font-bold mt-1">
                    Sundays & Gazetted Holidays Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Message Form (Clean Light Theme) */}
          <div className="lg:col-span-7">
            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                      Send a Message
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-1">Direct Helpdesk Inquiry</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  Have a question or feedback? Write to us and our administration team will get back to you promptly.
                </p>

                {sent ? (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="text-sm font-black text-emerald-900">Message Dispatched!</h4>
                    <p className="text-xs text-emerald-700">
                      Your inquiry has been opened on WhatsApp to connect directly with the office desk.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Anand Singh"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Phone / WhatsApp No. *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9876543210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Subject / Query Type
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Admission Inquiry, Fee Structure, Transfer Certificate"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Message Details *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Type your message or query here..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Message (WhatsApp Office Desk)</span>
                    </button>
                  </form>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>UDISE: 09670707502</span>
                <span>St. GNG School • Salarpur, Varanasi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
