import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { EntryType } from "@prisma/client";
import { getAcademicYear } from "@/lib/generateYearlyCharges";

export const dynamic = "force-dynamic";

/**
 * ── P-02: GET /api/billing/summary
 *
 * Lightweight aggregate endpoint calculating financial totals server-side via
 * Prisma aggregate/count queries without returning massive raw ledger arrays.
 * Scoped by caller role:
 *  - ADMIN & ACCOUNTANT: School-wide totals
 *  - TEACHER: Scoped to teacher's class students
 *  - PARENT: Scoped to parent's children
 */
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const acYear = getAcademicYear();
    const startYear = parseInt(acYear.split("-")[0], 10);
    const sessionStartDate = new Date(`${startYear}-03-01T00:00:00.000Z`);

    let studentIdsScope: string[] | undefined = undefined;

    if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: true },
      });
      const classIds = teacherProfile?.classes.map((c) => c.id) || [];
      if (classIds.length === 0) {
        return NextResponse.json({
          success: true,
          academicYear: acYear,
          summary: {
            totalChargesPaisa: 0,
            totalDiscountsPaisa: 0,
            totalCollectedPaisa: 0,
            todayCollectedPaisa: 0,
            netDuesPaisa: 0,
            totalReceiptsCount: 0,
          },
        });
      }
      const teacherStudents = await db.student.findMany({
        where: { classId: { in: classIds } },
        select: { id: true },
      });
      studentIdsScope = teacherStudents.map((s) => s.id);
    } else if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId },
      });
      if (!parentProfile) {
        return NextResponse.json({
          success: true,
          academicYear: acYear,
          summary: {
            totalChargesPaisa: 0,
            totalDiscountsPaisa: 0,
            totalCollectedPaisa: 0,
            todayCollectedPaisa: 0,
            netDuesPaisa: 0,
            totalReceiptsCount: 0,
          },
        });
      }
      const parentStudents = await db.student.findMany({
        where: { parentProfileId: parentProfile.id },
        select: { id: true },
      });
      studentIdsScope = parentStudents.map((s) => s.id);
    } else if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden access." }, { status: 403 });
    }

    const chargeWhere: any = {
      entryType: EntryType.CHARGE,
      createdAt: { gte: sessionStartDate },
    };
    const discountWhere: any = {
      entryType: EntryType.DISCOUNT,
      createdAt: { gte: sessionStartDate },
    };
    const receiptWhere: any = {};

    if (studentIdsScope) {
      chargeWhere.studentId = { in: studentIdsScope };
      discountWhere.studentId = { in: studentIdsScope };
      receiptWhere.studentId = { in: studentIdsScope };
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    const [
      chargeAgg,
      discountAgg,
      receiptAgg,
      todayReceiptAgg,
      receiptCount,
    ] = await Promise.all([
      db.ledgerEntry.aggregate({
        where: chargeWhere,
        _sum: { amount: true },
      }),
      db.ledgerEntry.aggregate({
        where: discountWhere,
        _sum: { amount: true },
      }),
      db.receipt.aggregate({
        where: receiptWhere,
        _sum: { amountPaid: true },
      }),
      db.receipt.aggregate({
        where: {
          ...receiptWhere,
          createdAt: { gte: todayStart },
        },
        _sum: { amountPaid: true },
      }),
      db.receipt.count({ where: receiptWhere }),
    ]);

    const totalChargesPaisa = chargeAgg._sum.amount || 0;
    const totalDiscountsPaisa = discountAgg._sum.amount || 0;
    const totalCollectedPaisa = receiptAgg._sum.amountPaid || 0;
    const todayCollectedPaisa = todayReceiptAgg._sum.amountPaid || 0;
    const netDuesPaisa = Math.max(0, totalChargesPaisa - totalDiscountsPaisa - totalCollectedPaisa);

    return NextResponse.json({
      success: true,
      academicYear: acYear,
      summary: {
        totalChargesPaisa,
        totalDiscountsPaisa,
        totalCollectedPaisa,
        todayCollectedPaisa,
        netDuesPaisa,
        totalReceiptsCount: receiptCount,
      },
    }, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (err: any) {
    console.error("Billing summary error:", err);
    return NextResponse.json({ error: "Failed to calculate billing summary" }, { status: 500 });
  }
}