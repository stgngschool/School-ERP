import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateYearlyCharges, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getNextFamilyCode, getNextAdmissionNumber, findMatchingParentProfile } from "@/lib/family";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access. Admin privileges required." }, { status: 401 });
    }

    const application = await db.admissionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json({ error: "Admission application not found." }, { status: 404 });
    }

    if (application.status === "APPROVED" && application.enrolledStudentId) {
      return NextResponse.json(
        { error: "This application has already been approved and enrolled in the student directory." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      assignedSection = "A",
      customAdmissionNo,
      customRollNo,
      concessionId,
      transportStopId,
      startingFeeMonth,
      admissionDate,
    } = body;

    const className = application.classApplied;
    const section = (assignedSection || "A").trim().toUpperCase();

    // 1. Find or create Class with Section
    let classObj = await db.class.findFirst({
      where: { name: className, section: section },
    });

    if (!classObj) {
      classObj = await db.class.create({
        data: { name: className, section: section },
      });
    }

    // 2. Match or Create Parent Profile
    let parent = null;

    // Check existing profiles by mobile / name / email
    const existingProfiles = await db.parentProfile.findMany({
      include: {
        user: true,
        students: {
          select: {
            fatherName: true,
            motherName: true,
            fatherMobile: true,
            motherMobile: true,
          },
        },
      },
    });

    const matched = findMatchingParentProfile(
      {
        fatherMobile: application.fatherMobile ? String(application.fatherMobile).trim() : undefined,
        motherMobile: application.motherMobile ? String(application.motherMobile).trim() : undefined,
        fatherName: application.fatherName ? String(application.fatherName).trim() : undefined,
        motherName: application.motherName ? String(application.motherName).trim() : undefined,
        parentEmail: application.parentEmail ? String(application.parentEmail).trim() : undefined,
        address: application.address ? String(application.address).trim() : undefined,
      },
      existingProfiles
    );

    if (matched) {
      parent = matched;
      if (!parent.address && application.address) {
        await db.parentProfile.update({
          where: { id: parent.id },
          data: { address: application.address },
        });
      }
    } else {
      // Create new Parent User & ParentProfile
      const sanitizedPhone = (application.fatherMobile || "").replace(/\s+/g, "");
      const username = `parent_${sanitizedPhone || Date.now()}`;
      const email = application.parentEmail || `${username}@school.com`;

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
          name: application.fatherName,
          phone: application.fatherMobile,
        },
      });

      const newFamilyCode = await getNextFamilyCode();
      parent = await db.parentProfile.create({
        data: {
          userId: user.id,
          familyCode: newFamilyCode,
          address: application.address || null,
        },
        include: { user: true },
      });
    }

    // 3. Determine Admission Number
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

    // 4. Determine Roll Number
    let rollNumber = (customRollNo || "").trim();
    if (!rollNumber) {
      const rollCount = await db.student.count({
        where: { classId: classObj.id },
      });
      const rollNoStr = String(rollCount + 1).padStart(2, "0");
      rollNumber = `${className}-${section}-${rollNoStr}`;
    }

    // 5. Create Student in Database
    const student = await db.student.create({
      data: {
        name: application.studentName,
        admissionNumber: admissionNo,
        rollNumber,
        gender: application.gender || null,
        dob: application.dob ? new Date(application.dob) : null,
        aadhaar: application.aadhaar || null,
        disability: application.disability || null,
        fatherName: application.fatherName || null,
        motherName: application.motherName || null,
        fatherMobile: application.fatherMobile || null,
        motherMobile: application.motherMobile || null,
        fatherAadhaar: application.fatherAadhaar || null,
        motherAadhaar: application.motherAadhaar || null,
        category: application.category || null,
        religion: application.religion || null,
        motherTongue: application.motherTongue || null,
        nationality: application.nationality || "Indian",
        admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        prevSchoolName: application.prevSchoolName || null,
        prevClassPassed: application.prevClassPassed || null,
        tcNumber: application.tcNumber || null,
        parentOccupation: application.fatherOccupation || null,
        familyIncome: application.familyIncome || null,
        emergencyName: application.emergencyName || null,
        emergencyPhone: application.emergencyPhone || null,
        transportMode: application.transportRequired ? "School Bus" : "Self / Private",
        busStop: application.busStop || null,
        isRte: application.isRte ?? false,
        parentProfileId: parent.id,
        classId: classObj.id,
        transportStopId: transportStopId || null,
        concessionId: concessionId || null,
        photoUrl: application.photoUrl || null,
      },
      include: {
        class: true,
        parentProfile: {
          include: { user: true },
        },
      },
    });

    // 6. Generate Academic Session Record & Yearly Fee Charges
    try {
      const academicYear = getAcademicYear();
      let activeSession = await db.academicSession.findFirst({
        where: { isCurrent: true },
      });

      if (!activeSession) {
        activeSession = await db.academicSession.findFirst({
          where: { name: academicYear },
        });
      }

      if (!activeSession) {
        activeSession = await db.academicSession.create({
          data: {
            name: academicYear,
            isCurrent: true,
            startDate: new Date(`${academicYear.split("-")[0]}-04-01`),
            endDate: new Date(`${academicYear.split("-")[1]}-03-31`),
          },
        });
      }

      // Link StudentSession
      await db.studentSession.upsert({
        where: {
          studentId_sessionId: {
            studentId: student.id,
            sessionId: activeSession.id,
          },
        },
        update: {
          classId: classObj.id,
          rollNumber: student.rollNumber,
        },
        create: {
          studentId: student.id,
          sessionId: activeSession.id,
          classId: classObj.id,
          rollNumber: student.rollNumber,
        },
      });

      // Auto-generate fee structures and charges
      await generateYearlyCharges(
        student.id,
        className,
        authUser.userId,
        academicYear,
        startingFeeMonth || undefined
      );
    } catch (chargeErr) {
      console.warn("Auto-generating fee charges encountered a non-critical notice:", chargeErr);
    }

    // 7. Update AdmissionApplication Status
    const updatedApplication = await db.admissionApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        assignedSection: section,
        enrolledStudentId: student.id,
        reviewedById: authUser.userId,
        updatedAt: new Date(),
      },
      include: {
        enrolledStudent: true,
        reviewedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // 8. Audit Log
    try {
      await db.auditLog.create({
        data: {
          userId: authUser.userId,
          action: "APPROVE_ADMISSION_APPLICATION",
          entityType: "STUDENT",
          entityId: student.id,
          newValues: JSON.stringify({
            applicationNo: application.applicationNo,
            studentName: student.name,
            class: className,
            section,
            admissionNumber: student.admissionNumber,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation failed:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Admission successfully approved! Student ${student.name} has been enrolled in ${className}-${section}.`,
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNumber,
        rollNo: student.rollNumber,
        class: student.class.name,
        section: student.class.section,
        familyCode: student.parentProfile.familyCode,
        parentName: student.parentProfile.user.name,
        fatherMobile: student.fatherMobile,
      },
      application: updatedApplication,
    });
  } catch (error: any) {
    console.error("Approve admission application error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve admission application" },
      { status: 500 }
    );
  }
}
