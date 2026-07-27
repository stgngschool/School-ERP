import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Vary", "Cookie");
  return response;
}

export async function GET() {
  const reqId = `me_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = performance.now();
  console.log(`[DIAGNOSTIC][API][START] GET /api/auth/me [${reqId}] | timestamp: ${new Date().toISOString()}`);

  try {
    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("auth_token");
    const token = tokenObj?.value;
    const cookieExists = !!token;

    console.log(`[DIAGNOSTIC][AUTH][${reqId}] /api/auth/me cookie check | cookieExists: ${cookieExists}`);

    if (!token) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] GET /api/auth/me [${reqId}] | status: 401 | duration: ${duration}ms | authenticated: false | reason: No token cookie`);
      return noStoreJson({ authenticated: false }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] GET /api/auth/me [${reqId}] | status: 401 | duration: ${duration}ms | authenticated: false | reason: JWT decode failed`);
      return noStoreJson({ authenticated: false }, { status: 401 });
    }

    const dbStart = performance.now();
    // Fetch user from DB with lightweight profile select for ultra-fast response
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        status: true,
        parentProfile: { select: { id: true, familyCode: true } },
        teacherProfile: { select: { id: true, employeeId: true } },
        accountantProfile: { select: { id: true, employeeId: true } },
      },
    });
    const dbDuration = (performance.now() - dbStart).toFixed(2);
    console.log(`[DIAGNOSTIC][DB][${reqId}] db.user.findUnique | duration: ${dbDuration}ms | userId: ${decoded.userId}`);

    if (!user) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] GET /api/auth/me [${reqId}] | status: 401 | duration: ${duration}ms | authenticated: false | reason: User not found in DB`);
      return noStoreJson({ authenticated: false }, { status: 401 });
    }

    if (user.status === "BLOCKED") {
      cookieStore.delete("auth_token");
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[DIAGNOSTIC][API][END] GET /api/auth/me [${reqId}] | status: 403 | duration: ${duration}ms | user: ${user.username} | status: BLOCKED`);
      return noStoreJson(
        { error: "Your account has been locked/blocked by administrator." },
        { status: 403 }
      );
    }

    const payload = {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        status: user.status,
        parentProfile: user.parentProfile,
        teacherProfile: user.teacherProfile,
        accountantProfile: user.accountantProfile,
      },
    };
    const responseStr = JSON.stringify(payload);
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[DIAGNOSTIC][API][END] GET /api/auth/me [${reqId}] | status: 200 | duration: ${duration}ms | dbDuration: ${dbDuration}ms | authenticatedUser: ${user.username} (${user.role}) | size: ${responseStr.length}B`);

    return noStoreJson(payload);
  } catch (error: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error(`[DIAGNOSTIC][API][ERROR] GET /api/auth/me [${reqId}] | status: 500 | duration: ${duration}ms | error: ${error.message}`);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
