import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validatePercentage, getSafeErrorMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const concessions = await db.concession.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(concessions, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Fetch concessions error:", error);
    return NextResponse.json({ error: "Failed to fetch concessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
  }

  try {
    const { name, percentage, feeHeadName } = await request.json();
    if (!name || percentage === undefined || !feeHeadName) {
      return NextResponse.json({ error: "Name, percentage, and fee head name are required" }, { status: 400 });
    }

    const nameStr = String(name).trim();
    if (!nameStr) {
      return NextResponse.json({ error: "Concession name cannot be empty." }, { status: 400 });
    }

    let pctVal: number;
    try {
      pctVal = validatePercentage(percentage, "Percentage");
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const headNameStr = String(feeHeadName).trim();
    if (!headNameStr) {
      return NextResponse.json({ error: "Fee head name cannot be empty." }, { status: 400 });
    }

    const concession = await db.concession.upsert({
      where: { name: nameStr },
      update: { percentage: pctVal, feeHeadName: headNameStr },
      create: { name: nameStr, percentage: pctVal, feeHeadName: headNameStr },
    });

    // ── E-02: Structured Audit Logging
    await db.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "CONCESSION_UPDATED",
        entityType: "Concession",
        entityId: concession.id,
        newValues: JSON.stringify({ name: nameStr, percentage: pctVal, feeHeadName: headNameStr }),
      },
    }).catch((err) => console.error("Audit log error on concession:", err));

    return NextResponse.json({ success: true, concession });
  } catch (error) {
    console.error("Create concession error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to save concession.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Concession ID is required" }, { status: 400 });
    }

    try {
      await db.concession.delete({
        where: { id },
      });
    } catch (e: any) {
      if (e?.code !== "P2025") throw e; // P2025 = Record to delete does not exist
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete concession error:", error);
    return NextResponse.json({ error: "Failed to delete concession" }, { status: 500 });
  }
}

export const PUT = POST;
export const PATCH = POST;
