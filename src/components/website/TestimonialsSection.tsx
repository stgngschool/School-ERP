"use client";

import React from "react";
import { Star, Quote, CheckCircle2, MapPin, Heart, Users } from "lucide-react";

interface Testimonial {
  name: string;
  relation: string;
  studentInfo: string;
  locality: string;
  rating: number;
  review: string;
  initials: string;
  tag?: string;
}

const parentReviews: Testimonial[] = [
  {
    name: "मनोज कुमार चौरसिया",
    relation: "पिता",
    studentInfo: "आयुष चौरसिया (कक्षा 5)",
    locality: "सलारपुर, वाराणसी",
    rating: 5,
    initials: "MC",
    tag: "सलारपुर लोकल",
    review:
      "स्कूल में टीचर्स हर बच्चे पर व्यक्तिगत ध्यान देते हैं। जब से आयुष यहाँ पढ़ रहा है, उसकी गणित और अंग्रेज़ी में बहुत अच्छा सुधार हुआ है। यहाँ की सबसे बड़ी विशेषता अनुशासन और भारतीय संस्कार हैं।",
  },
  {
    name: "श्रीमती सीमा पटेल",
    relation: "माता",
    studentInfo: "रिया पटेल (कक्षा 3)",
    locality: "रसूलगढ़, वाराणसी",
    rating: 5,
    initials: "SP",
    tag: "वैन सुविधा पेरेंट",
    review:
      "वैन सुविधा बहुत सुरक्षित और हमेशा समय पर रहती है, जिससे हमें बच्चों की कभी चिंता नहीं होती। पढ़ाई का माहौल बहुत अच्छा है और टीचर्स बच्चों को रटाने के बजाय प्यार से और समझकर पढ़ाते हैं।",
  },
  {
    name: "राजेश कुमार यादव",
    relation: "पिता",
    studentInfo: "सूर्यांश यादव (कक्षा 7)",
    locality: "आशापुर / सारनाथ मार्ग",
    rating: 5,
    initials: "RY",
    tag: "2 बच्चे स्कूल में",
    review:
      "प्रिंसिपल सर और सभी अध्यापक बहुत मिलनसार व जिम्मेदार हैं। स्कूल में समय-समय पर यूनिट टेस्ट, खेल-कूद और एक्टिविटीज़ होती रहती हैं। हमारे दोनों बच्चे इसी स्कूल में पढ़ रहे हैं और हम पूरी तरह संतुष्ट हैं।",
  },
  {
    name: "अनिल कुमार गुप्ता",
    relation: "पिता",
    studentInfo: "वैष्णवी गुप्ता (कक्षा 1)",
    locality: "पहड़िया - सलारपुर मार्ग",
    rating: 5,
    initials: "AG",
    tag: "प्राइमरी विंग",
    review:
      "छोटे बच्चों (Nursery/KG) की नींव मजबूत करने के लिए यह इस इलाके का सबसे बेहतरीन और वाजिब फीस वाला स्कूल है। मेरी बेटी स्कूल जाने के लिए हमेशा खुश और उत्साहित रहती है।",
  },
  {
    name: "सुनीता देवी",
    relation: "माता",
    studentInfo: "शिवम एवं अनन्या (कक्षा 4 व UKG)",
    locality: "रसूलगढ़ बस्ती, वाराणसी",
    rating: 5,
    initials: "SD",
    review:
      "किफायती फीस में इतनी अच्छी पढ़ाई और साफ़-सुथरा अनुशासन मिलना इस एरिया में बहुत बड़ी बात है। हर महीने की पेरेंट्स मीटिंग में बच्चे की कमियों और खूबियों पर विस्तार से चर्चा होती है।",
  },
  {
    name: "डॉ. विनोद शर्मा",
    relation: "पिता",
    studentInfo: "प्रांजल शर्मा (कक्षा 6)",
    locality: "सलारपुर मुख्य बाजार",
    rating: 5,
    initials: "VS",
    review:
      "कम्प्यूटर लैब और अनुशासन व्यवस्था बहुत सराहनीय है। बच्चों में बड़ों के प्रति आदर, शिष्टाचार और पढ़ाई के प्रति लगन देखकर गर्व होता है कि हमने सेंट जी.एन.जी. को चुना।",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/90 relative overflow-hidden">
      {/* Subtle Institutional Framing Accents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-200/80 text-amber-900 text-xs font-black uppercase tracking-wider mb-3">
            <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
            <span>अभिभावकों की जुबानी • Real Parent Voices</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            सलारपुर व आसपास के 500+ परिवारों का{" "}
            <span className="text-indigo-900 underline decoration-amber-400 decoration-4 underline-offset-4">
              अटूट भरोसा
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-normal mt-3 leading-relaxed">
            देखिये हमारे स्कूल के बारे में क्या अनुभव साझा करते हैं सलारपुर, रसूलगढ़, आशापुर एवं पहड़िया क्षेत्र के
            संतुष्ट अभिभावक — कोई बनावटी बातें नहीं, सिर्फ सच्चा अनुभव।
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
            <span className="flex items-center gap-1 text-slate-600">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>500+ स्थानीय छात्र-छात्राएं</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% सत्यापित अभिभावक समीक्षा</span>
            </span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {parentReviews.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group hover:border-indigo-200"
            >
              {/* Quote Watermark */}
              <Quote className="w-10 h-10 text-slate-100 absolute top-5 right-5 pointer-events-none group-hover:text-indigo-50 transition-colors" />

              <div>
                {/* Header: Stars + Locality Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    <MapPin className="w-3 h-3 text-indigo-600" />
                    <span>{t.locality.split(",")[0]}</span>
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-[13px] text-slate-700 font-normal leading-relaxed mb-6 italic">
                  "{t.review}"
                </p>
              </div>

              {/* Author Footer with Verified Badge */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-900 border border-indigo-100 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
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
                  title="सत्यापित अभिभावक (Verified Local Parent)"
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">सत्यापित</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Assurance Note */}
        <div className="mt-10 sm:mt-12 text-center">
          <p className="text-xs text-slate-500 font-medium">
            📍 सलारपुर, रसूलगढ़, सारनाथ, आशापुर एवं पहड़िया क्षेत्र के अभिभावक विद्यालय आकर कभी भी व्यक्तिगत रूप से
            मुलाकात कर सकते हैं।
          </p>
        </div>
      </div>
    </section>
  );
}
