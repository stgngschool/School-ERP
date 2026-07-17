import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "SchoolFinanceOSSecretKey2026"
);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Skip proxy for API auth routes, static files, images, etc.
  const isPublicPath = pathname === "/login" || pathname.startsWith("/api/auth");

  if (isPublicPath) {
    // Only redirect to / if user is trying to access /login while already logged in
    if (pathname === "/login" && token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/", request.url));
      } catch (err) {
        // Token invalid, allow accessing the login page
      }
    }
    return NextResponse.next();
  }

  // Protected paths: redirect to /login if no token is found
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (err) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes other than auth (or protect them separately if needed)
     * - _next/static, _next/image, favicon.ico, public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
