import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateYearlyChargesBulk, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getNextFamilyCode, getNextAdmissionNumber } from "@/lib/family";

export async function POST(request: Request) {
  try {
    const { students } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No students data provided." }, { status: 400 });
    }

    const importedStudents = [];
    const studentsToBackfill: { id: string; class: { name: string } }[] = [];

    const systemUser = await db.user.findFirst({
      where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
    });

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
        address,
        parentEmail,
        classVal,
        section,
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
      } = record;

      if (!name || !classVal || !section || !fatherName || !fatherMobile || !address) {
        // Skip invalid rows but log it
        console.warn("Skipping invalid bulk record:", record);
        continue;
      }

      // 1. Get/Create Class
      let classObj = await db.class.findFirst({
        where: { name: String(classVal).trim(), section: String(section).trim() },
      });

      if (!classObj) {
        classObj = await db.class.create({
          data: { name: String(classVal).trim(), section: String(section).trim() },
        });
      }

      // 2. Get/Create Parent
      let parent = null;
      const cleanMobile = String(fatherMobile).trim();
      const parentUser = await db.user.findFirst({
        where: {
          phone: cleanMobile,
          role: "PARENT",
        },
      });

      if (parentUser) {
        parent = await db.parentProfile.findUnique({
          where: { userId: parentUser.id },
          include: { user: true },
        });

        // Update address if it was empty
        if (parent && !parent.address && address) {
          parent = await db.parentProfile.update({
            where: { id: parent.id },
            data: { address: String(address).trim() },
            include: { user: true },
          });
        }
      }

      if (!parent) {
        const sanitizedPhone = cleanMobile.replace(/\s+/g, "");
        const username = `parent_${sanitizedPhone || Date.now()}`;
        const email = parentEmail ? String(parentEmail).trim() : `${username}@school.com`;

        const existingUser = await db.user.findUnique({
          where: { email },
        });

        const finalEmail = existingUser ? `parent_${Date.now()}_${Math.floor(Math.random() * 1000)}@school.com` : email;

        const user = await db.user.create({
          data: {
            username: `parent_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            email: finalEmail,
            passwordHash: "$2a$10$dummyhash",
            role: "PARENT",
            name: String(fatherName).trim(),
            phone: cleanMobile,
          },
        });

        parent = await db.parentProfile.create({
          data: {
            userId: user.id,
            familyCode: await getNextFamilyCode(),
            address: address ? String(address).trim() : null,
          },
          include: { user: true },
        });
      }

      // 3. Create Student
      const totalStudents = await db.student.count();
      const rollCount = await db.student.count({
        where: { classId: classObj.id },
      });
      const rollNo = String(rollCount + 1).padStart(2, "0");
      const admissionNo = await getNextAdmissionNumber();

      const dobDate = dob ? new Date(dob) : null;
      const admDateObj = admissionDate ? new Date(admissionDate) : null;

      const student = await db.student.create({
        data: {
          name: String(name).trim(),
          admissionNumber: admissionNo,
          rollNumber: `${classVal}-${section}-${rollNo}`,
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
        },
      });

      // 4. Queue for bulk charge generation
      studentsToBackfill.push({ id: student.id, class: { name: String(classVal).trim() } });

      importedStudents.push(student);
    }

    if (systemUser && studentsToBackfill.length > 0) {
      await generateYearlyChargesBulk(studentsToBackfill, systemUser.id, getAcademicYear());
    }

    return NextResponse.json({
      success: true,
      count: importedStudents.length,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Failed to import students" }, { status: 500 });
  }
}
