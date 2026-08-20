import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const application = await db.admissionApplication.findUnique({
      where: { id },
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

    if (!application) {
      return NextResponse.json({ error: "Admission application not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Get admission application error:", error);
    return NextResponse.json({ error: "Failed to fetch application details" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      rejectionReason,
      adminRemarks,
      assignedSection,
      studentName,
      classApplied,
      fatherName,
      fatherMobile,
      motherName,
      motherMobile,
      address,
      dob,
      gender,
      aadhaar,
      category,
      religion,
      transportRequired,
      busStop,
      isRte,
    } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (adminRemarks !== undefined) updateData.adminRemarks = adminRemarks;
    if (assignedSection !== undefined) updateData.assignedSection = assignedSection;
    if (studentName !== undefined) updateData.studentName = studentName.trim();
    if (classApplied !== undefined) updateData.classApplied = classApplied.trim();
    if (fatherName !== undefined) updateData.fatherName = fatherName.trim();
    if (fatherMobile !== undefined) updateData.fatherMobile = fatherMobile.trim();
    if (motherName !== undefined) updateData.motherName = motherName?.trim() || null;
    if (motherMobile !== undefined) updateData.motherMobile = motherMobile?.trim() || null;
    if (address !== undefined) updateData.address = address.trim();
    if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
    if (gender !== undefined) updateData.gender = gender;
    if (aadhaar !== undefined) updateData.aadhaar = aadhaar?.trim() || null;
    if (category !== undefined) updateData.category = category;
    if (religion !== undefined) updateData.religion = religion;
    if (transportRequired !== undefined) updateData.transportRequired = Boolean(transportRequired);
    if (busStop !== undefined) updateData.busStop = busStop;
    if (isRte !== undefined) updateData.isRte = Boolean(isRte);

    updateData.reviewedById = authUser.userId;

    const updated = await db.admissionApplication.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error("Update admission application error:", error);
    return NextResponse.json({ error: "Failed to update admission application" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access. Admin privileges required." }, { status: 403 });
    }

    await db.admissionApplication.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Application deleted successfully." });
  } catch (error: any) {
    console.error("Delete admission application error:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
