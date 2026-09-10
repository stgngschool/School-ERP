import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
    const section = searchParams.get("section") || "";
    const examName = searchParams.get("exam");
    const subject = searchParams.get("subject");
    const sessionId = searchParams.get("sessionId");

    if (!className || !examName || !subject) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const cleanClassName = className.replace(/^class\s*/i, "").trim();

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
      const currentSession = await db.academicSession.findFirst({ where: { isCurrent: true } });
      targetSessionId = currentSession ? currentSession.id : null;
    }

    const normSub = subject.toUpperCase().trim();
    let subjectAliases = [subject];
    if (normSub === "SCIENCE/EVS" || normSub === "SCIENCE" || normSub === "EVS") {
      subjectAliases = ["SCIENCE/EVS", "SCIENCE", "EVS", "Science"];
    } else if (normSub === "G.K." || normSub === "GK" || normSub === "GENERAL KNOWLEDGE") {
      subjectAliases = ["G.K.", "GK", "GENERAL KNOWLEDGE"];
    } else if (normSub === "DRAWING" || normSub === "ART") {
      subjectAliases = ["DRAWING", "ART"];
    } else if (normSub === "SOCIAL SCIENCE" || normSub === "SOCIAL STUDIES" || normSub === "SST") {
      subjectAliases = ["SOCIAL SCIENCE", "SOCIAL STUDIES", "SST"];
    } else if (normSub === "COMPUTER" || normSub === "COMPUTER SCIENCE") {
      subjectAliases = ["COMPUTER", "COMPUTER SCIENCE"];
    }

    const whereClause: any = {
      examName: { equals: examName, mode: "insensitive" },
      OR: subjectAliases.map((sub) => ({ subject: { equals: sub, mode: "insensitive" } })),
      student: {
        class: {
          OR: classOrConditions,
        }
      }
    };
    if (targetSessionId) {
      whereClause.sessionId = targetSessionId;
    }

    const marks = await db.mark.findMany({
      where: whereClause,
      select: {
        studentId: true,
        marksObtained: true,
        maxMarks: true,
        remarks: true,
        writtenExam: true,
        notebook: true,
        subjectEnrichment: true,
        practical: true,
        breakdown: true,
      }
    });

    const marksRecord: Record<string, any> = {};
    marks.forEach(m => {
      marksRecord[m.studentId] = m;
    });

    // ── Check if Exam is Locked in SchoolConfig (Fresh real-time DB check)
    let isExamLocked = false;
    let lockedExams: string[] = [];
    try {
      const schoolConfigRow = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
      const cfgData = (schoolConfigRow?.data as any) || {};
      lockedExams = Array.isArray(cfgData.lockedExams) ? cfgData.lockedExams : [];
      isExamLocked = lockedExams.some((e: string) => e.trim().toLowerCase() === examName.trim().toLowerCase());
    } catch (cfgErr) {
      console.warn("Could not check lockedExams in marks roster:", cfgErr);
    }

    return NextResponse.json({
      isLocked: isExamLocked,
      lockedExams,
      marks: marksRecord,
      ...marksRecord,
    }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch marks roster:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
