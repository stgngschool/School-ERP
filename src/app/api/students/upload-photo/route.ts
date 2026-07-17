import { NextResponse } from "next/server";
import db from "@/lib/db";
import { uploadFile, supabaseClient } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const studentId = formData.get("studentId") as string;
    const file = formData.get("file") as File;

    if (!studentId || !file) {
      return NextResponse.json({ error: "Missing studentId or file" }, { status: 400 });
    }

    // Validate format: strictly JPG/JPEG
    const isJpg = file.type === "image/jpeg" || file.type === "image/jpg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg");
    if (!isJpg) {
      return NextResponse.json({ error: "Only JPG/JPEG format is supported." }, { status: 400 });
    }

    // Validate size: <= 50KB
    const maxSize = 50 * 1024; // 51200 bytes
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must not exceed 50KB." }, { status: 400 });
    }

    // Ensure bucket exists
    try {
      await supabaseClient.storage.createBucket("student-photos", { public: true });
    } catch (e) {
      // ignore
    }

    // Read file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save with unique name to prevent cache issues
    const fileName = `std-${studentId}-${Date.now()}.jpg`;
    const path = `photos/${fileName}`;

    // Upload to Supabase Storage
    const photoUrl = await uploadFile("student-photos", path, buffer, "image/jpeg");

    // Update Student in DB
    const student = await db.student.update({
      where: { id: studentId },
      data: { photoUrl },
    });

    return NextResponse.json({ success: true, photoUrl: student.photoUrl });
  } catch (error: any) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: "Failed to upload photo: " + error.message }, { status: 500 });
  }
}
