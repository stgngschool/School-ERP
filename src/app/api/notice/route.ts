import { NextResponse } from "next/server";
import db from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken, getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    let whereClause: any = { target: "ALL" };

    if (authUser) {
      if (authUser.role === "ADMIN" || authUser.role === "ACCOUNTANT") {
        whereClause = {}; // Admin and accountant see all notices
      } else if (authUser.role === "PARENT") {
        whereClause = { target: { in: ["ALL", "PARENTS"] } };
      } else if (authUser.role === "TEACHER") {
        whereClause = { target: { in: ["ALL", "TEACHERS"] } };
      }
    }

    const notices = await db.notice.findMany({
      where: whereClause,
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    const formatted = notices.map((nt) => ({
      id: nt.id,
      title: nt.title,
      content: nt.content,
      target: nt.target,
      createdAt: nt.createdAt.toISOString().split("T")[0],
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch notices error:", error);
    return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const { title, content, target } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const creatorUserId = authUser.userId;

    const notice = await db.notice.create({
      data: {
        title,
        content,
        target: target || "ALL",
        createdById: creatorUserId,
      },
    });

    return NextResponse.json({
      success: true,
      notice: {
        id: notice.id,
        title: notice.title,
        content: notice.content,
        target: notice.target,
        createdAt: notice.createdAt.toISOString().split("T")[0],
      },
    });
  } catch (error: any) {
    console.error("Create notice error:", error);
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Notice ID is required." }, { status: 400 });
    }

    await db.notice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Notice deleted successfully" });
  } catch (error: any) {
    console.error("Delete notice error:", error);
    return NextResponse.json({ error: "Failed to delete notice" }, { status: 500 });
  }
}
