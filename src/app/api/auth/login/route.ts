import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username/Phone and password are required." },
        { status: 400 }
      );
    }

    const cleanInput = String(username).trim();
    const cleanPassword = String(password).trim();
    const digitsOnly = cleanInput.replace(/\D/g, "");

    // Query user from database by username, email, phone, familyCode, or admissionNumber
    let user = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanInput, mode: "insensitive" } },
          { email: { equals: cleanInput, mode: "insensitive" } },
          ...(digitsOnly.length >= 7
            ? [{ phone: { contains: digitsOnly } }]
            : []),
        ],
      },
    });

    // Fallback: Check if input matches Family Code (FAM-XXXX) or Child Admission Number (ADM-XXXX)
    if (!user) {
      const parentByCode = await db.parentProfile.findFirst({
        where: {
          OR: [
            { familyCode: { equals: cleanInput, mode: "insensitive" } },
            { students: { some: { admissionNumber: { equals: cleanInput, mode: "insensitive" } } } },
          ],
        },
        include: { user: true },
      });

      if (parentByCode && parentByCode.user) {
        user = parentByCode.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials. Please check your username, phone, or family code." },
        { status: 401 }
      );
    }

    if (user.status === "BLOCKED") {
      return NextResponse.json(
        { error: "Your account has been locked/blocked by administrator." },
        { status: 403 }
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials. Please check your password." },
        { status: 401 }
      );
    }

    // Sign JWT token
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Set cookie directly on response object
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

