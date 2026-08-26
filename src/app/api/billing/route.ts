import { NextResponse } from "next/server";
import db from "@/lib/db";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyToken, getAuthUser } from "@/lib/auth";
import { PaymentMethod, EntryType } from "@prisma/client";
import { getNextReceiptNumber } from "@/lib/family";
import { getAcademicYear } from "@/lib/generateYearlyCharges";
import { numberToIndianWords } from "@/lib/currency";
import { validatePaisaAmount, getSafeErrorMessage } from "@/lib/validation";

// Server-side in-memory cache for ultra-fast response times & zero Supabase overload
const serverBillingCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 20000; // 20s TTL

function clearServerBillingCache() {
  serverBillingCache.clear();
}

function getChargeDueDate(chargeName: string, fallbackTime: number): string {
  const nameLower = chargeName.toLowerCase();

  // ── B-04: Derive the academic year dynamically rather than hardcoding 2026-27 ──
  // getAcademicYear() returns e.g. "2026-2027"; extract both halves.
  const acYear = getAcademicYear();
  const [syStr, eyStr] = acYear.split("-");
  const sy = parseInt(syStr, 10); // e.g. 2026  (April–December months)
  const ey = parseInt(eyStr, 10); // e.g. 2027  (January–March months)

  // Months April–December fall in the START year; Jan–March in the END year.
  if (nameLower.includes("april"))     return `${sy}-04-10`;
  if (nameLower.includes("may"))       return `${sy}-05-10`;
  if (nameLower.includes("june"))      return `${sy}-06-10`;
  if (nameLower.includes("july")) {
    if (nameLower.includes("unit 1") || nameLower.includes("exam")) return `${sy}-07-15`;
    return `${sy}-07-10`;
  }
  if (nameLower.includes("august"))    return `${sy}-08-10`;
  if (nameLower.includes("september")) return `${sy}-09-10`;
  if (nameLower.includes("october")) {
    if (nameLower.includes("half yearly") || nameLower.includes("exam")) return `${sy}-10-15`;
    return `${sy}-10-10`;
  }
  if (nameLower.includes("november"))  return `${sy}-11-10`;
  if (nameLower.includes("december")) {
    if (nameLower.includes("unit 2") || nameLower.includes("exam")) return `${sy}-12-15`;
    return `${sy}-12-10`;
  }
  if (nameLower.includes("january"))   return `${ey}-01-10`;
  if (nameLower.includes("february"))  return `${ey}-02-10`;
  if (nameLower.includes("march")) {
    if (nameLower.includes("yearly") || nameLower.includes("exam")) return `${ey}-03-15`;
    return `${ey}-03-10`;
  }
  if (
    nameLower.includes("m/s") ||
    nameLower.includes("annual") ||
    nameLower.includes("admission") ||
    nameLower.includes("previous session")
  ) {
    return `${sy}-04-10`;
  }

  return new Date(fallbackTime).toISOString().split("T")[0];
}


export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // ── RS-02 / RS-03: Include full request URL in cache key so filtered/search queries don't collide
    const cacheKey = `${authUser.role}_${authUser.userId}_${request.url}`;
    const cached = serverBillingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
          "X-Server-Cache": "HIT",
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const receiptIdParam = searchParams.get("receiptId") || searchParams.get("id");
    const receiptNoParam = searchParams.get("receiptNo") || searchParams.get("receiptNumber");
    const studentIdParam = searchParams.get("studentId");
    const searchParam = (searchParams.get("search") || searchParams.get("q") || "").trim();

    // ── B-11: Clamped pagination parameters with safe defaults
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limitParam = parseInt(searchParams.get("limit") || searchParams.get("pageSize") || "150", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 150 : Math.min(500, limitParam);
    const skip = (page - 1) * limit;

    let ledgerWhere: any = {};
    let receiptWhere: any = {};
    let chargesWhere: any = { entryType: EntryType.CHARGE };
    let discountsWhere: any = { entryType: EntryType.DISCOUNT };
    let scopedStudentIds: string[] | undefined = undefined;

    if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: true }
      });
      const classIds = teacherProfile?.classes.map(c => c.id) || [];
      if (classIds.length === 0) {
        return NextResponse.json({
          ledgerEntries: [],
          receipts: [],
          dueItems: [],
          pagination: { page: 1, limit, totalReceipts: 0, totalPages: 0, hasMore: false },
        });
      }
      const teacherStudents = await db.student.findMany({
        where: { classId: { in: classIds } },
        select: { id: true }
      });
      const teacherStudentIds = teacherStudents.map((s) => s.id);

      // ── RS-02 / RS-03: Enforce teacher scoping on studentId / receiptId / receiptNo
      if (studentIdParam && !teacherStudentIds.includes(studentIdParam)) {
        return NextResponse.json({ error: "Forbidden. You do not have access to this student's financial records." }, { status: 403 });
      }

      if (receiptIdParam) {
        const rec = await db.receipt.findFirst({
          where: { id: receiptIdParam, studentId: { in: teacherStudentIds } },
          select: { id: true }
        });
        if (!rec) {
          return NextResponse.json({ error: "Forbidden. Unauthorized receipt access." }, { status: 403 });
        }
      }

      if (receiptNoParam) {
        const rec = await db.receipt.findFirst({
          where: { receiptNumber: receiptNoParam, studentId: { in: teacherStudentIds } },
          select: { id: true }
        });
        if (!rec) {
          return NextResponse.json({ error: "Forbidden. Unauthorized receipt access." }, { status: 403 });
        }
      }

      scopedStudentIds = studentIdParam ? [studentIdParam] : teacherStudentIds;
      ledgerWhere = { studentId: { in: scopedStudentIds } };
      chargesWhere = { entryType: EntryType.CHARGE, studentId: { in: scopedStudentIds } };
      discountsWhere = { entryType: EntryType.DISCOUNT, studentId: { in: scopedStudentIds } };

      const teacherConditions: any[] = [
        {
          OR: [
            { studentId: { in: scopedStudentIds } },
            { items: { some: { ledgerEntry: { studentId: { in: scopedStudentIds } } } } }
          ]
        }
      ];
      if (receiptIdParam) teacherConditions.push({ id: receiptIdParam });
      if (receiptNoParam) teacherConditions.push({ receiptNumber: receiptNoParam });
      if (searchParam) {
        teacherConditions.push({
          OR: [
            { receiptNumber: { contains: searchParam, mode: "insensitive" } },
            { manualReceiptNo: { contains: searchParam, mode: "insensitive" } },
            { transactionReference: { contains: searchParam, mode: "insensitive" } },
            { student: { name: { contains: searchParam, mode: "insensitive" } } },
            { student: { admissionNumber: { contains: searchParam, mode: "insensitive" } } },
          ]
        });
      }
      receiptWhere = { AND: teacherConditions };
    }

    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId }
      });
      if (!parentProfile) {
        return NextResponse.json({
          ledgerEntries: [],
          receipts: [],
          dueItems: [],
          pagination: { page: 1, limit, totalReceipts: 0, totalPages: 0, hasMore: false },
        });
      }

      const students = await db.student.findMany({
        where: { parentProfileId: parentProfile.id },
        select: { id: true }
      });
      const authorizedStudentIds = students.map((s) => s.id);

      // ── RS-02 / RS-03: Enforce parent scoping on studentId / receiptId / receiptNo
      if (studentIdParam && !authorizedStudentIds.includes(studentIdParam)) {
        return NextResponse.json({ error: "Forbidden. You do not have access to this student's financial records." }, { status: 403 });
      }

      if (receiptIdParam) {
        const rec = await db.receipt.findFirst({
          where: {
            id: receiptIdParam,
            OR: [
              { studentId: { in: authorizedStudentIds } },
              { parentProfileId: parentProfile.id }
            ]
          },
          select: { id: true }
        });
        if (!rec) {
          return NextResponse.json({ error: "Forbidden. Unauthorized receipt access." }, { status: 403 });
        }
      }

      if (receiptNoParam) {
        const rec = await db.receipt.findFirst({
          where: {
            receiptNumber: receiptNoParam,
            OR: [
              { studentId: { in: authorizedStudentIds } },
              { parentProfileId: parentProfile.id }
            ]
          },
          select: { id: true }
        });
        if (!rec) {
          return NextResponse.json({ error: "Forbidden. Unauthorized receipt access." }, { status: 403 });
        }
      }

      scopedStudentIds = studentIdParam ? [studentIdParam] : authorizedStudentIds;
      ledgerWhere = { studentId: { in: scopedStudentIds } };
      chargesWhere = { 
        entryType: EntryType.CHARGE,
        studentId: { in: scopedStudentIds }
      };
      discountsWhere = { 
        entryType: EntryType.DISCOUNT,
        studentId: { in: scopedStudentIds }
      };

      const parentConditions: any[] = [
        studentIdParam
          ? { studentId: studentIdParam }
          : { OR: [{ studentId: { in: authorizedStudentIds } }, { parentProfileId: parentProfile.id }] }
      ];
      if (receiptIdParam) parentConditions.push({ id: receiptIdParam });
      if (receiptNoParam) parentConditions.push({ receiptNumber: receiptNoParam });
      if (searchParam) {
        parentConditions.push({
          OR: [
            { receiptNumber: { contains: searchParam, mode: "insensitive" } },
            { manualReceiptNo: { contains: searchParam, mode: "insensitive" } },
            { transactionReference: { contains: searchParam, mode: "insensitive" } },
            { student: { name: { contains: searchParam, mode: "insensitive" } } },
            { student: { admissionNumber: { contains: searchParam, mode: "insensitive" } } },
          ]
        });
      }
      receiptWhere = { AND: parentConditions };
    }

    if (authUser.role === "ADMIN" || authUser.role === "ACCOUNTANT") {
      if (studentIdParam) {
        scopedStudentIds = [studentIdParam];
        ledgerWhere.studentId = studentIdParam;
        chargesWhere.studentId = studentIdParam;
        discountsWhere.studentId = studentIdParam;
      }

      const adminConditions: any[] = [];
      if (studentIdParam) adminConditions.push({ studentId: studentIdParam });
      if (receiptIdParam) adminConditions.push({ id: receiptIdParam });
      if (receiptNoParam) adminConditions.push({ receiptNumber: receiptNoParam });
      if (searchParam) {
        adminConditions.push({
          OR: [
            { receiptNumber: { contains: searchParam, mode: "insensitive" } },
            { manualReceiptNo: { contains: searchParam, mode: "insensitive" } },
            { transactionReference: { contains: searchParam, mode: "insensitive" } },
            { student: { name: { contains: searchParam, mode: "insensitive" } } },
            { student: { admissionNumber: { contains: searchParam, mode: "insensitive" } } },
          ]
        });
      }
      if (adminConditions.length > 0) {
        receiptWhere = { AND: adminConditions };
      }
    }

    const acYear = getAcademicYear();
    const startYear = parseInt(acYear.split("-")[0]);
    // Fetch charges created from March 1st of the current academic year to cover early assignments
    const sessionStartDate = new Date(`${startYear}-03-01T00:00:00.000Z`);
    chargesWhere.createdAt = { gte: sessionStartDate };
    discountsWhere.createdAt = { gte: sessionStartDate };

    // Execute optimized queries concurrently with minimal join overhead
    // ── B-05: Scope paidGroups aggregation to only the authorized students
    let receiptItemGroupWhere: any = undefined;
    if (scopedStudentIds && scopedStudentIds.length > 0) {
      receiptItemGroupWhere = {
        ledgerEntry: {
          studentId: { in: scopedStudentIds }
        }
      };
    }

    // SCH-01: school config is now fetched from DB in the same parallel batch
    const [ledger, receipts, totalReceiptsCount, charges, discounts, paidGroups, schoolConfigRow] = await Promise.all([
      db.ledgerEntry.findMany({
        where: ledgerWhere,
        take: 150,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          studentId: true,
          entryType: true,
          amount: true,
          description: true,
          createdById: true,
        },
      }),
      // ── B-11: Paginated receipt query
      db.receipt.findMany({
        where: receiptWhere,
        skip,
        take: limit,
        select: {
          id: true,
          studentId: true,
          receiptNumber: true,
          manualReceiptNo: true,
          paymentMethod: true,
          transactionReference: true,
          amountPaid: true,
          remarks: true,
          createdAt: true,
          createdById: true,
          student: {
            select: {
              id: true,
              name: true,
              admissionNumber: true,
              fatherName: true,
              class: {
                select: {
                  name: true,
                  section: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              name: true,
              role: true,
            },
          },
          items: {
            select: {
              amount: true,
              ledgerEntry: {
                select: {
                  id: true,
                  studentId: true,
                  description: true,
                  amount: true,
                  student: {
                    select: {
                      name: true,
                      admissionNumber: true,
                      fatherName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.receipt.count({ where: receiptWhere }),
      db.ledgerEntry.findMany({
        where: chargesWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          studentId: true,
          description: true,
          amount: true,
          createdAt: true,
        },
      }),
      db.ledgerEntry.findMany({
        where: discountsWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          studentId: true,
          description: true,
          amount: true,
        },
      }),
      // ── B-05: Scoped paidGroups grouping
      db.receiptItem.groupBy({
        by: ["ledgerEntryId"],
        where: receiptItemGroupWhere,
        _sum: { amount: true },
      }),
      // SCH-01: Fetch school config from DB (replaces fs.readFileSync on school.json)
      db.schoolConfig.findUnique({ where: { id: "singleton" } }),
    ]);


    const formattedLedger = ledger.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      type: l.entryType,
      amount: l.amount,
      description: l.description,
      createdById: l.createdById,
    }));

    const formattedReceipts = receipts.map((r: any) => {
      const studentIds = Array.from(
        new Set(r.items.map((i: any) => i.ledgerEntry?.studentId).filter(Boolean))
      );
      const studentNames = Array.from(
        new Set(r.items.map((i: any) => i.ledgerEntry?.student?.name).filter(Boolean))
      );
      const classSections = Array.from(
        new Set(
          r.items
            .map((i: any) => {
              const cls = i.ledgerEntry?.student?.class;
              return cls ? `${cls.name}-${cls.section}` : "";
            })
            .filter(Boolean)
        )
      );

      const sClass = r.student?.class
        ? `${r.student.class.name}-${r.student.class.section}`
        : classSections.join(", ");

      let meta: any = null;
      if (r.remarks) {
        try {
          meta = JSON.parse(r.remarks);
        } catch {}
      }

      // ── B-07: Use immutable snapshot fields where available. If remarks is missing/corrupted,
      // do not use live mutable ledgerEntry.amount to invent unrecorded historical arrears.
      // Fall back to the verified immutable amountPaid on the receipt.
      const subtotal = meta?.subtotal !== undefined && meta?.subtotal !== null
        ? meta.subtotal
        : r.amountPaid;
      const discount = meta?.discount !== undefined && meta?.discount !== null
        ? meta.discount
        : 0;
      const arrears = meta?.arrears !== undefined && meta?.arrears !== null
        ? meta.arrears
        : 0;

      const fallbackItems = r.items.map((i: any) => {
        const sName = i.ledgerEntry?.student?.name ? `${i.ledgerEntry.student.name}: ` : "";
        const desc = (i.ledgerEntry?.description || "")
          .replace("Payment for: Assigned: ", "")
          .replace("Payment for: ", "");
        // RS-01: Use i.amount (ReceiptItem.amount = what was actually paid — immutable)
        // as originalAmount in the fallback path. Using i.ledgerEntry?.amount (live charge)
        // is unsafe because the charge may have been modified or reversed after the fact.
        const orig = i.amount;
        return {
          name: `${sName}${desc || "Fee Particular"}`,
          originalAmount: orig,
          amount: i.amount,
          discount: 0,
          balance: 0,
        };
      });

      const items =
        meta?.items && Array.isArray(meta.items) && meta.items.length > 0
          ? meta.items
          : fallbackItems;

      const admissionNo =
        meta?.admissionNo ||
        r.student?.admissionNumber ||
        r.items[0]?.ledgerEntry?.student?.admissionNumber ||
        "Unified Family";

      const fatherName =
        meta?.fatherName ||
        r.student?.fatherName ||
        r.items[0]?.ledgerEntry?.student?.fatherName ||
        "";

      return {
        id: r.id,
        studentId: r.studentId || (studentIds.length === 1 ? (studentIds[0] as string) : null),
        studentIds,
        receiptNo: r.receiptNumber,
        manualReceiptNo: r.manualReceiptNo || meta?.manualReceiptNo || null,
        amount: r.amountPaid,
        subtotal,
        discount,
        arrears,
        // RS-01: Include amountInWords derived from the immutable amountPaid so reprints
        // never recompute it from the current ledger state.
        amountInWords: meta?.amountInWords || numberToIndianWords(r.amountPaid),
        paymentMethod: r.paymentMethod,
        method: r.paymentMethod,
        transactionRef: r.transactionReference || "",
        createdAt: r.createdAt.toISOString().split("T")[0],
        studentName: r.student?.name || studentNames.join(", "),
        classSection: sClass,
        admissionNo,
        fatherName,
        collectedBy: r.createdBy?.name || "System",
        collectedByRole: r.createdBy?.role || "ADMIN",
        createdById: r.createdById,
        details: r.items
          .map((i: any) => {
            const sName = i.ledgerEntry?.student?.name || "Student";
            const desc = (i.ledgerEntry?.description || "")
              .replace("Payment for: Assigned: ", "")
              .replace("Payment for: ", "");
            return `${sName}: ${desc} (Rs. ${i.amount / 100})`;
          })
          .join(" + "),
        items,
      };

    });

    // O(1) paid lookup map
    const paidMap = new Map<string, number>();
    for (const p of paidGroups) {
      if (p.ledgerEntryId) {
        paidMap.set(p.ledgerEntryId, p._sum.amount || 0);
      }
    }

    // O(1) discount lookup map by studentId + chargeName
    const discountMap = new Map<string, number>();
    for (const d of discounts) {
      const dName = d.description.replace("Discount for: ", "").replace(/.*: /, "").trim().toLowerCase();
      const key = `${d.studentId}||${dName}`;
      discountMap.set(key, (discountMap.get(key) || 0) + Math.abs(d.amount));
    }

    // SCH-01: Read school config from DB (schoolConfigRow fetched above in parallel).
    // Falls back to safe defaults if the SchoolConfig table is empty (pre-migration).
    const DEFAULT_SCHOOL_CONFIG = { enableLateFee: false, lateFeeGraceDays: 10, lateFeeAmount: 50, lateFeeType: "FLAT" };
    const schoolConfig: typeof DEFAULT_SCHOOL_CONFIG & Record<string, any> =
      schoolConfigRow ? (schoolConfigRow.data as any) : DEFAULT_SCHOOL_CONFIG;

    const now = Date.now();
    const graceDays = schoolConfig.lateFeeGraceDays ?? 10;
    const isLateFeeEnabled = !!schoolConfig.enableLateFee;
    const isDailyFine = schoolConfig.lateFeeType === "DAILY";
    // ── B-06: Both FLAT and DAILY modes read from the same lateFeeAmount field.
    // Previously dailyFineUnit used `?? 5` while baseFineAmount used `?? 50`,
    // creating an inconsistency from a different (wrong) magic number.
    // The fallback for both is now `?? 50`.
    const lateFeeAmountRupees = schoolConfig.lateFeeAmount ?? 50;
    const baseFineAmount = lateFeeAmountRupees * 100;  // FLAT fine in paise
    const dailyFineUnit  = lateFeeAmountRupees * 100;  // Per-day fine in paise


    const formattedDues = charges.map((c) => {
      const chargeName = c.description.replace("Assigned: ", "").trim();
      const totalPaid = paidMap.get(c.id) || 0;
      const dKey = `${c.studentId}||${chargeName.toLowerCase()}`;
      const totalDiscount = discountMap.get(dKey) || 0;

      const outstanding = c.amount - totalDiscount - totalPaid;
      const cTime = c.createdAt.getTime();
      const dueTime = cTime + 15 * 24 * 60 * 60 * 1000;
      const graceTime = dueTime + graceDays * 24 * 60 * 60 * 1000;

      let fineAmount = 0;
      if (isLateFeeEnabled && now > graceTime && outstanding > 0) {
        if (isDailyFine) {
          const daysOver = Math.floor((now - graceTime) / (24 * 60 * 60 * 1000)) + 1;
          fineAmount = daysOver * dailyFineUnit;
        } else {
          fineAmount = baseFineAmount;
        }
      }

      const chargeDueDate = getChargeDueDate(chargeName, dueTime);

      return {
        id: c.id,
        studentId: c.studentId,
        name: chargeName,
        amount: Math.max(0, outstanding),
        originalAmount: c.amount,
        totalPaid: totalPaid,
        totalDiscount: totalDiscount,
        dueDate: chargeDueDate,
        sessionName: acYear,
        isCurrentSession: true,
        status: (outstanding <= 0 ? "PAID" : "UNPAID") as "PAID" | "UNPAID",
        fine: fineAmount,
      };
    });

    const result = {
      ledgerEntries: formattedLedger,
      receipts: formattedReceipts,
      dueItems: formattedDues,
      pagination: {
        page,
        limit,
        totalReceipts: totalReceiptsCount,
        totalPages: Math.ceil(totalReceiptsCount / limit),
        hasMore: skip + receipts.length < totalReceiptsCount,
      },
    };

    serverBillingCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
        "X-Server-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("Fetch billing error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing ledger: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    const creatorUserId = authUser.userId;

    // Invalidate server cache on mutations
    clearServerBillingCache();

    const body = await request.json();
    const { action, studentId, parentProfileId, items, paymentMethod, transactionRef, manualReceiptNo, title, amount, headName } = body;
    const cleanManualReceiptNo = manualReceiptNo && typeof manualReceiptNo === "string" && manualReceiptNo.trim() ? manualReceiptNo.trim() : null;

    // Single student custom charge handler
    if (action === "ADD_CUSTOM_CHARGE") {
      if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
        return NextResponse.json({ error: "Only admins and accountants can add charges." }, { status: 403 });
      }

      if (!studentId || typeof studentId !== "string" || !title || typeof title !== "string") {
        return NextResponse.json({ error: "Valid student ID and title string are required." }, { status: 400 });
      }

      let amountInPaisa: number;
      try {
        amountInPaisa = validatePaisaAmount(amount, "Charge amount", { isRupeesInput: true, min: 1 });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      const targetStudent = await db.student.findUnique({
        where: { id: studentId },
        select: { id: true, name: true },
      });
      if (!targetStudent) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      let feeHead = await db.feeHead.findFirst({
        where: { name: headName || "Other Fee" },
      });

      if (!feeHead) {
        feeHead = await db.feeHead.create({
          data: {
            name: headName || "Other Fee",
            frequency: "ad_hoc",
          },
        });
      }

      const entry = await db.ledgerEntry.create({
        data: {
          studentId,
          feeHeadId: feeHead.id,
          entryType: EntryType.CHARGE,
          amount: amountInPaisa,
          description: `Assigned: ${title.trim()}`,
          createdById: creatorUserId,
        },
      });

      // ── E-02: Structured Audit Logging
      await db.auditLog.create({
        data: {
          userId: creatorUserId,
          action: "CUSTOM_CHARGE_CREATED",
          entityType: "LedgerEntry",
          entityId: entry.id,
          newValues: JSON.stringify({
            studentId,
            studentName: targetStudent.name,
            amount: amountInPaisa,
            title: title.trim(),
          }),
        },
      });

      return NextResponse.json({ success: true, entry });
    }

    // ── RS-04: Receipt Reversal / Cancellation Handler
    if (action === "REVERSE_RECEIPT" || action === "CANCEL_RECEIPT") {
      if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
        return NextResponse.json({ error: "Forbidden. Only authorized finance staff can reverse receipts." }, { status: 403 });
      }

      const { receiptId, receiptNo, reason } = body;
      if (!receiptId && !receiptNo) {
        return NextResponse.json({ error: "Receipt ID or receipt number is required for reversal." }, { status: 400 });
      }

      const targetReceipt = await db.receipt.findFirst({
        where: {
          ...(receiptId ? { id: receiptId } : { receiptNumber: receiptNo }),
        },
        include: {
          items: {
            include: { ledgerEntry: true },
          },
          student: true,
        },
      });

      if (!targetReceipt) {
        return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
      }

      if (targetReceipt.status === "REVERSED") {
        return NextResponse.json({ error: "Receipt is already reversed." }, { status: 400 });
      }

      const reversedReceipt = await db.$transaction(async (tx) => {
        // 1. Mark receipt as REVERSED
        const remarksObj = targetReceipt.remarks ? JSON.parse(targetReceipt.remarks) : {};
        remarksObj.reversedAt = new Date().toISOString();
        remarksObj.reversedBy = authUser.userId;
        remarksObj.reversalReason = reason || "Administrative Reversal";

        const updated = await tx.receipt.update({
          where: { id: targetReceipt.id },
          data: {
            status: "REVERSED",
            remarks: JSON.stringify(remarksObj),
          },
        });

        // 2. Create offsetting REVERSAL ledger entries for all payments/discounts linked to this receipt
        const linkedLedgerEntries = await tx.ledgerEntry.findMany({
          where: { referenceId: targetReceipt.id },
        });

        for (const entry of linkedLedgerEntries) {
          await tx.ledgerEntry.create({
            data: {
              studentId: entry.studentId,
              feeHeadId: entry.feeHeadId,
              entryType: EntryType.REVERSAL,
              amount: Math.abs(entry.amount),
              referenceId: targetReceipt.id,
              description: `Reversal for Receipt ${targetReceipt.receiptNumber}: ${entry.description}`,
              createdById: creatorUserId,
            },
          });
        }

        // 3. Log Audit entry
        await tx.auditLog.create({
          data: {
            userId: authUser.userId,
            action: "RECEIPT_REVERSED",
            entityType: "Receipt",
            entityId: targetReceipt.id,
            oldValues: JSON.stringify({ status: "ACTIVE", receiptNumber: targetReceipt.receiptNumber, amountPaid: targetReceipt.amountPaid }),
            newValues: JSON.stringify({ status: "REVERSED", reason: reason || "Administrative Reversal" }),
          },
        });

        return updated;
      });

      return NextResponse.json({ success: true, receipt: reversedReceipt });
    }

    if (!items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
      return NextResponse.json({ error: "Missing or invalid checkout parameters (items array and paymentMethod required)." }, { status: 400 });
    }

    if (items.length > 100) {
      return NextResponse.json({ error: "Cannot process more than 100 items in a single payment transaction." }, { status: 400 });
    }

    // ── O-01: Idempotency Protection for Payment Transactions
    const rawIdempotencyKey = request.headers.get("Idempotency-Key") || body.idempotencyKey || (paymentMethod !== "CASH" ? transactionRef : null);
    const idempotencyKey = rawIdempotencyKey ? String(rawIdempotencyKey).trim() : null;

    if (idempotencyKey) {
      const existingReceipt = await db.receipt.findFirst({
        where: {
          OR: [
            { transactionReference: idempotencyKey },
            { remarks: { contains: `"idempotencyKey":"${idempotencyKey}"` } },
          ],
        },
        include: { student: { include: { class: true } } },
      });

      if (existingReceipt) {
        const snapshot = existingReceipt.remarks ? JSON.parse(existingReceipt.remarks) : {};
        return NextResponse.json({
          success: true,
          receipt: {
            id: existingReceipt.id,
            studentId: existingReceipt.studentId,
            receiptNo: existingReceipt.receiptNumber,
            manualReceiptNo: existingReceipt.manualReceiptNo || snapshot.manualReceiptNo || null,
            amount: existingReceipt.amountPaid,
            subtotal: snapshot.subtotal !== undefined ? snapshot.subtotal : existingReceipt.amountPaid,
            discount: snapshot.discount !== undefined ? snapshot.discount : 0,
            arrears: snapshot.arrears !== undefined ? snapshot.arrears : 0,
            amountInWords: snapshot.amountInWords || "",
            paymentMethod: existingReceipt.paymentMethod,
            transactionRef: existingReceipt.transactionReference || "",
            createdAt: existingReceipt.createdAt.toISOString().split("T")[0],
            studentName: existingReceipt.student?.name || "Multiple Siblings",
            classSection: existingReceipt.student ? `${existingReceipt.student.class.name}-${existingReceipt.student.class.section}` : "Unified Family",
            collectedBy: "Finance Staff",
            collectedByRole: "ADMIN",
            items: snapshot.items || [],
            isDuplicateRetry: true,
          },
        });
      }
    }

    // ── B-12: Strict input validation for all items — reject negative, NaN, Infinity,
    // null, or malformed monetary amounts before any financial calculations.
    // Using != null (loose) catches both null and undefined.
    for (const item of items) {
      if (!item || typeof item !== "object" || !item.ledgerEntryId || typeof item.ledgerEntryId !== "string") {
        return NextResponse.json({ error: "Each item must have a valid ledgerEntryId string." }, { status: 400 });
      }
      try {
        if (item.payAmount != null) validatePaisaAmount(item.payAmount, "Payment amount", { min: 0 });
        if (item.discountAmount != null) validatePaisaAmount(item.discountAmount, "Discount amount", { min: 0 });
        if (item.fineAmount != null) validatePaisaAmount(item.fineAmount, "Fine amount", { min: 0 });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    // ── B-05: Enforce role-based checkout restrictions
    if (authUser.role === "TEACHER") {
      return NextResponse.json({ error: "Forbidden. Teachers cannot record fee payments or grant discounts." }, { status: 403 });
    }

    let resolvedParentProfileId = parentProfileId || null;
    let resolvedStudentId = studentId || null;

    if (authUser.role === "PARENT") {
      // Parents can only pay online / UPI
      if (paymentMethod !== "ONLINE" && paymentMethod !== "UPI") {
        return NextResponse.json({ error: "Forbidden. Parents can only make online/UPI fee payments." }, { status: 403 });
      }

      // Parents cannot grant discounts
      const hasDiscount = items.some((i: any) => Number(i.discountAmount) > 0);
      if (hasDiscount) {
        return NextResponse.json({ error: "Forbidden. Parents cannot grant fee discounts." }, { status: 403 });
      }

      // Verify parent profile and children ownership
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId }
      });
      if (!parentProfile) {
        return NextResponse.json({ error: "Forbidden. Parent profile not found." }, { status: 403 });
      }

      const parentStudents = await db.student.findMany({
        where: { parentProfileId: parentProfile.id },
        select: { id: true }
      });
      const authorizedStudentIds = parentStudents.map(s => s.id);

      // Verify every charge item belongs to authorized children
      const chargeIds = items.map((i: any) => i.ledgerEntryId).filter(Boolean);
      const targetCharges = await db.ledgerEntry.findMany({
        where: { id: { in: chargeIds } },
        select: { id: true, studentId: true }
      });

      const hasUnauthorizedCharge = targetCharges.some(c => !authorizedStudentIds.includes(c.studentId));
      if (hasUnauthorizedCharge || targetCharges.length !== chargeIds.length) {
        return NextResponse.json({ error: "Forbidden. You cannot pay for charges outside your authorized family." }, { status: 403 });
      }

      resolvedParentProfileId = parentProfile.id;
    } else if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden. Only authorized finance staff can record fee receipts." }, { status: 403 });
    }

    if (resolvedStudentId && !resolvedParentProfileId) {
      const std = await db.student.findUnique({
        where: { id: resolvedStudentId },
      });
      if (std) {
        resolvedParentProfileId = std.parentProfileId;
      }
    }

    // Double check item level parent lookup if needed
    if (!resolvedParentProfileId && items.length > 0) {
      const firstCharge = await db.ledgerEntry.findUnique({
        where: { id: items[0].ledgerEntryId },
        include: { student: true },
      });
      if (firstCharge && firstCharge.student) {
        resolvedParentProfileId = firstCharge.student.parentProfileId;
      }
    }

    const uniqueStudentIds = Array.from(new Set(items.map((i: any) => i.studentId).filter(Boolean)));
    if (!resolvedStudentId && uniqueStudentIds.length === 1) {
      resolvedStudentId = uniqueStudentIds[0] as string;
    }

    if (!resolvedStudentId && !resolvedParentProfileId) {
      return NextResponse.json({ error: "Could not resolve student or family profile." }, { status: 400 });
    }

    const { receipt: result, snapshot } = await db.$transaction(async (tx) => {
      const receiptNo = await getNextReceiptNumber(tx);
      let actualTotalPayPaisa = 0;

      // ── B-02: Reject duplicate ledgerEntryIds up-front ──────────────────
      const seenLedgerIds = new Set<string>();
      for (const item of items) {
        if (!item.ledgerEntryId) continue;
        if (seenLedgerIds.has(item.ledgerEntryId)) {
          throw Object.assign(
            new Error(`Duplicate charge in payment request: ${item.ledgerEntryId}`),
            { code: "DUPLICATE_LEDGER_ENTRY" }
          );
        }
        seenLedgerIds.add(item.ledgerEntryId);
      }

      // 1. Calculate and validate charges/overpayments first
      const validatedItems: Array<{
        charge: any;
        itemStudentId: string;
        chargeName: string;
        payAmountPaisa: number;
        discountAmountPaisa: number;
        fineAmountPaisa: number;
        // ── B-03: outstanding balance at the moment of this payment ─────────
        // = charge.amount - prior payments - prior discounts.
        // Used in the receipt snapshot so arrears are calculated from the
        // actual remaining balance, not the original charge amount.
        outstandingPaisa: number;
      }> = [];

      // ── GY-03: Eliminate N+1 queries by batching lock, payment, and discount lookups
      // Sort IDs deterministically to prevent PostgreSQL transaction deadlocks under concurrency
      const targetLedgerIds = Array.from(
        new Set(items.map((i: any) => i.ledgerEntryId).filter(Boolean))
      ).sort();

      // Batch 1: Acquire exclusive row locks for all target charges in a single sorted query
      const lockedRows: any[] = targetLedgerIds.length > 0
        ? await tx.$queryRawUnsafe(
            `SELECT * FROM "LedgerEntry" WHERE "id" = ANY($1::text[]) ORDER BY "id" FOR UPDATE`,
            targetLedgerIds
          )
        : [];

      const lockedChargesMap = new Map<string, any>();
      const lockedStudentIds = new Set<string>();
      for (const row of lockedRows) {
        row.amount = Number(row.amount);
        lockedChargesMap.set(row.id, row);
        if (row.studentId) lockedStudentIds.add(row.studentId);
      }

      // Batch 2: Pre-fetch all committed ReceiptItem payment totals for all target charges
      const paidRows: any[] = targetLedgerIds.length > 0
        ? await tx.$queryRawUnsafe(
            `SELECT "ledgerEntryId", COALESCE(SUM("amount"), 0)::int AS total
             FROM "ReceiptItem"
             WHERE "ledgerEntryId" = ANY($1::text[])
             GROUP BY "ledgerEntryId"`,
            targetLedgerIds
          )
        : [];
      const paidAmountsMap = new Map<string, number>();
      for (const pr of paidRows) {
        paidAmountsMap.set(pr.ledgerEntryId, Number(pr.total));
      }

      // Batch 3: Pre-fetch all DISCOUNT entries for all relevant students
      const studentIdArray = Array.from(lockedStudentIds);
      const discountRows: any[] = studentIdArray.length > 0
        ? await tx.$queryRawUnsafe(
            `SELECT "studentId", "description", ABS("amount") AS amt
             FROM "LedgerEntry"
             WHERE "studentId" = ANY($1::text[])
               AND "entryType" = 'DISCOUNT'`,
            studentIdArray
          )
        : [];
      const studentDiscountsMap = new Map<string, Array<{ desc: string; amt: number }>>();
      for (const dr of discountRows) {
        const sid = dr.studentId as string;
        if (!studentDiscountsMap.has(sid)) studentDiscountsMap.set(sid, []);
        studentDiscountsMap.get(sid)!.push({ desc: (dr.description || "") as string, amt: Number(dr.amt) });
      }

      for (const item of items) {
        const { ledgerEntryId, payAmount, discountAmount, fineAmount } = item;
        const requestedPayPaisa = Math.max(0, Math.round(Number(payAmount) || 0));
        const requestedDiscountPaisa = Math.max(0, Math.round(Number(discountAmount) || 0));
        const fineAmountPaisa = Math.max(0, Math.round(Number(fineAmount || 0)));

        const charge = lockedChargesMap.get(ledgerEntryId);
        if (!charge) continue; // charge not found — skip

        const chargeName = (charge.description as string).replace("Assigned: ", "").trim();
        const itemStudentId = charge.studentId as string;

        // ── BL-01 + BL-02: Re-read balances from the locked snapshot
        const existingPaid = paidAmountsMap.get(ledgerEntryId) || 0;

        const studentDiscs = studentDiscountsMap.get(itemStudentId) || [];
        const associatedDiscounts = studentDiscs.reduce((sum, d) => {
          if (
            d.desc.endsWith(`: ${chargeName}`) ||
            d.desc === `Discount for: ${chargeName}`
          ) {
            return sum + d.amt;
          }
          return sum;
        }, 0);

        // ── BL-02: Authoritative outstanding balance
        const outstandingPaisa = Math.max(
          0,
          charge.amount - associatedDiscounts - existingPaid
        );

        // ── BL-02: Reject discounts that exceed the remaining balance
        if (requestedDiscountPaisa > outstandingPaisa) {
          throw Object.assign(
            new Error(
              `Discount (${requestedDiscountPaisa} paise) exceeds outstanding balance ` +
              `(${outstandingPaisa} paise) for charge "${chargeName}"`
            ),
            { code: "DISCOUNT_EXCEEDS_BALANCE" }
          );
        }

        const discountAmountPaisa = requestedDiscountPaisa; // validated: ≤ outstanding

        // Cap payment to what actually remains after discount (safety net)
        const maxPayablePaisa = Math.max(0, outstandingPaisa - discountAmountPaisa);
        const payAmountPaisa = Math.min(requestedPayPaisa, maxPayablePaisa);

        actualTotalPayPaisa += payAmountPaisa + fineAmountPaisa;

        validatedItems.push({
          charge,
          itemStudentId,
          chargeName,
          payAmountPaisa,
          discountAmountPaisa,
          fineAmountPaisa,
          outstandingPaisa, // ── B-03: actual remaining balance before this payment
        });
      }

      // 2. Build receipt snapshot with correct balances
      //
      // ── B-03 fix ──────────────────────────────────────────────────────────
      // Use outstandingPaisa (actual remaining balance before this payment)
      // as the per-item subtotal, NOT charge.amount (original full charge).
      // Prior partial payments would otherwise inflate subtotal/arrears.
      const totalOutstandingThisReceipt = validatedItems.reduce(
        (sum, vi) => sum + vi.outstandingPaisa,
        0
      );
      const totalDiscountPaisa = validatedItems.reduce(
        (sum, vi) => sum + vi.discountAmountPaisa,
        0
      );

      // ── BL-03 fix ─────────────────────────────────────────────────────────
      // Arrears = ALL unpaid dues for this family AFTER applying this receipt.
      // We query the family's total outstanding BEFORE writing (the locked
      // per-item outstanding values are authoritative for the items in this
      // receipt; all other charges are unchanged).
      //
      // Steps:
      //   a. Sum ALL outstanding dues for all students under this parentProfile
      //      (or just this student if no family profile).
      //   b. Subtract what this receipt is paying and discounting.
      //   c. The result is the true remaining balance across the whole family.
      let familyTotalOutstandingPaisa = 0;
      if (resolvedParentProfileId) {
        // Single precise query: for each CHARGE entry across all family students,
        // compute outstanding = charge.amount - paid (via ReceiptItems) - discounts
        // (via correlated subquery matching the same description-pattern used in the item loop).
        const preciseRows: any[] = await tx.$queryRawUnsafe(
          `SELECT
             le.id                                                              AS charge_id,
             le.amount::int                                                     AS charge_amount,
             COALESCE(SUM(ri.amount) FILTER (WHERE ri.id IS NOT NULL), 0)::int AS paid,
             COALESCE(
               (SELECT SUM(ABS(d.amount))
                FROM "LedgerEntry" d
                WHERE d."studentId" = le."studentId"
                  AND d."entryType" = 'DISCOUNT'
                  AND (d.description LIKE '%: ' || REGEXP_REPLACE(le.description, '^Assigned: ', '') || ''
                       OR d.description = 'Discount for: ' || REGEXP_REPLACE(le.description, '^Assigned: ', ''))
               ), 0
             )::int                                                             AS discounted
           FROM "LedgerEntry" le
           JOIN "Student" s ON s.id = le."studentId"
           LEFT JOIN "ReceiptItem" ri ON ri."ledgerEntryId" = le.id
           WHERE s."parentProfileId" = $1
             AND le."entryType" = 'CHARGE'
           GROUP BY le.id, le.amount, le."studentId", le.description`,
          resolvedParentProfileId
        );
        for (const row of preciseRows) {
          const outstanding = Math.max(
            0,
            Number(row.charge_amount) - Number(row.paid) - Number(row.discounted)
          );
          familyTotalOutstandingPaisa += outstanding;
        }
      } else {
        // No family profile — use the sum of outstanding for this single student's
        // charges in this receipt (plus any charges not in this receipt).
        // For the single-student case, we don't have locked data for charges outside
        // this receipt. Query them separately (no lock needed — they're not being modified).
        const studentId = resolvedStudentId;
        if (studentId) {
          const studentRows: any[] = await tx.$queryRawUnsafe(
            `SELECT
               le.id,
               le.amount::int                                                     AS charge_amount,
               COALESCE(SUM(ri.amount) FILTER (WHERE ri.id IS NOT NULL), 0)::int AS paid,
               COALESCE(
                 (SELECT SUM(ABS(d.amount))
                  FROM "LedgerEntry" d
                  WHERE d."studentId" = le."studentId"
                    AND d."entryType" = 'DISCOUNT'
                    AND (d.description LIKE '%: ' || REGEXP_REPLACE(le.description, '^Assigned: ', '')
                         OR d.description = 'Discount for: ' || REGEXP_REPLACE(le.description, '^Assigned: ', ''))
                 ), 0
               )::int                                                             AS discounted
             FROM "LedgerEntry" le
             LEFT JOIN "ReceiptItem" ri ON ri."ledgerEntryId" = le.id
             WHERE le."studentId" = $1
               AND le."entryType" = 'CHARGE'
             GROUP BY le.id, le.amount, le."studentId", le.description`,
            studentId
          );
          for (const row of studentRows) {
            familyTotalOutstandingPaisa += Math.max(
              0,
              Number(row.charge_amount) - Number(row.paid) - Number(row.discounted)
            );
          }
        }
      }

      // True arrears after this receipt = all family outstanding − what this receipt pays/discounts
      const trueArrearsPaisa = Math.max(
        0,
        familyTotalOutstandingPaisa - actualTotalPayPaisa - totalDiscountPaisa
      );

      const snapshot = {
        idempotencyKey: idempotencyKey || undefined,
        manualReceiptNo: cleanManualReceiptNo || undefined,
        // ── B-03: subtotal = what was actually outstanding, not original charge amounts
        subtotal: totalOutstandingThisReceipt,
        discount: totalDiscountPaisa,
        // ── BL-03: arrears = remaining dues across the WHOLE family after this receipt
        arrears: trueArrearsPaisa,
        // ── RS-01: amountInWords computed from the immutable amountPaid at payment time
        // so historical reprints never recompute it from the current ledger.
        amountInWords: numberToIndianWords(actualTotalPayPaisa),
        items: validatedItems.map((vi) => ({
          name: vi.chargeName,
          originalAmount: vi.charge.amount,          // original charge (for display)
          amount: vi.payAmountPaisa,
          discount: vi.discountAmountPaisa,
          // ── B-03: balance = outstanding BEFORE this payment − what this receipt covers
          balance: Math.max(
            0,
            vi.outstandingPaisa - vi.payAmountPaisa - vi.discountAmountPaisa
          ),
        })),
      };

      const receipt = await tx.receipt.create({
        data: {
          studentId: resolvedStudentId,
          parentProfileId: resolvedParentProfileId,
          receiptNumber: receiptNo,
          manualReceiptNo: cleanManualReceiptNo,
          paymentMethod: paymentMethod as PaymentMethod,
          transactionReference: transactionRef || null,
          amountPaid: actualTotalPayPaisa,
          remarks: JSON.stringify(snapshot),
          createdById: creatorUserId,
        },
      });

      // ── E-02: Structured Audit Logging for Payment Transactions
      await tx.auditLog.create({
        data: {
          userId: creatorUserId,
          action: "PAYMENT_RECORDED",
          entityType: "Receipt",
          entityId: receipt.id,
          newValues: JSON.stringify({
            receiptNumber: receiptNo,
            manualReceiptNo: cleanManualReceiptNo,
            studentId: resolvedStudentId,
            amountPaid: actualTotalPayPaisa,
            paymentMethod,
            itemCount: validatedItems.length,
          }),
        },
      });

      // 3. Apply items to ledger and receipt
      for (const vi of validatedItems) {
        const { charge, itemStudentId, chargeName, payAmountPaisa, discountAmountPaisa, fineAmountPaisa } = vi;

        // C. Handle Fine if any
        if (fineAmountPaisa > 0) {
          const fineEntry = await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.FINE,
              amount: fineAmountPaisa,
              description: `Late Fee Fine: ${chargeName}`,
              createdById: creatorUserId,
            },
          });

          // Create offsetting PAYMENT for the fine (so it doesn't show as permanently unpaid)
          await tx.receiptItem.create({
            data: {
              receiptId: receipt.id,
              ledgerEntryId: fineEntry.id,
              amount: fineAmountPaisa,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.PAYMENT,
              amount: -fineAmountPaisa,
              referenceId: receipt.id,
              description: `Payment for: Late Fee Fine: ${chargeName}`,
              createdById: creatorUserId,
            },
          });
        }

        // A. Handle Discount if any
        if (discountAmountPaisa > 0) {
          await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.DISCOUNT,
              amount: -discountAmountPaisa,
              referenceId: receipt.id,
              description: `Discount for: ${chargeName}`,
              createdById: creatorUserId,
            },
          });
        }

        // B. Handle Payment if any
        if (payAmountPaisa > 0) {
          await tx.receiptItem.create({
            data: {
              receiptId: receipt.id,
              ledgerEntryId: charge.id,
              amount: payAmountPaisa,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.PAYMENT,
              amount: -payAmountPaisa,
              referenceId: receipt.id,
              description: `Payment for: ${chargeName}`,
              createdById: creatorUserId,
            },
          });
        }
      }

      return { receipt, snapshot };
    });

    // Return receipt formatted with details
    const student = resolvedStudentId
      ? await db.student.findUnique({
          where: { id: resolvedStudentId },
          include: { class: true },
        })
      : null;

    const collectorUser = await db.user.findUnique({
      where: { id: authUser.userId },
      select: { name: true, role: true },
    });

    return NextResponse.json({
      success: true,
      receipt: {
        id: result.id,
        studentId: result.studentId,
        receiptNo: result.receiptNumber,
        manualReceiptNo: result.manualReceiptNo || cleanManualReceiptNo || null,
        amount: result.amountPaid,
        // RS-01: Include snapshot-derived fields so the immediate post-payment receipt
        // modal shows the same data as a historical reprint — no recomputation from
        // the live ledger.
        subtotal: snapshot.subtotal,
        discount: snapshot.discount,
        arrears: snapshot.arrears,
        amountInWords: snapshot.amountInWords,
        paymentMethod: result.paymentMethod,
        transactionRef: result.transactionReference || "",
        createdAt: result.createdAt.toISOString().split("T")[0],
        studentName: student?.name || "Multiple Siblings",
        classSection: student ? `${student.class.name}-${student.class.section}` : "Unified Family",
        collectedBy: collectorUser?.name || authUser.username || "Finance Staff",
        collectedByRole: collectorUser?.role || authUser.role || "ADMIN",
        // RS-01: Return full snapshot items instead of the simplified "Payment applied" descriptions
        // so the immediate receipt modal shows the correct fee-head-level breakdown.
        items: snapshot.items,
      },
    });

  } catch (error: any) {
    console.error("Payment checkout error:", error);
    // Validation errors thrown by B-02 / BL-02 guards are client mistakes (400)
    if (
      error?.code === "DUPLICATE_LEDGER_ENTRY" ||
      error?.code === "DISCOUNT_EXCEEDS_BALANCE"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const safeError = getSafeErrorMessage(error, "Checkout transaction failed.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
