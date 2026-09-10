import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import {
  checkActivationRateLimit,
  clearActivationRateLimit,
  getTrustedClientIp,
} from "@/lib/rateLimit";
import { getSafeErrorMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

const DUMMY_HASH = "$2a$10$wK1hV37P4vK4sO6hWjK/U.0O9/9O1O8O2O3O4O5O6O7O8O9O0O1O2";

export async function POST(request: Request) {
  const clientIp = getTrustedClientIp(request);

  try {
    const body = await request.json().catch(() => ({}));
    const { admissionNumber, mobile, newPassword } = body;

    const cleanAdmission = String(admissionNumber || "").trim();
    const cleanMobile = String(mobile || "").replace(/\D/g, "");
    const cleanPassword = String(newPassword || "").trim();

    // 1. Strict input validation
    if (!cleanAdmission || cleanMobile.length < 10 || cleanPassword.length < 6) {
      return NextResponse.json(
        {
          error:
            "Please provide a valid Admission Number, a 10-digit mobile number, and a new password with at least 6 characters.",
        },
        { status: 400 }
      );
    }

    if (cleanPassword.length > 72) {
      return NextResponse.json(
        { error: "Password must not exceed 72 characters." },
        { status: 400 }
      );
    }

    // 2. Strict Rate Limiting (IP: max 5 / 15m; Pair: max 3 / 15m)
    const rateCheck = await checkActivationRateLimit(clientIp, cleanAdmission, cleanMobile);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.reason || "Too many activation attempts. Please try again after 15 minutes." },
        { status: 429 }
      );
    }

    // 3. Lookup Student Record
    const student = await db.student.findFirst({
      where: {
        admissionNumber: { equals: cleanAdmission, mode: "insensitive" },
      },
      include: {
        parentProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    // Constant-time rejection helper to prevent timing-based user enumeration
    const rejectGeneric = async () => {
      await bcrypt.compare(cleanPassword, DUMMY_HASH);
      return NextResponse.json(
        {
          error:
            "Invalid admission details provided, or this account has already been activated. Please verify your details or log in directly.",
        },
        { status: 400 }
      );
    };

    if (!student || !student.parentProfile || !student.parentProfile.user) {
      return await rejectGeneric();
    }

    // 4. Secure Mobile Matching (check last 10 digits across fatherMobile, motherMobile, and parent user phone)
    const last10 = cleanMobile.slice(-10);
    const normalize10 = (val?: string | null) => (val ? val.replace(/\D/g, "").slice(-10) : "");
    const father10 = normalize10(student.fatherMobile);
    const mother10 = normalize10(student.motherMobile);
    const userPhone10 = normalize10(student.parentProfile.user.phone);

    const matchesMobile =
      (father10 && father10 === last10) ||
      (mother10 && mother10 === last10) ||
      (userPhone10 && userPhone10 === last10);

    if (!matchesMobile) {
      return await rejectGeneric();
    }

    // 5. Verify Pending Activation Status (Must be one-time only!)
    const parentUser = student.parentProfile.user;
    if (!parentUser.passwordHash || !parentUser.passwordHash.startsWith("PENDING_ACTIVATION:")) {
      return await rejectGeneric();
    }

    // 6. Secure Password Hashing and Atomic Account Activation
    const newPasswordHash = await bcrypt.hash(cleanPassword, 10);

    await db.user.update({
      where: { id: parentUser.id },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 },
        phone: parentUser.phone || last10,
        status: "ACTIVE",
      },
    });

    // 7. Clear rate limit for this pair upon successful activation
    await clearActivationRateLimit(cleanAdmission, cleanMobile);

    return NextResponse.json({
      success: true,
      message:
        "Account activated successfully! You can now log in using your registered mobile number and new password.",
    });
  } catch (error: any) {
    console.error("Parent activation error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to activate account. Please try again later.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
