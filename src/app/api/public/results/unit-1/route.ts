import { NextResponse } from "next/server";
import db from "@/lib/db";
import { formatCanonicalDOBIso } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

// In-memory rate limiting map for FAILED attempts per IP (IP -> { failedCount, resetTime })
const failedAttemptsMap = new Map<string, { failedCount: number; resetTime: number }>();
const MAX_FAILED_ATTEMPTS = 15;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isIpBlocked(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttemptsMap.get(ip);
  if (!entry) return false;
  if (now > entry.resetTime) {
    failedAttemptsMap.delete(ip);
    return false;
  }
  return entry.failedCount >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = failedAttemptsMap.get(ip);
  if (!entry || now > entry.resetTime) {
    failedAttemptsMap.set(ip, { failedCount: 1, resetTime: now + WINDOW_MS });
  } else {
    entry.failedCount += 1;
  }
}


// Helper: Read dynamic portal configuration from DB (SchoolConfig singleton) or env fallback
async function getPortalConfig(): Promise<{ isEnabled: boolean; allowedExams: string[] }> {
  try {
    const row = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
    if (row && row.data && typeof row.data === "object") {
      const data = row.data as Record<string, any>;
      const isEnabled =
        typeof data.enablePublicResults === "boolean"
          ? data.enablePublicResults
          : (process.env.NEXT_PUBLIC_ENABLE_PUBLIC_RESULTS === "true" ||
             process.env.NEXT_PUBLIC_ENABLE_PUBLIC_UNIT1_RESULT === "true");

      let allowedExams: string[] = [];
      if (Array.isArray(data.allowedPublicExams) && data.allowedPublicExams.length > 0) {
        allowedExams = data.allowedPublicExams;
      } else {
        const raw = process.env.NEXT_PUBLIC_ALLOWED_PUBLIC_EXAMS || "Unit-1";
        allowedExams = raw.split(",").map((e) => e.trim()).filter(Boolean);
      }

      return { isEnabled, allowedExams };
    }
  } catch (err) {
    console.error("Failed to read dynamic portal config from DB:", err);
  }

  // Fallback to env variables
  const isEnabled =
    process.env.NEXT_PUBLIC_ENABLE_PUBLIC_RESULTS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PUBLIC_UNIT1_RESULT === "true";
  const raw = process.env.NEXT_PUBLIC_ALLOWED_PUBLIC_EXAMS || "Unit-1";
  const allowedExams = raw.split(",").map((e) => e.trim()).filter(Boolean);

  return { isEnabled, allowedExams };
}

// GET: Returns the currently unlocked public exams for UI selection
export async function GET() {
  const { isEnabled, allowedExams } = await getPortalConfig();

  return NextResponse.json({
    isEnabled,
    allowedExams: isEnabled ? allowedExams : [],
  });
}

// POST: Verifies student & fetches marks for the selected / locked exam
export async function POST(request: Request) {
  const { isEnabled, allowedExams } = await getPortalConfig();

  if (!isEnabled) {
    return NextResponse.json(
      { error: "Examination Result Portal is currently offline or closed by administration." },
      { status: 403 }
    );
  }

  // Rate Limiting: check if IP is currently locked due to repeated failures
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (isIpBlocked(clientIp)) {
    return NextResponse.json(
      { error: "Too many incorrect attempts from this device. Please wait 10 minutes before trying again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { admissionNumber, dob, examName } = body;

    if (!admissionNumber || typeof admissionNumber !== "string") {
      return NextResponse.json(
        { error: "Please enter a valid Admission Number / Scholar No." },
        { status: 400 }
      );
    }

    if (!dob || typeof dob !== "string") {
      return NextResponse.json(
        { error: "Please provide Date of Birth for verification." },
        { status: 400 }
      );
    }

    // Examination Lock Verification
    const requestedExam = (examName || allowedExams[0] || "Unit-1").trim();

    // Verify if this exam is currently unlocked by the school administration
    const isExamAllowed = allowedExams.some(
      (e) => e.toLowerCase() === requestedExam.toLowerCase()
    );

    if (!isExamAllowed) {
      return NextResponse.json(
        {
          error: `Result for '${requestedExam}' has not been published yet or is currently locked by the school office.`,
        },
        { status: 403 }
      );
    }

    const trimmedAdm = admissionNumber.trim();
    const cleanDobInput = formatCanonicalDOBIso(dob);

    // Find student matching admission number (case-insensitive)
    const student = await db.student.findFirst({
      where: {
        admissionNumber: {
          equals: trimmedAdm,
          mode: "insensitive",
        },
      },
      include: {
        class: {
          select: {
            name: true,
            section: true,
          },
        },
      },
    });

    if (!student) {
      recordFailedAttempt(clientIp);
      return NextResponse.json(
        { error: "No student found with this Admission Number. Please verify from fee receipt or ID card." },
        { status: 404 }
      );
    }

    // Verify Date of Birth
    if (!student.dob) {
      return NextResponse.json(
        { error: "Date of Birth record is missing in school database. Please contact school office (+91 9452824318)." },
        { status: 400 }
      );
    }

    const studentDobIso = formatCanonicalDOBIso(student.dob);
    if (!cleanDobInput || !studentDobIso || studentDobIso !== cleanDobInput) {
      recordFailedAttempt(clientIp);
      return NextResponse.json(
        { error: "Date of Birth does not match school records. Please check and try again." },
        { status: 401 }
      );
    }

    // Get Active Academic Session
    const currentSession = await db.academicSession.findFirst({
      where: { isCurrent: true },
    });

    // Flexible exam name match (e.g. Unit-1, Unit 1)
    const examVariants = [
      requestedExam,
      requestedExam.replace("-", " "),
      requestedExam.replace(" ", "-"),
      requestedExam.toUpperCase(),
      requestedExam.toLowerCase(),
    ];

    const whereMarks: any = {
      studentId: student.id,
      examName: {
        in: Array.from(new Set(examVariants)),
      },
    };

    if (currentSession?.id) {
      whereMarks.sessionId = currentSession.id;
    }

    const marksRecords = await db.mark.findMany({
      where: whereMarks,
      orderBy: { updatedAt: "desc" },
    });

    // Deduplicate subjects in case of case mismatches (e.g. English vs ENGLISH)
    const seenSubjects = new Set<string>();
    const uniqueRecords: typeof marksRecords = [];

    for (const m of marksRecords) {
      const normSub = m.subject.trim().toUpperCase();
      if (!seenSubjects.has(normSub)) {
        seenSubjects.add(normSub);
        uniqueRecords.push(m);
      }
    }

    // Sort alphabetically by subject
    uniqueRecords.sort((a, b) => a.subject.localeCompare(b.subject));

    // Compute totals
    let totalObtained = 0;
    let totalMax = 0;

    const subjects = uniqueRecords.map((m) => {
      totalObtained += m.marksObtained;
      totalMax += m.maxMarks;

      return {
        id: m.id,
        subject: m.subject.toUpperCase(),
        examName: m.examName,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        notebook: m.notebook ?? null,
        subjectEnrichment: m.subjectEnrichment ?? null,
        practical: m.practical ?? null,
        breakdown: m.breakdown ?? null,
        remarks: m.remarks ?? null,
      };
    });

    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0.0";

    // Fetch school contact info from SchoolConfig
    const schoolConfigRow = await db.schoolConfig.findUnique({
      where: { id: "singleton" },
    });
    const schoolData = (schoolConfigRow?.data as any) || {};

    return NextResponse.json({
      success: true,
      student: {
        name: student.name,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || "N/A",
        className: `${student.class?.name || ""} - ${student.class?.section || ""}`.trim(),
        fatherName: student.fatherName || "N/A",
        motherName: student.motherName || "N/A",
      },
      academicSession: currentSession?.name || "2026-2027",
      examName: requestedExam,
      allowedExams,
      marksCount: subjects.length,
      subjects,
      summary: {
        totalObtained,
        totalMax,
        percentage,
      },
      schoolInfo: {
        name: schoolData.name || "St. GNG School",
        address: schoolData.address || "Main Campus",
        phone: schoolData.phone || "+91 9452824318",
      },
    });
  } catch (error: any) {
    console.error("[PUBLIC_MARKS_API_ERROR]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching marks. Please try again." },
      { status: 500 }
    );
  }
}
