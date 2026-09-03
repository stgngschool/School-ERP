"use client";

import React, { useState } from "react";
import { Star, Quote, CheckCircle2, MapPin, Heart, Users, Sparkles } from "lucide-react";

interface Testimonial {
  name: string;
  relation: string;
  studentInfo: string;
  locality: string;
  areaKey: "SALARPUR" | "RASULGARH" | "DINAPUR" | "RAGHUNATHPUR" | "KHALISPUR";
  rating: number;
  review: string;
  initials: string;
}

const parentReviews: Testimonial[] = [
  {
    name: "मनोज कुमार चौरसिया",
    relation: "पिता",
    studentInfo: "आयुष चौरसिया (कक्षा 5)",
    locality: "सलारपुर",
    areaKey: "SALARPUR",
    rating: 5,
    initials: "MC",
    review:
      "स्कूल में टीचर्स हर बच्चे पर व्यक्तिगत ध्यान देते हैं। जब से आयुष यहाँ पढ़ रहा है, उसकी गणित और अंग्रेज़ी में बहुत अच्छा सुधार हुआ है। यहाँ की सबसे बड़ी विशेषता अनुशासन और भारतीय संस्कार हैं।",
  },
  {
    name: "श्रीमती सीमा पटेल",
    relation: "माता",
    studentInfo: "रिया पटेल (कक्षा 3)",
    locality: "रसूलगढ़",
    areaKey: "RASULGARH",
    rating: 5,
    initials: "SP",
    review:
      "रसूलगढ़ के लिए वैन सुविधा बहुत सुरक्षित और हमेशा समय पर रहती है, जिससे हमें बच्चों की कभी चिंता नहीं होती। पढ़ाई का माहौल बहुत अच्छा है और टीचर्स बच्चों को रटाने के बजाय प्यार से समझाते हैं।",
  },
  {
    name: "राजेश कुमार यादव",
    relation: "पिता",
    studentInfo: "सूर्यांश यादव (कक्षा 7)",
    locality: "दीनापुर",
    areaKey: "DINAPUR",
    rating: 5,
    initials: "DINAPUR" as any,
    review:
      "दीनापुर से हमारे दोनों बच्चे सेंट जी.एन.जी. में ही पढ़ रहे हैं। प्रिंसिपल सर और सभी अध्यापक बहुत मिलनसार व जिम्मेदार हैं। स्कूल में समय-समय पर यूनिट टेस्ट और खेल-कूद की प्रतियोगिताएं होती रहती हैं।",
  },
  {
    name: "अखिलेश कुमार सिंह",
    relation: "पिता",
    studentInfo: "प्रियांशु सिंह (कक्षा 4)",
    locality: "रघुनाथपुर",
    areaKey: "RAGHUNATHPUR",
    rating: 5,
    initials: "AS",
    review:
      "रघुनाथपुर मार्ग पर वैन की व्यवस्था एकदम सही समय पर है। अनुशासन और पढ़ाई का स्तर बहुत बढ़िया है। हर महीने की पेरेंट्स मीटिंग में बच्चे की प्रोग्रेस खुलकर समझाई जाती है।",
  },
  {
    name: "संतोष कुमार मौर्य",
    relation: "पिता",
    studentInfo: "आराध्या मौर्य (कक्षा 1)",
    locality: "खालिसपुर",
    areaKey: "KHALISPUR",
    rating: 5,
    initials: "SM",
    review:
      "खालिसपुर से पास में छोटे बच्चों (Nursery से Primary) की मजबूत नींव के लिए यह सबसे सुरक्षित व वाजिब फीस वाला स्कूल है। मेरी बेटी स्कूल जाने के लिए हमेशा खुश और उत्साहित रहती है।",
  },
  {
    name: "डॉ. विनोद शर्मा",
    relation: "पिता",
    studentInfo: "प्रांजल शर्मा (कक्षा 6)",
    locality: "सलारपुर",
    areaKey: "SALARPUR",
    rating: 5,
    initials: "VS",
    review:
      "कम्प्यूटर लैब और अनुशासन व्यवस्था बहुत सराहनीय है। बच्चों में बड़ों के प्रति आदर, शिष्टाचार और पढ़ाई के प्रति लगन देखकर गर्व होता है कि हमने सलारपुर में सेंट जी.एन.जी. को चुना।",
  },
  {
    name: "सुनीता देवी",
    relation: "माता",
    studentInfo: "शिवम व अनन्या (कक्षा 4 व UKG)",
    locality: "रसूलगढ़",
    areaKey: "RASULGARH",
    rating: 5,
    initials: "SD",
    review:
      "किफायती फीस में इतनी अच्छी पढ़ाई और साफ़-सुथरा माहौल मिलना हमारे रसूलगढ़ क्षेत्र में बहुत बड़ी बात है। टीचर्स बच्चों पर घर जैसा स्नेह और ध्यान रखते हैं।",
  },
  {
    name: "दिनेश कुमार वर्मा",
    relation: "पिता",
    studentInfo: "हर्षित वर्मा (कक्षा 2)",
    locality: "सलारपुर",
    areaKey: "SALARPUR",
    rating: 5,
    initials: "DV",
    review:
      "सलारपुर में 21 साल से यह स्कूल चल रहा है और हमारे परिवार के कई बच्चे यहीं से पढ़कर आगे बढ़े हैं। बुनियादी पढ़ाई और संस्कार के लिए इस क्षेत्र का सबसे भरोसेमंद स्कूल है।",
  },
];

export default function TestimonialsSection() {
  const [selectedArea, setSelectedArea] = useState<string>("ALL");

  const filteredReviews =
    selectedArea === "ALL"
      ? parentReviews
      : parentReviews.filter((r) => r.areaKey === selectedArea);

  // For infinite marquee loop, duplicate items so there is no gap
  const marqueeList = [...filteredReviews, ...filteredReviews];

  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/90 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
            <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
            <span>अभिभावकों की जुबानी • Real Parent Voices</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            सलारपुर, रसूलगढ़ व आसपास के 500+ परिवारों का{" "}
            <span className="text-indigo-950 underline decoration-amber-400 decoration-4 underline-offset-4">
              अटूट भरोसा
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-normal mt-3 leading-relaxed">
            देखिये हमारे स्कूल के बारे में क्या अनुभव साझा करते हैं <strong>सलारपुर, रसूलगढ़, दीनापुर, रघुनाथपुर एवं खालिसपुर</strong> के स्थानीय अभिभावक — कोई बनावटी बातें नहीं, सिर्फ सच्चा अनुभव।
          </p>

          {/* Quick Summary Pill Bar */}
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-bold text-slate-700 bg-white px-4 sm:px-6 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 text-amber-600">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-black text-slate-900">4.9 / 5.0</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-slate-700">
              <Users className="w-4 h-4 text-indigo-700" />
              <span>500+ स्थानीय छात्र-छात्राएं</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% स्थानीय अभिभावक</span>
            </span>
          </div>

          {/* Locality Filter Pills */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-6 flex-wrap">
            {[
              { label: "सभी क्षेत्र (All Areas)", key: "ALL" },
              { label: "📍 सलारपुर", key: "SALARPUR" },
              { label: "📍 रसूलगढ़", key: "RASULGARH" },
              { label: "📍 दीनापुर", key: "DINAPUR" },
              { label: "📍 रघुनाथपुर", key: "RAGHUNATHPUR" },
              { label: "📍 खालिसपुर", key: "KHALISPUR" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedArea(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedArea === tab.key
                    ? "bg-[#0f285a] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subtle Live Marquee Indicator */}
          <p className="text-[11px] text-slate-400 font-semibold mt-3">
            ✨ (माउस या उंगली ले जाकर रोकें / Pause on Hover to Read)
          </p>
        </div>
      </div>

      {/* ─── Infinite Smooth Flowing Moving Testimonials Showcase ─── */}
      <div className="relative w-full overflow-hidden py-3">
        {/* Left Edge Gradient Fade Mask */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-r from-slate-50 via-slate-50/70 to-transparent z-20" />

        {/* Right Edge Gradient Fade Mask */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-l from-slate-50 via-slate-50/70 to-transparent z-20" />

        {/* Infinite Moving Marquee Track */}
        <div className="animate-marquee-smooth flex items-stretch gap-5 sm:gap-6 px-4">
          {marqueeList.map((t, idx) => (
            <div
              key={idx}
              className="w-[320px] sm:w-[380px] shrink-0 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group hover:border-indigo-300 select-none"
            >
              {/* Quote Watermark Icon */}
              <Quote className="w-10 h-10 text-slate-100 absolute top-5 right-5 pointer-events-none group-hover:text-indigo-50 transition-colors" />

              <div>
                {/* Header: 5 Stars + FULL Unclipped Address Badge */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  {/* Stars */}
                  <div className="flex items-center gap-1 text-amber-400 shrink-0">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Locality Pill (Guaranteed Zero Clipping / Truncation) */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-150 shrink-0 whitespace-nowrap shadow-2xs">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{t.locality}</span>
                  </span>
                </div>

                {/* Sincere Indian Parent Review Quote */}
                <p className="text-xs sm:text-[13px] text-slate-700 font-normal leading-relaxed mb-6 italic">
                  "{t.review}"
                </p>
              </div>

              {/* Author Footer with Verified Parent Badge */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-950 border border-indigo-100 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {t.initials}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
                      {t.name}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                      {t.relation} — {t.studentInfo}
                    </p>
                  </div>
                </div>

                <span
                  title="सत्यापित स्थानीय अभिभावक (Verified Local Parent)"
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>सत्यापित</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Trust Assurance Note */}
      <div className="mt-8 text-center px-4">
        <p className="text-xs text-slate-500 font-medium">
          📍 सलारपुर, रसूलगढ़, दीनापुर, रघुनाथपुर एवं खालिसपुर क्षेत्र के अभिभावक विद्यालय आकर कभी भी व्यक्तिगत रूप से
          मुलाकात कर सकते हैं।
        </p>
      </div>
    </section>
  );
}
