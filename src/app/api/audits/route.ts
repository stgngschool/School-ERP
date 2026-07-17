import { NextResponse } from "next/server";
import db from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const logs = await db.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = logs.map((log) => {
      const d = log.createdAt;
      const timestamp = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        id: log.id,
        userName: `${log.user.name} (${log.user.role})`,
        role: log.user.role,
        action: log.action,
        createdAt: timestamp,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch audits error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (!action) {
      return NextResponse.json({ error: "Action string is required." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    let userId = "";

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    if (!userId) {
      const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
      userId = admin?.id || "";
    }

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
