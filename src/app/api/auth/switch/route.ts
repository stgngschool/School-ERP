import { NextResponse } from "next/server";
import db from "@/lib/db";
import { signToken, getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Role switching is disabled in production environments." },
        { status: 403 }
      );
    }

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Please log in to switch demo accounts." },
        { status: 401 }
      );
    }

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

    // Set cookie directly on response object
    const response = NextResponse.json({ success: true, user });
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Switch role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

