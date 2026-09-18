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
  Link as LinkIcon,
  RotateCcw,
} from "lucide-react";
import { uploadToCloudinary, getOptimizedImageUrl } from "@/lib/cloudinary";
import { getTodayIST } from "@/lib/dateUtils";

/**
 * Client-side canvas image compression to ensure fast uploads
 * and avoid Cloudinary free tier payload size limits.
 */
async function compressImage(file: File, maxWidth = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressed);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

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
  const [inlineFeedback, setInlineFeedback] = useState<{ [key: string]: { type: "success" | "error"; text: string } }>({});
  const [customUrlInput, setCustomUrlInput] = useState<{ [key: string]: string }>({});

  // New Gallery Item Modal state
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [newGallerySource, setNewGallerySource] = useState<"FILE" | "URL">("FILE");
  const [newGalleryTitle, setNewGalleryTitle] = useState("");
  const [newGalleryCategory, setNewGalleryCategory] = useState("EVENTS");
  const [newGalleryDesc, setNewGalleryDesc] = useState("");
  const [newGalleryFile, setNewGalleryFile] = useState<File | null>(null);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [newGalleryPreview, setNewGalleryPreview] = useState<string | null>(null);

  // Fetch current media configuration with cache busting
  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/website-media?t=${Date.now()}`, { cache: "no-store" });
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
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Upload file to Cloudinary with compression and update specific target
  const handleDirectUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "HERO" | "PRINCIPAL" | { type: "FACILITY"; id: string } | { type: "GALLERY"; id: string }
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // Reset input so re-selecting same file triggers change
    if (!file || !mediaData) return;

    const targetKey = typeof target === "string" ? target : `${target.type}-${target.id}`;
    setUploadingId(targetKey);
    setStatusMsg(null);
    setInlineFeedback((prev) => ({ ...prev, [targetKey]: undefined! }));

    try {
      // Compress phone camera / large images before upload
      const maxWidth = target === "HERO" ? 1920 : 1200;
      const fileToUpload = await compressImage(file, maxWidth);

      const uploadRes = await uploadToCloudinary(fileToUpload, "school_website");
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
      setInlineFeedback((prev) => ({
        ...prev,
        [targetKey]: { type: "success", text: "Photo uploaded & updated live!" },
      }));
      setTimeout(() => {
        setInlineFeedback((prev) => {
          const copy = { ...prev };
          delete copy[targetKey];
          return copy;
        });
      }, 4000);
    } catch (err: any) {
      const msg = err.message || "Upload failed.";
      setStatusMsg({ type: "error", text: msg });
      setInlineFeedback((prev) => ({ ...prev, [targetKey]: { type: "error", text: msg } }));
    } finally {
      setUploadingId(null);
    }
  };

  // Directly apply an image URL without uploading
  const handleApplyDirectUrl = async (
    target: "HERO" | "PRINCIPAL" | { type: "FACILITY"; id: string },
    url: string
  ) => {
    const trimmed = url.trim();
    if (!trimmed || !mediaData) return;
    const targetKey = typeof target === "string" ? target : `${target.type}-${target.id}`;

    try {
      const updated: WebsiteMediaConfig = JSON.parse(JSON.stringify(mediaData));

      if (target === "HERO") {
        updated.hero.bannerImage = trimmed;
      } else if (target === "PRINCIPAL") {
        updated.principal.photoUrl = trimmed;
      } else if (typeof target === "object" && target.type === "FACILITY") {
        updated.facilities = updated.facilities.map((f) =>
          f.id === target.id ? { ...f, imageUrl: trimmed } : f
        );
      }

      await saveMedia(updated);
      setCustomUrlInput((prev) => ({ ...prev, [targetKey]: "" }));
      setInlineFeedback((prev) => ({
        ...prev,
        [targetKey]: { type: "success", text: "Image URL updated live!" },
      }));
      setTimeout(() => {
        setInlineFeedback((prev) => {
          const copy = { ...prev };
          delete copy[targetKey];
          return copy;
        });
      }, 4000);
    } catch (err: any) {
      setInlineFeedback((prev) => ({
        ...prev,
        [targetKey]: { type: "error", text: err.message || "Failed to set image URL" },
      }));
    }
  };

  // Remove photo or reset to default
  const handleRemovePhoto = async (target: "HERO" | "PRINCIPAL") => {
    if (!mediaData) return;
    try {
      if (target === "PRINCIPAL") {
        if (!confirm("Remove custom photo and use the official School Logo for Principal's Desk?")) return;
        const updated: WebsiteMediaConfig = {
          ...mediaData,
          principal: {
            ...mediaData.principal,
            photoUrl: "",
          },
        };
        await saveMedia(updated);
        setInlineFeedback((prev) => ({
          ...prev,
          PRINCIPAL: { type: "success", text: "Photo removed. Official School Logo is now active!" },
        }));
      } else if (target === "HERO") {
        if (!confirm("Reset to default school hero banner?")) return;
        const updated: WebsiteMediaConfig = {
          ...mediaData,
          hero: {
            ...mediaData.hero,
            bannerImage: "https://res.cloudinary.com/ec4srd3k/image/upload/v1788449371/school_website/hmwpzxl2utdpplrtzbwe.jpg",
          },
        };
        await saveMedia(updated);
        setInlineFeedback((prev) => ({
          ...prev,
          HERO: { type: "success", text: "Reset to default hero banner!" },
        }));
      }
    } catch (err: any) {
      setInlineFeedback((prev) => ({
        ...prev,
        [target]: { type: "error", text: err.message || "Failed to reset photo" },
      }));
    }
  };

  // Add new photo to gallery
  const handleAddNewGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaData) return;

    setSaving(true);
    setStatusMsg(null);

    try {
      let finalImageUrl = "";

      if (newGallerySource === "URL") {
        if (!newGalleryUrl.trim()) {
          throw new Error("Please enter a valid image URL");
        }
        finalImageUrl = newGalleryUrl.trim();
      } else {
        if (!newGalleryFile) {
          throw new Error("Please select an image file to upload");
        }
        const compressed = await compressImage(newGalleryFile, 1400);
        const uploadRes = await uploadToCloudinary(compressed, "gallery_events");
        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || "Failed to upload photo to Cloudinary");
        }
        finalImageUrl = uploadRes.url;
      }

      const newItem: MediaItem = {
        id: `gal-${Date.now()}`,
        title: newGalleryTitle.trim(),
        category: newGalleryCategory,
        imageUrl: finalImageUrl,
        description: newGalleryDesc.trim(),
        date: getTodayIST(),
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
      setNewGalleryUrl("");
      setNewGalleryPreview(null);
      setNewGallerySource("FILE");
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to add gallery photo." });
    } finally {
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900">Homepage Main Hero School Banner</h3>
              <p className="text-xs text-slate-500">
                The grand background school photo shown at the top of the homepage.
              </p>
            </div>

            <button
              onClick={() => handleRemovePhoto("HERO")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors self-start cursor-pointer"
              title="Reset to default banner"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>
          </div>

          {inlineFeedback["HERO"] && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                inlineFeedback["HERO"].type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {inlineFeedback["HERO"].type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{inlineFeedback["HERO"].text}</span>
            </div>
          )}

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

          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
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

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="Or paste external banner image URL (https://...)"
                  value={customUrlInput["HERO"] || ""}
                  onChange={(e) =>
                    setCustomUrlInput((prev) => ({ ...prev, HERO: e.target.value }))
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>
              <button
                onClick={() => handleApplyDirectUrl("HERO", customUrlInput["HERO"] || "")}
                disabled={!customUrlInput["HERO"]?.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Apply URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: PRINCIPAL PROFILE ─── */}
      {activeTab === "PRINCIPAL" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900">Principal's Desk Photo & Message</h3>
              <p className="text-xs text-slate-500">
                Update Principal Sir's photograph and message on the public website.
              </p>
            </div>

            {mediaData.principal.photoUrl && (
              <button
                onClick={() => handleRemovePhoto("PRINCIPAL")}
                className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors self-start cursor-pointer"
                title="Remove photo and use official school logo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo (Use Logo)</span>
              </button>
            )}
          </div>

          {inlineFeedback["PRINCIPAL"] && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                inlineFeedback["PRINCIPAL"].type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {inlineFeedback["PRINCIPAL"].type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{inlineFeedback["PRINCIPAL"].text}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden bg-slate-100 border-2 border-indigo-200 shrink-0 shadow-md flex items-center justify-center">
              {mediaData.principal.photoUrl ? (
                <img
                  src={getOptimizedImageUrl(mediaData.principal.photoUrl, 400)}
                  alt={mediaData.principal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <User className="w-10 h-10 text-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500">Default Logo Active</span>
                </div>
              )}

              {uploadingId === "PRINCIPAL" && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 w-full">
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

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors">
                  <UploadCloud className="w-4 h-4" />
                  <span>{mediaData.principal.photoUrl ? "Change Photo" : "Upload Principal Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleDirectUpload(e, "PRINCIPAL")}
                  />
                </label>

                {mediaData.principal.photoUrl && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto("PRINCIPAL")}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              <button
                onClick={() => saveMedia(mediaData)}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Details</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="Or paste external photo URL (https://...)"
                  value={customUrlInput["PRINCIPAL"] || ""}
                  onChange={(e) =>
                    setCustomUrlInput((prev) => ({ ...prev, PRINCIPAL: e.target.value }))
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>
              <button
                onClick={() => handleApplyDirectUrl("PRINCIPAL", customUrlInput["PRINCIPAL"] || "")}
                disabled={!customUrlInput["PRINCIPAL"]?.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Apply URL
              </button>
            </div>
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
                  setNewGalleryUrl("");
                  setNewGallerySource("FILE");
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

              {/* Photo Source Selector: File vs URL */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setNewGallerySource("FILE")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      newGallerySource === "FILE"
                        ? "bg-white text-indigo-600 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Upload Photo File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewGallerySource("URL");
                      setNewGalleryFile(null);
                      setNewGalleryPreview(newGalleryUrl || null);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      newGallerySource === "URL"
                        ? "bg-white text-indigo-600 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Paste Image URL
                  </button>
                </div>

                {newGallerySource === "FILE" ? (
                  <input
                    type="file"
                    required={!newGalleryPreview}
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
                ) : (
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/... or Cloudinary URL"
                    value={newGalleryUrl}
                    onChange={(e) => {
                      setNewGalleryUrl(e.target.value);
                      setNewGalleryPreview(e.target.value.trim() || null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                )}
              </div>

              {newGalleryPreview && (
                <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={newGalleryPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setNewGalleryPreview(null)}
                  />
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
                  onClick={() => {
                    setShowAddGallery(false);
                    setNewGalleryPreview(null);
                    setNewGalleryFile(null);
                    setNewGalleryUrl("");
                    setNewGallerySource("FILE");
                  }}
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
                      <span>Saving & Publishing...</span>
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
