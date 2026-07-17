import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { subject, examName, marksObtained, maxMarks, remarks, writtenExam, notebook, subjectEnrichment, practical } = body;

    if (!id) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }
    if (!subject || !examName || marksObtained === undefined || maxMarks === undefined) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
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

    const mark = await db.mark.upsert({
      where: {
        studentId_subject_examName: {
          studentId: id,
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
    return NextResponse.json({ error: "Failed to save mark: " + error.message }, { status: 500 });
  }
}
