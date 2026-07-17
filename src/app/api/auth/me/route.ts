import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Fetch user from DB with rich profile context
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                class: true,
              },
            },
          },
        },
        teacherProfile: {
          include: {
            classes: true,
          },
        },
        accountantProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (user.status === "BLOCKED") {
      cookieStore.delete("auth_token");
      return NextResponse.json(
        { error: "Your account has been locked/blocked by administrator." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        parentProfile: user.parentProfile,
        teacherProfile: user.teacherProfile,
        accountantProfile: user.accountantProfile,
      },
    });
  } catch (error: any) {
    console.error("Auth Me API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
