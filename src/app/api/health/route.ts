import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const studentCount = await db.student.count();
    return NextResponse.json({
      status: "ok",
      system: "School Finance OS",
      database: "connected",
      studentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error?.message || "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
