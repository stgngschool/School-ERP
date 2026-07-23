import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateYearlyCharges, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getNextFamilyCode, getNextAdmissionNumber, findMatchingParentProfile } from "@/lib/family";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const students = await db.student.findMany({
      include: {
        class: true,
        parentProfile: {
          include: {
            user: true,
          },
        },
        concession: true,
        marks: true,
      },
      orderBy: { name: "asc" },
    });

    const formatted = students.map((s) => ({
      id: s.id,
      name: s.name,
      admissionNo: s.admissionNumber,
      rollNo: s.rollNumber || "",
      dob: s.dob ? s.dob.toISOString().split("T")[0] : "",
      aadhaar: s.aadhaar || "",
      disability: s.disability || "",
      fatherName: s.fatherName || "",
      motherName: s.motherName || "",
      fatherMobile: s.fatherMobile || "",
      motherMobile: s.motherMobile || "",
      fatherAadhaar: s.fatherAadhaar || "",
      category: s.category || "",
      religion: s.religion || "",
      motherTongue: s.motherTongue || "",
      nationality: s.nationality || "",
      admissionDate: s.admissionDate ? s.admissionDate.toISOString().split("T")[0] : "",
      boardRegNo: s.boardRegNo || "",
      prevSchoolName: s.prevSchoolName || "",
      prevClassPassed: s.prevClassPassed || "",
      tcNumber: s.tcNumber || "",
      parentOccupation: s.parentOccupation || "",
      familyIncome: s.familyIncome || "",
      emergencyName: s.emergencyName || "",
      emergencyPhone: s.emergencyPhone || "",
      motherAadhaar: s.motherAadhaar || "",
      transportMode: s.transportMode || "",
      busRoute: s.busRoute || "",
      busStop: s.busStop || "",
      isRte: s.isRte,
      class: s.class.name,
      section: s.class.section,
      parentName: s.parentProfile.user.name,
      parentPhone: s.parentProfile.user.phone || "",
      parentEmail: s.parentProfile.user.email || "",
      address: s.parentProfile.address || "",
      familyCode: s.parentProfile.familyCode,
      concessionId: s.concessionId || "",
      photoUrl: s.photoUrl || "",
      concession: s.concession ? {
        id: s.concession.id,
        name: s.concession.name,
        percentage: s.concession.percentage,
        feeHeadName: s.concession.feeHeadName,
      } : null,
      marks: s.marks.map((m) => ({
        id: m.id,
        subject: m.subject,
        examName: m.examName,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        writtenExam: m.writtenExam,
        notebook: m.notebook,
        subjectEnrichment: m.subjectEnrichment,
        practical: m.practical,
        breakdown: m.breakdown,
        remarks: m.remarks || "",
        createdAt: m.createdAt,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      classVal,
      section,
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
      initialDues,
      familyCode,
      previousDues,
      concessionId,
      startingFeeMonth,
    } = body;

    if (!name || !classVal || !section || !fatherName || !fatherMobile || !address) {
      return NextResponse.json(
        { error: "Name, class, section, father's name, father's mobile, and address are required." },
        { status: 400 }
      );
    }

    let classObj = await db.class.findFirst({
      where: { name: classVal, section: section },
    });

    if (!classObj) {
      classObj = await db.class.create({
        data: { name: classVal, section: section },
      });
    }

    let parent = null;

    if (familyCode) {
      parent = await db.parentProfile.findUnique({
        where: { familyCode },
        include: { user: true },
      });
    }

    if (!parent) {
      const existingProfiles = await db.parentProfile.findMany({
        include: {
          user: true,
          students: { select: { fatherName: true, motherName: true, fatherMobile: true, motherMobile: true } },
        },
      });

      const matched = findMatchingParentProfile(
        {
          fatherMobile: fatherMobile ? String(fatherMobile).trim() : undefined,
          motherMobile: motherMobile ? String(motherMobile).trim() : undefined,
          fatherName: fatherName ? String(fatherName).trim() : undefined,
          motherName: motherName ? String(motherName).trim() : undefined,
          parentEmail: parentEmail ? String(parentEmail).trim() : undefined,
          address: address ? String(address).trim() : undefined,
        },
        existingProfiles
      );

      if (matched) {
        parent = matched;
        if (!parent.address && address) {
          await db.parentProfile.update({
            where: { id: parent.id },
            data: { address },
          });
        }
      }
    }

    if (!parent) {
      const sanitizedPhone = (fatherMobile || "").replace(/\s+/g, "");
      const username = `parent_${sanitizedPhone || Date.now()}`;
      const email = parentEmail || `${username}@school.com`;

      const existingUser = await db.user.findUnique({
        where: { email },
      });

      const finalEmail = existingUser ? `parent_${Date.now()}@school.com` : email;
      const secureRandomPassword = crypto.randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(secureRandomPassword, 10);

      const user = await db.user.create({
        data: {
          username: `parent_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          email: finalEmail,
          passwordHash,
          role: "PARENT",
          name: fatherName,
          phone: fatherMobile,
        },
      });

      parent = await db.parentProfile.create({
        data: {
          userId: user.id,
          familyCode: await getNextFamilyCode(),
          address: address || null,
        },
        include: { user: true },
      });
    }

    const totalStudents = await db.student.count();
    const rollCount = await db.student.count({
      where: { classId: classObj.id },
    });
    const rollNo = String(rollCount + 1).padStart(2, "0");
    const admissionNo = await getNextAdmissionNumber();

    const student = await db.student.create({
      data: {
        name,
        admissionNumber: admissionNo,
        rollNumber: `${classVal}-${section}-${rollNo}`,
        dob: dob ? new Date(dob) : null,
        aadhaar: aadhaar || null,
        disability: disability || null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        fatherMobile: fatherMobile || null,
        motherMobile: motherMobile || null,
        fatherAadhaar: fatherAadhaar || null,
        category: category || null,
        religion: religion || null,
        motherTongue: motherTongue || null,
        nationality: nationality || null,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
        boardRegNo: boardRegNo || null,
        prevSchoolName: prevSchoolName || null,
        prevClassPassed: prevClassPassed || null,
        tcNumber: tcNumber || null,
        parentOccupation: parentOccupation || null,
        familyIncome: familyIncome || null,
        emergencyName: emergencyName || null,
        emergencyPhone: emergencyPhone || null,
        motherAadhaar: motherAadhaar || null,
        transportMode: transportMode || null,
        busRoute: busRoute || null,
        busStop: busStop || null,
        parentProfileId: parent.id,
        classId: classObj.id,
        isRte: !!isRte,
        concessionId: concessionId || null,
      },
    });

    // Auto-generate full academic year charges using fee structure for this class
    const systemUser = await db.user.findFirst({
      where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
    });

    if (systemUser) {
      await generateYearlyCharges(student.id, classVal, systemUser.id, getAcademicYear(), startingFeeMonth);
      if (previousDues && parseFloat(previousDues) > 0) {
        const prevDuesAmountInPaisa = Math.round(parseFloat(previousDues) * 100);
        await db.ledgerEntry.create({
          data: {
            studentId: student.id,
            entryType: "CHARGE",
            amount: prevDuesAmountInPaisa,
            description: "Assigned: Previous Session Dues",
            createdById: systemUser.id,
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNumber,
        rollNo: student.rollNumber,
        class: classVal,
        section,
        parentName: parent.user.name,
        parentPhone: parent.user.phone || "",
      },
    });
  } catch (error: any) {
    console.error("Add student error:", error);
    return NextResponse.json({ error: "Failed to create student record" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, action, data } = body;

    if (!studentId || !action) {
      return NextResponse.json({ error: "Missing studentId or action." }, { status: 400 });
    }

    const studentIds = Array.isArray(studentId) ? studentId : [studentId];

    if (action === "updateStatus") {
      const updated = await db.student.updateMany({
        where: { id: { in: studentIds } },
        data: { status: data.status },
      });
      return NextResponse.json({ success: true, count: updated.count });
    }

    if (action === "promote") {
      const { classVal, section } = data;
      let classObj = await db.class.findFirst({
        where: { name: classVal, section: section },
      });

      if (!classObj) {
        classObj = await db.class.create({
          data: { name: classVal, section: section },
        });
      }

      const updated = await db.student.updateMany({
        where: { id: { in: studentIds } },
        data: { classId: classObj.id },
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

    if (action === "updateDetails") {
      const targetId = Array.isArray(studentId) ? studentId[0] : studentId;
      const student = await db.student.findUnique({
        where: { id: targetId },
        include: { parentProfile: true }
      });

      const updated = await db.student.update({
        where: { id: targetId },
        data: {
          name: data.name,
          dob: data.dob ? new Date(data.dob) : null,
          aadhaar: data.aadhaar || null,
          disability: data.disability || null,
          fatherName: data.fatherName,
          motherName: data.motherName || null,
          fatherMobile: data.fatherMobile,
          motherMobile: data.motherMobile || null,
          fatherAadhaar: data.fatherAadhaar || null,
          category: data.category || null,
          religion: data.religion || null,
          motherTongue: data.motherTongue || null,
          nationality: data.nationality || null,
          parentOccupation: data.parentOccupation || null,
          familyIncome: data.familyIncome || null,
          emergencyName: data.emergencyName || null,
          emergencyPhone: data.emergencyPhone || null,
          motherAadhaar: data.motherAadhaar || null,
          transportMode: data.transportMode || null,
          busRoute: data.busRoute || null,
          busStop: data.busStop || null,
          isRte: data.isRte !== undefined ? !!data.isRte : undefined,
          concessionId: data.concessionId || null,
        },
      });

      if (student?.parentProfile) {
        await db.parentProfile.update({
          where: { id: student.parentProfile.id },
          data: {
            address: data.address || null,
            user: {
              update: {
                email: data.parentEmail || undefined,
                name: data.fatherName,
                phone: data.fatherMobile,
              }
            }
          }
        });
      }

      if (updated.isRte) {
        const systemUser = await db.user.findFirst({
          where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
        });
        const studentClass = await db.class.findUnique({
          where: { id: updated.classId },
        });
        if (systemUser && studentClass) {
          await generateYearlyCharges(updated.id, studentClass.name, systemUser.id, getAcademicYear());
        }
      }

      return NextResponse.json({ success: true, student: updated });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Student update error:", error);
    return NextResponse.json({ error: "Failed to update student: " + error.message }, { status: 500 });
  }
}

