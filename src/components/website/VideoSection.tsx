"use client";

import React, { useState } from "react";
import {
  Play,
  ExternalLink,
  Sparkles,
  Tv,
  Film,
  Calendar,
  X,
  ChevronRight,
  Video as VideoIcon,
  Flame,
  Award,
  Music,
  Clock,
  Eye,
} from "lucide-react";

const YouTubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface VideoItem {
  id: string;
  title: string;
  category: "DANCE" | "DRAMA" | "PATRIOTIC" | "CULTURAL";
  categoryLabel: string;
  duration: string;
  views: string;
  timeAgo: string;
  thumbnail: string;
  watchUrl: string;
  embedUrl: string;
}

const AUTHENTIC_YOUTUBE_VIDEOS: VideoItem[] = [
  {
    id: "oW5tWtf7gwM",
    title: "Papa Kehte Hain Dance Performance | 26 January 2026 | St GNG School Varanasi",
    category: "DANCE",
    categoryLabel: "Dance Performance",
    duration: "5:19",
    views: "500+ views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/oW5tWtf7gwM/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=oW5tWtf7gwM",
    embedUrl: "https://www.youtube-nocookie.com/embed/oW5tWtf7gwM?autoplay=1",
  },
  {
    id: "P27gveGTYXg",
    title: "Jhoom Barabar Jhoom Dance Performance 🔥 | 26 January 2026 | St GNG School Varanasi",
    category: "DANCE",
    categoryLabel: "Group Dance",
    duration: "3:17",
    views: "467 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/P27gveGTYXg/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=P27gveGTYXg",
    embedUrl: "https://www.youtube-nocookie.com/embed/P27gveGTYXg?autoplay=1",
  },
  {
    id: "3pix6gpgPS0",
    title: "Apna Har Din Aise Jiyo Dance Performance 💫 | 26 January 2026 | St GNG School",
    category: "DANCE",
    categoryLabel: "Patriotic Dance",
    duration: "4:44",
    views: "601 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/3pix6gpgPS0/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=3pix6gpgPS0",
    embedUrl: "https://www.youtube-nocookie.com/embed/3pix6gpgPS0?autoplay=1",
  },
  {
    id: "mH_aCNMFSxg",
    title: "Powerful Drama Performance by Boys 🎭 | 26 January 2026 | St GNG School",
    category: "DRAMA",
    categoryLabel: "Stage Drama",
    duration: "9:21",
    views: "176 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/mH_aCNMFSxg/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=mH_aCNMFSxg",
    embedUrl: "https://www.youtube-nocookie.com/embed/mH_aCNMFSxg?autoplay=1",
  },
  {
    id: "dCdEB5arc08",
    title: "Shiv Tandav Best Girls Performance | St GNG School Varanasi",
    category: "CULTURAL",
    categoryLabel: "Classical Dance",
    duration: "3:22",
    views: "527 views",
    timeAgo: "Cultural Event",
    thumbnail: "https://i.ytimg.com/vi/dCdEB5arc08/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=dCdEB5arc08",
    embedUrl: "https://www.youtube-nocookie.com/embed/dCdEB5arc08?autoplay=1",
  },
  {
    id: "RWDR9RR-C3w",
    title: "Girls Dance Performance 💃 | St. GNG School | Republic Day Program 2026",
    category: "DANCE",
    categoryLabel: "Girls Dance",
    duration: "2:58",
    views: "669 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/RWDR9RR-C3w/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=RWDR9RR-C3w",
    embedUrl: "https://www.youtube-nocookie.com/embed/RWDR9RR-C3w?autoplay=1",
  },
  {
    id: "4o3z4Y6ff8U",
    title: "Desh Bhakti Act & Patriotic Dance | 26 January 2026 | St GNG School Varanasi",
    category: "PATRIOTIC",
    categoryLabel: "Patriotic Act",
    duration: "4:32",
    views: "284 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/4o3z4Y6ff8U/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=4o3z4Y6ff8U",
    embedUrl: "https://www.youtube-nocookie.com/embed/4o3z4Y6ff8U?autoplay=1",
  },
  {
    id: "-a2ryxZ0jwo",
    title: "Teachers Appreciation Drama & Motivational Dance | 26 January 2026 | St GNG School",
    category: "DRAMA",
    categoryLabel: "School Drama",
    duration: "5:06",
    views: "209 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/-a2ryxZ0jwo/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=-a2ryxZ0jwo",
    embedUrl: "https://www.youtube-nocookie.com/embed/-a2ryxZ0jwo?autoplay=1",
  },
  {
    id: "Lcx0DvSxiSY",
    title: "Sabhi Mehmano Ka Swagat Is Tarah Hua 😍 | 26 January 2026 Welcome Song",
    category: "CULTURAL",
    categoryLabel: "Welcome Song",
    duration: "4:18",
    views: "591 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/Lcx0DvSxiSY/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=Lcx0DvSxiSY",
    embedUrl: "https://www.youtube-nocookie.com/embed/Lcx0DvSxiSY?autoplay=1",
  },
  {
    id: "dIPxXinaaKE",
    title: "Itni Powerful Performance! 🇮🇳 | Republic Day Special 2026",
    category: "PATRIOTIC",
    categoryLabel: "Republic Day",
    duration: "3:22",
    views: "387 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/dIPxXinaaKE/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=dIPxXinaaKE",
    embedUrl: "https://www.youtube-nocookie.com/embed/dIPxXinaaKE?autoplay=1",
  },
  {
    id: "NMaxZBT_DBY",
    title: "Republic Day Dance Performance 2026 🇮🇳 | School Students Dance | Varanasi",
    category: "DANCE",
    categoryLabel: "Group Dance",
    duration: "2:57",
    views: "463 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/NMaxZBT_DBY/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=NMaxZBT_DBY",
    embedUrl: "https://www.youtube-nocookie.com/embed/NMaxZBT_DBY?autoplay=1",
  },
  {
    id: "Y3KJsajl7nU",
    title: "Swachhta Dance Performance | 26 January Program – GNG School",
    category: "CULTURAL",
    categoryLabel: "Awareness Dance",
    duration: "2:33",
    views: "143 views",
    timeAgo: "26 Jan 2026",
    thumbnail: "https://i.ytimg.com/vi/Y3KJsajl7nU/hqdefault.jpg",
    watchUrl: "https://www.youtube.com/watch?v=Y3KJsajl7nU",
    embedUrl: "https://www.youtube-nocookie.com/embed/Y3KJsajl7nU?autoplay=1",
  },
];

export default function VideoSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const categories = [
    { key: "ALL", label: "All Channel Videos" },
    { key: "DANCE", label: "Dance Performances (डांस)" },
    { key: "DRAMA", label: "Stage Drama & Plays (नाटक)" },
    { key: "PATRIOTIC", label: "Patriotic Act (देशभक्ति)" },
    { key: "CULTURAL", label: "Cultural & Swagat Songs" },
  ];

  const filteredVideos = AUTHENTIC_YOUTUBE_VIDEOS.filter((v) =>
    selectedCategory === "ALL" ? true : v.category === selectedCategory
  );

  return (
    <section id="videos" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-black uppercase tracking-wider mb-3">
              <YouTubeIcon className="w-4 h-4 text-red-600" />
              <span>Official YouTube Channel: @stgngschool</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Student Activities & YouTube Videos
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 max-w-2xl">
              Real programs, cultural dance performances, stage drama, and 26th January Republic Day
              celebrations from the official St. G.N.G. School YouTube channel.
            </p>
          </div>

          {/* YouTube Channel Red CTA Button */}
          <a
            href="https://www.youtube.com/@stgngschool"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-lg shadow-red-600/25 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <YouTubeIcon className="w-5 h-5 text-white shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[10px] font-medium text-red-100 uppercase tracking-wider">Visit Official Channel</div>
              <div className="text-sm font-black text-white">@stgngschool</div>
            </div>
            <ExternalLink className="w-4 h-4 ml-1 text-red-100" />
          </a>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Video Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between"
            >
              {/* Real YouTube Video Thumbnail */}
              <div className="relative h-52 bg-slate-900 overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback to standard yt thumbnail if high-res not available
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/0.jpg`;
                  }}
                />

                {/* Central Play Button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-2xl group-hover:scale-115 group-hover:bg-red-600 transition-all duration-300">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Top Badge: Category */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
                    {video.categoryLabel}
                  </span>
                </div>

                {/* Bottom Duration & Views */}
                <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[10px] font-bold text-white">
                  <span className="px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{video.duration}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md flex items-center gap-1 text-slate-200">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>{video.views}</span>
                  </span>
                </div>
              </div>

              {/* Card Information */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-2 mb-2">
                    {video.title}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-red-600">
                  <span className="flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-red-600" />
                    <span>Watch Performance</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{video.timeAgo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Channel Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <YouTubeIcon className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Official YouTube Channel: @stgngschool
              </h4>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Visit the official YouTube channel to watch all 20+ school program videos and annual celebrations.
              </p>
            </div>
          </div>

          <a
            href="https://www.youtube.com/@stgngschool"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md transition-all whitespace-nowrap flex items-center gap-2"
          >
            <YouTubeIcon className="w-4 h-4 text-white" />
            <span>Open @stgngschool on YouTube</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </a>
        </div>
      </div>

      {/* ─── Video Modal Player (Plays the exact video clicked) ─── */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video Player Frame */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={activeVideo.embedUrl}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Modal Info Footer */}
            <div className="p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-100">
                    {activeVideo.categoryLabel}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">Duration: {activeVideo.duration}</span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-snug">{activeVideo.title}</h3>
              </div>

              <a
                href={activeVideo.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                <YouTubeIcon className="w-4 h-4 text-white" />
                <span>Watch on YouTube</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
