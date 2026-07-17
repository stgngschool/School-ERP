import { NextResponse } from "next/server";
import db from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { LeaveStatus } from "@prisma/client";

export async function GET() {
  try {
    const leaves = await db.leaveRequest.findMany({
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = leaves.map((lv) => ({
      id: lv.id,
      studentId: lv.studentId,
      studentName: lv.student.name,
      classSection: `${lv.student.class.name}-${lv.student.class.section}`,
      startDate: lv.startDate.toISOString().split("T")[0],
      endDate: lv.endDate.toISOString().split("T")[0],
      reason: lv.reason,
      status: lv.status,
      createdAt: lv.createdAt.toISOString().split("T")[0],
      fileUrl: lv.fileUrl,
      remarks: lv.remarks || "",
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch leaves error:", error);
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const studentId = formData.get("studentId") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const reason = formData.get("reason") as string;
    const file = formData.get("file") as File | null;

    if (!studentId || !startDateStr || !endDateStr || !reason) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    let fileUrl: string | null = null;
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileExtension = file.name.split(".").pop();
      const fileName = `leave-${Date.now()}-${Math.floor(100 + Math.random() * 900)}.${fileExtension}`;
      
      fileUrl = await uploadFile("leave-certificates", `slips/${fileName}`, buffer, file.type);
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });

    let teacherId: string | null = null;
    if (student?.class.classTeacherId) {
      teacherId = student.class.classTeacherId;
    }

    const leave = await db.leaveRequest.create({
      data: {
        studentId,
        startDate: new Date(startDateStr),
        endDate: new Date(endDateStr),
        reason,
        fileUrl,
        teacherId,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      leave,
    });
  } catch (error: any) {
    console.error("Submit leave error:", error);
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, remarks } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Leave request ID and status are required." }, { status: 400 });
    }

    const leave = await db.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
        remarks: remarks || "",
      },
    });

    return NextResponse.json({
      success: true,
      leave,
    });
  } catch (error: any) {
    console.error("Update leave error:", error);
    return NextResponse.json({ error: "Failed to update leave request status" }, { status: 500 });
  }
}
