import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const { username, password, portal } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username/Phone and password are required." },
        { status: 400 }
      );
    }

    const cleanInput = String(username).trim();
    const cleanPassword = String(password).trim();
    const digitsOnly = cleanInput.replace(/\D/g, "");

    // Determine target roles based on login portal selected (STAFF vs PARENT)
    const targetRoles: Role[] =
      portal === "STAFF"
        ? [Role.ADMIN, Role.ACCOUNTANT, Role.TEACHER]
        : portal === "PARENT"
        ? [Role.PARENT]
        : [Role.ADMIN, Role.ACCOUNTANT, Role.TEACHER, Role.PARENT];

    // Find candidate users in database matching login criteria and role filter
    let candidateUsers = await db.user.findMany({
      where: {
        role: { in: targetRoles },
        OR: [
          { username: { equals: cleanInput, mode: "insensitive" } },
          { email: { equals: cleanInput, mode: "insensitive" } },
          ...(digitsOnly.length >= 7
            ? [{ phone: { contains: digitsOnly } }]
            : []),
        ],
      },
    });

    // Fallback for Parent portal: Check Family Code (FAM-XXXX) or Child Admission Number (ADM-XXXX)
    if (candidateUsers.length === 0 && (portal === "PARENT" || !portal)) {
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
        candidateUsers = [parentByCode.user];
      }
    }

    if (candidateUsers.length === 0) {
      const portalName = portal === "STAFF" ? "Staff Login" : portal === "PARENT" ? "Parent Portal" : "system";
      return NextResponse.json(
        { error: `No account found for ${portalName}. Please check your username/phone.` },
        { status: 401 }
      );
    }

    // Authenticate candidate user by password
    let authenticatedUser = null;
    for (const candidate of candidateUsers) {
      if (candidate.status === "BLOCKED") continue;
      const isMatch = await bcrypt.compare(cleanPassword, candidate.passwordHash);
      if (isMatch) {
        authenticatedUser = candidate;
        break;
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Invalid password. Please check your credentials." },
        { status: 401 }
      );
    }

    if (authenticatedUser.status === "BLOCKED") {
      return NextResponse.json(
        { error: "Your account has been locked/blocked by administrator." },
        { status: 403 }
      );
    }

    // Sign JWT token
    const token = signToken({
      userId: authenticatedUser.id,
      username: authenticatedUser.username,
      role: authenticatedUser.role,
    });

    // Set cookie directly on response object
    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        name: authenticatedUser.name,
      },
    });

    // Mobile/PWA auth fix:
    // Keep the cookie same-site and only mark it secure on HTTPS requests.
    // SameSite=None requires HTTPS and can silently fail on LAN/HTTP mobile tests.
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    const requestUrl = new URL(request.url);
    const isHttps = requestUrl.protocol === "https:";
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: isHttps,
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
