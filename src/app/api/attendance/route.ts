import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";
import { getAcademicYear } from "@/lib/generateYearlyCharges";
import { getSafeErrorMessage } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const studentIdParam = searchParams.get("studentId");
    const sessionIdParam = searchParams.get("sessionId");

    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.min(2000, Math.max(1, parseInt(limitParam || "1000", 10) || 1000));
    const skip = (page - 1) * limit;

    const acYear = getAcademicYear();
    const startYear = parseInt(acYear.split("-")[0]);
    // ── AT-03: Academic year session begins April 1st (04-01), not March 1st (03-01)
    const sessionStartDate = new Date(`${startYear}-04-01T00:00:00.000Z`);

    let dateFilter: any = {};
    if (startDateParam) {
      dateFilter.gte = new Date(startDateParam);
    } else {
      dateFilter.gte = sessionStartDate;
    }
    if (endDateParam) {
      dateFilter.lte = new Date(endDateParam);
    }

    let whereClause: any = {
      date: dateFilter
    };

    if (sessionIdParam) {
      whereClause.sessionId = sessionIdParam;
    }

    if (studentIdParam) {
      whereClause.studentId = studentIdParam;
    }

    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId },
        include: { students: true }
      });
      if (!parentProfile) {
        return NextResponse.json([]);
      }
      const studentIds = parentProfile.students.map((s) => s.id);
      if (studentIdParam) {
        if (!studentIds.includes(studentIdParam)) {
          return NextResponse.json({ error: "Forbidden. Access to this student is unauthorized." }, { status: 403 });
        }
      } else {
        whereClause.studentId = { in: studentIds };
      }
    }

    // ── AT-02: Bounded pagination retrieving total count and paged logs without hard truncation
    const [totalCount, logs] = await Promise.all([
      db.attendance.count({ where: whereClause }),
      db.attendance.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { date: "desc" },
      }),
    ]);

    const formatted = logs.map((log) => ({
      id: log.id,
      studentId: log.studentId,
      date: log.date.toISOString().split("T")[0],
      status: log.status,
      // ── AT-04: Include server-side updatedAt so clients can do optimistic concurrency checks.
      updatedAt: log.updatedAt.toISOString(),
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = skip + logs.length < totalCount;

    return NextResponse.json(formatted, {
      headers: {
        "X-Total-Count": String(totalCount),
        "X-Page": String(page),
        "X-Limit": String(limit),
        "X-Total-Pages": String(totalPages),
        "X-Has-More": String(hasMore),
      },
    });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to fetch attendance");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "TEACHER" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const body = await request.json();
    const teacherUserId = authUser.userId;

    // ── AT-01: Enforce class-level authorization for teachers ─────────────────
    let allowedClassIds: Set<string> | null = null;
    if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: { select: { id: true } } }
      });
      if (!teacherProfile || teacherProfile.classes.length === 0) {
        return NextResponse.json(
          { error: "Forbidden. You are not assigned as a class teacher to any class." },
          { status: 403 }
        );
      }
      allowedClassIds = new Set(teacherProfile.classes.map((c) => c.id));
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Handle Bulk / Batch Attendance Save
    if (body.records && Array.isArray(body.records)) {
      const { records } = body;
      if (records.length === 0) {
        return NextResponse.json({ error: "Empty records array." }, { status: 400 });
      }

      // ── AT-01: Verify teacher is authorized for all students in bulk payload
      if (allowedClassIds) {
        const studentIds = records.map((r: any) => r.studentId);
        const students = await db.student.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, classId: true }
        });
        const studentMap = new Map(students.map((s) => [s.id, s.classId]));
        const unauthorized = records.some((r: any) => {
          const cId = studentMap.get(r.studentId);
          return !cId || !allowedClassIds!.has(cId);
        });
        if (unauthorized || students.length !== studentIds.length) {
          return NextResponse.json(
            { error: "Forbidden. Teachers can only mark attendance for students in their assigned classes." },
            { status: 403 }
          );
        }
      }

      // ── AT-04: Optimistic concurrency check + upsert in a single interactive
      // transaction.  Records that include expectedUpdatedAt are compared against
      // the current DB value inside the transaction; if any record is stale we
      // abort and return HTTP 409 with the conflicting studentIds so the client
      // can re-fetch and re-merge before retrying.
      // Records that omit expectedUpdatedAt are always allowed through (backward-
      // compatible with callers that were written before this check was added).
      let conflicts: string[] = [];

      await db.$transaction(async (tx) => {
        // Phase 1: conflict detection (only for records that sent a timestamp)
        for (const rec of records) {
          if (!rec.expectedUpdatedAt) continue;

          const dateStr = typeof rec.date === "string"
            ? rec.date.split("T")[0]
            : new Date(rec.date).toISOString().split("T")[0];
          const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

          const existing = await tx.attendance.findUnique({
            where: { studentId_date: { studentId: rec.studentId, date: dateObj } },
            select: { updatedAt: true, studentId: true },
          });

          if (existing) {
            const expectedTs = new Date(rec.expectedUpdatedAt).getTime();
            if (existing.updatedAt.getTime() > expectedTs) {
              conflicts.push(rec.studentId);
            }
          }
        }

        if (conflicts.length > 0) {
          // Throwing inside $transaction triggers automatic rollback.
          throw Object.assign(
            new Error("ATTENDANCE_CONFLICT"),
            { conflicts }
          );
        }

        // Phase 2: all upserts (no conflicts detected)
        for (const rec of records) {
          const dateStr = typeof rec.date === "string"
            ? rec.date.split("T")[0]
            : new Date(rec.date).toISOString().split("T")[0];
          const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

          await tx.attendance.upsert({
            where: { studentId_date: { studentId: rec.studentId, date: dateObj } },
            update: { status: rec.status as AttendanceStatus, markedBy: teacherUserId },
            create: {
              studentId: rec.studentId,
              date: dateObj,
              status: rec.status as AttendanceStatus,
              markedBy: teacherUserId,
            },
          });
        }
      });

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

    // ── AT-01: Verify teacher is authorized for this student
    if (allowedClassIds && (!student.classId || !allowedClassIds.has(student.classId))) {
      return NextResponse.json(
        { error: "Forbidden. Teachers can only mark attendance for students in their assigned classes." },
        { status: 403 }
      );
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
        updatedAt: attendance.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    // ── AT-04: Return 409 for optimistic concurrency conflicts so the frontend
    // can distinguish a stale-write rejection from a generic server error.
    if (error?.message === "ATTENDANCE_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "Attendance conflict: another user saved more recent data for some students. " +
            "Please refresh and try again.",
          conflicts: error.conflicts ?? [],
        },
        { status: 409 }
      );
    }
    console.error("Mark attendance error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to save attendance record");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

