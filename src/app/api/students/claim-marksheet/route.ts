import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, isMarksheetClaimed } = body;
    
    if (!studentId || typeof isMarksheetClaimed !== "boolean") {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const student = await db.student.update({
      where: { id: studentId },
      data: { isMarksheetClaimed }
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    console.error("[API_ERROR] claim-marksheet:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
