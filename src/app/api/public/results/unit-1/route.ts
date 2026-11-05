import { getTrustedClientIp, checkRateLimit } from "@/lib/rateLimit";
import { getCachedSchoolConfig } from "@/lib/cache/schoolConfigCache";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { BoundedCache } from "@/lib/cache/BoundedCache";
import { getCachedActiveSession } from "@/lib/cache/sessionCache";
import { publicResultFailureKey, publicResultCacheKey } from "@/lib/publicResultPolicy";
import { formatCanonicalDOBIso } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";
const resultCache = new BoundedCache<any>(500, 30_000);

// Helper: Read dynamic portal configuration from DB (SchoolConfig singleton) or env fallback
async function getPortalConfig(): Promise<{ isEnabled: boolean; allowedExams: string[] }> {
  try {
    const row = await getCachedSchoolConfig();
    if (row && row.data && typeof row.data === "object") {
      const data = row.data as Record<string, any>;
      const isEnabled =
        typeof data.enablePublicResults === "boolean"
          ? data.enablePublicResults
          : (process.env.NEXT_PUBLIC_ENABLE_PUBLIC_RESULTS === "true" ||
             process.env.NEXT_PUBLIC_ENABLE_PUBLIC_UNIT1_RESULT === "true");

      let allowedExams: string[] = [];
      if (Array.isArray(data.allowedPublicExams)) {
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
  const clientIp = getTrustedClientIp(request);
  if (!(await checkRateLimit(`public-results:ip:${clientIp}`, 300, 60)).allowed) {
    return NextResponse.json({ error: "Too many requests from this network. Please wait a minute." }, { status: 429 });
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
    if (examName !== undefined && typeof examName !== "string") return NextResponse.json({ error: "Invalid examination." }, { status: 400 });
    const requestedExam = allowedExams.find(e => e.toLowerCase() === (examName || allowedExams[0] || "").trim().toLowerCase()) || "";

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

    if (!cleanDobInput || !trimmedAdm || trimmedAdm.length > 100) return NextResponse.json({ error: "Enter a valid admission number and date of birth." }, { status: 400 });
    const invalidDetails = async () => {
      const attempt = await checkRateLimit(publicResultFailureKey(trimmedAdm, clientIp), 10, 600);
      return NextResponse.json({ error: attempt.allowed ? "Admission number or date of birth does not match school records." : "Too many incorrect details for this student from this network. Please wait 10 minutes." }, { status: attempt.allowed ? 401 : 429 });
    };
    // Find student matching admission number (case-insensitive)
    const student = await db.student.findFirst({
      where: {
        admissionNumber: {
          equals: trimmedAdm,
          mode: "insensitive",
        },
      },
      select: {
        id: true, name: true, admissionNumber: true, dob: true, rollNumber: true, fatherName: true, motherName: true,
        class: {
          select: {
            name: true,
            section: true,
          },
        },
      },
    });

    if (!student?.dob || formatCanonicalDOBIso(student.dob) !== cleanDobInput) return invalidDetails();

    // Get Active Academic Session
    const currentSession = await getCachedActiveSession();

    if (!currentSession?.id) return NextResponse.json({ error: "Results are temporarily unavailable. Please contact the school office." }, { status: 503 });

    // Gate results on overdue monthly charges before consulting the result cache.
    const todayIST = new Date(Date.now() + 330 * 60_000);
    const cutoffMonth = todayIST.getUTCFullYear() * 12 + todayIST.getUTCMonth() - 2;
    const [charges, paymentAllocations, discounts] = await Promise.all([
      db.ledgerEntry.findMany({
        where: { studentId: student.id, entryType: "CHARGE" },
        select: { id: true, amount: true, description: true, sessionId: true, feeHead: { select: { frequency: true } } },
      }),
      db.receiptItem.findMany({
        where: { ledgerEntry: { studentId: student.id, entryType: "CHARGE" }, receipt: { status: "ACTIVE" } },
        select: { ledgerEntryId: true, amount: true },
      }),
      db.ledgerEntry.findMany({
        where: { studentId: student.id, entryType: "DISCOUNT", OR: [{ referenceId: null }, { receipt: { status: "ACTIVE" } }] },
        select: { description: true, amount: true, sessionId: true },
      }),
    ]);
    const paidByCharge = new Map<string, number>();
    for (const allocation of paymentAllocations) paidByCharge.set(allocation.ledgerEntryId, (paidByCharge.get(allocation.ledgerEntryId) || 0) + allocation.amount);
    const discountByChargeName = new Map<string, number>();
    for (const discount of discounts) {
      const chargeName = discount.description.replace("Discount for: ", "").replace(/.*: /, "").trim().toLowerCase();
      const key = `${discount.sessionId || ""}||${chargeName}`;
      discountByChargeName.set(key, (discountByChargeName.get(key) || 0) + Math.abs(discount.amount));
    }
    const monthIndex = (month: string) => ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(month.toLowerCase());
    const hasOverdueMonthlyDues = charges.some((charge) => {
      if (charge.feeHead?.frequency !== "monthly") return false;
      const match = charge.description.trim().match(/-\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})-(\d{4})$/i);
      if (!match) return false;
      const month = monthIndex(match[1]);
      const year = Number(month < 3 ? match[3] : match[2]);
      if (year * 12 + month > cutoffMonth) return false;
      const chargeName = charge.description.replace(/^Assigned:\s*/, "").trim().toLowerCase();
      const discount = discountByChargeName.get(`${charge.sessionId || ""}||${chargeName}`) || 0;
      return charge.amount - discount - (paidByCharge.get(charge.id) || 0) > 0;
    });
    if (hasOverdueMonthlyDues) {
      return NextResponse.json({ code: "RESULT_FEES_PENDING", error: "Fees are pending. Please clear fees for months up to two months before the current month to view the result. If already paid, please contact the school office. / परिणाम देखने के लिए कृपया दो महीने पहले तक की बकाया फीस जमा करें। भुगतान कर चुके हैं तो विद्यालय कार्यालय से संपर्क करें।" }, { status: 402, headers: { "Cache-Control": "private, no-store" } });
    }

    const cacheKey = publicResultCacheKey(student.id, cleanDobInput, currentSession.id, requestedExam);
    const cached = resultCache.get(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "private, no-store" } });
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
      select: { id: true, subject: true, examName: true, marksObtained: true, maxMarks: true, notebook: true, subjectEnrichment: true, practical: true, breakdown: true, remarks: true },
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
    const schoolConfigRow = await getCachedSchoolConfig();
    const schoolData = (schoolConfigRow?.data as any) || {};

    const payload = {
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
    };
    resultCache.set(cacheKey, payload);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    console.error("[PUBLIC_MARKS_API_ERROR]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching marks. Please try again." },
      { status: 500 }
    );
  }
}
