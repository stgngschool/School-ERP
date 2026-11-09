import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getCachedActiveSession } from "@/lib/cache/sessionCache";

import { sessionClassFilter } from "@/lib/sessionClassFilter";

export const dynamic = "force-dynamic";

function marksVersion(rows: { id: string; updatedAt: Date }[]) {
  const revisions = rows.map(row => [row.id, row.updatedAt.toISOString()]).sort();
  return `"${createHash("sha256").update(JSON.stringify(revisions)).digest("hex")}"`;
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "ADMIN" && authUser.role !== "TEACHER" && authUser.role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden. Admin, Accountant, or Teacher access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class");
    const section = searchParams.get("section");
    const sessionId = searchParams.get("sessionId");
    const studentId = searchParams.get("studentId");

    if (!className || !section) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const cleanClassName = className.replace(/^class\s*/i, "").trim();

    if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: { where: { status: "ACTIVE" }, select: { name: true, section: true } } },
      });
      const normalizeClassName = (value: string) => value.replace(/^class\s*/i, "").trim().toLowerCase();
      const isAssigned = teacherProfile?.classes.some((assignedClass) =>
        normalizeClassName(assignedClass.name) === normalizeClassName(cleanClassName) &&
        (assignedClass.section ?? "").trim().toLowerCase() === section.trim().toLowerCase()
      ) ?? false;

      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden. You are only authorized to view marks for your assigned class and section." }, { status: 403 });
      }
    }

    const classOrConditions: any[] = [
      { name: { equals: cleanClassName, mode: "insensitive" } },
      { name: { equals: `Class ${cleanClassName}`, mode: "insensitive" } },
      { name: { equals: className, mode: "insensitive" } },
    ];

    if (section) {
      classOrConditions.forEach((cond) => {
        cond.section = { equals: section, mode: "insensitive" };
      });
    }

    let targetSessionId: string | null = sessionId;
    if (!targetSessionId) {
      const currentSession = await getCachedActiveSession();
      targetSessionId = currentSession ? currentSession.id : null;
    }

    const whereClause: any = {
      student: {
        class: {
          OR: classOrConditions,
        }
      }
    };
    if (!targetSessionId) return NextResponse.json({ error: "Select a valid academic session." }, { status: 409 });
    const selectedSession = await db.academicSession.findUnique({ where: { id: targetSessionId } });
    if (!selectedSession) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    const selectedClassWhere = whereClause.student.class;
    whereClause.student = sessionClassFilter(targetSessionId, selectedClassWhere, selectedSession.isCurrent);
    whereClause.sessionId = targetSessionId;
    if (studentId) whereClause.studentId = studentId;


    const versioned = searchParams.get("versioned") === "1";
    const previousVersion = versioned ? request.headers.get("If-None-Match") : null;
    const headers = { "Cache-Control": "private, no-store" };
    if (previousVersion) {
      const revisions = await db.mark.findMany({
        where: whereClause,
        select: { id: true, updatedAt: true },
      });
      if (marksVersion(revisions) === previousVersion) {
        return new Response(null, { status: 304, headers });
      }
    }

    const marks = await db.mark.findMany({
      where: whereClause,
      select: {
        id: true,
        updatedAt: true,
        studentId: true,
        subject: true,
        examName: true,
        marksObtained: true,
        maxMarks: true,
        remarks: true,
        writtenExam: true,
        notebook: true,
        subjectEnrichment: true,
        practical: true,
        breakdown: true
      }
    });

    const data = marks.map(({ id, updatedAt, ...mark }) => mark);
    if (!versioned) return NextResponse.json(data, { headers });

    const byStudent = new Map<string, typeof marks>();
    if (!studentId) {
      for (const mark of marks) {
        const studentMarks = byStudent.get(mark.studentId) ?? [];
        studentMarks.push(mark);
        byStudent.set(mark.studentId, studentMarks);
      }
    }
    return NextResponse.json({
      marks: data,
      version: marksVersion(marks),
      studentVersions: Object.fromEntries([...byStudent].map(([id, rows]) => [id, marksVersion(rows)])),
      emptyVersion: marksVersion([]),
    }, { headers });
  } catch (error: any) {
    console.error("[API_ERROR] /api/marks/class:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
