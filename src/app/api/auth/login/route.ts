import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";
import { Role } from "@prisma/client";

// Basic in-memory rate limiter for login
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    return true;
  }
  if (now > record.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  record.count++;
  return true;
}

export async function POST(request: Request) {
  const reqId = `login_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = performance.now();
  console.log(`[DIAGNOSTIC][API][START] POST /api/auth/login [${reqId}] | timestamp: ${new Date().toISOString()}`);

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again after 15 minutes." },
      { status: 429 }
    );
  }

  try {
    const { username, password, portal } = await request.json();

    if (!username || !password) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 400 | duration: ${duration}ms | reason: Missing username or password`);
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

    const dbStart = performance.now();
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

    const dbDuration = (performance.now() - dbStart).toFixed(2);
    console.log(`[DIAGNOSTIC][DB][${reqId}] db.user candidate lookup | duration: ${dbDuration}ms | candidatesFound: ${candidateUsers.length}`);

    if (candidateUsers.length === 0) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 401 | duration: ${duration}ms | reason: Candidate user not found | input: ${cleanInput}`);
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
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 401 | duration: ${duration}ms | reason: Password mismatch`);
      return NextResponse.json(
        { error: "Invalid password. Please check your credentials." },
        { status: 401 }
      );
    }

    if (authenticatedUser.status === "BLOCKED") {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 403 | duration: ${duration}ms | user: ${authenticatedUser.username} | status: BLOCKED`);
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

    const payload = {
      success: true,
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        name: authenticatedUser.name,
      },
    };

    const response = NextResponse.json(payload);

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

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 200 | duration: ${duration}ms | dbDuration: ${dbDuration}ms | userId: ${authenticatedUser.id} | role: ${authenticatedUser.role} | secureCookie: ${isHttps}`);

    return response;
  } catch (error: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error(`[DIAGNOSTIC][API][ERROR] POST /api/auth/login [${reqId}] | status: 500 | duration: ${duration}ms | error: ${error.message}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
