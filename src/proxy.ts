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

  // If user is already authenticated and visits /login, redirect to ERP dashboard
  if (pathname === "/login" && token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.redirect(new URL("/?view=erp", request.url));
    } catch (err) {
      // Token invalid, allow accessing the login page
    }
  }

  // All website routes (/, /about, /academics, /admissions, /facilities, /gallery, /notices, /contact, /videos, etc.)
  // and login page are publicly accessible
  return NextResponse.next();
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
