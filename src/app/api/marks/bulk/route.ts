import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN" && authUser.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden. Admin or Teacher access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { examName, subject, maxMarks, marksList } = body;

    if (!examName || !subject || maxMarks === undefined || !Array.isArray(marksList)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const max = parseFloat(maxMarks);
    if (isNaN(max) || max <= 0) {
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

    const upserts = marksList.map((m: any) => {
      const breakdown = m.breakdown || null;
      let obtained = parseFloat(m.marksObtained);

      if (breakdown && typeof breakdown === "object") {
        obtained = Object.values(breakdown).reduce((sum: number, val: any) => {
          const num = parseFloat(val);
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
      }

      if (isNaN(obtained) || obtained < 0 || obtained > max) {
        throw new Error(`Invalid marks: must be between 0 and ${max}`);
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

      return db.mark.upsert({
        where: {
          studentId_sessionId_subject_examName: {
            studentId: m.studentId,
            sessionId: targetSessionId,
            subject,
            examName,
          },
        },
        update: {
          marksObtained: obtained,
          maxMarks: max,
          writtenExam,
          notebook,
          subjectEnrichment,
          practical,
          breakdown: breakdown || undefined,
          remarks: m.remarks || null,
        },
        create: {
          studentId: m.studentId,
          sessionId: targetSessionId,
          subject,
          examName,
          marksObtained: obtained,
          maxMarks: max,
          writtenExam,
          notebook,
          subjectEnrichment,
          practical,
          breakdown: breakdown || undefined,
          remarks: m.remarks || null,
        },
      });
    });

    await db.$transaction(upserts);

    return NextResponse.json({ success: true, count: upserts.length });
  } catch (error: any) {
    console.error("Bulk save student marks error:", error);
    const safeMsg = error?.message && error.message.includes("Invalid marks")
      ? error.message
      : "Failed to save student marks.";
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
