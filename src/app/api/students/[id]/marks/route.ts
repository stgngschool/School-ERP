import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validation";
import { getCachedSchoolConfig } from "@/lib/cache/schoolConfigCache";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: studentId } = await params;

    if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: { where: { status: "ACTIVE" }, select: { id: true } } },
      });
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: { classId: true },
      });
      const allowedClassIds = new Set(teacherProfile?.classes.map((classRecord) => classRecord.id) ?? []);
      if (!student || !student.classId || !allowedClassIds.has(student.classId)) {
        return NextResponse.json({ error: "Forbidden. You are only authorized to view marks for students in your assigned classes." }, { status: 403 });
      }
    }

    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId }
      });
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: { parentProfileId: true }
      });
      if (!parentProfile || !student || student.parentProfileId !== parentProfile.id) {
        return NextResponse.json({ error: "Unauthorized access to this student's marks." }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    const whereClause: any = {
      studentId,
    };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const marks = await db.mark.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(marks);
  } catch (error: any) {
    console.error("Failed to fetch student marks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN" && authUser.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden. Only administrators and teachers can record marks." }, { status: 403 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const { subject, examName, marksObtained, maxMarks, remarks, writtenExam, notebook, subjectEnrichment, practical } = body;

    if (!subject || !examName || marksObtained === undefined || maxMarks === undefined) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: { where: { status: "ACTIVE" }, select: { id: true } } },
      });
      const student = await db.student.findUnique({
        where: { id },
        select: { classId: true },
      });
      const allowedClassIds = new Set(teacherProfile?.classes.map((classRecord) => classRecord.id) ?? []);
      if (!student || !student.classId || !allowedClassIds.has(student.classId)) {
        return NextResponse.json({ error: "Forbidden. You can only record marks for students in your assigned classes." }, { status: 403 });
      }
    }

    if (authUser.role !== "ADMIN") {
      try {
        const schoolConfigRow = await getCachedSchoolConfig();
        if (!schoolConfigRow) throw new Error("School configuration unavailable");
        const cfgData = (schoolConfigRow.data as Record<string, unknown>) || {};
        const lockedExams = Array.isArray(cfgData.lockedExams) ? cfgData.lockedExams : [];
        const isLocked = lockedExams.some(
          (lockedExam): lockedExam is string =>
            typeof lockedExam === "string" && lockedExam.trim().toLowerCase() === String(examName).trim().toLowerCase()
        );
        if (isLocked) {
          return NextResponse.json({ error: `Examination '${examName}' is confirmed and locked by Admin. Marks cannot be entered or edited.` }, { status: 403 });
        }
      } catch (configError) {
        console.error("Could not verify lockedExams in single-student marks:", configError);
        return NextResponse.json({ error: "Unable to verify exam lock status. Please try again." }, { status: 503 });
      }
    }

    const writtenVal = writtenExam !== undefined && writtenExam !== null && writtenExam !== "" ? parseFloat(writtenExam) : null;
    const notebookVal = notebook !== undefined && notebook !== null && notebook !== "" ? parseFloat(notebook) : null;
    const subjectEnriVal = subjectEnrichment !== undefined && subjectEnrichment !== null && subjectEnrichment !== "" ? parseFloat(subjectEnrichment) : null;
    const practicalVal = practical !== undefined && practical !== null && practical !== "" ? parseFloat(practical) : null;

    let obtained = parseFloat(marksObtained);
    if (writtenVal !== null || notebookVal !== null || subjectEnriVal !== null || practicalVal !== null) {
      obtained = (writtenVal || 0) + (notebookVal || 0) + (subjectEnriVal || 0) + (practicalVal || 0);
    }

    const max = parseFloat(maxMarks);

    if (isNaN(obtained) || isNaN(max)) {
      return NextResponse.json({ error: "Marks must be numeric." }, { status: 400 });
    }

    if (obtained < 0 || obtained > max) {
      return NextResponse.json({ error: "Obtained marks must be between 0 and maximum marks." }, { status: 400 });
    }

    // ── DB-11: Resolve academic session for marks scoping
    let targetSessionId = body.sessionId;
    if (!targetSessionId) {
      const currentSession = await db.academicSession.findFirst({ where: { isCurrent: true } });
      targetSessionId = currentSession?.id;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: "Active academic session not found." }, { status: 400 });
    }

    const mark = await db.mark.upsert({
      where: {
        studentId_sessionId_subject_examName: {
          studentId: id,
          sessionId: targetSessionId,
          subject,
          examName,
        },
      },
      update: {
        marksObtained: obtained,
        maxMarks: max,
        writtenExam: writtenVal,
        notebook: notebookVal,
        subjectEnrichment: subjectEnriVal,
        practical: practicalVal,
        remarks: remarks || null,
      },
      create: {
        studentId: id,
        sessionId: targetSessionId,
        subject,
        examName,
        marksObtained: obtained,
        maxMarks: max,
        writtenExam: writtenVal,
        notebook: notebookVal,
        subjectEnrichment: subjectEnriVal,
        practical: practicalVal,
        remarks: remarks || null,
      },
    });

    return NextResponse.json({ success: true, mark });
  } catch (error: any) {
    console.error("Save student mark error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to save mark.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
