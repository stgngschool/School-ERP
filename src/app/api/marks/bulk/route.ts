import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN" && authUser.role !== "TEACHER" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin, Accountant, or Teacher access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { examName, subject, maxMarks, marksList, deletedStudentIds } = body;

    if (!examName || !subject) {
      return NextResponse.json({ error: "Missing examName or subject." }, { status: 400 });
    }

    // ── Check if Exam is Locked by Admin
    const cleanExamName = examName.trim();
    const cleanSubject = subject.trim().toUpperCase();
    try {
      const schoolConfigRow = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
      const cfgData = (schoolConfigRow?.data as any) || {};
      const lockedExams: string[] = Array.isArray(cfgData.lockedExams) ? cfgData.lockedExams : [];
      const isLocked = lockedExams.some((e: string) => e.trim().toLowerCase() === cleanExamName.toLowerCase());
      if (isLocked && authUser.role !== "ADMIN") {
        return NextResponse.json({
          error: `Examination '${cleanExamName}' is confirmed and locked by Admin. Marks cannot be entered or edited.`,
        }, { status: 403 });
      }
    } catch (cfgErr) {
      console.warn("Could not check lockedExams in bulk marks:", cfgErr);
    }

    const hasMarksList = Array.isArray(marksList) && marksList.length > 0;
    const hasDeletions = Array.isArray(deletedStudentIds) && deletedStudentIds.length > 0;

    if (!hasMarksList && !hasDeletions) {
      return NextResponse.json({ error: "No marks or deletions provided." }, { status: 400 });
    }

    const max = maxMarks !== undefined ? parseFloat(maxMarks) : 100;
    if (hasMarksList && (isNaN(max) || max <= 0)) {
      return NextResponse.json({ error: "Max marks must be a positive number." }, { status: 400 });
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

    const isAbsentString = (val: any) => {
      if (typeof val === "string") {
        const clean = val.trim().toUpperCase();
        return clean === "AB" || clean === "A" || clean === "ABSENT";
      }
      return false;
    };

    const validEntries: any[] = [];
    const validationErrors: string[] = [];

    for (const m of marksList) {
      if (!m.studentId) continue;

      const breakdown = m.breakdown || null;
      let isAbsent = m.isAbsent === true || isAbsentString(m.marksObtained);
      let obtained = 0;
      let remarks = m.remarks || "";

      if (breakdown && typeof breakdown === "object") {
        let hasAnyNumber = false;
        let sum = 0;
        Object.values(breakdown).forEach((val: any) => {
          if (isAbsentString(val)) {
            isAbsent = true;
          } else {
            const num = parseFloat(val);
            if (!isNaN(num)) {
              hasAnyNumber = true;
              sum += num;
            }
          }
        });
        obtained = sum;
      } else {
        if (!isAbsent) {
          obtained = parseFloat(m.marksObtained);
        }
      }

      if (isAbsent) {
        obtained = 0;
        if (!remarks.toUpperCase().includes("ABSENT")) {
          remarks = remarks ? `${remarks} (ABSENT)` : "ABSENT";
        }
      }

      if (isNaN(obtained) || obtained < 0 || obtained > max) {
        validationErrors.push(`Student ${m.studentId}: Marks must be between 0 and ${max}`);
        continue;
      }

      // Map dynamic breakdown keys to static columns where possible for compatibility
      let writtenExam: number | null = null;
      let notebook: number | null = null;
      let subjectEnrichment: number | null = null;
      let practical: number | null = null;

      if (breakdown && typeof breakdown === "object") {
        Object.entries(breakdown).forEach(([key, val]) => {
          const numVal = parseFloat(val as string);
          if (isNaN(numVal)) return;

          const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "");
          if (normalizedKey.includes("written") || normalizedKey.includes("exam")) {
            writtenExam = numVal;
          } else if (normalizedKey.includes("notebook") || normalizedKey.includes("note")) {
            notebook = numVal;
          } else if (normalizedKey.includes("enrichment") || normalizedKey.includes("enri") || normalizedKey.includes("sub")) {
            subjectEnrichment = numVal;
          } else if (normalizedKey.includes("practical") || normalizedKey.includes("act") || normalizedKey.includes("prac")) {
            practical = numVal;
          }
        });
      }

      validEntries.push({
        studentId: m.studentId,
        obtained,
        max,
        writtenExam,
        notebook,
        subjectEnrichment,
        practical,
        breakdown,
        remarks: remarks || null,
      });
    }

    if (validEntries.length === 0 && validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors[0] }, { status: 400 });
    }

    // If any students need to be deleted (cleared marks)
    let deletedCount = 0;
    if (hasDeletions) {
      const delRes = await db.mark.deleteMany({
        where: {
          studentId: { in: deletedStudentIds },
          sessionId: targetSessionId,
          subject: cleanSubject,
          examName: cleanExamName,
        },
      });
      deletedCount = delRes.count;
    }

    // Generate individual upsert operations
    const upsertOps = validEntries.map((entry) => {
      return db.mark.upsert({
        where: {
          studentId_sessionId_subject_examName: {
            studentId: entry.studentId,
            sessionId: targetSessionId,
            subject: cleanSubject,
            examName: cleanExamName,
          },
        },
        update: {
          marksObtained: entry.obtained,
          maxMarks: entry.max,
          writtenExam: entry.writtenExam,
          notebook: entry.notebook,
          subjectEnrichment: entry.subjectEnrichment,
          practical: entry.practical,
          breakdown: entry.breakdown || undefined,
          remarks: entry.remarks,
        },
        create: {
          studentId: entry.studentId,
          sessionId: targetSessionId,
          subject: cleanSubject,
          examName: cleanExamName,
          marksObtained: entry.obtained,
          maxMarks: entry.max,
          writtenExam: entry.writtenExam,
          notebook: entry.notebook,
          subjectEnrichment: entry.subjectEnrichment,
          practical: entry.practical,
          breakdown: entry.breakdown || undefined,
          remarks: entry.remarks,
        },
      });
    });

    // ── Safe Chunked Execution (eliminates Prisma 5s transaction timeout and full-batch aborts)
    const CHUNK_SIZE = 15;
    let savedCount = 0;
    const failedStudentIds: string[] = [];

    for (let i = 0; i < upsertOps.length; i += CHUNK_SIZE) {
      const chunk = upsertOps.slice(i, i + CHUNK_SIZE);
      try {
        await db.$transaction(chunk);
        savedCount += chunk.length;
      } catch (chunkErr: any) {
        console.warn(`[API /api/marks/bulk] Chunk batch ${Math.floor(i / CHUNK_SIZE) + 1} transaction failed, retrying row-by-row:`, chunkErr.message);
        // Fallback: save row-by-row so no valid student data in this chunk is discarded
        for (let j = 0; j < chunk.length; j++) {
          try {
            await chunk[j];
            savedCount++;
          } catch (singleErr: any) {
            console.error(`[API /api/marks/bulk] Failed to save student ${validEntries[i + j]?.studentId}:`, singleErr.message);
            failedStudentIds.push(validEntries[i + j]?.studentId);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: savedCount,
      deletedCount,
      totalSubmitted: (marksList?.length || 0) + (deletedStudentIds?.length || 0),
      failedStudentIds,
      warnings: validationErrors,
    });
  } catch (error: any) {
    console.error("Bulk save student marks error:", error);
    const isValidationError = error?.message && error.message.includes("Invalid marks");
    const safeMsg = isValidationError
      ? error.message
      : "Failed to save student marks. Please try again.";
    return NextResponse.json({ error: safeMsg }, { status: isValidationError ? 400 : 500 });
  }
}

export async function DELETE(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN" && authUser.role !== "TEACHER" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin, Accountant, or Teacher access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { examName, subject, studentId, studentIds } = body;

    if (!examName || !subject || (!studentId && (!Array.isArray(studentIds) || studentIds.length === 0))) {
      return NextResponse.json({ error: "Missing required fields for deletion (examName, subject, studentId/studentIds)." }, { status: 400 });
    }

    let targetSessionId = body.sessionId;
    if (!targetSessionId) {
      const currentSession = await db.academicSession.findFirst({ where: { isCurrent: true } });
      targetSessionId = currentSession?.id;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: "Active academic session not found." }, { status: 400 });
    }

    const idsToDelete: string[] = studentId ? [studentId] : studentIds;
    const cleanSubject = subject.trim().toUpperCase();
    const cleanExamName = examName.trim();

    // ── Check if Exam is Locked by Admin
    try {
      const schoolConfigRow = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
      const cfgData = (schoolConfigRow?.data as any) || {};
      const lockedExams: string[] = Array.isArray(cfgData.lockedExams) ? cfgData.lockedExams : [];
      const isLocked = lockedExams.some((e: string) => e.trim().toLowerCase() === cleanExamName.toLowerCase());
      if (isLocked && authUser.role !== "ADMIN") {
        return NextResponse.json({
          error: `Examination '${cleanExamName}' is confirmed and locked by Admin. Marks cannot be deleted or reset.`,
        }, { status: 403 });
      }
    } catch (cfgErr) {
      console.warn("Could not check lockedExams in delete marks:", cfgErr);
    }

    const delResult = await db.mark.deleteMany({
      where: {
        studentId: { in: idsToDelete },
        sessionId: targetSessionId,
        subject: cleanSubject,
        examName: cleanExamName,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: delResult.count,
    });
  } catch (error: any) {
    console.error("Delete mark error:", error);
    return NextResponse.json({ error: "Failed to delete student marks." }, { status: 500 });
  }
}
