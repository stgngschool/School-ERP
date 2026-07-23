import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateYearlyChargesBulk, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getAuthUser } from "@/lib/auth";

function getMaxSuffixNumber(codes: (string | null | undefined)[]): number {
  let maxNum = 0;
  for (const code of codes) {
    if (!code) continue;
    const parts = code.trim().split("-");
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return maxNum;
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { students } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No students data provided." }, { status: 400 });
    }

    const systemUser = await db.user.findFirst({
      where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
    });

    const year = new Date().getFullYear();

    // 1. Pre-calculate starting admission number max counter
    const existingStudents = await db.student.findMany({ select: { admissionNumber: true } });
    let maxAdmissionNum = getMaxSuffixNumber(existingStudents.map((s) => s.admissionNumber));
    const existingAdmissionNumbersSet = new Set<string>(
      existingStudents.map((s) => s.admissionNumber?.trim().toUpperCase()).filter(Boolean) as string[]
    );

    // 2. Pre-calculate starting family code max counter
    const existingParents = await db.parentProfile.findMany({ select: { familyCode: true } });
    let maxFamilyNum = getMaxSuffixNumber(existingParents.map((p) => p.familyCode));
    const existingFamilyCodesSet = new Set<string>(
      existingParents.map((p) => p.familyCode?.trim().toUpperCase()).filter(Boolean) as string[]
    );

    // 3. Pre-fetch Classes and Roll Counters
    const existingClasses = await db.class.findMany({
      include: { _count: { select: { students: true } } },
    });
    const classMap = new Map<string, any>();
    const classRollMap = new Map<string, number>();

    for (const c of existingClasses) {
      const key = `${c.name.trim().toUpperCase()}-${c.section.trim().toUpperCase()}`;
      classMap.set(key, c);
      classRollMap.set(c.id, c._count.students);
    }

    // 4. Pre-fetch Parent Users and Profiles by Phone
    const existingParentUsers = await db.user.findMany({
      where: { role: "PARENT" },
      include: { parentProfile: true },
    });
    const parentMap = new Map<string, any>();
    for (const u of existingParentUsers) {
      if (u.phone && u.parentProfile) {
        parentMap.set(u.phone.trim(), u.parentProfile);
      }
    }

    // 5. Pre-create any missing classes
    for (const record of students) {
      if (!record.name || !record.classVal || !record.section || !record.fatherName || !record.fatherMobile) continue;
      const classNameClean = String(record.classVal).trim();
      const sectionClean = String(record.section).trim();
      const classKey = `${classNameClean.toUpperCase()}-${sectionClean.toUpperCase()}`;

      if (!classMap.has(classKey)) {
        const newClass = await db.class.create({
          data: { name: classNameClean, section: sectionClean },
        });
        classMap.set(classKey, newClass);
        classRollMap.set(newClass.id, 0);
      }
    }

    // 6. Pre-create any missing parent users and profiles
    for (const record of students) {
      if (!record.fatherMobile || !record.fatherName) continue;
      const cleanMobile = String(record.fatherMobile).trim();

      if (!parentMap.has(cleanMobile)) {
        maxFamilyNum++;
        let familyCode = `FAM-${year}-${String(maxFamilyNum).padStart(4, "0")}`;
        while (existingFamilyCodesSet.has(familyCode.toUpperCase())) {
          maxFamilyNum++;
          familyCode = `FAM-${year}-${String(maxFamilyNum).padStart(4, "0")}`;
        }
        existingFamilyCodesSet.add(familyCode.toUpperCase());

        const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1000000)}_${maxFamilyNum}`;
        const email = record.parentEmail ? String(record.parentEmail).trim() : `parent_${uniqueSuffix}@school.com`;

        const existingUserWithEmail = await db.user.findUnique({ where: { email } });
        const finalEmail = existingUserWithEmail ? `parent_${uniqueSuffix}@school.com` : email;
        const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);

        const user = await db.user.create({
          data: {
            username: `user_${uniqueSuffix}`,
            email: finalEmail,
            passwordHash,
            role: "PARENT",
            name: String(record.fatherName).trim(),
            phone: cleanMobile,
          },
        });

        const parentProfile = await db.parentProfile.create({
          data: {
            userId: user.id,
            familyCode,
            address: record.address ? String(record.address).trim() : null,
          },
          include: { user: true },
        });

        parentMap.set(cleanMobile, parentProfile);
      }
    }

    // 7. Prepare student objects for fast bulk creation
    const studentsToCreate: any[] = [];
    const backfillMap: { id: string; class: { name: string } }[] = [];

    for (const record of students) {
      const {
        name,
        dob,
        aadhaar,
        disability,
        fatherName,
        motherName,
        fatherMobile,
        motherMobile,
        fatherAadhaar,
        category,
        religion,
        motherTongue,
        nationality,
        admissionDate,
        boardRegNo,
        prevSchoolName,
        prevClassPassed,
        tcNumber,
        parentOccupation,
        familyIncome,
        emergencyName,
        emergencyPhone,
        motherAadhaar,
        transportMode,
        busRoute,
        busStop,
        isRte,
        classVal,
        section,
        admissionNumber: providedAdmissionNo,
        admissionNo: providedAdmissionNoAlt,
      } = record;

      if (!name || !classVal || !section || !fatherName || !fatherMobile) continue;

      const classNameClean = String(classVal).trim();
      const sectionClean = String(section).trim();
      const classKey = `${classNameClean.toUpperCase()}-${sectionClean.toUpperCase()}`;
      const classObj = classMap.get(classKey);
      const cleanMobile = String(fatherMobile).trim();
      const parent = parentMap.get(cleanMobile);

      if (!classObj || !parent) continue;

      // Unique admission number logic
      let admissionNo = (providedAdmissionNo || providedAdmissionNoAlt || "").toString().trim();
      if (!admissionNo || existingAdmissionNumbersSet.has(admissionNo.toUpperCase())) {
        maxAdmissionNum++;
        admissionNo = `ADM-${year}-${String(maxAdmissionNum).padStart(4, "0")}`;
        while (existingAdmissionNumbersSet.has(admissionNo.toUpperCase())) {
          maxAdmissionNum++;
          admissionNo = `ADM-${year}-${String(maxAdmissionNum).padStart(4, "0")}`;
        }
      }
      existingAdmissionNumbersSet.add(admissionNo.toUpperCase());

      // Roll Number logic
      const currentRollCount = (classRollMap.get(classObj.id) || 0) + 1;
      classRollMap.set(classObj.id, currentRollCount);
      const rollNumber = `${classNameClean}-${sectionClean}-${String(currentRollCount).padStart(2, "0")}`;

      const dobDate = dob ? new Date(dob) : null;
      const admDateObj = admissionDate ? new Date(admissionDate) : null;
      const studentId = `std_${Date.now()}_${Math.floor(Math.random() * 1000000)}_${studentsToCreate.length}`;

      studentsToCreate.push({
        id: studentId,
        name: String(name).trim(),
        admissionNumber: admissionNo,
        rollNumber,
        dob: dobDate && !isNaN(dobDate.getTime()) ? dobDate : null,
        aadhaar: aadhaar ? String(aadhaar).trim() : null,
        disability: disability ? String(disability).trim() : null,
        fatherName: String(fatherName).trim(),
        motherName: motherName ? String(motherName).trim() : null,
        fatherMobile: cleanMobile,
        motherMobile: motherMobile ? String(motherMobile).trim() : null,
        fatherAadhaar: fatherAadhaar ? String(fatherAadhaar).trim() : null,
        category: category ? String(category).trim() : null,
        religion: religion ? String(religion).trim() : null,
        motherTongue: motherTongue ? String(motherTongue).trim() : null,
        nationality: nationality ? String(nationality).trim() : null,
        admissionDate: admDateObj && !isNaN(admDateObj.getTime()) ? admDateObj : null,
        boardRegNo: boardRegNo ? String(boardRegNo).trim() : null,
        prevSchoolName: prevSchoolName ? String(prevSchoolName).trim() : null,
        prevClassPassed: prevClassPassed ? String(prevClassPassed).trim() : null,
        tcNumber: tcNumber ? String(tcNumber).trim() : null,
        parentOccupation: parentOccupation ? String(parentOccupation).trim() : null,
        familyIncome: familyIncome ? String(familyIncome).trim() : null,
        emergencyName: emergencyName ? String(emergencyName).trim() : null,
        emergencyPhone: emergencyPhone ? String(emergencyPhone).trim() : null,
        motherAadhaar: motherAadhaar ? String(motherAadhaar).trim() : null,
        transportMode: transportMode ? String(transportMode).trim() : null,
        busRoute: busRoute ? String(busRoute).trim() : null,
        busStop: busStop ? String(busStop).trim() : null,
        isRte: !!isRte,
        parentProfileId: parent.id,
        classId: classObj.id,
      });

      backfillMap.push({ id: studentId, class: { name: classNameClean } });
    }

    // 8. Bulk insert student records instantly
    if (studentsToCreate.length > 0) {
      await db.student.createMany({
        data: studentsToCreate,
      });
    }

    // 9. Generate full-year billing charges in bulk for imported students
    if (systemUser && backfillMap.length > 0) {
      await generateYearlyChargesBulk(backfillMap, systemUser.id, getAcademicYear());
    }

    return NextResponse.json({
      success: true,
      count: studentsToCreate.length,
    });
  } catch (error: any) {
    console.error("Bulk import error detailed:", error);
    return NextResponse.json({ error: error?.message || "Failed to import students" }, { status: 500 });
  }
}
