import { NextResponse } from "next/server";
import db from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

export async function GET() {
  try {
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
    const { studentId, date, status } = await request.json();

    if (!studentId || !date || !status) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    let teacherUserId = "system";

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        teacherUserId = decoded.userId;
      }
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const dateObj = new Date(date);

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
