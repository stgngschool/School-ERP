import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ClassStatus } from "@prisma/client";
import { isGhostClassName, sortClassObjects } from "@/lib/classUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const rawClasses = await db.class.findMany({
      where: {
        status: ClassStatus.ACTIVE,
        NOT: [
          { name: { startsWith: "Class_" } },
          { name: { startsWith: "class_" } },
          { name: { startsWith: "sec-" } },
        ],
      },
      orderBy: [
        { name: "asc" },
        { section: "asc" }
      ]
    });
    const classes = sortClassObjects(rawClasses.filter(c => !isGhostClassName(c.name)));
    return NextResponse.json(classes, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Fetch classes error:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access. Staff finance/admin privileges required." }, { status: 403 });
    }

    const { name, section } = await request.json();
    if (!name || !section) {
      return NextResponse.json({ error: "Class name and section are required" }, { status: 400 });
    }

    const nameStr = String(name).trim();
    const sectionStr = String(section).trim();

    if (isGhostClassName(nameStr) || isGhostClassName(sectionStr)) {
      return NextResponse.json({ error: "Invalid class or section name" }, { status: 400 });
    }

    let classObj = await db.class.findFirst({
      where: { name: nameStr, section: sectionStr },
    });

    if (!classObj) {
      classObj = await db.class.create({
        data: { name: nameStr, section: sectionStr },
      });
    }

    return NextResponse.json({ success: true, class: classObj });
  } catch (error) {
    console.error("Create class error:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    // DB-05: Using ClassStatus enum — only valid enum values can be stored
    await db.class.update({
      where: { id },
      data: { status: ClassStatus.ARCHIVED },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete class error:", error);
    return NextResponse.json({ error: "Failed to archive class" }, { status: 500 });
  }
}
