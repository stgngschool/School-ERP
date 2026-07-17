import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stops = await db.transportStop.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(stops);
  } catch (error) {
    console.error("Fetch transport stops error:", error);
    return NextResponse.json({ error: "Failed to fetch transport stops" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, amount } = await request.json();
    if (!name || amount === undefined) {
      return NextResponse.json({ error: "Name and amount are required" }, { status: 400 });
    }

    const nameStr = String(name).trim();
    const amountVal = parseFloat(amount);

    if (isNaN(amountVal) || amountVal < 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    // Store in Paisa (Rupees * 100)
    const amountInPaisa = Math.round(amountVal * 100);

    const stop = await db.transportStop.upsert({
      where: { name: nameStr },
      update: { amount: amountInPaisa },
      create: { name: nameStr, amount: amountInPaisa },
    });

    return NextResponse.json({ success: true, stop });
  } catch (error) {
    console.error("Create transport stop error:", error);
    return NextResponse.json({ error: "Failed to create transport stop" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Transport stop ID is required" }, { status: 400 });
    }

    await db.transportStop.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transport stop error:", error);
    return NextResponse.json({ error: "Failed to delete transport stop" }, { status: 500 });
  }
}
