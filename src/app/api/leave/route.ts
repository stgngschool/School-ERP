import { NextResponse } from "next/server";
import db from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { getAuthUser } from "@/lib/auth";
import { LeaveStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

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
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const formData = await request.formData();
    const studentId = formData.get("studentId") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const reason = formData.get("reason") as string;
    const file = formData.get("file") as File | null;

    if (!studentId || !startDateStr || !endDateStr || !reason) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid start or end date format." }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json({ error: "Start date cannot be after end date." }, { status: 400 });
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
        startDate: start,
        endDate: end,
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
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "TEACHER")) {
      return NextResponse.json({ error: "Only teachers and admins can update leave requests." }, { status: 403 });
    }

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

    if (status === "APPROVED" && leave.startDate && leave.endDate) {
      const current = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const teacherUserId = authUser.userId;

      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

        await db.attendance.upsert({
          where: {
            studentId_date: {
              studentId: leave.studentId,
              date: dateObj,
            },
          },
          update: {
            status: "LEAVE",
            markedBy: teacherUserId,
          },
          create: {
            studentId: leave.studentId,
            date: dateObj,
            status: "LEAVE",
            markedBy: teacherUserId,
          },
        });

        current.setDate(current.getDate() + 1);
      }
    }

    return NextResponse.json({
      success: true,
      leave,
    });
  } catch (error: any) {
    console.error("Update leave error:", error);
    return NextResponse.json({ error: "Failed to update leave request status" }, { status: 500 });
  }
}

