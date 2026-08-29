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

    const whereClause: any = {
      examName: { equals: examName, mode: "insensitive" },
      subject: { equals: subject, mode: "insensitive" },
      student: {
        class: {
          OR: classOrConditions,
        }
      }
    };
    if (sessionId) {
      whereClause.sessionId = sessionId;
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

    return NextResponse.json(marksRecord);
  } catch (error: any) {
    console.error("Failed to fetch marks roster:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
