import { NextResponse } from "next/server";
import db from "@/lib/db";
import { uploadFile } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const studentId = formData.get("studentId") as string;
    const file = formData.get("file") as File;

    if (!studentId || !file) {
      return NextResponse.json({ error: "Missing studentId or file" }, { status: 400 });
    }

    // Validate format: image format (JPG/PNG/WEBP)
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    if (!isImage) {
      return NextResponse.json({ error: "Only image files (JPG/PNG/WEBP) are supported." }, { status: 400 });
    }

    // Read file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save with unique name
    const fileName = `std-${studentId}-${Date.now()}.jpg`;
    const pathInsideBucket = `photos/${fileName}`;

    // Upload to Supabase Storage or Local Storage Fallback
    const photoUrl = await uploadFile("student-photos", pathInsideBucket, buffer, file.type || "image/jpeg");

    // Update Student in DB
    const student = await db.student.update({
      where: { id: studentId },
      data: { photoUrl },
    });

    return NextResponse.json({ success: true, photoUrl: student.photoUrl });
  } catch (error: any) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: "Failed to upload photo: " + (error?.message || "Unknown error") }, { status: 500 });
  }
}
