import { NextResponse } from "next/server";
import db from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const notices = await db.notice.findMany({
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
  try {
    const { title, content, target } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    let creatorUserId = "";

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        creatorUserId = decoded.userId;
      }
    }

    if (!creatorUserId) {
      const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
      creatorUserId = admin?.id || "";
    }

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
