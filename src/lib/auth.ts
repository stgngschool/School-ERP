import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import db from "./db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set. This is a critical security risk.");
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  // ── A-02: token version for server-side revocation ──────────────────────────
  // Included in every issued JWT. If the User.tokenVersion in the DB is higher
  // than this value the token has been revoked (block, logout, password reset).
  tokenVersion?: number;
  // ── A-07: Expiry timestamp exposed for callers to determine session expiry.
  // Derived from the JWT `exp` claim (seconds since epoch) at verification time.
  // Never set by callers — populated by verifyToken only. Does not affect JWT
  // validation or token lifetime.
  expiresAt?: string; // ISO-8601 date string, e.g. "2026-09-01T12:00:00.000Z"
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload & { exp?: number };
    // ── A-07: Extract the `exp` claim and expose it as a human-readable ISO string.
    // `exp` is a Unix timestamp in seconds. Only set when jwt.sign used expiresIn.
    if (decoded.exp) {
      decoded.expiresAt = new Date(decoded.exp * 1000).toISOString();
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Resolve the authenticated user from the incoming request.
 *
 * ── A-02 fix: server-side token revocation ──────────────────────────────────
 * After verifying the JWT signature we look up a single lightweight row in the
 * User table (indexed PK lookup — ~1 ms). We check two things:
 *   1. user.status !== "BLOCKED"  — user was blocked by admin after token issuance.
 *   2. user.tokenVersion === payload.tokenVersion — token was revoked (logout /
 *      block / password reset) after it was issued.
 *
 * Any mismatch returns null, which causes every protected API endpoint to
 * respond 401 — the client clears the cookie and forces re-login.
 *
 * Tokens issued before this fix deploy have no `tokenVersion` claim (undefined),
 * which is treated as version 0. Existing DB rows start at version 1 (the
 * migration default), so all pre-existing tokens are immediately revoked and
 * users must re-login once. This is intentional and correct security behaviour.
 */
export async function getAuthUser(request?: Request): Promise<TokenPayload | null> {
  try {
    let token: string | undefined;

    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      const cookieStore = await cookies();
      const cookieObj = cookieStore.get("auth_token");
      token = cookieObj?.value;
    }

    if (!token) {
      return null;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    // ── A-02: Lightweight DB check — one indexed PK lookup ──────────────────
    // Fetches only the three fields needed for revocation validation.
    const dbUser = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { status: true, tokenVersion: true },
    });

    if (!dbUser) return null;

    // Blocked users are always rejected regardless of token validity
    if (dbUser.status === "BLOCKED") return null;

    // Reject tokens whose version is older than the current DB version.
    // A missing tokenVersion in the payload (pre-fix tokens) is treated as 0
    // and will always fail this check (DB starts at 1) — forcing re-login.
    if ((decoded.tokenVersion ?? 0) !== dbUser.tokenVersion) return null;

    return decoded;
  } catch (err: any) {
    return null;
  }
}
