import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await db.academicSession.findMany({
      orderBy: { startDate: "desc" },
    });
    
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { name, startDate, endDate, isCurrent } = await request.json();
    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, start date, and end date are required" }, { status: 400 });
    }

    // If setting as current, unset others
    if (isCurrent) {
      await db.academicSession.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      });
    }

    const session = await db.academicSession.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: Boolean(isCurrent)
      }
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id, isCurrent } = await request.json();
    
    if (!id || typeof isCurrent === 'undefined') {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (isCurrent) {
      // Unset previous current session
      await db.academicSession.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      });
    }

    const updated = await db.academicSession.update({
      where: { id },
      data: { isCurrent: Boolean(isCurrent) }
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
