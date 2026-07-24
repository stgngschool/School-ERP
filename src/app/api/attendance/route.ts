import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const logs = await db.attendance.findMany({
      orderBy: { date: "desc" },
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      studentId: log.studentId,
      date: log.date.toISOString().split("T")[0],
      status: log.status,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "TEACHER" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const teacherUserId = authUser.userId;

    // Handle Bulk / Batch Attendance Save
    if (body.records && Array.isArray(body.records)) {
      const { records } = body;

      const upsertOps = records.map((rec: { studentId: string; date: string; status: AttendanceStatus }) => {
        const dateStr = typeof rec.date === "string" ? rec.date.split("T")[0] : new Date(rec.date).toISOString().split("T")[0];
        const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

        return db.attendance.upsert({
          where: {
            studentId_date: {
              studentId: rec.studentId,
              date: dateObj,
            },
          },
          update: {
            status: rec.status as AttendanceStatus,
            markedBy: teacherUserId,
          },
          create: {
            studentId: rec.studentId,
            date: dateObj,
            status: rec.status as AttendanceStatus,
            markedBy: teacherUserId,
          },
        });
      });

      await db.$transaction(upsertOps);

      return NextResponse.json({ success: true, count: records.length });
    }

    // Handle Single Attendance Mark
    const { studentId, date, status, overrideLeave } = body;

    if (!studentId || !date || !status) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const validStatuses = Object.values(AttendanceStatus);
    if (!validStatuses.includes(status as AttendanceStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const dateStr = typeof date === "string" ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    // Check if an approved leave already exists for this date
    const existing = await db.attendance.findUnique({
      where: {
        studentId_date: {
          studentId,
          date: dateObj,
        },
      },
    });

    if (existing && existing.status === "LEAVE" && status !== "LEAVE" && !overrideLeave) {
      return NextResponse.json(
        { error: "Student has an approved leave for this date. Set overrideLeave: true to change status." },
        { status: 409 }
      );
    }

    const attendance = await db.attendance.upsert({
      where: {
        studentId_date: {
          studentId,
          date: dateObj,
        },
      },
      update: {
        status: status as AttendanceStatus,
        markedBy: teacherUserId,
      },
      create: {
        studentId,
        date: dateObj,
        status: status as AttendanceStatus,
        markedBy: teacherUserId,
      },
    });

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        studentId: attendance.studentId,
        date: attendance.date.toISOString().split("T")[0],
        status: attendance.status,
      },
    });
  } catch (error: any) {
    console.error("Mark attendance error:", error);
    return NextResponse.json({ error: "Failed to save attendance record" }, { status: 500 });
  }
}

