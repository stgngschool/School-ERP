import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateYearlyChargesBulk, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getAuthUser } from "@/lib/auth";

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
      include: { class: true },
    });

    const result = await generateYearlyChargesBulk(
      students,
      systemUser.id,
      academicYear
    );

    return NextResponse.json({
      success: true,
      message: `Resync complete for academic year ${academicYear}`,
      totalGenerated: result.generated,
      totalSkipped: result.skipped,
      studentCount: students.length,
    });
  } catch (error: any) {
    console.error("Bill resync error:", error);
    return NextResponse.json({ error: "Failed to resync bills: " + error.message }, { status: 500 });
  }
}
