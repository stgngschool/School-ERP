import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { EntryType } from "@prisma/client";
import { getAcademicYear } from "@/lib/generateYearlyCharges";

import { getTodayIST } from "@/lib/dateUtils";
import { unstable_cache } from "next/cache";
import { serverBillingSummaryCache, BILLING_SUMMARY_TAG } from "@/lib/cache/billingCache";

export const dynamic = "force-dynamic";

// ── EGRESS P2: Durable, fleet-wide cache for the STAFF (school-global) billing summary.
// The totals are identical for every ADMIN/ACCOUNTANT, so we compute the 5 aggregate
// queries at most once per 60s across ALL serverless instances/devices (instead of the
// old per-container in-memory cache that re-ran them on every cold start and on every
// device's 3-minute probe). Purged immediately on any payment/charge via BILLING_SUMMARY_TAG.
// IMPORTANT: no cookies/headers are read inside this scope (unsupported in unstable_cache);
// the result is school-global and never role/user-specific.
const getStaffBillingSummary = unstable_cache(
  async () => {
    const acYear = getAcademicYear();
    const startYear = parseInt(acYear.split("-")[0], 10);
    const sessionStartDate = new Date(`${startYear}-03-01T00:00:00.000Z`);
    const todayStr = getTodayIST();
    const todayStart = new Date(`${todayStr}T00:00:00+05:30`);

    const [chargeAgg, discountAgg, receiptAgg, todayReceiptAgg, receiptCount] = await Promise.all([
      db.ledgerEntry.aggregate({ where: { entryType: EntryType.CHARGE, createdAt: { gte: sessionStartDate } }, _sum: { amount: true } }),
      db.ledgerEntry.aggregate({ where: { entryType: EntryType.DISCOUNT, createdAt: { gte: sessionStartDate } }, _sum: { amount: true } }),
      db.receipt.aggregate({ where: { status: { not: "REVERSED" } }, _sum: { amountPaid: true } }),
      db.receipt.aggregate({ where: { status: { not: "REVERSED" }, createdAt: { gte: todayStart } }, _sum: { amountPaid: true } }),
      db.receipt.count({ where: { status: { not: "REVERSED" } } }),
    ]);

    const totalChargesPaisa = chargeAgg._sum.amount || 0;
    const totalDiscountsPaisa = Math.abs(discountAgg._sum.amount || 0);
    const totalCollectedPaisa = receiptAgg._sum.amountPaid || 0;
    const todayCollectedPaisa = todayReceiptAgg._sum.amountPaid || 0;
    const netDuesPaisa = Math.max(0, totalChargesPaisa - totalDiscountsPaisa - totalCollectedPaisa);

    return {
      academicYear: acYear,
      summary: { totalChargesPaisa, totalDiscountsPaisa, totalCollectedPaisa, todayCollectedPaisa, netDuesPaisa, totalReceiptsCount: receiptCount },
    };
  },
  ["billing-summary-staff"],
  { tags: [BILLING_SUMMARY_TAG], revalidate: 60 }
);

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

    const isStaff = authUser.role === "ADMIN" || authUser.role === "ACCOUNTANT";

    // ── EGRESS P2: Staff totals are school-global and identical for every ADMIN/ACCOUNTANT,
    // so serve them from the durable fleet-wide cache above. The response stays `private`
    // (NOT a public CDN cache): this same URL returns role-scoped data for teachers/parents,
    // and a shared public cache keyed only by URL would leak financial totals across roles.
    if (isStaff) {
      const staff = await getStaffBillingSummary();
      return NextResponse.json({ success: true, ...staff }, {
        headers: {
          "Cache-Control": "private, max-age=45, stale-while-revalidate=90",
          "X-Server-Cache": "DURABLE",
        },
      });
    }

    const cacheKey = isStaff ? "SUMMARY_STAFF" : `SUMMARY_${authUser.role}_${authUser.userId}`;
    const cachedSummary = serverBillingSummaryCache.get(cacheKey);
    if (cachedSummary) {
      return NextResponse.json(cachedSummary, {
        headers: {
          "Cache-Control": "private, max-age=45, stale-while-revalidate=90",
          "X-Server-Cache": "HIT",
        },
      });
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
    const receiptWhere: any = { status: { not: "REVERSED" } };

    if (studentIdsScope) {
      chargeWhere.studentId = { in: studentIdsScope };
      discountWhere.studentId = { in: studentIdsScope };
      receiptWhere.studentId = { in: studentIdsScope };
    }

    const todayStr = getTodayIST();
    const todayStart = new Date(`${todayStr}T00:00:00+05:30`);

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
    const totalDiscountsPaisa = Math.abs(discountAgg._sum.amount || 0);
    const totalCollectedPaisa = receiptAgg._sum.amountPaid || 0;
    const todayCollectedPaisa = todayReceiptAgg._sum.amountPaid || 0;
    const netDuesPaisa = Math.max(0, totalChargesPaisa - totalDiscountsPaisa - totalCollectedPaisa);

    const payload = {
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
    };

    serverBillingSummaryCache.set(cacheKey, payload);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=45, stale-while-revalidate=90",
        "X-Server-Cache": "MISS",
      },
    });
  } catch (err: any) {
    console.error("Billing summary error:", err);
    return NextResponse.json({ error: "Failed to calculate billing summary" }, { status: 500 });
  }
}