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

    if (authUser.role !== "ADMIN" && authUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden. Admin or Teacher access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class");
    const section = searchParams.get("section");

    if (!className || !section) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const marks = await db.mark.findMany({
      where: {
        student: {
          class: {
            name: className,
            section: section,
          }
        }
      },
      select: {
        studentId: true,
        subject: true,
        examName: true,
        marksObtained: true,
        maxMarks: true,
        writtenExam: true,
        notebook: true,
        subjectEnrichment: true,
        practical: true,
        breakdown: true
      }
    });

    return NextResponse.json(marks);
  } catch (error: any) {
    console.error("[API_ERROR] /api/marks/class:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
