import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper to generate sequential application numbers (e.g., ADM-2026-0001)
async function getNextApplicationNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `ADM-${currentYear}-`;

  const lastApp = await db.admissionApplication.findFirst({
    where: {
      applicationNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      applicationNo: "desc",
    },
    select: {
      applicationNo: true,
    },
  });

  let nextSeq = 1;
  if (lastApp?.applicationNo) {
    const parts = lastApp.applicationNo.split("-");
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) {
        nextSeq = num + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const trackingAppNo = url.searchParams.get("applicationNo");
    const trackingMobile = url.searchParams.get("mobile");
    const statusFilter = url.searchParams.get("status");
    const classFilter = url.searchParams.get("class");
    const searchQuery = url.searchParams.get("search");
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 200;

    // Public Status Tracking Flow
    if (trackingAppNo && trackingMobile) {
      const cleanMobile = trackingMobile.trim().replace(/\D/g, "");
      const app = await db.admissionApplication.findFirst({
        where: {
          applicationNo: trackingAppNo.trim().toUpperCase(),
          OR: [
            { fatherMobile: { contains: cleanMobile } },
            { motherMobile: { contains: cleanMobile } },
          ],
        },
        select: {
          id: true,
          applicationNo: true,
          studentName: true,
          classApplied: true,
          fatherName: true,
          fatherMobile: true,
          status: true,
          rejectionReason: true,
          assignedSection: true,
          createdAt: true,
          updatedAt: true,
          enrolledStudent: {
            select: {
              id: true,
              admissionNumber: true,
              rollNumber: true,
              class: {
                select: {
                  name: true,
                  section: true,
                },
              },
            },
          },
        },
      });

      if (!app) {
        return NextResponse.json(
          { error: "No admission application found matching the provided Application Number and Mobile Number." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, application: app });
    }

    // Admin / Accountant ERP Applications Management
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access. Admin privileges required." }, { status: 401 });
    }

    const whereClause: any = {};

    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    if (classFilter && classFilter !== "ALL") {
      whereClause.classApplied = classFilter;
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      whereClause.OR = [
        { applicationNo: { contains: q, mode: "insensitive" } },
        { studentName: { contains: q, mode: "insensitive" } },
        { fatherName: { contains: q, mode: "insensitive" } },
        { fatherMobile: { contains: q } },
        { motherName: { contains: q, mode: "insensitive" } },
        { motherMobile: { contains: q } },
        { aadhaar: { contains: q } },
      ];
    }

    const applications = await db.admissionApplication.findMany({
      where: whereClause,
      take: limit,
      orderBy: [
        { createdAt: "desc" },
      ],
      include: {
        enrolledStudent: {
          select: {
            id: true,
            admissionNumber: true,
            rollNumber: true,
            class: {
              select: {
                name: true,
                section: true,
              },
            },
            parentProfile: {
              select: {
                familyCode: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    const summaryCounts = {
      total: await db.admissionApplication.count(),
      pending: await db.admissionApplication.count({ where: { status: "PENDING" } }),
      underReview: await db.admissionApplication.count({ where: { status: "UNDER_REVIEW" } }),
      approved: await db.admissionApplication.count({ where: { status: "APPROVED" } }),
      rejected: await db.admissionApplication.count({ where: { status: "REJECTED" } }),
    };

    return NextResponse.json({
      success: true,
      applications,
      summary: summaryCounts,
    });
  } catch (error: any) {
    console.error("Fetch admission applications error:", error);
    return NextResponse.json({ error: "Failed to fetch admission applications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentName,
      classApplied,
      gender,
      dob,
      aadhaar,
      category,
      religion,
      motherTongue,
      nationality,
      disability,
      bloodGroup,
      photoUrl,
      fatherName,
      fatherMobile,
      fatherOccupation,
      fatherAadhaar,
      motherName,
      motherMobile,
      motherOccupation,
      motherAadhaar,
      parentEmail,
      address,
      emergencyName,
      emergencyPhone,
      familyIncome,
      prevSchoolName,
      prevClassPassed,
      tcNumber,
      transportRequired,
      busStop,
      isRte,
    } = body;

    // Required Field Validation
    if (!studentName?.trim() || !classApplied?.trim() || !fatherName?.trim() || !fatherMobile?.trim() || !address?.trim()) {
      return NextResponse.json(
        { error: "Student Name, Class, Father's Name, Mobile Number, and Address are required." },
        { status: 400 }
      );
    }

    const applicationNo = await getNextApplicationNumber();

    const application = await db.admissionApplication.create({
      data: {
        applicationNo,
        studentName: studentName.trim(),
        classApplied: classApplied.trim(),
        gender: gender || null,
        dob: dob ? new Date(dob) : null,
        aadhaar: aadhaar ? aadhaar.trim() : null,
        category: category || "GENERAL",
        religion: religion || null,
        motherTongue: motherTongue || null,
        nationality: nationality || "Indian",
        disability: disability || null,
        bloodGroup: bloodGroup || null,
        photoUrl: photoUrl || null,
        fatherName: fatherName.trim(),
        fatherMobile: fatherMobile.trim(),
        fatherOccupation: fatherOccupation || null,
        fatherAadhaar: fatherAadhaar ? fatherAadhaar.trim() : null,
        motherName: motherName ? motherName.trim() : null,
        motherMobile: motherMobile ? motherMobile.trim() : null,
        motherOccupation: motherOccupation || null,
        motherAadhaar: motherAadhaar ? motherAadhaar.trim() : null,
        parentEmail: parentEmail ? parentEmail.trim().toLowerCase() : null,
        address: address.trim(),
        emergencyName: emergencyName ? emergencyName.trim() : null,
        emergencyPhone: emergencyPhone ? emergencyPhone.trim() : null,
        familyIncome: familyIncome || null,
        prevSchoolName: prevSchoolName ? prevSchoolName.trim() : null,
        prevClassPassed: prevClassPassed ? prevClassPassed.trim() : null,
        tcNumber: tcNumber ? tcNumber.trim() : null,
        transportRequired: Boolean(transportRequired),
        busStop: busStop || null,
        isRte: Boolean(isRte),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      applicationNo: application.applicationNo,
      application: {
        id: application.id,
        applicationNo: application.applicationNo,
        studentName: application.studentName,
        classApplied: application.classApplied,
        fatherName: application.fatherName,
        fatherMobile: application.fatherMobile,
        status: application.status,
        createdAt: application.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Create admission application error:", error);
    return NextResponse.json({ error: "Failed to submit admission application" }, { status: 500 });
  }
}
