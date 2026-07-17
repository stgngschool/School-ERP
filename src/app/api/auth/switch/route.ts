import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { role } = await request.json();

    if (!role) {
      return NextResponse.json({ error: "Role is required." }, { status: 400 });
    }

    // Find the seed user matching the requested role
    const user = await db.user.findFirst({
      where: { role },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found for this role." }, { status: 404 });
    }

    if (user.status === "BLOCKED") {
      return NextResponse.json({ error: "User is blocked." }, { status: 403 });
    }

    // Sign JWT token
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Set cookie
    const response = NextResponse.json({ success: true, user });
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Switch role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
