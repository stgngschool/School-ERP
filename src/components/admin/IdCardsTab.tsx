"use client";

import React, { useState } from "react";
import { Printer } from "lucide-react";
import {
  getCleanClassKey,
  matchStudentToClass,
  normalizeDisplayClassName,
  sortClasses,
} from "@/lib/classUtils";

interface IdCardsTabProps {
  students: any[];
  filteredSortedClasses: any[];
  updateStudentPhoto: (studentId: string, photoUrl: string) => void;
  showToast: (type: any, title: string, message: string) => void;
}

export default function IdCardsTab({
  students,
  filteredSortedClasses,
  updateStudentPhoto,
  showToast,
}: IdCardsTabProps) {
  // ID Cards & Photos State
  const [idClassFilter, setIdClassFilter] = useState("");
  const [selectedIdCardStudentIds, setSelectedIdCardStudentIds] = useState<string[]>([]);
  const [isPrintingIdCards, setIsPrintingIdCards] = useState(false);
  const [compressingStudentId, setCompressingStudentId] = useState<string | null>(null);

  const compressAndUploadPhoto = async (studentId: string, file: File) => {
    setCompressingStudentId(studentId);
    try {
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const targetWidth = 240;
            const targetHeight = 240;
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }
            
            const sourceSize = Math.min(img.width, img.height);
            const sourceX = (img.width - sourceSize) / 2;
            const sourceY = (img.height - sourceSize) / 2;
            
            ctx.drawImage(
              img, 
              sourceX, sourceY, sourceSize, sourceSize,
              0, 0, targetWidth, targetHeight
            );
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Compression failed"));
                }
              },
              "image/jpeg",
              0.75
            );
          };
          img.onerror = () => reject(new Error("Failed to load image"));
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
      });
      
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("file", new File([compressedBlob], `student_${studentId}.jpg`, { type: "image/jpeg" }));
      
      const res = await fetch("/api/students/upload-photo", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Upload failed");
      }
      
      const uploadData = await res.json();
      if (uploadData?.photoUrl) {
        updateStudentPhoto(studentId, uploadData.photoUrl);
      }
      showToast("success", "Photo Uploaded", "Student profile photo compressed and updated successfully.");
    } catch (err: any) {
      showToast("error", "Upload Failed", err.message || "Failed to process and upload student photo.");
    } finally {
      setCompressingStudentId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/60 p-3 sm:p-5 sm:rounded-2xl rounded-xl shadow-sm">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Student ID Cards &amp; Photos Center
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Class-wise quick photo upload with client-side auto-compressor and print-ready dynamic ID card layout.
          </p>
        </div>
        <button
          type="button"
          disabled={selectedIdCardStudentIds.length === 0}
          onClick={() => setIsPrintingIdCards(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <Printer className="h-4 w-4" /> Print Selected ID Cards ({selectedIdCardStudentIds.length})
        </button>
      </div>

      {/* Class Selector and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Class:</span>
          <select
            value={idClassFilter}
            onChange={(e) => {
              setIdClassFilter(e.target.value);
              setSelectedIdCardStudentIds([]);
            }}
            className="text-xs font-bold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 cursor-pointer w-full sm:w-[180px]"
          >
            <option value="">-- Choose Class --</option>
            {sortClasses(
              Array.from(
                new Set([
                  ...filteredSortedClasses.map((cls: any) => getCleanClassKey(cls.name, cls.section)),
                  ...students.map((std: any) => getCleanClassKey(std.class, std.section)),
                ])
              ).filter(Boolean)
            ).map((clsKey: string) => (
              <option key={clsKey} value={clsKey}>{normalizeDisplayClassName(clsKey)}</option>
            ))}
          </select>
        </div>

        {idClassFilter && (
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
              <input
                type="checkbox"
                id="select-all-idcards"
                checked={
                  students.filter(s => matchStudentToClass(s, idClassFilter)).length > 0 &&
                  students.filter(s => matchStudentToClass(s, idClassFilter)).every(s => selectedIdCardStudentIds.includes(s.id))
                }
                onChange={(e) => {
                  const classStds = students.filter(s => matchStudentToClass(s, idClassFilter));
                  if (e.target.checked) {
                    setSelectedIdCardStudentIds(classStds.map(s => s.id));
                  } else {
                    setSelectedIdCardStudentIds([]);
                  }
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="select-all-idcards" className="cursor-pointer">Select All Class</label>
            </div>
            <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full">
              {students.filter(s => matchStudentToClass(s, idClassFilter)).length} Students
            </span>
          </div>
        )}
      </div>

      {/* Roster Grid */}
      {!idClassFilter ? (
        <div className="bg-slate-50 border-2 border-dashed border-indigo-100 rounded-2xl py-12 text-center">
          <div className="text-3xl mb-2">🪪</div>
          <p className="text-xs font-bold text-slate-500">Select a class from the dropdown above to start managing photos and printing ID cards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {students
            .filter((s) => matchStudentToClass(s, idClassFilter))
            .map((std) => (
              <div
                key={std.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 transition-all relative ${
                  selectedIdCardStudentIds.includes(std.id)
                    ? "border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/5"
                    : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                {/* Checkbox selector */}
                <div className="absolute top-3 left-3 z-10 bg-white rounded">
                  <input
                    type="checkbox"
                    checked={selectedIdCardStudentIds.includes(std.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIdCardStudentIds((prev) => [...prev, std.id]);
                      } else {
                        setSelectedIdCardStudentIds((prev) => prev.filter((id) => id !== std.id));
                      }
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                </div>

                {/* Photo Box */}
                <div className="flex flex-col items-center gap-2 mt-2">
                  <div className="h-24 w-24 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center bg-slate-50 relative group">
                    {std.photoUrl ? (
                      <img src={std.photoUrl} alt={std.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-slate-400 font-extrabold text-2xl uppercase">
                        {std.name.substring(0, 2)}
                      </span>
                    )}
                    {compressingStudentId === std.id && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-bold">
                        Compress...
                      </div>
                    )}
                  </div>
                  
                  {/* File input */}
                  <label className="text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-1.5 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4zm3 10a3 3 0 116 0H7zm6-3a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" /><path d="M12 9a1 1 0 100-2 1 1 0 000 2z" /></svg>
                    <span>{std.photoUrl ? "Change Photo" : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) compressAndUploadPhoto(std.id, file);
                      }}
                    />
                  </label>
                </div>

                {/* Info details */}
                <div className="border-t border-slate-100 pt-3 text-center">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{std.name}</h4>
                  <div className="flex justify-center gap-2 mt-1 text-[9px] font-bold text-slate-400 uppercase">
                    <span>ADM: {std.admissionNo}</span>
                    <span>&bull;</span>
                    <span>ROLL: {std.rollNo || "N/A"}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Print ID Cards Overlay */}
      {isPrintingIdCards && (
        <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto flex flex-col p-6 print:p-0 print:bg-white">
          {/* Controls Bar - Hidden in printing */}
          <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-lg w-full max-w-5xl mx-auto mb-6 print:hidden">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">ID Card Print Layout</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Ready to print. Click Print to open browser settings, or back to adjust selection.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPrintingIdCards(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm text-slate-700"
              >
                Back to Grid
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Open Print Menu
              </button>
            </div>
          </div>

          {/* ID Cards Layout Canvas */}
          <div className="flex-1 w-full max-w-5xl mx-auto bg-slate-100/50 p-8 rounded-3xl border border-slate-200 shadow-inner overflow-y-auto print:p-0 print:bg-white print:border-none print:shadow-none">
            <div id="idcards-print-area" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center items-center print:grid-cols-3 print:gap-4 print:p-0">
              {students
                .filter((s) => selectedIdCardStudentIds.includes(s.id))
                .map((std) => (
                  <div
                    key={std.id}
                    className="w-[54mm] h-[86mm] bg-white border border-slate-200 rounded-[16px] shadow-[0_4px_20px_rgba(99,102,241,0.06)] relative overflow-hidden flex flex-col justify-between p-3.5 select-none print:shadow-none print:border-slate-300 shrink-0 mx-auto"
                    style={{ pageBreakInside: "avoid" }}
                  >
                    {/* Top Accent Gradient Bar */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
                    
                    {/* Watermark Logo Background */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                      <img src="/logo.png" alt="" className="w-16 h-16 object-contain" />
                    </div>

                    {/* Header School Banner */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 relative z-10">
                      <img src="/logo.png" alt="St. G.N.G. School Logo" className="h-8 w-8 object-contain shrink-0" />
                      <div className="text-left min-w-0 flex-1">
                        <h4 className="text-[9.5px] font-black text-indigo-950 uppercase tracking-tight truncate leading-none font-sans">
                          St. G.N.G. School
                        </h4>
                        <p className="text-[5px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-0.5">
                          Varanasi &bull; CBSE Affiliated
                        </p>
                      </div>
                    </div>

                    {/* Middle Section (Photo & Name) */}
                    <div className="flex flex-col items-center mt-2.5 shrink-0 relative z-10">
                      <div className="h-[25mm] w-[24mm] rounded-[10px] border-[1.5px] border-indigo-100 shadow-md flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {std.photoUrl ? (
                          <img src={std.photoUrl} alt={std.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-indigo-300 font-black text-[12px] uppercase">
                            {std.name.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/80 text-[4.5px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase mt-2 leading-none">
                        STUDENT ID
                      </span>
                      
                      <h5 className="text-[9.5px] font-black text-slate-800 uppercase mt-2 tracking-tight text-center leading-tight truncate w-full font-sans">
                        {std.name}
                      </h5>
                    </div>

                    {/* Details Grid inside a neat card */}
                    <div className="px-2 py-1.5 bg-slate-50/80 border border-slate-100 rounded-xl mt-2 flex-1 flex flex-col justify-center relative z-10 space-y-1">
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Class-Sec</span>
                        <span className="text-slate-800 font-black">{std.class}-{std.section}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Roll Number</span>
                        <span className="text-slate-800 font-black">{std.rollNo || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Admission No</span>
                        <span className="text-slate-800 font-black">{std.admissionNo}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500 border-b border-slate-100/50 pb-0.5">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Father's Name</span>
                        <span className="text-slate-800 font-black uppercase truncate max-w-[28mm]">{std.fatherName || std.parentName || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1 font-extrabold text-[5px] uppercase text-slate-400">Contact No</span>
                        <span className="text-slate-800 font-black">{std.fatherMobile || std.parentPhone || "N/A"}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between gap-1 mt-2 shrink-0 relative z-10">
                      {/* Barcode lines */}
                      <div className="flex items-center gap-[1.5px] h-3 select-none opacity-85 shrink-0">
                        {[1, 2, 1, 3, 1, 2, 1, 4, 1, 2, 1, 3, 2, 1].map((w, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-900 inline-block h-[12px]"
                            style={{ width: `${w}px` }}
                          />
                        ))}
                      </div>
                      
                      <div className="text-center select-none shrink-0 pr-1">
                        <span className="font-mono text-[6.5px] font-black text-indigo-600 block italic leading-none" style={{ transform: "rotate(-3deg)" }}>
                          S.K. Sen
                        </span>
                        <span className="text-[4.5px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5 leading-none">
                          Principal
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Print Styling Override */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #idcards-print-area, #idcards-print-area * {
                visibility: visible;
              }
              #idcards-print-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: white !important;
                box-sizing: border-box;
                padding: 10mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 15px !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
