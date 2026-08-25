import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateYearlyChargesBulk, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getAuthUser } from "@/lib/auth";

import { getSafeErrorMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/generate
 * Body: { academicYear?: "2026-2027" } — optional, defaults to current
 *
 * Resync/backfill tool: regenerates full-year charges for ALL active students.
 * Safe to run multiple times — idempotent (skips already-created charges).
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const academicYear = body.academicYear || getAcademicYear();

    const systemUser = await db.user.findFirst({
      where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
    });

    if (!systemUser) {
      return NextResponse.json({ error: "No admin/accountant user found" }, { status: 500 });
    }

    const students = await db.student.findMany({
      where: { status: "ACTIVE" },
      // ── GY-02: admissionDate lets bulk generator derive per-student starting month
      select: {
        id: true,
        admissionDate: true,
        class: { select: { name: true } },
      },
    });

    const result = await generateYearlyChargesBulk(
      students,
      systemUser.id,
      academicYear
    );

    const hasFailed = (result as any).failed > 0;

    return NextResponse.json({
      success: !hasFailed,
      message: hasFailed
        ? `Resync completed with issues: ${result.generated} generated, ${result.skipped} skipped, ${(result as any).failed} failed`
        : `Resync complete for academic year ${academicYear}`,
      totalGenerated: result.generated,
      totalSkipped: result.skipped,
      totalFailed: (result as any).failed || 0,
      studentCount: students.length,
      errors: (result as any).errors || [],
    }, { status: hasFailed ? 207 : 200 });
  } catch (error: any) {
    console.error("Bill resync error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to resync bills.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
