import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const concessions = await db.concession.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(concessions);
  } catch (error) {
    console.error("Fetch concessions error:", error);
    return NextResponse.json({ error: "Failed to fetch concessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, percentage, feeHeadName } = await request.json();
    if (!name || percentage === undefined || !feeHeadName) {
      return NextResponse.json({ error: "Name, percentage, and fee head name are required" }, { status: 400 });
    }

    const nameStr = String(name).trim();
    const pctVal = parseInt(percentage);
    const headNameStr = String(feeHeadName).trim();

    if (isNaN(pctVal) || pctVal < 0 || pctVal > 100) {
      return NextResponse.json({ error: "Percentage must be between 0 and 100" }, { status: 400 });
    }

    const concession = await db.concession.upsert({
      where: { name: nameStr },
      update: { percentage: pctVal, feeHeadName: headNameStr },
      create: { name: nameStr, percentage: pctVal, feeHeadName: headNameStr },
    });

    return NextResponse.json({ success: true, concession });
  } catch (error) {
    console.error("Create concession error:", error);
    return NextResponse.json({ error: "Failed to create concession" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Concession ID is required" }, { status: 400 });
    }

    await db.concession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete concession error:", error);
    return NextResponse.json({ error: "Failed to delete concession" }, { status: 500 });
  }
}
