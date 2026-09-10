import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getTrustedClientIp,
  checkAccountRateLimit,
  clearAccountRateLimit,
} from "@/lib/rateLimit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const reqId = `login_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = performance.now();
  console.log(`[DIAGNOSTIC][API][START] POST /api/auth/login [${reqId}] | timestamp: ${new Date().toISOString()}`);

  // ── SEC-09: Trusted client IP resolution from edge infrastructure (Vercel)
  const clientIp = getTrustedClientIp(request);

  // Network IP rate limit (10 attempts / 15m)
  const allowed = await checkLoginRateLimit(clientIp);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts from this network. Please try again after 15 minutes." },
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

    // ── SEC-09: Account-level lockout (5 failed attempts per 15 minutes)
    const accountAllowed = await checkAccountRateLimit(cleanInput);
    if (!accountAllowed) {
      return NextResponse.json(
        { error: "Too many failed login attempts for this account. Please try again after 15 minutes." },
        { status: 429 }
      );
    }

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
      // ── SEC-17: Constant-time dummy compare prevents timing-based user enumeration
      await bcrypt.compare(cleanPassword, "$2a$10$wK1hV37P4vK4sO6hWjK/U.0O9/9O1O8O2O3O4O5O6O7O8O9O0O1O2");
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 401 | duration: ${duration}ms | reason: Candidate user not found | input: ${cleanInput}`);
      return NextResponse.json(
        { error: "Invalid username/phone or password. Please check your credentials." },
        { status: 401 }
      );
    }

    // Authenticate candidate user by password
    let authenticatedUser = null;
    let isBlockedUser = false;
    for (const candidate of candidateUsers) {
      const isMatch = await bcrypt.compare(cleanPassword, candidate.passwordHash);
      if (isMatch) {
        if (candidate.status === "BLOCKED") {
          isBlockedUser = true;
          break;
        }
        authenticatedUser = candidate;
        break;
      }
    }

    if (isBlockedUser) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 403 | duration: ${duration}ms | status: BLOCKED`);
      return NextResponse.json(
        { error: "Your account has been locked/blocked by administrator." },
        { status: 403 }
      );
    }

    if (!authenticatedUser) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] POST /api/auth/login [${reqId}] | status: 401 | duration: ${duration}ms | reason: Password mismatch`);
      return NextResponse.json(
        { error: "Invalid username/phone or password. Please check your credentials." },
        { status: 401 }
      );
    }

    // Successful login — clear rate limit records for both IP and targeted account
    void clearLoginRateLimit(clientIp).catch(() => { /* non-critical, ignore */ });
    void clearAccountRateLimit(cleanInput).catch(() => { /* non-critical, ignore */ });

    // ── A-02: Sign JWT with current tokenVersion ─────────────────────────────
    // The tokenVersion is verified on every subsequent request in getAuthUser().
    // Incrementing tokenVersion (on block/logout/password-reset) immediately
    // invalidates this and all other tokens for the user.
    const token = signToken({
      userId: authenticatedUser.id,
      username: authenticatedUser.username,
      role: authenticatedUser.role,
      tokenVersion: authenticatedUser.tokenVersion,
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
