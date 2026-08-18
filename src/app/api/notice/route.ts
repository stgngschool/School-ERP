import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 100;
    const categoryFilter = url.searchParams.get("category");
    const isPublicOnly = url.searchParams.get("public") === "true";

    const authUser = await getAuthUser(request);
    let whereClause: any = { isActive: true };

    if (authUser && !isPublicOnly) {
      if (authUser.role === "ADMIN" || authUser.role === "ACCOUNTANT") {
        whereClause = {}; // Admin and accountant see all notices including inactive
      } else if (authUser.role === "PARENT") {
        whereClause = { isActive: true, target: { in: ["ALL", "PARENTS", "PUBLIC"] } };
      } else if (authUser.role === "TEACHER") {
        whereClause = { isActive: true, target: { in: ["ALL", "TEACHERS", "PUBLIC"] } };
      }
    } else {
      // Unauthenticated public website visitors
      whereClause = { isActive: true, target: { in: ["ALL", "PUBLIC"] } };
    }

    if (categoryFilter && categoryFilter !== "ALL") {
      whereClause.category = categoryFilter;
    }

    const notices = await db.notice.findMany({
      where: whereClause,
      take: limit,
      orderBy: [
        { isUrgent: "desc" },
        { createdAt: "desc" },
      ],
    });

    const formatted = notices.map((nt) => ({
      id: nt.id,
      title: nt.title,
      content: nt.content,
      category: nt.category || "GENERAL",
      target: nt.target,
      isUrgent: nt.isUrgent ?? false,
      isActive: nt.isActive ?? true,
      fileUrl: nt.fileUrl || null,
      createdAt: nt.createdAt.toISOString().split("T")[0],
    }));

    const response = NextResponse.json(formatted);
    // Cache for 30s with stale-while-revalidate for fast public performance
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return response;
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
    const { title, content, target, category, isUrgent, isActive, fileUrl } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const creatorUserId = authUser.userId;

    const notice = await db.notice.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        target: target || "ALL",
        category: category || "GENERAL",
        isUrgent: Boolean(isUrgent),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        fileUrl: fileUrl || null,
        createdById: creatorUserId,
      },
    });

    return NextResponse.json({
      success: true,
      notice: {
        id: notice.id,
        title: notice.title,
        content: notice.content,
        category: notice.category,
        target: notice.target,
        isUrgent: notice.isUrgent,
        isActive: notice.isActive,
        fileUrl: notice.fileUrl,
        createdAt: notice.createdAt.toISOString().split("T")[0],
      },
    });
  } catch (error: any) {
    console.error("Create notice error:", error);
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const { id, title, content, target, category, isUrgent, isActive, fileUrl } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Notice ID is required." }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (target !== undefined) updateData.target = target;
    if (category !== undefined) updateData.category = category;
    if (isUrgent !== undefined) updateData.isUrgent = Boolean(isUrgent);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl || null;

    const updated = await db.notice.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      notice: {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        category: updated.category,
        target: updated.target,
        isUrgent: updated.isUrgent,
        isActive: updated.isActive,
        fileUrl: updated.fileUrl,
        createdAt: updated.createdAt.toISOString().split("T")[0],
      },
    });
  } catch (error: any) {
    console.error("Update notice error:", error);
    return NextResponse.json({ error: "Failed to update notice" }, { status: 500 });
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
