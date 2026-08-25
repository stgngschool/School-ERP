import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // ── A-04: Caller verification & CSRF protection ────────────────────────────
  // 1. Verify caller is an authenticated user with a valid JWT
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 2. Prevent CSRF-forced logout: verify Origin / Sec-Fetch-Site
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return NextResponse.json({ error: "Forbidden: Cross-site request rejected." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: "Forbidden: Invalid origin." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden: Malformed origin." }, { status: 403 });
    }
  }

  // ── A-02: Increment tokenVersion on logout ──────────────────────────────────
  // Invalidates all tokens currently held by the user immediately.
  try {
    await db.user.updateMany({
      where: { id: authUser.userId },
      data: { tokenVersion: { increment: 1 } },
    });
  } catch {
    // Non-critical: if DB update fails, cookie is still cleared below.
  }

  const requestUrl = new URL(request.url);
  const isHttps = requestUrl.protocol === "https:";

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "auth_token",
    value: "",
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

