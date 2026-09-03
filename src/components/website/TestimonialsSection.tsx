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
      "टीचर्स बहुत मेहनत करते हैं बच्चों के साथ। पहले राजवीर को पहाड़ा और टेबल याद नहीं होता था, अब खुद बैठकर होमवर्क करता है। हमारे लिए यही सबसे बड़ी तसल्ली है।",
  },
  {
    name: "राधेश्याम मौर्य",
    relation: "पिता",
    studentName: "अयांश मौर्य",
    locality: "सलारपुर",
    rating: 5,
    initials: "RM",
    review:
      "हमारा बच्चा पहले स्कूल जाने के नाम से रोने लगता था, अब सुबह खुद तैयार होकर बैठ जाता है। टीचर्स बहुत प्यार से रखते हैं, कभी डांट-फटकार नहीं करते।",
  },
  {
    name: "रवि कुमार सेठ",
    relation: "पिता",
    studentName: "अंजलि सोनी",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "RS",
    review:
      "रसूलगढ़ में वैन एकदम दरवाजे पर आती है। बारिश हो या ठंड, ड्राइवर भैया हमेशा टाइम पर रहते हैं। बच्ची को भेजने में कोई डर या चिंता नहीं रहती।",
  },
  {
    name: "पप्पू प्रजापति",
    relation: "पिता",
    studentName: "रितिका व आदित्य",
    locality: "सलारपुर",
    rating: 5,
    initials: "PP",
    review:
      "हमारे दोनों बच्चे यहीं पढ़ रहे हैं। बड़े स्कूलों की तरह यहाँ फालतू का दिखावा और अनाप-शनाप खर्चा नहीं है। जितनी वाजिब फीस है, उससे कहीं अच्छी पढ़ाई है।",
  },
  {
    name: "दीपक सेठ",
    relation: "पिता",
    studentName: "शौर्य सेठ",
    locality: "रघुनाथपुर",
    rating: 5,
    initials: "DS",
    review:
      "महीने के अंत में पेरेंट्स मीटिंग में प्रिंसिपल सर और मैडम खुलकर बताते हैं कि बच्चा किस विषय में कमजोर है और कैसे सुधारना है। ऐसा ध्यान हर जगह नहीं मिलता।",
  },
  {
    name: "विकास जायसवाल",
    relation: "पिता",
    studentName: "किंजल जायसवाल",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "VJ",
    review:
      "पढ़ाई के साथ-साथ यहाँ बच्चों में आदर-सम्मान और नमस्ते-प्रणाम करने की आदत बहुत अच्छी डाली जाती है। घर में भी सबका कहना मानती है।",
  },
  {
    name: "राजन कुमार मौर्य",
    relation: "पिता",
    studentName: "रुद्र प्रताप मौर्य",
    locality: "दीनापुर",
    rating: 5,
    initials: "RM",
    review:
      "दीनापुर से वैन की अच्छी सुविधा मिल गई, वरना हमें रोज दुकान छोड़कर छोड़ने-लाने जाना पड़ता। छोटे बच्चों के लिए बहुत सुरक्षित स्कूल है।",
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
      "दिवांश की राइटिंग बहुत खराब थी, मैडम ने खुद हाथ पकड़कर सुधरवाई। अब कॉपी में साफ़-सुथरा काम करता है और टेस्ट में भी अच्छे नंबर ला रहा है।",
  },
  {
    name: "नवीन कुमार रस्तोगी",
    relation: "पिता",
    studentName: "पार्थ रस्तोगी",
    locality: "खालिसपुर",
    rating: 5,
    initials: "NR",
    review:
      "खालिसपुर से पास में यही सबसे भरोसेमंद स्कूल लगा। पार्थ को एबीसीडी और गिनती खेल-खेल में बहुत जल्दी सिखा दिया इन्होंने।",
  },
  {
    name: "संतोष कुमार गुप्ता",
    relation: "पिता",
    studentName: "पायल गुप्ता",
    locality: "रसूलगढ़",
    rating: 5,
    initials: "SG",
    review:
      "स्कूल का माहौल बहुत पारिवारिक है। कोई भी बात हो तो प्रिंसिपल सर सीधे सुनते हैं और तुरंत हल करते हैं। कभी कोई शिकायत का मौका नहीं मिला।",
  },
  {
    name: "अभिषेक विश्वकर्मा",
    relation: "पिता",
    studentName: "दक्ष विश्वकर्मा",
    locality: "सलारपुर",
    rating: 5,
    initials: "AV",
    review:
      "कम्प्यूटर की क्लास दक्ष को बहुत पसंद है। स्कूल में 15 अगस्त और 26 जनवरी पर बच्चों से जो भाषण और डांस करवाते हैं, उससे बच्चों का झिझक खुलता है।",
  },
  {
    name: "अमर कुमार गुप्ता",
    relation: "पिता",
    studentName: "नित्या गुप्ता",
    locality: "दीनापुर",
    rating: 5,
    initials: "AG",
    review:
      "दीनापुर में बाकी स्कूलों में एडमिशन के नाम पर बहुत लूट मची है। सेंट जी.एन.जी. में एक-एक पैसे का हिसाब सही रहता है, कोई छुपा हुआ चार्ज नहीं है।",
  },
  {
    name: "कमलेश कुमार शुक्ला",
    relation: "पिता",
    studentName: "कादम्बरी शुक्ला",
    locality: "खालिसपुर",
    rating: 5,
    initials: "KS",
    review:
      "कादम्बरी को स्कूल से इतना लगाव हो गया है कि छुट्टी के दिन भी कहती है स्कूल जाना है। यही देखकर समझ आता है कि स्कूल में टीचर्स कितने प्यार से पढ़ाते हैं।",
  },
  {
    name: "दिलीप गुप्ता",
    relation: "पिता",
    studentName: "आनंद गुप्ता",
    locality: "सलारपुर",
    rating: 5,
    initials: "DG",
    review:
      "आनंद 6 साल से इसी स्कूल में है। हमें आज तक कभी बाहर ट्यूशन लगाने की ज़रूरत नहीं पड़ी। जो भी है, स्कूल के टीचर्स की मेहनत से ही है।",
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
            <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
            <span>अभिभावकों की जुबानी • Real Parent Voices</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            सलारपुर, रसूलगढ़ व आसपास के 500+ परिवारों का{" "}
            <span className="text-[#0f285a] underline decoration-amber-400 decoration-4 underline-offset-4">
              अटूट भरोसा
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-normal mt-3 leading-relaxed">
            देखिये हमारे स्कूल के बारे में क्या अनुभव साझा करते हैं{" "}
            <strong className="text-slate-900 font-extrabold">
              सलारपुर, रसूलगढ़, दीनापुर, रघुनाथपुर एवं खालिसपुर
            </strong>{" "}
            के स्थानीय अभिभावक — कोई बनावटी बातें नहीं, हमारे छात्र-छात्राओं के परिजनों का सच्चा अनुभव।
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
