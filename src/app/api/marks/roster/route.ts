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

    if (authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class");
    const section = searchParams.get("section");
    const examName = searchParams.get("exam");
    const subject = searchParams.get("subject");

    if (!className || !section || !examName || !subject) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const marks = await db.mark.findMany({
      where: {
        examName,
        subject,
        student: {
          class: {
            name: className,
            section: section,
          }
        }
      },
      select: {
        studentId: true,
        marksObtained: true,
        maxMarks: true,
        remarks: true,
        writtenExam: true,
        notebook: true,
        subjectEnrichment: true,
        practical: true,
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
