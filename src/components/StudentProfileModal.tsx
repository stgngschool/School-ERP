"use client";

import React, { useState, useEffect } from "react";
import { 
  X, User, ShieldAlert, Phone, Mail, MapPin, CreditCard, 
  Calendar, FileText, CheckCircle2, AlertCircle, Clock, Percent,
  TrendingDown, TrendingUp, Bus, Gift, Award
} from "lucide-react";

interface StudentProfileModalProps {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
}

export default function StudentProfileModal({ studentId, isOpen, onClose, isInline = false }: StudentProfileModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "fees" | "attendance" | "leaves" | "marks">("profile");

  // Photo uploading states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);

  // Marks saving states
  const [showAddMarkModal, setShowAddMarkModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newExamName, setNewExamName] = useState("Quarterly");
  const [newObtained, setNewObtained] = useState("");
  const [newMax, setNewMax] = useState("100");
  const [newRemarks, setNewRemarks] = useState("");
  const [savingMark, setSavingMark] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    setPhotoSuccess(false);

    // Validate type: strictly JPG/JPEG
    const isJpg = file.type === "image/jpeg" || file.type === "image/jpg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg");
    if (!isJpg) {
      setPhotoError("Only JPG/JPEG format is supported.");
      return;
    }

    // Validate size: <= 50KB
    const maxSize = 50 * 1024; // 50KB
    if (file.size > maxSize) {
      setPhotoError("Size must be under 50KB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("file", file);

      const res = await fetch("/api/students/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to upload photo.");
      }

      const json = await res.json();
      setPhotoSuccess(true);
      setData((prev: any) => prev ? { ...prev, photoUrl: json.photoUrl } : null);
    } catch (err: any) {
      setPhotoError(err.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newObtained || !newMax) return;

    setMarkError(null);
    setSavingMark(true);

    try {
      const res = await fetch(`/api/students/${studentId}/marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject,
          examName: newExamName,
          marksObtained: parseFloat(newObtained),
          maxMarks: parseFloat(newMax),
          remarks: newRemarks,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save mark entry.");
      }

      const json = await res.json();
      setData((prev: any) => {
        if (!prev) return null;
        const prevMarks: any[] = prev.marks || [];
        const existingIndex = prevMarks.findIndex(
          (m: any) => m.subject.toLowerCase() === newSubject.toLowerCase() && m.examName === newExamName
        );
        let updatedMarks = [...prevMarks];
        const newMarkObj = {
          id: json.mark.id,
          subject: json.mark.subject,
          examName: json.mark.examName,
          marksObtained: json.mark.marksObtained,
          maxMarks: json.mark.maxMarks,
          remarks: json.mark.remarks || "",
          createdAt: json.mark.createdAt,
        };
        if (existingIndex > -1) {
          updatedMarks[existingIndex] = newMarkObj;
        } else {
          updatedMarks.push(newMarkObj);
        }
        return { ...prev, marks: updatedMarks };
      });

      setNewSubject("");
      setNewObtained("");
      setNewRemarks("");
      setShowAddMarkModal(false);
    } catch (err: any) {
      setMarkError(err.message || "Failed to save mark.");
    } finally {
      setSavingMark(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/students/${studentId}`);
        if (!res.ok) {
          throw new Error("Failed to load student profile");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId, isOpen]);

  if (!isOpen) return null;

  // Helper: Format Paisa to Rupees
  const formatCurrency = (paisa: number) => {
    const rupees = paisa / 100;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(rupees);
  };

  // Calculations for Financials
  const getFinancialSummary = () => {
    if (!data || !data.ledgerEntries) return { totalCharged: 0, totalPaid: 0, totalDiscount: 0, outstanding: 0 };
    
    let totalCharged = 0;
    let totalPaid = 0;
    let totalDiscount = 0;

    data.ledgerEntries.forEach((entry: any) => {
      if (entry.entryType === "CHARGE" || entry.entryType === "FINE") {
        totalCharged += entry.amount;
      } else if (entry.entryType === "PAYMENT") {
        totalPaid += Math.abs(entry.amount);
      } else if (entry.entryType === "DISCOUNT" || entry.entryType === "REVERSAL") {
        totalDiscount += Math.abs(entry.amount);
      }
    });

    const outstanding = totalCharged - totalPaid - totalDiscount;

    return { totalCharged, totalPaid, totalDiscount, outstanding };
  };

  // Calculations for Attendance
  const getAttendanceSummary = () => {
    if (!data || !data.attendance || data.attendance.length === 0) return { percent: 0, present: 0, absent: 0, total: 0 };
    const total = data.attendance.length;
    const present = data.attendance.filter((a: any) => a.status === "PRESENT" || a.status === "LATE").length;
    const absent = data.attendance.filter((a: any) => a.status === "ABSENT").length;
    const leave = data.attendance.filter((a: any) => a.status === "LEAVE").length;
    
    // Percent calculated out of active days (present + late + absent)
    const activeDays = present + absent;
    const percent = activeDays > 0 ? Math.round((present / activeDays) * 100) : 100;

    return { percent, present, absent, leave, total };
  };

  const { totalCharged, totalPaid, totalDiscount, outstanding } = getFinancialSummary();
  const { percent: attendancePercent, present: attPresent, absent: attAbsent, leave: attLeave, total: attTotal } = getAttendanceSummary();

  if (!isInline && !isOpen) return null;

  return (
    <div className={isInline ? "w-full bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden" : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"}>
      <div className={isInline ? "w-full flex flex-col overflow-hidden" : "bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"}>
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-bold text-xl tracking-wider text-indigo-300 uppercase shadow-inner overflow-hidden">
              {data?.photoUrl ? (
                <img src={data.photoUrl} alt={data.name} className="h-full w-full object-cover" />
              ) : (
                data?.name ? data.name.substring(0, 2) : "ST"
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight">{data?.name || "Student Profile"}</h2>
                {data?.isRte && (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30">
                    RTE Student
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Class {data?.class?.name}-{data?.class?.section} &bull; Roll No: {data?.rollNo || "N/A"} &bull; Adm: {data?.admissionNo || "N/A"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
            title={isInline ? "Back to Student Directory" : "Close window"}
          >
            {isInline ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>Back</span>
              </>
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-sm font-semibold text-slate-500">Loading student details...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-rose-500" />
            <h3 className="text-base font-bold text-slate-800">Error Loading Profile</h3>
            <p className="text-xs text-slate-500 max-w-sm">{error}</p>
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
            {/* Tabs Selector */}
            <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-2 flex space-x-1 shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === "profile" 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Profile Info</span>
              </button>
              <button
                onClick={() => setActiveTab("fees")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === "fees" 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Fees & Ledger</span>
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === "attendance" 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Attendance</span>
              </button>
              <button
                onClick={() => setActiveTab("leaves")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === "leaves" 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Leave Requests</span>
              </button>
              <button
                onClick={() => setActiveTab("marks")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === "marks" 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Marks & Progress</span>
              </button>
            </div>

            {/* Scrollable View Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              
              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  
                  {/* Quick Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center overflow-hidden shrink-0">
                        {data.photoUrl ? (
                          <img src={data.photoUrl} alt="Student" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Photo</p>
                        <label className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer mt-1 block">
                          {uploadingPhoto ? "Saving..." : "Upload JPG"}
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,image/jpeg" 
                            className="hidden" 
                            onChange={handlePhotoUpload} 
                            disabled={uploadingPhoto}
                          />
                        </label>
                        {photoError && <p className="text-[8px] text-rose-500 font-semibold truncate mt-0.5">{photoError}</p>}
                        {photoSuccess && <p className="text-[8px] text-emerald-500 font-semibold truncate mt-0.5">Success!</p>}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
                        <p className="text-sm font-black text-slate-700 mt-0.5">{data.status || "ACTIVE"}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Percent className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Percentage</p>
                        <p className="text-sm font-black text-slate-700 mt-0.5">{attendancePercent}% ({attPresent}/{attTotal} days)</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Dues</p>
                        <p className={`text-sm font-black mt-0.5 ${outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {formatCurrency(outstanding)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal & Parent Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Student Personal Info */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center space-x-1.5 text-indigo-600">
                        <span>Personal Information</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold">Date of Birth</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.dob || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Aadhaar Number</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.aadhaar || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Category</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.category || "General"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Religion</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.religion || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Mother Tongue</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.motherTongue || "Hindi"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Nationality</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.nationality || "Indian"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Admission Date</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.admissionDate || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Blood Group / Disability</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.disability || "None"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Parents Details */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center space-x-1.5 text-indigo-600">
                        <span>Parent / Guardian Details</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold">Father's Name</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.fatherName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Mother's Name</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.motherName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Father's Mobile</p>
                          <p className="font-semibold text-slate-700 mt-0.5 flex items-center space-x-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{data.fatherMobile || "N/A"}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Mother's Mobile</p>
                          <p className="font-semibold text-slate-700 mt-0.5 flex items-center space-x-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{data.motherMobile || "N/A"}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Parent Email</p>
                          <p className="font-semibold text-slate-700 mt-0.5 flex items-center space-x-1 truncate">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{data.parent?.email || "N/A"}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Family Code</p>
                          <p className="font-black text-indigo-600 mt-0.5">{data.parent?.familyCode || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Parent Occupation</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.parentOccupation || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Family Annual Income</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.familyIncome || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Father's Aadhaar</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.fatherAadhaar || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Mother's Aadhaar</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.motherAadhaar || "N/A"}</p>
                        </div>
                      </div>
                      <div className="border-t pt-3 mt-2 text-xs">
                        <p className="text-slate-400 font-bold">Residential Address</p>
                        <p className="font-semibold text-slate-700 mt-1 flex items-start space-x-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{data.parent?.address || "N/A"}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Previous Schooling & Emergency Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Previous Schooling details */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 text-indigo-600 flex items-center space-x-1.5">
                        <span>Previous Academic Details</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold">Previous School</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.prevSchoolName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Previous Class Passed</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.prevClassPassed || "N/A"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-400 font-bold">Transfer Certificate (TC) No.</p>
                          <p className="font-semibold text-slate-700 mt-0.5 font-mono">{data.tcNumber || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contacts */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 text-indigo-600 flex items-center space-x-1.5">
                        <span>Emergency Contact Info</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold">Emergency Contact Person</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.emergencyName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Emergency Contact Phone</p>
                          <p className="font-semibold text-slate-700 mt-0.5 flex items-center space-x-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{data.emergencyPhone || "N/A"}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Academic, Concessions & Transport Info */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 text-indigo-600">
                      Academic, Concessions & Transport Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                      <div className="space-y-2">
                        <div>
                          <p className="text-slate-400 font-bold">Class Teacher</p>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {data.class?.classTeacher?.name || "Not Assigned"}
                          </p>
                          {data.class?.classTeacher && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {data.class.classTeacher.email} &bull; {data.class.classTeacher.phone}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">Board Registration No.</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{data.boardRegNo || "N/A"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-slate-400 font-bold">Transport Mode</p>
                          <p className="font-semibold text-slate-700 mt-0.5 flex items-center space-x-1">
                            <Bus className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{data.transportMode || "Self Transport"}</span>
                          </p>
                        </div>
                        {(data.busRoute || data.busStop) && (
                          <div>
                            <p className="text-slate-400 font-bold">Bus Route / Stop</p>
                            <p className="font-semibold text-slate-700 mt-0.5">
                              Route: {data.busRoute || "N/A"} &bull; Stop: {data.busStop || "N/A"}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-slate-400 font-bold">Concession Profile</p>
                          {data.concession ? (
                            <div className="mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center space-x-2 text-emerald-800">
                              <Gift className="h-4 w-4 text-emerald-600 shrink-0" />
                              <div>
                                <p className="font-bold">{data.concession.name}</p>
                                <p className="text-[10px] text-emerald-600">{data.concession.percentage}% discount on {data.concession.feeHeadName}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="font-semibold text-slate-500 mt-0.5">No Concessions applied</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FEES & FINANCIAL TAB */}
              {activeTab === "fees" && (
                <div className="space-y-6">
                  
                  {/* Financial Mini Overview Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Charged</p>
                      <p className="text-lg font-black text-slate-700 mt-1">{formatCurrency(totalCharged)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Paid</p>
                      <p className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Concessions / Discounts</p>
                      <p className="text-lg font-black text-indigo-600 mt-1">{formatCurrency(totalDiscount)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Balance</p>
                      <p className={`text-lg font-black mt-1 ${outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatCurrency(outstanding)}
                      </p>
                    </div>
                  </div>

                  {/* Ledger History */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-indigo-600">
                        Financial Ledger Entries
                      </h3>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400">
                          <th className="p-3">Date</th>
                          <th className="p-3">Description</th>
                          <th className="p-3">Fee Head</th>
                          <th className="p-3">Type</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3">Marked By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.ledgerEntries && data.ledgerEntries.length > 0 ? (
                          data.ledgerEntries.map((entry: any) => {
                            const isDebit = entry.entryType === "CHARGE" || entry.entryType === "FINE";
                            return (
                              <tr key={entry.id} className="hover:bg-slate-50/50">
                                <td className="p-3 text-slate-500">
                                  {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </td>
                                <td className="p-3 font-semibold text-slate-700">{entry.description}</td>
                                <td className="p-3 text-slate-500">{entry.feeHead?.name || "N/A"}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isDebit 
                                      ? "bg-rose-50 text-rose-600 border border-rose-100" 
                                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  }`}>
                                    {entry.entryType}
                                  </span>
                                </td>
                                <td className={`p-3 text-right font-black ${isDebit ? "text-slate-800" : "text-emerald-600"}`}>
                                  {isDebit ? "" : "-"}{formatCurrency(Math.abs(entry.amount))}
                                </td>
                                <td className="p-3 text-slate-500">{entry.createdBy}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400 font-semibold">
                              No financial entries recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Receipts */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-indigo-600">
                        Payment Receipts Log
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {data.receipts && data.receipts.length > 0 ? (
                        data.receipts.map((rec: any) => (
                          <div key={rec.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-800 text-sm">{rec.receiptNumber}</span>
                                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">
                                  {rec.paymentMethod}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Date: {new Date(rec.createdAt).toLocaleString("en-IN")} &bull; Marked by: {rec.createdBy}
                              </p>
                              {rec.transactionReference && (
                                <p className="text-[10px] text-slate-500 font-semibold">Ref: {rec.transactionReference}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-left md:text-right">
                                <p className="text-[10px] text-slate-400 font-bold">Amount Paid</p>
                                <p className="text-sm font-black text-emerald-600">{formatCurrency(rec.amountPaid)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-xs font-semibold text-slate-400">
                          No payment receipts found for this student.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ATTENDANCE TAB */}
              {activeTab === "attendance" && (
                <div className="space-y-6">
                  
                  {/* Attendance Stats Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {attendancePercent}%
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Rate</p>
                        <p className="text-sm font-black text-slate-700 mt-0.5">Overall Rating</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        {attPresent}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Present Days</p>
                        <p className="text-sm font-black text-slate-700 mt-0.5">Active Presence</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        {attAbsent}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Absent Days</p>
                        <p className="text-sm font-black text-slate-700 mt-0.5">Missed classes</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        {attLeave}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approved Leave</p>
                        <p className="text-sm font-black text-slate-700 mt-0.5">Official Exemption</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-indigo-600">
                        Attendance Logs
                      </h3>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400">
                          <th className="p-3">Date</th>
                          <th className="p-3">Day</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Marked On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.attendance && data.attendance.length > 0 ? (
                          data.attendance.map((att: any) => {
                            const dateObj = new Date(att.date + "T00:00:00");
                            const dayName = dateObj.toLocaleDateString("en-IN", { weekday: "long" });
                            
                            let badgeStyle = "";
                            if (att.status === "PRESENT") badgeStyle = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                            else if (att.status === "ABSENT") badgeStyle = "bg-rose-50 text-rose-600 border border-rose-100";
                            else if (att.status === "LATE") badgeStyle = "bg-orange-50 text-orange-600 border border-orange-100";
                            else badgeStyle = "bg-slate-100 text-slate-600 border border-slate-200";

                            return (
                              <tr key={att.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-700">
                                  {dateObj.toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </td>
                                <td className="p-3 text-slate-500">{dayName}</td>
                                <td className="p-3">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                                    {att.status}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-500">
                                  {new Date(att.createdAt).toLocaleDateString("en-IN")}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-semibold">
                              No attendance data marked for this student.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LEAVE REQUESTS TAB */}
              {activeTab === "leaves" && (
                <div className="space-y-6">
                  
                  {/* Leave Requests Logs */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-indigo-600">
                        Leave Request Records
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {data.leaveRequests && data.leaveRequests.length > 0 ? (
                        data.leaveRequests.map((leave: any) => {
                          let badgeColor = "bg-amber-50 border-amber-100 text-amber-700";
                          let Icon = Clock;
                          if (leave.status === "APPROVED") {
                            badgeColor = "bg-emerald-50 border-emerald-100 text-emerald-700";
                            Icon = CheckCircle2;
                          } else if (leave.status === "REJECTED") {
                            badgeColor = "bg-rose-50 border-rose-100 text-rose-700";
                            Icon = AlertCircle;
                          }

                          return (
                            <div key={leave.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-700 text-xs">
                                    Duration: {new Date(leave.startDate + "T00:00:00").toLocaleDateString("en-IN")} - {new Date(leave.endDate + "T00:00:00").toLocaleDateString("en-IN")}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center space-x-1 ${badgeColor}`}>
                                    <Icon className="h-2.5 w-2.5" />
                                    <span>{leave.status}</span>
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-semibold mt-1">Reason: "{leave.reason}"</p>
                                {leave.remarks && (
                                  <p className="text-xs text-slate-600 font-bold bg-white p-2 rounded-lg border border-slate-100 mt-2">
                                    Teacher Remarks: <span className="font-semibold text-slate-500">"{leave.remarks}"</span>
                                  </p>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 whitespace-nowrap self-end md:self-start">
                                Requested on: {new Date(leave.createdAt).toLocaleDateString("en-IN")}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center py-6 text-xs font-semibold text-slate-400">
                          No leave applications filed yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MARKS & RESULTS TAB */}
              {activeTab === "marks" && (
                <div className="space-y-6">
                  {/* Marks overview cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Aggregate</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1">
                        {(() => {
                          if (!data.marks || data.marks.length === 0) return "N/A";
                          const totalMax = data.marks.reduce((sum: number, m: any) => sum + m.maxMarks, 0);
                          const totalObt = data.marks.reduce((sum: number, m: any) => sum + m.marksObtained, 0);
                          return totalMax > 0 ? `${Math.round((totalObt / totalMax) * 100)}%` : "N/A";
                        })()}
                      </h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Subjects</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1">
                        {data.marks ? Array.from(new Set(data.marks.map((m: any) => m.subject))).length : 0}
                      </h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Exams Recorded</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1">
                        {data.marks ? Array.from(new Set(data.marks.map((m: any) => m.examName))).length : 0}
                      </h3>
                    </div>
                    
                    {/* Add Exam Marks button */}
                    <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-center">
                      <button
                        onClick={() => setShowAddMarkModal(true)}
                        className="w-full h-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>+ Add Exam Mark</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Exams scorecards */}
                  <div className="space-y-6">
                    {data.marks && data.marks.length > 0 ? (
                      Array.from(new Set(data.marks.map((m: any) => m.examName))).map((examName: any) => {
                        const examMarks = data.marks.filter((m: any) => m.examName === examName);
                        const totalObtained = examMarks.reduce((sum: number, m: any) => sum + m.marksObtained, 0);
                        const totalMax = examMarks.reduce((sum: number, m: any) => sum + m.maxMarks, 0);
                        const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                        
                        let grade = "F";
                        if (percentage >= 90) grade = "A+";
                        else if (percentage >= 80) grade = "A";
                        else if (percentage >= 70) grade = "B";
                        else if (percentage >= 60) grade = "C";
                        else if (percentage >= 50) grade = "D";
                        else if (percentage >= 40) grade = "E";

                        return (
                          <div key={examName} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                                  {examName} Examination
                                </h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                  Aggregate: {totalObtained} / {totalMax} &bull; {percentage}% &bull; Grade: {grade}
                                </p>
                              </div>
                            </div>
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-white border-b border-slate-100 font-bold text-slate-400">
                                  <th className="p-3">Subject</th>
                                  <th className="p-3 text-center">Marks Obtained</th>
                                  <th className="p-3 text-center">Max Marks</th>
                                  <th className="p-3 text-center">Percentage</th>
                                  <th className="p-3">Remarks / Teacher Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {examMarks.map((mark: any) => (
                                  <tr key={mark.id} className="hover:bg-slate-50/20">
                                    <td className="p-3 font-semibold text-slate-700">{mark.subject}</td>
                                    <td className="p-3 text-center font-bold text-slate-800">{mark.marksObtained}</td>
                                    <td className="p-3 text-center text-slate-500">{mark.maxMarks}</td>
                                    <td className="p-3 text-center font-black text-indigo-600">
                                      {mark.maxMarks > 0 ? `${Math.round((mark.marksObtained / mark.maxMarks) * 100)}%` : "N/A"}
                                    </td>
                                    <td className="p-3 text-slate-500 italic">{mark.remarks || "No remarks"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center text-slate-400 font-semibold italic">
                        No academic marks records found for this student.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* Add Marks Form Modal Overlay */}
      {showAddMarkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Add Exam Mark Entry</h3>
              <button 
                onClick={() => {
                  setShowAddMarkModal(false);
                  setMarkError(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMark} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Exam Name</label>
                <select 
                  value={newExamName} 
                  onChange={(e) => setNewExamName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half Yearly">Half Yearly</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Subject</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mathematics, Science"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Marks Obtained</label>
                  <input 
                    type="number" 
                    step="0.5"
                    placeholder="e.g. 85"
                    value={newObtained}
                    onChange={(e) => setNewObtained(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Maximum Marks</label>
                  <input 
                    type="number" 
                    step="1"
                    placeholder="e.g. 100"
                    value={newMax}
                    onChange={(e) => setNewMax(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Remarks (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Excellent work!"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:border-indigo-600"
                />
              </div>

              {markError && <p className="text-xs text-rose-500 font-semibold">{markError}</p>}

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddMarkModal(false);
                    setMarkError(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingMark}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
                >
                  {savingMark ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
