import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const classes = await db.class.findMany({
      where: { status: "ACTIVE" },
      orderBy: [
        { name: "asc" },
        { section: "asc" }
      ]
    });
    return NextResponse.json(classes);
  } catch (error) {
    console.error("Fetch classes error:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT" && authUser.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { name, section } = await request.json();
    if (!name || !section) {
      return NextResponse.json({ error: "Class name and section are required" }, { status: 400 });
    }

    const nameStr = String(name).trim();
    const sectionStr = String(section).trim();

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

    await db.class.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete class error:", error);
    return NextResponse.json({ error: "Failed to archive class" }, { status: 500 });
  }
}

