import { SessionError } from "@/lib/sessionPolicy";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateYearlyCharges, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getNextFamilyCode, getNextAdmissionNumber, findMatchingParentProfile } from "@/lib/family";
import { getAuthUser } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validation";
import { parseCanonicalDOB } from "@/lib/dateUtils";

import { lockSessionWorkflow } from "@/lib/sessionWorkflow";
import { clearServerStudentsCache } from "@/lib/cache/studentsCache";
import { clearServerBillingCache } from "@/lib/cache/billingCache";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let canInvalidateRoster = false;
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access. Admin privileges required." }, { status: 401 });
    }

    canInvalidateRoster = true;
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

    const { student, updatedApplication, academicYear } = await db.$transaction(async tx => {
      await lockSessionWorkflow(tx);
      const fresh = await tx.admissionApplication.findUnique({ where: { id: application.id } });
      if (!fresh || fresh.status === "APPROVED" || fresh.enrolledStudentId) throw new Error("This application was already processed. Refresh before continuing.");
      const activeSession = await tx.academicSession.findFirst({ where: { isCurrent: true } });
      if (!activeSession) throw new Error("An active academic session is required before admission approval.");
    // 1. Find or create Class with Section
    let classObj = await tx.class.findFirst({
      where: { name: className, section: section },
    });

    if (!classObj) {
      classObj = await tx.class.create({
        data: { name: className, section: section },
      });
    }

    // 2. Match or Create Parent Profile
    let parent = null;

    // Check existing profiles by mobile / name / email
    const phones = [application.fatherMobile, application.motherMobile]
      .map(value => (value || "").replace(/\D/g, "")).filter(value => value.length >= 8);
    const father = (application.fatherName || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    // Fetch only candidate families; retain the existing conservative matching rules below.
    const candidateIds = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT p.id FROM "ParentProfile" p JOIN "User" u ON u.id = p."userId"
      WHERE (LOWER(TRIM(u.email)) = ${application.parentEmail?.trim().toLowerCase() || ""} AND ${Boolean(application.parentEmail)})
        OR REGEXP_REPLACE(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = ANY(${phones}::text[])
        OR (${father} <> '' AND REGEXP_REPLACE(LOWER(u.name), '[^a-z0-9]', '', 'g') = ${father})
        OR EXISTS (SELECT 1 FROM "Student" s WHERE s."parentProfileId" = p.id AND (
          REGEXP_REPLACE(COALESCE(s."fatherMobile", ''), '[^0-9]', '', 'g') = ANY(${phones}::text[])
          OR REGEXP_REPLACE(COALESCE(s."motherMobile", ''), '[^0-9]', '', 'g') = ANY(${phones}::text[])
          OR (${father} <> '' AND REGEXP_REPLACE(LOWER(COALESCE(s."fatherName", '')), '[^a-z0-9]', '', 'g') = ${father})
        ))`;
    const existingProfiles = await tx.parentProfile.findMany({
      where: { id: { in: candidateIds.map(row => row.id) } },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
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
        await tx.parentProfile.update({
          where: { id: parent.id },
          data: { address: application.address },
        });
      }
    } else {
      // Create new Parent User & ParentProfile
      const sanitizedPhone = (application.fatherMobile || "").replace(/\s+/g, "");
      const username = `parent_${sanitizedPhone || Date.now()}`;
      const email = application.parentEmail || `${username}@school.com`;

      const existingUser = await tx.user.findUnique({
        where: { email },
      });

      const finalEmail = existingUser ? `parent_${Date.now()}@school.com` : email;
      const passwordHash = `PENDING_ACTIVATION:${crypto.randomBytes(16).toString("hex")}`;

      const user = await tx.user.create({
        data: {
          username: `parent_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          email: finalEmail,
          passwordHash,
          role: "PARENT",
          name: application.fatherName,
          phone: application.fatherMobile,
        },
      });

      const newFamilyCode = await getNextFamilyCode(tx);
      parent = await tx.parentProfile.create({
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
      const existing = await tx.student.findUnique({
        where: { admissionNumber: admissionNo },
      });
      if (existing) {
        throw new SessionError(`Admission Number "${admissionNo}" is already taken.`, 400);
      }
    } else {
      admissionNo = await getNextAdmissionNumber(tx);
    }

    // 4. Determine Roll Number
    let rollNumber = (customRollNo || "").trim();
    if (!rollNumber) {
      const rollCount = await tx.student.count({
        where: { classId: classObj.id },
      });
      const rollNoStr = String(rollCount + 1).padStart(2, "0");
      rollNumber = `${className}-${section}-${rollNoStr}`;
    }

    // 5. Create Student in Database
    const student = await tx.student.create({
      data: {
        name: application.studentName,
        admissionNumber: admissionNo,
        rollNumber,
        gender: application.gender || null,
        dob: parseCanonicalDOB(application.dob),
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


      await tx.studentSession.create({ data: { studentId: student.id, sessionId: activeSession.id, classId: classObj.id, rollNumber: student.rollNumber } });
    // 7. Update AdmissionApplication Status
    const updatedApplication = await tx.admissionApplication.update({
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


      return { student, updatedApplication, academicYear: activeSession.name };
    }, { isolationLevel: "ReadCommitted", timeout: 30000 });
    let feesPending = false;
    try {
      await generateYearlyCharges(student.id, className, authUser.userId, academicYear, startingFeeMonth || undefined);
    } catch (error) { feesPending = true; console.warn("Admission saved; fee generation is pending:", error); }
    clearServerStudentsCache(); clearServerBillingCache();

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
      feesPending,
      message: `Admission successfully approved! Student ${student.name} has been enrolled in ${className}-${section}.`,
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNumber,
        rollNo: student.rollNumber,
        class: student.class.name,
        section: student.class.section,
        familyCode: student.parentProfile.familyCode,
        parentName: student.parentProfile.user?.name || student.fatherName || "Parent",
        fatherMobile: student.fatherMobile,
      },
      application: updatedApplication,
    });
  } catch (error: any) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Approve admission application error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to approve admission application.");
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  } finally {
    // Invalidate after either a committed approval or a rolled-back attempt.
    if (canInvalidateRoster) clearServerStudentsCache();
  }
}
