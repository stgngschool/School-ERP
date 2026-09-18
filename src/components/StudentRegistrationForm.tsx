"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ModernDatePicker from "@/components/ModernDatePicker";
import { getLocalDateString } from "@/lib/dateUtils";
import { sortClasses, sortClassObjects, isGhostClassName } from "@/lib/classUtils";
import {
  PlusCircle,
  Check,
  Loader2,
  Users,
  Home,
  Bus,
  Sparkles,
  DollarSign,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from "lucide-react";

interface StudentRegistrationFormProps {
  onSuccess?: (student?: any) => void;
  onCancel?: () => void;
}

export default function StudentRegistrationForm({
  onSuccess,
  onCancel,
}: StudentRegistrationFormProps) {
  const {
    classes,
    students,
    feeStructures,
    addStudent,
    showToast,
    refreshStudents,
    refreshBilling,
  } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Section 1: Personal & Demographics Form State
  const [stdName, setStdName] = useState("");
  const [stdDob, setStdDob] = useState("");
  const [stdGender, setStdGender] = useState("");
  const [stdAdmissionNo, setStdAdmissionNo] = useState("");
  const [stdRollNo, setStdRollNo] = useState("");
  const [stdAadhaar, setStdAadhaar] = useState("");
  const [stdCategory, setStdCategory] = useState("General");
  const [stdReligion, setStdReligion] = useState("Hinduism");
  const [stdDisability, setStdDisability] = useState("No");
  const [stdMotherTongue, setStdMotherTongue] = useState("Hindi");
  const [stdNationality, setStdNationality] = useState("Indian");
  const [stdIsRte, setStdIsRte] = useState(false);

  // Section 2: Academic History & Admissions
  const [stdClass, setStdClass] = useState("");
  const [stdSection, setStdSection] = useState("");
  const [stdAdmissionDate, setStdAdmissionDate] = useState(getLocalDateString());
  const [stdBoardRegNo, setStdBoardRegNo] = useState("");
  const [stdPrevSchoolName, setStdPrevSchoolName] = useState("");
  const [stdPrevClassPassed, setStdPrevClassPassed] = useState("");
  const [stdTcNumber, setStdTcNumber] = useState("");

  // Section 3: Family Details & Household Finance
  const [stdFamilyIdMode, setStdFamilyIdMode] = useState<"auto" | "existing">("auto");
  const [stdSelectedFamilyCode, setStdSelectedFamilyCode] = useState("");
  const [stdFatherName, setStdFatherName] = useState("");
  const [stdMotherName, setStdMotherName] = useState("");
  const [stdFatherMobile, setStdFatherMobile] = useState("");
  const [stdMotherMobile, setStdMotherMobile] = useState("");
  const [stdFatherAadhaar, setStdFatherAadhaar] = useState("");
  const [stdMotherAadhaar, setStdMotherAadhaar] = useState("");
  const [stdAddress, setStdAddress] = useState("");
  const [stdParentEmail, setStdParentEmail] = useState("");
  const [stdParentOccupation, setStdParentOccupation] = useState("");
  const [stdFamilyIncome, setStdFamilyIncome] = useState("");
  const [stdEmergencyName, setStdEmergencyName] = useState("");
  const [stdEmergencyPhone, setStdEmergencyPhone] = useState("");

  // Section 4: Transport & Initial Fee Allocation
  const [stdTransportMode, setStdTransportMode] = useState("Self");
  const [stdBusRoute, setStdBusRoute] = useState("");
  const [stdBusStop, setStdBusStop] = useState("");
  const [stdStartingFeeMonth, setStdStartingFeeMonth] = useState("April");
  const [checkedDues, setCheckedDues] = useState<Record<string, boolean>>({});

  // Memoized unique family codes for sibling linkage
  const parentFamilies = useMemo(() => {
    const familiesMap = new Map<
      string,
      {
        familyCode: string;
        parentName: string;
        parentPhone: string;
        parentEmail: string;
        address: string;
        parentOccupation: string;
        familyIncome: string;
        emergencyName: string;
        emergencyPhone: string;
        motherName: string;
        motherMobile: string;
        fatherAadhaar: string;
        motherAadhaar: string;
      }
    >();

    (students || []).forEach((s: any) => {
      if (s.familyCode) {
        familiesMap.set(s.familyCode, {
          familyCode: s.familyCode,
          parentName: s.parentName || s.fatherName || "",
          parentPhone: s.parentPhone || s.fatherMobile || "",
          parentEmail: s.parentEmail || "",
          address: s.address || "",
          parentOccupation: s.parentOccupation || "",
          familyIncome: s.familyIncome || "",
          emergencyName: s.emergencyName || "",
          emergencyPhone: s.emergencyPhone || "",
          motherName: s.motherName || "",
          motherMobile: s.motherMobile || "",
          fatherAadhaar: s.fatherAadhaar || "",
          motherAadhaar: s.motherAadhaar || "",
        });
      }
    });

    return Array.from(familiesMap.values());
  }, [students]);

  // Prefill parent fields when an existing sibling's family code is chosen
  useEffect(() => {
    if (stdFamilyIdMode === "existing" && stdSelectedFamilyCode) {
      const fam = parentFamilies.find((f) => f.familyCode === stdSelectedFamilyCode);
      if (fam) {
        setStdFatherName(fam.parentName);
        setStdFatherMobile(fam.parentPhone);
        setStdParentEmail(fam.parentEmail);
        setStdAddress(fam.address);
        setStdParentOccupation(fam.parentOccupation);
        setStdFamilyIncome(fam.familyIncome);
        setStdEmergencyName(fam.emergencyName);
        setStdEmergencyPhone(fam.emergencyPhone);
        setStdMotherName(fam.motherName);
        setStdMotherMobile(fam.motherMobile);
        setStdFatherAadhaar(fam.fatherAadhaar);
        setStdMotherAadhaar(fam.motherAadhaar);
      }
    }
  }, [stdFamilyIdMode, stdSelectedFamilyCode, parentFamilies]);

  // Clean active classes
  const filteredSortedClasses = useMemo(() => {
    return sortClassObjects(
      (classes || []).filter((c: any) => c && c.name && !isGhostClassName(c.name))
    );
  }, [classes]);

  const uniqueClassNames = useMemo(() => {
    return sortClasses(Array.from(new Set(filteredSortedClasses.map((c: any) => c.name))));
  }, [filteredSortedClasses]);

  // Filter fee structures relevant to selected class
  const classFeeStructures = useMemo(() => {
    return (feeStructures || []).filter(
      (s: any) => s.className === stdClass || s.className === "All Classes"
    );
  }, [feeStructures, stdClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stdName.trim()) {
      showToast("error", "Validation Error", "Student full name is required.");
      return;
    }
    if (!stdDob) {
      showToast("error", "Validation Error", "Date of birth is required.");
      return;
    }
    if (!stdClass) {
      showToast("error", "Validation Error", "Please select a Class.");
      return;
    }
    if (!stdFatherName.trim()) {
      showToast("error", "Validation Error", "Father's name is required.");
      return;
    }
    if (!stdFatherMobile.trim()) {
      showToast("error", "Validation Error", "Father's 10-digit mobile number is required.");
      return;
    }
    if (!stdAddress.trim()) {
      showToast("error", "Validation Error", "Residential address is required.");
      return;
    }

    const initialDues: { name: string; amount: number }[] = [];
    Object.keys(checkedDues).forEach((h) => {
      if (checkedDues[h]) {
        const struct = feeStructures.find((s) => s.name === h);
        const amount = struct ? struct.total : 700;
        initialDues.push({ name: h, amount });
      }
    });

    const studentData = {
      name: stdName.trim(),
      classVal: stdClass,
      section: stdSection || "A",
      dob: stdDob,
      aadhaar: stdAadhaar.trim(),
      disability: stdDisability,
      fatherName: stdFatherName.trim(),
      motherName: stdMotherName.trim(),
      fatherMobile: stdFatherMobile.trim(),
      motherMobile: stdMotherMobile.trim(),
      fatherAadhaar: stdFatherAadhaar.trim(),
      address: stdAddress.trim(),
      parentEmail: stdParentEmail.trim(),
      category: stdCategory,
      religion: stdReligion,
      motherTongue: stdMotherTongue,
      nationality: stdNationality,
      admissionDate: stdAdmissionDate,
      boardRegNo: stdBoardRegNo.trim(),
      prevSchoolName: stdPrevSchoolName.trim(),
      prevClassPassed: stdPrevClassPassed.trim(),
      tcNumber: stdTcNumber.trim(),
      parentOccupation: stdParentOccupation.trim(),
      familyIncome: stdFamilyIncome.trim(),
      emergencyName: stdEmergencyName.trim(),
      emergencyPhone: stdEmergencyPhone.trim(),
      motherAadhaar: stdMotherAadhaar.trim(),
      transportMode: stdTransportMode,
      busRoute: stdBusRoute.trim(),
      busStop: stdBusStop.trim(),
      familyCode: stdFamilyIdMode === "existing" ? stdSelectedFamilyCode : undefined,
      isRte: stdIsRte,
      startingFeeMonth: stdStartingFeeMonth,
      admissionNo: stdAdmissionNo.trim() || undefined,
      rollNo: stdRollNo.trim() || undefined,
      gender: stdGender || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await addStudent(studentData, initialDues);
      if (res && res.success) {
        showToast(
          "success",
          "Student Registered Successfully",
          `Profile for "${stdName}" created and academic dues initialized.`
        );
        await Promise.all([refreshStudents(), refreshBilling()]).catch(() => {});
        onSuccess?.(res.student);
      } else {
        showToast("error", "Registration Failed", res?.error || "Could not register student.");
      }
    } catch (err: any) {
      console.error("Student registration error:", err);
      showToast("error", "Submission Error", err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 bg-white border border-slate-200/70 p-5 sm:p-8 lg:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] animate-scale-in text-left">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl inline-flex items-center gap-2 tracking-wider">
            <PlusCircle className="h-4 w-4 text-emerald-600" /> Register Student Profile
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-1.5">
            Fill student details accurately. Parent account & fee ledger will be automatically initialized.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200/70 px-3 py-1 rounded-xl">
            * Indicates Required Fields
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1: Personal & Demographics Information
        ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
            <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black">
              1
            </span>
            <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider">
              Personal & Demographics Information
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Student Name */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={stdName}
                onChange={(e) => setStdName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 shadow-2xs transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>

            {/* DOB */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Date of Birth (DOB) *
              </label>
              <ModernDatePicker
                value={stdDob}
                onChange={(val) => setStdDob(val)}
                placeholder="Select Date of Birth"
                className="w-full"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Gender
              </label>
              <select
                value={stdGender}
                onChange={(e) => setStdGender(e.target.value)}
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 cursor-pointer"
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Admission Number */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Admission Number
              </label>
              <input
                type="text"
                value={stdAdmissionNo}
                onChange={(e) => setStdAdmissionNo(e.target.value)}
                placeholder="e.g. ADM-2026-0001 (Optional)"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>

            {/* Roll Number */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Roll Number
              </label>
              <input
                type="text"
                value={stdRollNo}
                onChange={(e) => setStdRollNo(e.target.value)}
                placeholder="e.g. 10-A-01 (Optional)"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>

            {/* Aadhaar Number */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Aadhaar Number
              </label>
              <input
                type="text"
                maxLength={12}
                value={stdAadhaar}
                onChange={(e) => setStdAadhaar(e.target.value.replace(/\D/g, ""))}
                placeholder="12-digit Aadhaar"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>

            {/* Caste Category */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Caste Category
              </label>
              <select
                value={stdCategory}
                onChange={(e) => setStdCategory(e.target.value)}
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 cursor-pointer"
              >
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Religion */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Religion
              </label>
              <input
                type="text"
                value={stdReligion}
                onChange={(e) => setStdReligion(e.target.value)}
                placeholder="e.g. Hinduism, Islam, Sikhism..."
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800"
              />
            </div>

            {/* Disability */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Disability Status
              </label>
              <select
                value={stdDisability}
                onChange={(e) => setStdDisability(e.target.value)}
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 cursor-pointer"
              >
                <option value="No">No</option>
                <option value="Yes (Visual)">Yes (Visual)</option>
                <option value="Yes (Hearing)">Yes (Hearing)</option>
                <option value="Yes (Locomotor)">Yes (Locomotor)</option>
                <option value="Yes (Other)">Yes (Other)</option>
              </select>
            </div>

            {/* Mother Tongue */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mother Tongue
              </label>
              <input
                type="text"
                value={stdMotherTongue}
                onChange={(e) => setStdMotherTongue(e.target.value)}
                placeholder="e.g. Hindi, English..."
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800"
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Nationality
              </label>
              <input
                type="text"
                value={stdNationality}
                onChange={(e) => setStdNationality(e.target.value)}
                placeholder="e.g. Indian"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800"
              />
            </div>

            {/* RTE Student */}
            <div className="sm:col-span-2 lg:col-span-4 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  RTE Student Provision (Right to Education)
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Enable 100% full fee waiver for eligible students under RTE quota.
                </span>
              </div>
              <select
                value={stdIsRte ? "Yes" : "No"}
                onChange={(e) => setStdIsRte(e.target.value === "Yes")}
                className="text-xs font-bold py-1.5 px-3 border border-slate-200 rounded-xl bg-white focus:border-emerald-600 shadow-2xs text-slate-800 cursor-pointer"
              >
                <option value="No">No (Standard Billing)</option>
                <option value="Yes">Yes (RTE 100% Full Fee Waiver)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2: Academic History & Admissions
        ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
            <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black">
              2
            </span>
            <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider">
              Academic History & Admissions
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Class */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Class *
              </label>
              <select
                required
                value={stdClass}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  setStdClass(selectedName);
                  const matched = filteredSortedClasses.find((c: any) => c.name === selectedName);
                  if (matched) {
                    setStdSection(matched.section);
                  }
                }}
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 cursor-pointer"
              >
                <option value="">-- Select Class --</option>
                {uniqueClassNames.map((className) => (
                  <option key={className} value={className}>
                    Class {className}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Section *
              </label>
              <select
                value={stdSection}
                onChange={(e) => setStdSection(e.target.value)}
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 cursor-pointer"
              >
                <option value="">Select Section</option>
                {classes
                  .filter((c: any) => c.name === stdClass)
                  .map((cls: any) => (
                    <option key={cls.id} value={cls.section}>
                      Section {cls.section}
                    </option>
                  ))}
              </select>
            </div>

            {/* Admission Date */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Admission Date
              </label>
              <ModernDatePicker
                value={stdAdmissionDate}
                onChange={(val) => setStdAdmissionDate(val)}
                placeholder="Admission Date"
                className="w-full"
              />
            </div>

            {/* Board Reg No */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Board Registration No.
              </label>
              <input
                type="text"
                value={stdBoardRegNo}
                onChange={(e) => setStdBoardRegNo(e.target.value)}
                placeholder="CBSE / Board ID (Optional)"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Previous School Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Previous School Name
              </label>
              <input
                type="text"
                value={stdPrevSchoolName}
                onChange={(e) => setStdPrevSchoolName(e.target.value)}
                placeholder="e.g. DPS, KV, St. Joseph..."
                className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl bg-white focus:border-indigo-600 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Previous Class Passed
              </label>
              <input
                type="text"
                value={stdPrevClassPassed}
                onChange={(e) => setStdPrevClassPassed(e.target.value)}
                placeholder="e.g. Class 5"
                className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl bg-white focus:border-indigo-600 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                TC Number (Transfer Certificate)
              </label>
              <input
                type="text"
                value={stdTcNumber}
                onChange={(e) => setStdTcNumber(e.target.value)}
                placeholder="TC Number"
                className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl bg-white focus:border-indigo-600 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3: Family Details & Household Finance
        ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
            <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black">
              3
            </span>
            <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider">
              Family Details & Household Finance
            </h4>
          </div>

          {/* Sibling Linkage Option */}
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-indigo-600" /> Family Linkage Setup (Sibling Grouping)
              </span>
              <span className="text-[9px] text-slate-400 font-bold">
                Auto-syncs contact & billing across siblings
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="stdFamilyIdMode"
                  value="auto"
                  checked={stdFamilyIdMode === "auto"}
                  onChange={() => {
                    setStdFamilyIdMode("auto");
                    setStdSelectedFamilyCode("");
                  }}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                Auto-Generate New Family ID
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="stdFamilyIdMode"
                  value="existing"
                  checked={stdFamilyIdMode === "existing"}
                  onChange={() => setStdFamilyIdMode("existing")}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                Link to Existing Family / Sibling
              </label>
            </div>

            {stdFamilyIdMode === "existing" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Select Sibling's Family Code *
                </label>
                <select
                  required={stdFamilyIdMode === "existing"}
                  value={stdSelectedFamilyCode}
                  onChange={(e) => setStdSelectedFamilyCode(e.target.value)}
                  className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl bg-white focus:border-indigo-600 cursor-pointer shadow-2xs"
                >
                  <option value="">-- Choose Sibling / Family --</option>
                  {parentFamilies.map((fam) => (
                    <option key={fam.familyCode} value={fam.familyCode}>
                      {fam.familyCode} - {fam.parentName} ({fam.parentPhone})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-700 font-bold mt-1">
                  💡 Notice: Linking to an existing Family automatically inherits parents' mobile, email, and address.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Father Name */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Father's Name *
              </label>
              <input
                type="text"
                required
                disabled={stdFamilyIdMode === "existing"}
                value={stdFatherName}
                onChange={(e) => setStdFatherName(e.target.value)}
                placeholder="Father's Full Name"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Mother Name */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mother's Name
              </label>
              <input
                type="text"
                disabled={stdFamilyIdMode === "existing"}
                value={stdMotherName}
                onChange={(e) => setStdMotherName(e.target.value)}
                placeholder="Mother's Full Name"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Father Mobile */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Father's Mobile Number *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                disabled={stdFamilyIdMode === "existing"}
                value={stdFatherMobile}
                onChange={(e) => setStdFatherMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit Mobile"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Mother Mobile */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mother's Mobile Number
              </label>
              <input
                type="text"
                maxLength={10}
                disabled={stdFamilyIdMode === "existing"}
                value={stdMotherMobile}
                onChange={(e) => setStdMotherMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit Mobile"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Father Aadhaar */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Father's Aadhaar Number
              </label>
              <input
                type="text"
                maxLength={12}
                disabled={stdFamilyIdMode === "existing"}
                value={stdFatherAadhaar}
                onChange={(e) => setStdFatherAadhaar(e.target.value.replace(/\D/g, ""))}
                placeholder="12-digit Aadhaar"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Mother Aadhaar */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mother's Aadhaar Number
              </label>
              <input
                type="text"
                maxLength={12}
                disabled={stdFamilyIdMode === "existing"}
                value={stdMotherAadhaar}
                onChange={(e) => setStdMotherAadhaar(e.target.value.replace(/\D/g, ""))}
                placeholder="12-digit Aadhaar"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Parent Email */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Parent Email Address
              </label>
              <input
                type="email"
                disabled={stdFamilyIdMode === "existing"}
                value={stdParentEmail}
                onChange={(e) => setStdParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Parent Occupation */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Parent Occupation
              </label>
              <input
                type="text"
                disabled={stdFamilyIdMode === "existing"}
                value={stdParentOccupation}
                onChange={(e) => setStdParentOccupation(e.target.value)}
                placeholder="e.g. Business, Teacher, Service..."
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Family Income */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Family Annual Income
              </label>
              <input
                type="text"
                disabled={stdFamilyIdMode === "existing"}
                value={stdFamilyIncome}
                onChange={(e) => setStdFamilyIncome(e.target.value)}
                placeholder="e.g. ₹3,00,000"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Emergency Contact Name */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Emergency Contact Name
              </label>
              <input
                type="text"
                disabled={stdFamilyIdMode === "existing"}
                value={stdEmergencyName}
                onChange={(e) => setStdEmergencyName(e.target.value)}
                placeholder="e.g. Uncle / Guardian"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Emergency Contact Phone */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Emergency Phone Number
              </label>
              <input
                type="text"
                maxLength={10}
                disabled={stdFamilyIdMode === "existing"}
                value={stdEmergencyPhone}
                onChange={(e) => setStdEmergencyPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit Mobile"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Residential Address */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Full Residential Address *
              </label>
              <input
                type="text"
                required
                disabled={stdFamilyIdMode === "existing"}
                value={stdAddress}
                onChange={(e) => setStdAddress(e.target.value)}
                placeholder="House No., Street, Area, City, Pin Code"
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4: Transportation & Initial Fee Allocation
        ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
            <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black">
              4
            </span>
            <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider">
              Transportation & Fee Allocation
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mode of Transport */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mode of Transport
              </label>
              <select
                value={stdTransportMode}
                onChange={(e) => setStdTransportMode(e.target.value)}
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 cursor-pointer"
              >
                <option value="Self">Self / Walk</option>
                <option value="School Bus">School Bus</option>
                <option value="Private Cab">Private Cab / Van</option>
                <option value="Parents Drop">Parents Drop</option>
              </select>
            </div>

            {stdTransportMode === "School Bus" && (
              <>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Bus Route
                  </label>
                  <input
                    type="text"
                    value={stdBusRoute}
                    onChange={(e) => setStdBusRoute(e.target.value)}
                    placeholder="e.g. Route-B"
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Bus Stop Name
                  </label>
                  <input
                    type="text"
                    value={stdBusStop}
                    onChange={(e) => setStdBusStop(e.target.value)}
                    placeholder="e.g. Main Market Stand"
                    className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800"
                  />
                </div>
              </>
            )}

            {/* Starting Fee Month */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Starting Fee Month
              </label>
              <select
                value={stdStartingFeeMonth}
                onChange={(e) => setStdStartingFeeMonth(e.target.value)}
                className="w-full text-xs font-bold py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-emerald-600 shadow-2xs transition-all text-slate-800 cursor-pointer"
              >
                {[
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                  "January",
                  "February",
                  "March",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Fee Structures Checklist */}
          <div className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Assign Initial Fee Structures (Optional)
              </span>
              <span className="text-[9px] text-slate-400 font-bold">
                Check fees to attach immediately upon registration
              </span>
            </div>

            {classFeeStructures.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {classFeeStructures.map((struct: any) => (
                  <label
                    key={struct.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl hover:bg-emerald-50/30 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(checkedDues[struct.name])}
                        onChange={(e) =>
                          setCheckedDues((prev) => ({
                            ...prev,
                            [struct.name]: e.target.checked,
                          }))
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="text-xs font-extrabold text-slate-800">{struct.name}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      ₹{struct.total.toLocaleString("en-IN")}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold italic text-center py-3 bg-white rounded-xl border border-slate-100">
                {stdClass
                  ? `No custom fee structures found for Class ${stdClass}. Default academic yearly fee will apply.`
                  : "Select a Class above to preview applicable fee structures."}
              </p>
            )}
          </div>
        </div>

        {/* ── ACTION FOOTER ── */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto py-3.5 px-8 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registering Student Account...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Register Student Profile & Dues</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
