import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "antigravity_school_finance_os_secret_jwt_key_2026_super_secure"
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes — they handle their own auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Skip middleware for static files and assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|css|js|woff|woff2|ttf|webmanifest|json)$/)
  ) {
    return NextResponse.next();
  }

  // Public paths: /login is accessible without auth
  const isPublicPath = pathname === "/login";

  if (isPublicPath) {
    // Redirect logged-in users away from /login to dashboard
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/", request.url));
      } catch (err) {
        // Token invalid — let them access login page
      }
    }
    return NextResponse.next();
  }

  // Protected paths: redirect to /login if no valid token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (err) {
    // Token expired or invalid — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (they handle their own auth)
     * - _next/static, _next/image, favicon.ico, public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
