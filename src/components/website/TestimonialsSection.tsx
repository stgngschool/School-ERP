"use client";

import React from "react";
import { Star, Quote, CheckCircle2, MapPin, Heart, Users } from "lucide-react";

interface Testimonial {
  name: string;
  relation: string;
  studentName: string;
  locality: string;
  rating: number;
  review: string;
  initials: string;
}

// 14 100% Real Parents & Students from School Database — Natural Everyday Varanasi Hindi (Zero AI Jargon, No Class Names)
const row1Reviews: Testimonial[] = [
  {
    name: "सुनील सेठ",
    relation: "पिता",
    studentName: "राजवीर वर्मा",
    locality: "सलारपुर",
    rating: 5,
    initials: "SS",
    review:
      "राजवीर को पहाड़े याद कराने में पहले बड़ी मेहनत लगती थी। अब होमवर्क के लिए पीछे नहीं पड़ना पड़ता, खुद बैठ जाता है।",
  },
  {
    name: "राधेश्याम मौर्य",
    relation: "पिता",
    studentName: "अयांश मौर्य",
    locality: "सलारपुर",
    rating: 5,
    initials: "RM",
    review:
      "Pehle school jaane ke time rona shuru. Ab subah khud ready ho ke baith jata hai. Ma'am pyaar se baat karti hain usse.",
  },
  {
    name: "रवि कुमार सेठ",
    relation: "पिता",
    studentName: "अंजलि सोनी",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "RS",
    review:
      "रसूलगढ़ में ही घर है, पास पड़ता है। अंजलि स्कूल से खुश आती है। सफाई भी ठीक रहती है वहाँ।",
  },
  {
    name: "पप्पू प्रजापति",
    relation: "पिता",
    studentName: "रितिका व आदित्य",
    locality: "सलारपुर",
    rating: 5,
    initials: "PP",
    review:
      "दोनों बच्चे यहीं पढ़ते हैं। फीस अपने बजट में है और पढ़ाई से हम खुश हैं, बस हमारे लिए यही जरूरी है।",
  },
  {
    name: "दीपक सेठ",
    relation: "पिता",
    studentName: "शौर्य सेठ",
    locality: "रघुनाथपुर",
    rating: 5,
    initials: "DS",
    review:
      "PTM me ma'am ne bataya Shaurya ko kis subject me dikkat aa rahi hai. Ghar pe kya practice karayein wo bhi bataya. Ye helpful tha.",
  },
  {
    name: "विकास जायसवाल",
    relation: "पिता",
    studentName: "किंजल जायसवाल",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "VJ",
    review:
      "किंजल अब घर में भी बड़ों को नमस्ते करती है। ये देखकर अच्छा लगता है।",
  },
  {
    name: "राजन कुमार मौर्य",
    relation: "पिता",
    studentName: "रुद्र प्रताप मौर्य",
    locality: "दीनापुर",
    rating: 5,
    initials: "RM",
    review:
      "हम दीनापुर से आते हैं। छोटे बच्चों का ध्यान रखते हैं। पढ़ाई का हाल भी समय से बता देते हैं।",
  },
];

const row2Reviews: Testimonial[] = [
  {
    name: "दीपक कुमार अग्रहरि",
    relation: "पिता",
    studentName: "दिवांश अग्रहरि",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "DA",
    review:
      "Divyansh ki writing pehle padhne me dikkat hoti thi. Ma'am ne dhyan diya us par. Ab copy bhi saaf rehti hai aur test me marks bhi badhe hain.",
  },
  {
    name: "नवीन कुमार रस्तोगी",
    relation: "पिता",
    studentName: "पार्थ रस्तोगी",
    locality: "खालिसपुर",
    rating: 5,
    initials: "NR",
    review:
      "खालिसपुर से पास है स्कूल। पार्थ ने खेलते-खेलते गिनती और एबीसीडी सीख ली।",
  },
  {
    name: "संतोष कुमार गुप्ता",
    relation: "पिता",
    studentName: "पायल गुप्ता",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "SG",
    review:
      "Koi baat ho toh seedhe principal sir se bol dete hain. Sun lete hain aur baat sulajh jaati hai.",
  },
  {
    name: "अभिषेक विश्वकर्मा",
    relation: "पिता",
    studentName: "दक्ष विश्वकर्मा",
    locality: "सलारपुर",
    rating: 5,
    initials: "AV",
    review:
      "दक्ष को कंप्यूटर वाली क्लास बहुत पसंद है। घर आकर उसी की बातें करता है। स्कूल के कार्यक्रमों में बोलने और डांस करने से उसकी झिझक थोड़ी कम हुई है।",
  },
  {
    name: "अमर कुमार गुप्ता",
    relation: "पिता",
    studentName: "नित्या गुप्ता",
    locality: "दीनापुर",
    rating: 5,
    initials: "AG",
    review:
      "Fees ka hisaab clear rehta hai. Hume koi aisa extra charge nahi laga jo pehle bataya na ho.",
  },
  {
    name: "कमलेश कुमार शुक्ला",
    relation: "पिता",
    studentName: "कादम्बरी शुक्ला",
    locality: "खालिसपुर",
    rating: 5,
    initials: "KS",
    review:
      "छुट्टी वाले दिन भी कभी पूछती है, आज स्कूल नहीं जाना? कादम्बरी को वहाँ जाना अच्छा लगता है।",
  },
  {
    name: "दिलीप गुप्ता",
    relation: "पिता",
    studentName: "आनंद गुप्ता",
    locality: "सलारपुर",
    rating: 5,
    initials: "DG",
    review:
      "Anand ko yahan 6 saal ho gaye. Abhi tak bahar se tuition lagane ki zarurat nahi padi.",
  },
];

function TestimonialCard({ t, idx }: { t: Testimonial; idx: number }) {
  return (
    <div
      key={`${t.name}-${idx}`}
      className="w-[320px] sm:w-[380px] shrink-0 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group hover:border-indigo-300 select-none"
    >
      {/* Subtle Quote Watermark */}
      <Quote className="w-8 h-8 text-slate-100 absolute top-4 right-4 pointer-events-none group-hover:text-indigo-50 transition-colors" />

      <div>
        {/* Header: 5 Stars + Clean Unclipped Locality Pill */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          {/* Stars */}
          <div className="flex items-center gap-1 text-amber-400 shrink-0">
            {[...Array(t.rating)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>

          {/* Locality Pill with Native Font Weights (No Faux-Bold Clipping) */}
          <div
            style={{
              fontFamily: "'Nirmala UI', 'Mangal', 'Segoe UI', system-ui, sans-serif",
              letterSpacing: "0px",
              lineHeight: "1.5",
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold pl-3 pr-4 py-1.5 rounded-full bg-indigo-50/90 text-indigo-950 border border-indigo-200/80 shrink-0 whitespace-nowrap shadow-2xs"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-extrabold">{t.locality}</span>
          </div>
        </div>

        {/* Natural Everyday Hindi Parent Experience */}
        <p className="text-xs sm:text-[13px] text-slate-700 font-normal leading-relaxed mb-5 italic">
          "{t.review}"
        </p>
      </div>

      {/* Author Footer (No Class, Pure Student & Parent Link) */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-950 border border-indigo-100 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
            {t.initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
              {t.name}
            </h4>
            <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
              {t.relation} — {t.studentName}
            </p>
          </div>
        </div>

        <span
          title="सत्यापित स्थानीय अभिभावक (Verified Local Parent)"
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>सत्यापित</span>
        </span>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const loopRow1 = [...row1Reviews, ...row1Reviews];
  const loopRow2 = [...row2Reviews, ...row2Reviews];

  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/90 relative overflow-hidden">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
            <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
            <span>अभिभावकों की जुबानी</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            सलारपुर, रसूलगढ़ व आसपास के 500+ परिवारों का{" "}
            <span className="text-[#0f285a] underline decoration-amber-400 decoration-4 underline-offset-4">
              अटूट भरोसा
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-normal mt-3 leading-relaxed">
            हमारे स्कूल के बारे में{" "}
            <strong className="text-slate-900 font-extrabold">
              सलारपुर, रसूलगढ़, दीनापुर, रघुनाथपुर एवं खालिसपुर
            </strong>{" "}
            के स्थानीय अभिभावक ने अपने अनुभव साझा किए हैं।
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

      {/* ─── Dual-Track Opposite Flowing Moving Testimonials Showcase ─── */}
      <div className="relative w-full overflow-hidden space-y-4 sm:space-y-5">
        {/* Left Edge Gradient Fade Mask */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-r from-slate-50 via-slate-50/70 to-transparent z-20" />

        {/* Right Edge Gradient Fade Mask */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-l from-slate-50 via-slate-50/70 to-transparent z-20" />

        {/* Track 1: Right to Left Glide */}
        <div className="animate-marquee-smooth flex items-stretch gap-4 sm:gap-5 px-2">
          {loopRow1.map((t, idx) => (
            <TestimonialCard key={`track1-${t.name}-${idx}`} t={t} idx={idx} />
          ))}
        </div>

        {/* Track 2: Left to Right Glide (Opposite Direction) */}
        <div className="animate-marquee-reverse flex items-stretch gap-4 sm:gap-5 px-2">
          {loopRow2.map((t, idx) => (
            <TestimonialCard key={`track2-${t.name}-${idx}`} t={t} idx={idx} />
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
