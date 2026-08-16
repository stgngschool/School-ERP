"use client";

import React, { useState, useEffect } from "react";
import { getOptimizedImageUrl } from "@/lib/cloudinary";
import {
  Sparkles,
  Image as ImageIcon,
  Camera,
  ChevronRight,
  X,
  Play,
  ArrowUpRight,
  Filter,
} from "lucide-react";

const YouTubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface MediaItem {
  id: string;
  type: "PHOTO" | "VIDEO";
  title: string;
  category: "DANCE" | "DRAMA" | "ACADEMICS" | "EVENTS" | "CULTURAL";
  imageUrl: string;
  description: string;
  youtubeId?: string;
  duration?: string;
  badgeText: string;
}

const ALL_MEDIA_ITEMS: MediaItem[] = [
  // 🎥 Real YouTube Channel Videos (@stgngschool)
  {
    id: "v-1",
    type: "VIDEO",
    title: "Papa Kehte Hain Dance Performance | 26 January 2026 | St GNG School Varanasi",
    category: "DANCE",
    youtubeId: "oW5tWtf7gwM",
    duration: "5:19",
    imageUrl: "https://i.ytimg.com/vi/oW5tWtf7gwM/hqdefault.jpg",
    description: "Heartwarming dance presentation by school students on Republic Day celebration.",
    badgeText: "YouTube Video",
  },
  {
    id: "v-2",
    type: "VIDEO",
    title: "Jhoom Barabar Jhoom Dance Performance 🔥 | 26 January 2026 | St GNG School",
    category: "DANCE",
    youtubeId: "P27gveGTYXg",
    duration: "3:17",
    imageUrl: "https://i.ytimg.com/vi/P27gveGTYXg/hqdefault.jpg",
    description: "Energetic stage dance performance by primary students at campus stage.",
    badgeText: "YouTube Video",
  },
  {
    id: "v-3",
    type: "VIDEO",
    title: "Apna Har Din Aise Jiyo Dance Performance 💫 | 26 January 2026",
    category: "DANCE",
    youtubeId: "3pix6gpgPS0",
    duration: "4:44",
    imageUrl: "https://i.ytimg.com/vi/3pix6gpgPS0/hqdefault.jpg",
    description: "Inspiring and melodious student dance act celebrating Republic Day.",
    badgeText: "YouTube Video",
  },
  {
    id: "v-4",
    type: "VIDEO",
    title: "Powerful Drama Performance by Boys 🎭 | 26 January 2026 | St GNG School",
    category: "DRAMA",
    youtubeId: "mH_aCNMFSxg",
    duration: "9:21",
    imageUrl: "https://i.ytimg.com/vi/mH_aCNMFSxg/hqdefault.jpg",
    description: "Thought-provoking social drama and moral skit enacted by senior boys.",
    badgeText: "YouTube Video",
  },
  {
    id: "v-5",
    type: "VIDEO",
    title: "Shiv Tandav Best Girls Performance | St GNG School Varanasi",
    category: "CULTURAL",
    youtubeId: "dCdEB5arc08",
    duration: "3:22",
    imageUrl: "https://i.ytimg.com/vi/dCdEB5arc08/hqdefault.jpg",
    description: "Classical Shiv Tandav Stotram dance routine performed with synchronization.",
    badgeText: "YouTube Video",
  },
  {
    id: "v-6",
    type: "VIDEO",
    title: "Girls Dance Performance 💃 | St. GNG School | Republic Day Program",
    category: "DANCE",
    youtubeId: "RWDR9RR-C3w",
    duration: "2:58",
    imageUrl: "https://i.ytimg.com/vi/RWDR9RR-C3w/hqdefault.jpg",
    description: "Vibrant cultural group dance by middle school girls on 26th January.",
    badgeText: "YouTube Video",
  },
  {
    id: "v-7",
    type: "VIDEO",
    title: "Desh Bhakti Act & Patriotic Dance | 26 January 2026 | St GNG School",
    category: "EVENTS",
    youtubeId: "4o3z4Y6ff8U",
    duration: "4:32",
    imageUrl: "https://i.ytimg.com/vi/4o3z4Y6ff8U/hqdefault.jpg",
    description: "Salute to freedom fighters and patriotic fervor presented by students.",
    badgeText: "YouTube Video",
  },
  {
    id: "v-8",
    type: "VIDEO",
    title: "Swachhta Dance Performance | 26 January Program – GNG School",
    category: "CULTURAL",
    youtubeId: "Y3KJsajl7nU",
    duration: "2:33",
    imageUrl: "https://i.ytimg.com/vi/Y3KJsajl7nU/hqdefault.jpg",
    description: "Clean India Swachh Bharat themed motivational dance and awareness act.",
    badgeText: "YouTube Video",
  },

  // 📸 Campus Photos
  {
    id: "p-1",
    type: "PHOTO",
    title: "School Campus & Morning Assembly",
    category: "EVENTS",
    imageUrl: "/images/hero_school.jpg",
    description: "Disciplined morning prayers, national anthem, news reading, and assembly.",
    badgeText: "Campus Photo",
  },
  {
    id: "p-2",
    type: "PHOTO",
    title: "Interactive Classroom Learning",
    category: "ACADEMICS",
    imageUrl: "/images/classroom.jpg",
    description: "Dedicated faculty providing attentive care to each student from Nursery to 8th.",
    badgeText: "Classroom Photo",
  },
  {
    id: "p-3",
    type: "PHOTO",
    title: "Computer Education Lab",
    category: "ACADEMICS",
    imageUrl: "/images/computer_lab.jpg",
    description: "Hands-on computer training, digital literacy, and basic IT education.",
    badgeText: "Lab Photo",
  },
];

export default function GallerySection() {
  const [filter, setFilter] = useState<string>("ALL");
  const [activeVideo, setActiveVideo] = useState<MediaItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<MediaItem | null>(null);
  const [dynamicItems, setDynamicItems] = useState<MediaItem[]>(ALL_MEDIA_ITEMS);

  useEffect(() => {
    fetch("/api/website-media")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.gallery && Array.isArray(data.gallery) && data.gallery.length > 0) {
          const uploadedPhotos: MediaItem[] = data.gallery.map((g: any) => ({
            id: g.id,
            type: "PHOTO",
            title: g.title,
            category: g.category || "EVENTS",
            imageUrl: g.imageUrl,
            description: g.description || "",
            badgeText: "Live Photo",
          }));

          // Keep YouTube videos and prepend dynamic uploaded photos
          const youtubeVideos = ALL_MEDIA_ITEMS.filter((item) => item.type === "VIDEO");
          setDynamicItems([...uploadedPhotos, ...youtubeVideos]);
        }
      })
      .catch(() => {});
  }, []);

  const filterTabs = [
    { key: "ALL", label: "All Media (सभी)" },
    { key: "VIDEO", label: "🎥 YouTube Videos" },
    { key: "PHOTO", label: "📸 Campus Photos" },
    { key: "DANCE", label: "💃 Dance & Plays" },
    { key: "ACADEMICS", label: "📚 Classroom & Lab" },
  ];

  const filterTabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [galleryPill, setGalleryPill] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const idx = filterTabs.findIndex((t) => t.key === filter);
    if (idx !== -1 && filterTabRefs.current[idx]) {
      const el = filterTabRefs.current[idx];
      if (el) {
        setGalleryPill({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1,
        });
      }
    }
  }, [filter]);

  const filteredItems = dynamicItems.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "VIDEO") return item.type === "VIDEO";
    if (filter === "PHOTO") return item.type === "PHOTO";
    if (filter === "DANCE") return item.category === "DANCE" || item.category === "DRAMA";
    if (filter === "ACADEMICS") return item.category === "ACADEMICS";
    return true;
  });

  const handleCardClick = (item: MediaItem) => {
    if (item.type === "VIDEO") {
      setActiveVideo(item);
    } else {
      setSelectedPhoto(item);
    }
  };

  return (
    <section id="gallery" className="py-16 bg-slate-50 border-b border-slate-200/80 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Camera className="w-3.5 h-3.5" />
            <span>Campus Glimpses & Media Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Photo Gallery & YouTube Videos
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
            Explore authentic moments from our campus — student dance performances, Republic Day skits,
            classroom sessions, and official YouTube videos from <strong>@stgngschool</strong>.
          </p>
        </div>

        {/* Filter Bar with iOS Liquid Sliding Capsule */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative flex items-center p-1 rounded-2xl bg-slate-100/85 backdrop-blur-md border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] max-w-full overflow-x-auto scrollbar-none">
            {/* 🌊 Pure Transparent Liquid Glass Bubble Capsule */}
            <div
              className="absolute top-1 bottom-1 rounded-xl pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-[transform,width]"
              style={{
                transform: `translateX(${galleryPill.left}px)`,
                width: `${galleryPill.width}px`,
                opacity: galleryPill.opacity,
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 246, 255, 0.88) 100%)",
                boxShadow:
                  "inset 0 1.5px 1px 0 rgba(255, 255, 255, 1), 0 4px 14px -1px rgba(99, 102, 241, 0.16), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Liquid Gloss Reflection */}
              <div className="absolute inset-x-2 top-0.5 h-[45%] rounded-t-lg bg-gradient-to-b from-white/90 to-transparent pointer-events-none opacity-90" />
            </div>

            {filterTabs.map((tab, idx) => (
              <button
                key={tab.key}
                ref={(el) => {
                  filterTabRefs.current[idx] = el;
                }}
                onClick={() => setFilter(tab.key)}
                className={`relative z-10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  filter === tab.key
                    ? "text-indigo-600 font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between"
            >
              {/* Media Thumbnail */}
              <div className="relative h-48 sm:h-52 bg-slate-900 overflow-hidden">
                <img
                  src={getOptimizedImageUrl(item.imageUrl, 700)}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Video Play Icon Overlay */}
                {item.type === "VIDEO" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-2.5 rounded-full bg-white/90 text-slate-900 shadow-lg">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  </div>
                )}

                {/* Duration Badge for Videos */}
                {item.duration && (
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                    {item.duration}
                  </span>
                )}

                {/* Top Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.type === "VIDEO"
                        ? "bg-red-600 text-white"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {item.badgeText}
                  </span>
                </div>
              </div>

              {/* Media Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-400">
                    {item.type === "VIDEO" ? "YouTube Stream" : "Campus Gallery"}
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      item.type === "VIDEO" ? "text-red-600" : "text-indigo-600"
                    }`}
                  >
                    <span>{item.type === "VIDEO" ? "Watch Video" : "View Photo"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* YouTube Channel Promo Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <YouTubeIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black">
                Subscribe to Official YouTube: @stgngschool
              </h3>
              <p className="text-xs sm:text-sm text-red-100 mt-0.5 font-medium">
                Watch all school function videos, annual day dances, dramas, and activities live on YouTube.
              </p>
            </div>
          </div>

          <a
            href="https://www.youtube.com/@stgngschool"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-2xl bg-white text-red-600 hover:bg-red-50 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 active:scale-95"
          >
            <span>Visit YouTube Channel</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* ─── Video Player Modal ─── */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-700 relative animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2 truncate pr-2">
                <YouTubeIcon className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-xs font-bold truncate">{activeVideo.title}</span>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Responsive Iframe Container */}
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 text-slate-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white text-xs">{activeVideo.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{activeVideo.description}</p>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>Open in YouTube</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Photo Lightbox Modal ─── */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 relative animate-scale-in"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-white transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={getOptimizedImageUrl(selectedPhoto.imageUrl, 1200)}
              alt={selectedPhoto.title}
              className="w-full max-h-[70vh] object-contain bg-slate-950"
            />

            <div className="p-5 bg-white">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 uppercase">
                {selectedPhoto.badgeText}
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">
                {selectedPhoto.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {selectedPhoto.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
