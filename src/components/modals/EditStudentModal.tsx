"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  User,
  GraduationCap,
  Users,
  Bus,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Sparkles,
  ShieldCheck,
  Award,
} from "lucide-react";

interface EditStudentModalProps {
  isOpen: boolean;
  student: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditStudentModal({
  isOpen,
  student,
  onClose,
  onSuccess,
}: EditStudentModalProps) {
  const { classes, concessions, transportStops, editStudentDetails } = useAuth();

  const [activeTab, setActiveTab] = useState<"academic" | "personal" | "parents" | "transport">("academic");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [classVal, setClassVal] = useState("");
  const [section, setSection] = useState("A");
  const [rollNo, setRollNo] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [disability, setDisability] = useState("No");
  const [category, setCategory] = useState("General");
  const [religion, setReligion] = useState("Hinduism");
  const [motherTongue, setMotherTongue] = useState("Hindi");
  const [nationality, setNationality] = useState("Indian");

  // Parent states
  const [fatherName, setFatherName] = useState("");
  const [fatherMobile, setFatherMobile] = useState("");
  const [fatherAadhaar, setFatherAadhaar] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherMobile, setMotherMobile] = useState("");
  const [motherAadhaar, setMotherAadhaar] = useState("");
  const [address, setAddress] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentOccupation, setParentOccupation] = useState("");
  const [familyIncome, setFamilyIncome] = useState("");

  // Transport & Other
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [isRte, setIsRte] = useState(false);
  const [concessionId, setConcessionId] = useState("");
  const [transportMode, setTransportMode] = useState("Self");
  const [busRoute, setBusRoute] = useState("");
  const [busStop, setBusStop] = useState("");

  // Sync state whenever selected student changes
  useEffect(() => {
    if (student) {
      setName(student.name || "");
      setClassVal(student.class || "");
      setSection(student.section || "A");
      setRollNo(student.rollNo || "");
      setAdmissionNo(student.admissionNo || "");
      setStatus(student.status || "ACTIVE");
      setGender(student.gender || "");
      setDob(student.dob ? student.dob.split("T")[0] : "");
      setAadhaar(student.aadhaar || "");
      setDisability(student.disability || "No");
      setCategory(student.category || "General");
      setReligion(student.religion || "Hinduism");
      setMotherTongue(student.motherTongue || "Hindi");
      setNationality(student.nationality || "Indian");

      setFatherName(student.fatherName || student.parentName || "");
      setFatherMobile(student.fatherMobile || student.parentPhone || "");
      setFatherAadhaar(student.fatherAadhaar || "");
      setMotherName(student.motherName || "");
      setMotherMobile(student.motherMobile || "");
      setMotherAadhaar(student.motherAadhaar || "");
      setAddress(student.address || "");
      setParentEmail(student.parentEmail || "");
      setParentOccupation(student.parentOccupation || "");
      setFamilyIncome(student.familyIncome || "");

      setEmergencyName(student.emergencyName || "");
      setEmergencyPhone(student.emergencyPhone || "");
      setIsRte(Boolean(student.isRte));
      setConcessionId(student.concessionId || "");
      setTransportMode(student.transportMode || "Self");
      setBusRoute(student.busRoute || "");
      setBusStop(student.busStop || "");

      setActiveTab("academic");
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  // Extract unique sorted list of class names from system classes
  const availableClassNames = Array.from(
    new Set(classes.map((c) => c.name))
  ).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  // If currently assigned class name is not in classes, append it
  if (classVal && !availableClassNames.includes(classVal)) {
    availableClassNames.unshift(classVal);
  }

  // Common sections
  const availableSections = ["A", "B", "C", "D", "E"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const payload: any = {
        name: name.trim(),
        classVal: classVal.trim(),
        section: section.trim(),
        rollNo: rollNo.trim(),
        admissionNo: admissionNo.trim(),
        status,
        gender,
        dob: dob || null,
        aadhaar: aadhaar.trim() || null,
        disability,
        category,
        religion,
        motherTongue,
        nationality,
        fatherName: fatherName.trim(),
        fatherMobile: fatherMobile.trim(),
        fatherAadhaar: fatherAadhaar.trim() || null,
        motherName: motherName.trim() || null,
        motherMobile: motherMobile.trim() || null,
        motherAadhaar: motherAadhaar.trim() || null,
        address: address.trim(),
        parentEmail: parentEmail.trim() || null,
        parentOccupation: parentOccupation.trim() || null,
        familyIncome: familyIncome.trim() || null,
        emergencyName: emergencyName.trim() || null,
        emergencyPhone: emergencyPhone.trim() || null,
        isRte,
        concessionId: concessionId || null,
        transportMode,
        busRoute: transportMode === "Bus" ? busRoute.trim() : null,
        busStop: transportMode === "Bus" ? busStop.trim() : null,
      };

      const result = await editStudentDetails(student.id, payload);

      if (result && result.success) {
        setSuccessMessage("Student details updated successfully!");
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMessage(result?.error || "Failed to update student profile.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  // Initials for avatar
  const initials = (name || student.name || "ST")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/70 rounded-3xl max-w-3xl w-full shadow-[0_16px_40px_rgba(0,0,0,0.08)] relative flex flex-col max-h-[92vh] text-left animate-scale-in overflow-hidden">
        
        {/* ── 1. Top Header & Identity Card ── */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white flex flex-col gap-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-indigo-100 shadow-xs"
                />
              ) : (
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-base flex items-center justify-center shadow-md shadow-indigo-500/20 tracking-wider">
                  {initials}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-tight">
                    {name || student.name}
                  </h3>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        : status === "LEFT"
                        ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                        : "bg-rose-50 text-rose-700 border border-rose-200/60"
                    }`}
                  >
                    {status}
                  </span>
                  {isRte && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 inline-flex items-center gap-1">
                      <Award className="w-3 h-3" /> RTE 100%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-bold flex-wrap">
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/80 px-2 py-0.5 rounded-md font-extrabold">
                    Class {classVal || "—"} {section || ""}
                  </span>
                  <span>•</span>
                  <span>Roll: <strong className="text-slate-800">{rollNo || "Unassigned"}</strong></span>
                  <span>•</span>
                  <span>Adm: <strong className="text-slate-800">{admissionNo || "—"}</strong></span>
                  {student.familyCode && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700 font-extrabold bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md text-[10px]">
                        {student.familyCode}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-8 w-8 bg-slate-50 border border-slate-200/60 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── 2. Segmented Capsule Tab Bar ── */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 border border-slate-200/60 rounded-2xl text-xs font-bold mt-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("academic")}
              className={`flex-1 min-w-[130px] py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                activeTab === "academic"
                  ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Academic & Class</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex-1 min-w-[120px] py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                activeTab === "personal"
                  ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Info</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("parents")}
              className={`flex-1 min-w-[130px] py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                activeTab === "parents"
                  ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Parents & Address</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transport")}
              className={`flex-1 min-w-[130px] py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                activeTab === "transport"
                  ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Transport & RTE</span>
            </button>
          </div>
        </div>

        {/* ── 3. Scrollable Tab Contents ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ════ TAB 1: ACADEMIC & CLASS ════ */}
          {activeTab === "academic" && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/80 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Class & Section Correction:</strong>
                  <p className="text-[11px] text-indigo-700/90 mt-0.5">
                    Yahan se aap student ki class, section, roll number aur status instantly update kar sakte hain bina kisi manual script ke.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Class Name *
                  </label>
                  <select
                    required
                    value={classVal}
                    onChange={(e) => setClassVal(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="">Select Class</option>
                    {availableClassNames.map((cName) => (
                      <option key={cName} value={cName}>
                        Class {cName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Section *
                  </label>
                  <select
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="e.g. 26660"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">
                    Auto-validated for uniqueness within this class.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Admission Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={admissionNo}
                    onChange={(e) => setAdmissionNo(e.target.value)}
                    placeholder="e.g. 1176 or ADM-2026-001"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">
                    System-wide unique student identifier.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Student Lifecycle Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Regular Enrolled)</option>
                    <option value="LEFT">LEFT (TC Issued / Transferred)</option>
                    <option value="SUSPENDED">SUSPENDED (Temporarily On Hold)</option>
                    <option value="ALUMNI">ALUMNI (Passed Out)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 2: PERSONAL INFO ════ */}
          {activeTab === "personal" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Date of Birth (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Student Aadhaar (12 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 568667536944"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Religion
                  </label>
                  <input
                    type="text"
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Mother Tongue
                  </label>
                  <input
                    type="text"
                    value={motherTongue}
                    onChange={(e) => setMotherTongue(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Disability Status
                  </label>
                  <select
                    value={disability}
                    onChange={(e) => setDisability(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 3: PARENTS & ADDRESS ════ */}
          {activeTab === "parents" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Father's Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Father's Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={fatherMobile}
                    onChange={(e) => setFatherMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="10 digit mobile"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Mother's Full Name
                  </label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Mother's Mobile Phone
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={motherMobile}
                    onChange={(e) => setMotherMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="Optional 10 digits"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Father's Aadhaar Number
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={fatherAadhaar}
                    onChange={(e) => setFatherAadhaar(e.target.value.replace(/\D/g, ""))}
                    placeholder="12 digit Aadhaar"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Mother's Aadhaar Number
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={motherAadhaar}
                    onChange={(e) => setMotherAadhaar(e.target.value.replace(/\D/g, ""))}
                    placeholder="12 digit Aadhaar"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Residential Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full residential address..."
                    className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Parent Email
                  </label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Parent Occupation
                  </label>
                  <input
                    type="text"
                    value={parentOccupation}
                    onChange={(e) => setParentOccupation(e.target.value)}
                    placeholder="e.g. Business / Service"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 4: TRANSPORT & RTE ════ */}
          {activeTab === "transport" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                
                {/* RTE Card */}
                <div className="sm:col-span-2 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h5 className="font-black text-purple-900 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-600" />
                      RTE Admission Status (Right To Education)
                    </h5>
                    <p className="text-[11px] text-purple-700/80 mt-0.5">
                      RTE students receive 100% government fee waiver on all academic fees.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isRte}
                      onChange={(e) => setIsRte(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Concession Selection */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Fee Concession Category
                  </label>
                  <select
                    value={concessionId}
                    onChange={(e) => setConcessionId(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="">No Concession (Standard Fees)</option>
                    {concessions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.percentage}% off on {c.feeHeadName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transport Mode */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Transport Mode
                  </label>
                  <select
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                  >
                    <option value="Self">Self (No School Transport)</option>
                    <option value="Bus">School Bus Facility</option>
                  </select>
                </div>

                {/* Conditional Bus Route & Stop */}
                {transportMode === "Bus" && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Bus Route
                      </label>
                      <input
                        type="text"
                        value={busRoute}
                        onChange={(e) => setBusRoute(e.target.value)}
                        placeholder="e.g. Route 4 (Cantt to School)"
                        className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Bus Stop / Pick-up Point
                      </label>
                      <input
                        type="text"
                        value={busStop}
                        onChange={(e) => setBusStop(e.target.value)}
                        placeholder="e.g. Salarpur Chauraha"
                        className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                      />
                    </div>
                  </>
                )}

                {/* Emergency Contact */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Uncle / Guardian"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10 digit phone"
                    className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 font-mono"
                  />
                </div>

              </div>
            </div>
          )}

          {/* ── 4. Sticky Bottom Action Bar ── */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="py-2.5 px-5 border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/20 cursor-pointer inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Student Profile</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
