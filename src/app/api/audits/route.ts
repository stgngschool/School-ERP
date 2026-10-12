import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validation";
import { getTodayIST } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isPaginated = searchParams.get("paginated") === "true" || searchParams.has("page");

    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

    const limitParam = parseInt(searchParams.get("limit") || "25", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 25 : Math.min(100, limitParam);
    const skip = (page - 1) * limit;

    const category = (searchParams.get("category") || "ALL").toUpperCase();
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const staffId = searchParams.get("userId") || searchParams.get("staffId") || "";
    const dateParam = (searchParams.get("date") || "").trim();

    // ── Build Prisma where filter ──
    const andConditions: any[] = [];

    // 1. Staff User Filter
    if (staffId && staffId !== "ALL") {
      andConditions.push({ userId: staffId });
    }

    // 2. Category Filter
    if (category === "LOOKUP") {
      andConditions.push({ action: { contains: "LOOKUP" } });
    } else if (category === "PAYMENT" || category === "FEE") {
      andConditions.push({
        OR: [
          { action: { contains: "PAYMENT" } },
          { action: { contains: "FEE" } },
          { action: { contains: "CHARGE" } },
          { action: { contains: "BILLING" } },
          { action: { contains: "CONCESSION" } },
        ],
      });
    } else if (category === "SECURITY" || category === "USER") {
      andConditions.push({
        OR: [
          { action: { contains: "USER" } },
          { action: { contains: "PASSWORD" } },
          { action: { contains: "LOGIN" } },
          { action: { contains: "STATUS" } },
        ],
      });
    } else if (category === "STUDENT") {
      andConditions.push({
        OR: [
          { action: { contains: "STUDENT" } },
          { action: { contains: "ADMISSION" } },
          { action: { contains: "PROMOTE" } },
          { action: { contains: "FAMILY" } },
        ],
      });
    }

    // 3. Search query across action & staff name
    if (search) {
      andConditions.push({
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    // 4. Date filter (Asia/Kolkata day boundary)
    if (dateParam) {
      const dayStart = new Date(`${dateParam}T00:00:00+05:30`);
      const dayEnd = new Date(`${dateParam}T23:59:59.999+05:30`);
      andConditions.push({
        createdAt: { gte: dayStart, lte: dayEnd },
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const todayIST = getTodayIST();
    const todayStart = new Date(`${todayIST}T00:00:00+05:30`);

    // Concurrent batch: fetch items, count, summary metrics, and active staff
    const [logs, totalCount, totalAll, todayTotal, todayLookups, todayPayments, staffUsers] =
      await Promise.all([
        db.auditLog.findMany({
          where,
          take: limit,
          skip,
          select: {
            id: true,
            action: true,
            createdAt: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.auditLog.count({ where }),
        db.auditLog.count(),
        db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
        db.auditLog.count({
          where: {
            action: { contains: "LOOKUP" },
            createdAt: { gte: todayStart },
          },
        }),
        db.auditLog.count({
          where: {
            OR: [
              { action: { contains: "PAYMENT" } },
              { action: { contains: "FEE" } },
              { action: { contains: "CHARGE" } },
              { action: { contains: "BILLING" } },
              { action: { contains: "CONCESSION" } },
            ],
            createdAt: { gte: todayStart },
          },
        }),
        db.user.findMany({
          where: { role: { in: ["ADMIN", "ACCOUNTANT", "TEACHER"] } },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        }),
      ]);

    const formatted = logs.map((log) => {
      const d = log.createdAt;
      const timestamp = d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return {
        id: log.id,
        userId: log.userId,
        userName: log.user ? log.user.name : "System / Deleted User",
        role: log.user ? log.user.role : "UNKNOWN",
        action: log.action,
        createdAt: timestamp,
        rawCreatedAt: log.createdAt.toISOString(),
      };
    });

    // If client requested paginated mode (or AuditLogsTab calls with params)
    if (isPaginated || searchParams.has("limit") || searchParams.has("category")) {
      return NextResponse.json({
        logs: formatted,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        },
        summary: {
          totalAll,
          todayTotal,
          todayLookups,
          todayPayments,
        },
        staffList: staffUsers,
      });
    }

    // Default response preserves array for backward-compatibility while including pagination metadata headers
    return NextResponse.json(formatted, {
      headers: {
        "X-Total-Count": String(totalCount),
        "X-Page": String(page),
        "X-Total-Pages": String(Math.max(1, Math.ceil(totalCount / limit))),
      },
    });
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
