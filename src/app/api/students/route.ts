import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateYearlyCharges, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getNextFamilyCode, getNextAdmissionNumber, findMatchingParentProfile } from "@/lib/family";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const reqId = `std_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = performance.now();
  console.log(`[DIAGNOSTIC][API][START] GET /api/students [${reqId}] | timestamp: ${new Date().toISOString()}`);

  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] GET /api/students [${reqId}] | status: 401 | duration: ${duration}ms | authenticated: false | reason: Unauthorized access`);
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const dbStart = performance.now();
    const students = await db.student.findMany({
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        rollNumber: true,
        gender: true,
        fatherName: true,
        fatherMobile: true,
        isRte: true,
        isMarksheetClaimed: true,
        photoUrl: true,
        concessionId: true,
        class: {
          select: { name: true, section: true }
        },
        parentProfile: {
          select: { 
            familyCode: true,
            user: { select: { name: true, phone: true } }
          }
        },
        concession: {
          select: { id: true, name: true, percentage: true, feeHeadName: true }
        },
      },
      orderBy: { name: "asc" },
    });
    const dbDuration = (performance.now() - dbStart).toFixed(2);
    console.log(`[DIAGNOSTIC][DB][${reqId}] db.student.findMany | duration: ${dbDuration}ms | rows: ${students.length}`);

    const formatted = students.map((s) => ({
      id: s.id,
      name: s.name,
      admissionNo: s.admissionNumber,
      rollNo: s.rollNumber || "",
      gender: s.gender || "",
      fatherName: s.fatherName || "",
      fatherMobile: s.fatherMobile || "",
      isRte: s.isRte,
      isMarksheetClaimed: s.isMarksheetClaimed,
      class: s.class.name,
      section: s.class.section,
      parentName: s.parentProfile?.user?.name || "",
      parentPhone: s.parentProfile?.user?.phone || "",
      familyCode: s.parentProfile?.familyCode || "",
      concessionId: s.concessionId || "",
      photoUrl: s.photoUrl || "",
      concession: s.concession ? {
        id: s.concession.id,
        name: s.concession.name,
        percentage: s.concession.percentage,
        feeHeadName: s.concession.feeHeadName,
      } : null,
    }));

    const responseStr = JSON.stringify(formatted);
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[DIAGNOSTIC][API][END] GET /api/students [${reqId}] | status: 200 | duration: ${duration}ms | dbDuration: ${dbDuration}ms | authenticatedUser: ${authUser.username} (${authUser.role}) | size: ${responseStr.length}B`);

    return NextResponse.json(formatted);
  } catch (error: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error(`[DIAGNOSTIC][API][ERROR] GET /api/students [${reqId}] | status: 500 | duration: ${duration}ms | error: ${error.message}`);
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
      admissionNo: customAdmissionNo,
      rollNo: customRollNo,
      gender,
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

    // Validate Admission Number logic
    let admissionNo = (customAdmissionNo || "").trim();
    if (admissionNo) {
      const existing = await db.student.findUnique({
        where: { admissionNumber: admissionNo },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Admission Number "${admissionNo}" is already taken.` },
          { status: 400 }
        );
      }
    } else {
      admissionNo = await getNextAdmissionNumber();
    }

    // Validate Roll Number logic
    let rollNumber = (customRollNo || "").trim();
    if (!rollNumber) {
      const rollCount = await db.student.count({
        where: { classId: classObj.id },
      });
      const rollNoStr = String(rollCount + 1).padStart(2, "0");
      rollNumber = `${classVal}-${section}-${rollNoStr}`;
    }

    const student = await db.student.create({
      data: {
        name,
        admissionNumber: admissionNo,
        rollNumber,
        gender: gender || null,
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

      // Check admissionNumber uniqueness if changed
      if (data.admissionNo && data.admissionNo !== student?.admissionNumber) {
        const existing = await db.student.findUnique({
          where: { admissionNumber: data.admissionNo },
        });
        if (existing) {
          return NextResponse.json(
            { error: `Admission Number "${data.admissionNo}" is already taken.` },
            { status: 400 }
          );
        }
      }

      const updated = await db.student.update({
        where: { id: targetId },
        data: {
          name: data.name,
          admissionNumber: data.admissionNo || undefined,
          rollNumber: data.rollNo || undefined,
          gender: data.gender !== undefined ? data.gender : undefined,
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

