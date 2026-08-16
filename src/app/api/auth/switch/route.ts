import { NextResponse } from "next/server";
import { getAuthUser, signToken } from "@/lib/auth";
import db from "@/lib/db";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { role } = await request.json();
    if (!role || !["ADMIN", "ACCOUNTANT", "TEACHER", "PARENT"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    // Verify user exists in database
    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      include: {
        teacherProfile: true,
        parentProfile: true,
        accountantProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Role eligibility validation
    // An ADMIN user can switch to any role for testing/management view
    // Other users can only switch if their profile exists for that role or original role equals the requested role
    const isAdmin = user.role === "ADMIN";
    const canSwitch =
      isAdmin ||
      user.role === role ||
      (role === "TEACHER" && !!user.teacherProfile) ||
      (role === "PARENT" && !!user.parentProfile) ||
      (role === "ACCOUNTANT" && !!user.accountantProfile);

    if (!canSwitch) {
      return NextResponse.json({ error: "You are not authorized to switch to this role." }, { status: 403 });
    }

    // Sign new JWT with updated active role
    const newToken = signToken({
      userId: user.id,
      username: user.username,
      role: role as Role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: role as Role,
        name: user.name,
      },
    });

    const requestUrl = new URL(request.url);
    const isHttps = requestUrl.protocol === "https:";
    response.cookies.set({
      name: "auth_token",
      value: newToken,
      httpOnly: true,
      secure: isHttps,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Switch role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
