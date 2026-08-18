import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET: Fetch all admission enquiries (Admin & Accountant only)
export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Staff access required." }, { status: 403 });
  }

  try {
    const enquiries = await db.admissionEnquiry.findMany({
      orderBy: { createdAt: "desc" },
    });

    const formatted = enquiries.map((item) => ({
      id: item.id,
      parentName: item.parentName,
      studentName: item.studentName,
      mobile: item.mobile,
      targetClass: item.targetClass,
      message: item.message || "",
      status: item.status,
      remarks: item.remarks || "",
      createdAt: item.createdAt.toISOString().split("T")[0],
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch enquiries error:", error);
    return NextResponse.json({ error: "Failed to fetch enquiries" }, { status: 500 });
  }
}

// POST: Public submission of online admission enquiry from website
export async function POST(request: Request) {
  try {
    const { parentName, studentName, mobile, targetClass, message } = await request.json();

    if (!parentName || !studentName || !mobile || !targetClass) {
      return NextResponse.json(
        { error: "Parent name, student name, mobile, and class are required." },
        { status: 400 }
      );
    }

    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);

    const enquiry = await db.admissionEnquiry.create({
      data: {
        parentName: parentName.trim(),
        studentName: studentName.trim(),
        mobile: cleanMobile || String(mobile).trim(),
        targetClass: targetClass.trim(),
        message: message ? message.trim() : null,
        status: "NEW",
      },
    });

    return NextResponse.json({
      success: true,
      id: enquiry.id,
      message: "Enquiry submitted successfully",
    });
  } catch (error) {
    console.error("Create enquiry error:", error);
    return NextResponse.json({ error: "Failed to submit enquiry" }, { status: 500 });
  }
}

// PATCH: Update enquiry status or admin remarks
export async function PATCH(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Staff access required." }, { status: 403 });
  }

  try {
    const { id, status, remarks } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Enquiry ID is required." }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const updated = await db.admissionEnquiry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      enquiry: {
        id: updated.id,
        status: updated.status,
        remarks: updated.remarks,
      },
    });
  } catch (error) {
    console.error("Update enquiry error:", error);
    return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 });
  }
}

// DELETE: Delete enquiry record
export async function DELETE(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Enquiry ID is required." }, { status: 400 });
    }

    await db.admissionEnquiry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Enquiry deleted successfully" });
  } catch (error) {
    console.error("Delete enquiry error:", error);
    return NextResponse.json({ error: "Failed to delete enquiry" }, { status: 500 });
  }
}
