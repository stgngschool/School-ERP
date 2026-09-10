import { NextResponse } from "next/server";
import db from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { getAuthUser } from "@/lib/auth";
import { validateUploadedFile, getSafeErrorMessage } from "@/lib/validation";

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const studentId = formData.get("studentId") as string;
    const file = formData.get("file") as File;

    if (!studentId || !file) {
      return NextResponse.json({ error: "Missing studentId or file" }, { status: 400 });
    }

    // Role-based access verification
    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId }
      });
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: { parentProfileId: true }
      });
      if (!parentProfile || !student || student.parentProfileId !== parentProfile.id) {
        return NextResponse.json({ error: "Unauthorized. You can only upload photos for your own children." }, { status: 403 });
      }
    }

    // Validate format: strict image whitelist (JPG/JPEG/PNG/WEBP, max 2MB, rejects SVG)
    const validation = validateUploadedFile(file, {
      allowedExtensions: ["jpg", "jpeg", "png", "webp"],
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      maxSizeBytes: 2 * 1024 * 1024,
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid photo file." }, { status: 400 });
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
    const safeError = getSafeErrorMessage(error, "Failed to upload photo.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
