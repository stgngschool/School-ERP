"use client";

import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
  ExternalLink,
  Layers,
  Building2,
  User,
  Camera,
  X,
} from "lucide-react";
import { uploadToCloudinary, getOptimizedImageUrl } from "@/lib/cloudinary";

interface MediaItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
  date?: string;
}

interface FacilityItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
}

interface WebsiteMediaConfig {
  hero: {
    bannerImage: string;
    badgeText?: string;
  };
  principal: {
    name: string;
    designation: string;
    photoUrl: string;
    message: string;
  };
  facilities: FacilityItem[];
  gallery: MediaItem[];
}

export default function WebsiteMediaManager({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<"HERO" | "PRINCIPAL" | "FACILITIES" | "GALLERY">("GALLERY");
  const [mediaData, setMediaData] = useState<WebsiteMediaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Gallery Item Modal state
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [newGalleryTitle, setNewGalleryTitle] = useState("");
  const [newGalleryCategory, setNewGalleryCategory] = useState("EVENTS");
  const [newGalleryDesc, setNewGalleryDesc] = useState("");
  const [newGalleryFile, setNewGalleryFile] = useState<File | null>(null);
  const [newGalleryPreview, setNewGalleryPreview] = useState<string | null>(null);

  // Fetch current media configuration
  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/website-media", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMediaData(data);
      }
    } catch (err) {
      console.error("Failed to load website media:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const saveMedia = async (updatedData: WebsiteMediaConfig) => {
    try {
      setSaving(true);
      setStatusMsg(null);
      const res = await fetch("/api/website-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        setMediaData(updatedData);
        setStatusMsg({ type: "success", text: "Changes saved to live website successfully!" });
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  // Upload file to Cloudinary and update specific target
  const handleDirectUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "HERO" | "PRINCIPAL" | { type: "FACILITY"; id: string } | { type: "GALLERY"; id: string }
  ) => {
    const file = e.target.files?.[0];
    if (!file || !mediaData) return;

    const targetKey = typeof target === "string" ? target : `${target.type}-${target.id}`;
    setUploadingId(targetKey);
    setStatusMsg(null);

    try {
      const uploadRes = await uploadToCloudinary(file, "school_website");
      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || "Image upload failed");
      }

      const newUrl = uploadRes.url;
      const updated: WebsiteMediaConfig = JSON.parse(JSON.stringify(mediaData));

      if (target === "HERO") {
        updated.hero.bannerImage = newUrl;
      } else if (target === "PRINCIPAL") {
        updated.principal.photoUrl = newUrl;
      } else if (typeof target === "object" && target.type === "FACILITY") {
        updated.facilities = updated.facilities.map((f) =>
          f.id === target.id ? { ...f, imageUrl: newUrl } : f
        );
      } else if (typeof target === "object" && target.type === "GALLERY") {
        updated.gallery = updated.gallery.map((g) =>
          g.id === target.id ? { ...g, imageUrl: newUrl } : g
        );
      }

      await saveMedia(updated);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Upload failed." });
    } finally {
      setUploadingId(null);
    }
  };

  // Add new photo to gallery
  const handleAddNewGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryFile || !mediaData) return;

    setSaving(true);
    setStatusMsg(null);

    try {
      const uploadRes = await uploadToCloudinary(newGalleryFile, "gallery_events");
      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || "Failed to upload photo to Cloudinary");
      }

      const newItem: MediaItem = {
        id: `gal-${Date.now()}`,
        title: newGalleryTitle.trim(),
        category: newGalleryCategory,
        imageUrl: uploadRes.url,
        description: newGalleryDesc.trim(),
        date: new Date().toISOString().split("T")[0],
      };

      const updated: WebsiteMediaConfig = {
        ...mediaData,
        gallery: [newItem, ...mediaData.gallery],
      };

      await saveMedia(updated);
      setShowAddGallery(false);
      setNewGalleryTitle("");
      setNewGalleryDesc("");
      setNewGalleryFile(null);
      setNewGalleryPreview(null);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to add gallery photo." });
      setSaving(false);
    }
  };

  // Delete gallery item
  const handleDeleteGallery = async (id: string) => {
    if (!mediaData) return;
    if (!confirm("Are you sure you want to remove this photo from the website?")) return;

    const updated: WebsiteMediaConfig = {
      ...mediaData,
      gallery: mediaData.gallery.filter((item) => item.id !== id),
    };
    await saveMedia(updated);
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Connecting to Cloudinary Media CDN...
        </p>
      </div>
    );
  }

  if (!mediaData) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Failed to load media config. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Website Media & Cloudinary CDN Manager
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload real photos. Cloudinary automatically delivers compressed WebP/AVIF images with instant load times.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMsg && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fade-in ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Live Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab("GALLERY")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "GALLERY"
              ? "bg-white text-indigo-600 shadow-sm font-extrabold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>School Event Gallery ({mediaData.gallery.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("FACILITIES")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "FACILITIES"
              ? "bg-white text-indigo-600 shadow-sm font-extrabold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Campus & Facilities ({mediaData.facilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("HERO")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "HERO"
              ? "bg-white text-indigo-600 shadow-sm font-extrabold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Home Hero Banner</span>
        </button>

        <button
          onClick={() => setActiveTab("PRINCIPAL")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "PRINCIPAL"
              ? "bg-white text-indigo-600 shadow-sm font-extrabold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Principal Profile</span>
        </button>
      </div>

      {/* ─── TAB 1: SCHOOL EVENT GALLERY ─── */}
      {activeTab === "GALLERY" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Event & Activity Photos</h3>
              <p className="text-xs text-slate-500">
                Photos shown in the Photo Gallery tab on the public website.
              </p>
            </div>

            <button
              onClick={() => setShowAddGallery(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New Photo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mediaData.gallery.map((item) => (
              <div
                key={item.id}
                className="group relative bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                  <img
                    src={getOptimizedImageUrl(item.imageUrl, 600)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-wider">
                    {item.category}
                  </div>

                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      onClick={() => handleDeleteGallery(item.id)}
                      className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-sm cursor-pointer transition-colors"
                      title="Delete from Gallery"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {uploadingId === `GALLERY-${item.id}` && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-[11px] font-bold">Uploading to Cloudinary...</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <label className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Replace Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDirectUpload(e, { type: "GALLERY", id: item.id })}
                      />
                    </label>

                    {item.date && (
                      <span className="text-[10px] font-semibold text-slate-400">{item.date}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 2: FACILITIES ─── */}
      {activeTab === "FACILITIES" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Campus & Facilities Photos</h3>
            <p className="text-xs text-slate-500">
              Replace campus facility cards (Smart Classrooms, Computer Lab, Science Corner, Library, Sports, etc.).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mediaData.facilities.map((fac) => (
              <div
                key={fac.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col"
              >
                <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                  <img
                    src={getOptimizedImageUrl(fac.imageUrl, 600)}
                    alt={fac.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-wider">
                    {fac.category}
                  </div>

                  {uploadingId === `FACILITY-${fac.id}` && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-[11px] font-bold">Uploading to Cloudinary...</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{fac.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{fac.description}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <label className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Real Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDirectUpload(e, { type: "FACILITY", id: fac.id })}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: HOME HERO BANNER ─── */}
      {activeTab === "HERO" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900">Homepage Main Hero School Banner</h3>
            <p className="text-xs text-slate-500">
              The grand background school photo shown at the top of the homepage.
            </p>
          </div>

          <div className="relative aspect-21/9 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
            <img
              src={getOptimizedImageUrl(mediaData.hero.bannerImage, 1400)}
              alt="School Main Banner"
              className="w-full h-full object-cover"
            />

            {uploadingId === "HERO" && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-xs font-bold">Uploading new Hero Banner to Cloudinary...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all active:scale-95">
              <UploadCloud className="w-4 h-4" />
              <span>Choose & Upload Real School Banner</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleDirectUpload(e, "HERO")}
              />
            </label>

            <span className="text-[11px] font-semibold text-slate-400">
              Recommended ratio: 16:9 or 21:9 (Landscape)
            </span>
          </div>
        </div>
      )}

      {/* ─── TAB 4: PRINCIPAL PROFILE ─── */}
      {activeTab === "PRINCIPAL" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900">Principal's Desk Photo & Message</h3>
            <p className="text-xs text-slate-500">
              Update Principal Sir's photograph and message on the public website.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden bg-slate-100 border-2 border-indigo-200 shrink-0 shadow-md">
              <img
                src={getOptimizedImageUrl(mediaData.principal.photoUrl, 400)}
                alt={mediaData.principal.name}
                className="w-full h-full object-cover"
              />

              {uploadingId === "PRINCIPAL" && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Principal Name
                </label>
                <input
                  type="text"
                  value={mediaData.principal.name}
                  onChange={(e) =>
                    setMediaData({
                      ...mediaData,
                      principal: { ...mediaData.principal, name: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={mediaData.principal.designation}
                  onChange={(e) =>
                    setMediaData({
                      ...mediaData,
                      principal: { ...mediaData.principal, designation: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Principal Message
                </label>
                <textarea
                  rows={3}
                  value={mediaData.principal.message}
                  onChange={(e) =>
                    setMediaData({
                      ...mediaData,
                      principal: { ...mediaData.principal, message: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <label className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors">
              <UploadCloud className="w-4 h-4" />
              <span>Upload Principal Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleDirectUpload(e, "PRINCIPAL")}
              />
            </label>

            <button
              onClick={() => saveMedia(mediaData)}
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save Details</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── ADD NEW GALLERY PHOTO MODAL ─── */}
      {showAddGallery && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Upload New Event / Activity Photo</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddGallery(false);
                  setNewGalleryPreview(null);
                  setNewGalleryFile(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewGalleryPhoto} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Photo Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Day Dance Performance, Science Fair 2026"
                  value={newGalleryTitle}
                  onChange={(e) => setNewGalleryTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={newGalleryCategory}
                    onChange={(e) => setNewGalleryCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="EVENTS">EVENTS (Celebrations / Functions)</option>
                    <option value="ACADEMICS">ACADEMICS (Science / Projects)</option>
                    <option value="SPORTS">SPORTS (Athletics / Games)</option>
                    <option value="CULTURAL">CULTURAL (Dance / Drama)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Select Photo File *
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewGalleryFile(file);
                        setNewGalleryPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              {newGalleryPreview && (
                <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={newGalleryPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note about the event..."
                  value={newGalleryDesc}
                  onChange={(e) => setNewGalleryDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGallery(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading to Cloudinary...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload & Publish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
