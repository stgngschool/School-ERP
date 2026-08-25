import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

import { boundPagination, getSafeErrorMessage } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { limit, offset } = boundPagination(searchParams, { defaultLimit: 200, maxLimit: 500 });

    const logs = await db.auditLog.findMany({
      take: limit,
      skip: offset,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = logs.map((log) => {
      const d = log.createdAt;
      const timestamp = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        id: log.id,
        userName: log.user ? `${log.user.name} (${log.user.role})` : "System / Deleted User",
        role: log.user ? log.user.role : "UNKNOWN",
        action: log.action,
        createdAt: timestamp,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch audits error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to fetch audit logs.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { action } = await request.json();

    if (!action) {
      return NextResponse.json({ error: "Action string is required." }, { status: 400 });
    }

    const userId = authUser.userId;

    const log = await db.auditLog.create({
      data: {
        userId,
        action,
        entityType: "PORTAL_ACTION",
        entityId: "PORTAL",
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error("Create audit error:", error);
    return NextResponse.json({ error: "Failed to log audit trail" }, { status: 500 });
  }
}

