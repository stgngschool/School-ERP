import { NextResponse } from "next/server";
import db from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken, getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const homeworks = await db.homework.findMany({
      include: { class: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = homeworks.map((h) => ({
      id: h.id,
      classSection: `${h.class.name}-${h.class.section}`,
      subject: h.subject,
      title: h.title,
      description: h.description,
      dueDate: h.dueDate.toISOString().split("T")[0],
      createdAt: h.createdAt.toISOString().split("T")[0],
      fileUrl: h.fileUrl,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch homework error:", error);
    return NextResponse.json({ error: "Failed to fetch homework" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const teacher = await db.teacherProfile.findFirst({
      where: { userId: decoded.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Only teachers can post homework." }, { status: 403 });
    }

    const formData = await request.formData();
    const classSection = formData.get("classSection") as string;
    const subject = formData.get("subject") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dueDateStr = formData.get("dueDate") as string;
    const file = formData.get("file") as File | null;

    if (!classSection || !subject || !title || !description || !dueDateStr) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const parts = classSection.split("-");
    const section = parts.pop() || "";
    const className = parts.join("-");
    
    let classObj = await db.class.findFirst({
      where: { name: className, section: section },
    });

    if (!classObj) {
      classObj = await db.class.create({
        data: { name: className, section: section },
      });
    }

    let fileUrl: string | null = null;
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileExtension = file.name.split(".").pop();
      const fileName = `hw-${Date.now()}-${Math.floor(100 + Math.random() * 900)}.${fileExtension}`;
      
      fileUrl = await uploadFile("homework-attachments", `assignments/${fileName}`, buffer, file.type);
    }

    const homework = await db.homework.create({
      data: {
        classId: classObj.id,
        subject,
        title,
        description,
        fileUrl,
        dueDate: new Date(dueDateStr),
        teacherId: teacher.id,
      },
    });

    return NextResponse.json({
      success: true,
      homework: {
        id: homework.id,
        classSection,
        subject,
        title,
        description,
        dueDate: homework.dueDate.toISOString().split("T")[0],
        createdAt: homework.createdAt.toISOString().split("T")[0],
        fileUrl,
      },
    });
  } catch (error: any) {
    console.error("Create homework error:", error);
    return NextResponse.json({ error: "Failed to create homework" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Homework ID is required." }, { status: 400 });
    }

    const homework = await db.homework.findUnique({
      where: { id },
    });

    if (!homework) {
      return NextResponse.json({ error: "Homework not found." }, { status: 404 });
    }

    if (homework.fileUrl) {
      try {
        const filePath = homework.fileUrl.split("/homework-attachments/").pop();
        if (filePath) {
          await deleteFile("homework-attachments", filePath);
        }
      } catch (err) {
        console.error("Failed to delete attachment from storage:", err);
      }
    }

    await db.homework.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete homework error:", error);
    return NextResponse.json({ error: "Failed to delete homework" }, { status: 500 });
  }
}
