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
}

// 14 Real Parents & Students directly from School ERP Database (Highest Fee Paying & Regular Families)
const parentReviews: Testimonial[] = [
  {
    name: "सुनील सेठ",
    relation: "पिता",
    studentInfo: "राजवीर वर्मा (कक्षा 4-A)",
    locality: "सलारपुर",
    rating: 5,
    initials: "SS",
    review:
      "स्कूल का अनुशासन और पढ़ाई का स्तर बहुत बढ़िया है। टीचर्स राजवीर पर व्यक्तिगत ध्यान देते हैं, जिससे उसकी गणित और अंग्रेज़ी में बहुत अच्छा सुधार हुआ है। सेंट जी.एन.जी. हमारे सलारपुर का सबसे भरोसेमंद स्कूल है।",
  },
  {
    name: "राधेश्याम मौर्य",
    relation: "पिता",
    studentInfo: "अयांश मौर्य (कक्षा 1-A)",
    locality: "सलारपुर",
    rating: 5,
    initials: "RM",
    review:
      "कक्षा 1 के बच्चों के लिए यहाँ की एक्टिविटीज़ और पढ़ाई का तरीका बहुत ही सुंदर है। अयांश रोज़ खुशी-खुशी स्कूल जाता है। प्रिंसिपल सर और सभी टीचर्स बहुत मिलनसार और ज़िम्मेदार हैं।",
  },
  {
    name: "रवि कुमार सेठ",
    relation: "पिता",
    studentInfo: "अंजलि सोनी (कक्षा 4-A)",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "RS",
    review:
      "रसूलगढ़ से स्कूल की वैन हमेशा समय पर आती है और सुरक्षा का पूरा ध्यान रखा जाता है। फीस भी बहुत वाजिब है और पढ़ाई में कोई लापरवाही नहीं होती। हम पूरी तरह संतुष्ट हैं।",
  },
  {
    name: "पप्पू प्रजापति",
    relation: "पिता",
    studentInfo: "रितिका (कक्षा 2) व आदित्य (कक्षा 5)",
    locality: "सलारपुर",
    rating: 5,
    initials: "PP",
    review:
      "हमारे दोनों बच्चे रितिका और आदित्य इसी स्कूल में पढ़ रहे हैं। कम फीस में इतनी अच्छी पढ़ाई और साफ़-सुथरा अनुशासित माहौल मिलना हमारे सलारपुर इलाके में बहुत बड़ी बात है।",
  },
  {
    name: "दीपक सेठ",
    relation: "पिता",
    studentInfo: "शौर्य सेठ (कक्षा 4-A)",
    locality: "रघुनाथपुर",
    rating: 5,
    initials: "DS",
    review:
      "रघुनाथपुर मार्ग पर वैन की सुविधा एकदम सुरक्षित और समय पर है। हर महीने की पेरेंट्स मीटिंग में बच्चे की प्रोग्रेस रिपोर्ट विस्तार से समझाई जाती है। संस्कार और अनुशासन लाजवाब है।",
  },
  {
    name: "विकास जायसवाल",
    relation: "पिता",
    studentInfo: "किंजल जायसवाल (कक्षा 5-A)",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "VJ",
    review:
      "किंजल पिछले कई सालों से यहीं पढ़ रही है। यहाँ बच्चों में भारतीय संस्कार, शिष्टाचार और कम्प्यूटर की शिक्षा बहुत अच्छी दी जाती है। पूरा स्टाफ बहुत सहयोग करने वाला है।",
  },
  {
    name: "राजन कुमार मौर्य",
    relation: "पिता",
    studentInfo: "रुद्र प्रताप मौर्य (कक्षा LKG)",
    locality: "दीनापुर",
    rating: 5,
    initials: "RM",
    review:
      "दीनापुर से छोटे बच्चों के लिए सेंट जी.एन.जी. सबसे सुरक्षित और बेहतरीन स्कूल है। टीचर्स बच्चों को घर जैसा प्यार देकर समझाते हैं, जिससे बच्चे बहुत जल्दी सब सीख जाते हैं।",
  },
  {
    name: "दीपक कुमार अग्रहरि",
    relation: "पिता",
    studentInfo: "दिवांश अग्रहरि (कक्षा 3-A)",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "DA",
    review:
      "स्कूल में नियमित टेस्ट, होमवर्क चेकिंग और खेलकूद की प्रतियोगिताएं बहुत अच्छे से होती हैं। दिवांश की लिखावट और आत्मविश्वास में बहुत सुधार आया है।",
  },
  {
    name: "नवीन कुमार रस्तोगी",
    relation: "पिता",
    studentInfo: "पार्थ रस्तोगी (कक्षा KG)",
    locality: "खालिसपुर",
    rating: 5,
    initials: "NR",
    review:
      "खालिसपुर क्षेत्र के लिए यह बहुत ही बढ़िया स्कूल है। छोटे बच्चों की बुनियादी शिक्षा बहुत मजबूत की जाती है और वैन की व्यवस्था एकदम सुरक्षित और समयबद्ध है।",
  },
  {
    name: "संतोष कुमार गुप्ता",
    relation: "पिता",
    studentInfo: "पायल गुप्ता (कक्षा 2-A)",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "SG",
    review:
      "रसूलगढ़ में सेंट जी.एन.जी. स्कूल का नाम बहुत सम्मान से लिया जाता है। पायल की पढ़ाई और अनुशासन में जो निखार आया है, उसके लिए हम सभी अध्यापकों के आभारी हैं।",
  },
  {
    name: "अभिषेक विश्वकर्मा",
    relation: "पिता",
    studentInfo: "दक्ष विश्वकर्मा (कक्षा 3-A)",
    locality: "सलारपुर",
    rating: 5,
    initials: "AV",
    review:
      "कम्प्यूटर लैब और अनुशासन व्यवस्था बहुत ही शानदार है। बच्चों को नैतिक संस्कार सिखाए जाते हैं। सलारपुर में इससे बेहतर और कोई विद्यालय नहीं हो सकता।",
  },
  {
    name: "अमर कुमार गुप्ता",
    relation: "पिता",
    studentInfo: "नित्या गुप्ता (कक्षा KG)",
    locality: "दीनापुर",
    rating: 5,
    initials: "AG",
    review:
      "दीनापुर से नित्या के लिए वैन की सुविधा बहुत अच्छी है। फीस एकदम वाजिब और पारदर्शी है, कोई फालतू खर्चा नहीं लिया जाता। स्कूल का माहौल बहुत पारिवारिक है।",
  },
  {
    name: "कमलेश कुमार शुक्ला",
    relation: "पिता",
    studentInfo: "कादम्बरी शुक्ला (कक्षा LKG)",
    locality: "खालिसपुर",
    rating: 5,
    initials: "KS",
    review:
      "खालिसपुर के परिवारों के लिए सेंट जी.एन.जी. पहली पसंद है। कादम्बरी स्कूल जाने के लिए हमेशा उत्साहित रहती है। यहाँ अनुशासन और पढ़ाई दोनों पर बराबर ध्यान दिया जाता है।",
  },
  {
    name: "दिलीप गुप्ता",
    relation: "पिता",
    studentInfo: "आनंद गुप्ता (कक्षा 7-A)",
    locality: "सलारपुर",
    rating: 5,
    initials: "DG",
    review:
      "आनंद कक्षा 7 में है और उसकी पढ़ाई की मजबूत नींव इसी स्कूल ने रखी है। 21 वर्षों से सलारपुर में चल रहा यह स्कूल वाकई शिक्षा और संस्कार का सच्चा केंद्र है।",
  },
];

export default function TestimonialsSection() {
  // Seamless loop without duplicate key issues
  const marqueeList = [...parentReviews, ...parentReviews];

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
            देखिये हमारे स्कूल के बारे में क्या अनुभव साझा करते हैं{" "}
            <strong className="text-slate-900 font-extrabold">
              सलारपुर, रसूलगढ़, दीनापुर, रघुनाथपुर एवं खालिसपुर
            </strong>{" "}
            के स्थानीय अभिभावक — कोई बनावटी बातें नहीं, हमारे छात्र-छात्राओं के अभिभावकों का सच्चा अनुभव।
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
              <span>सत्यापित स्थानीय अभिभावक समीक्षा</span>
            </span>
          </div>

          {/* Subtle Live Marquee Instruction */}
          <p className="text-[11px] text-slate-400 font-semibold mt-3">
            ✨ (माउस या उंगली रखकर रोकें / Pause on Hover to Read)
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
              key={`${t.name}-${idx}`}
              className="w-[330px] sm:w-[390px] shrink-0 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group hover:border-indigo-300 select-none"
            >
              {/* Quote Watermark Icon */}
              <Quote className="w-10 h-10 text-slate-100 absolute top-5 right-5 pointer-events-none group-hover:text-indigo-50 transition-colors" />

              <div>
                {/* Header: 5 Stars + FULL Unclipped Locality Badge */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  {/* Stars */}
                  <div className="flex items-center gap-1 text-amber-400 shrink-0">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Locality Pill — Zero clipping with dedicated font rendering & extra padding */}
                  <div
                    style={{
                      fontFamily: "'Nirmala UI', 'Mangal', 'Segoe UI', system-ui, sans-serif",
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1 rounded-full bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 shrink-0 whitespace-nowrap shadow-2xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="tracking-wide">{t.locality}</span>
                  </div>
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
                      {t.relation} — {t.studentInfo} •{" "}
                      <span className="text-indigo-900 font-black">{t.locality}</span>
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
