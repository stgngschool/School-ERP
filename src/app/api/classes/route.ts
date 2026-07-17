import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
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
