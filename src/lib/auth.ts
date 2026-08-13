import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set. This is a critical security risk.");
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  const start = performance.now();
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload;
    console.log(`[DIAGNOSTIC][AUTH] verifyToken SUCCESS | duration: ${(performance.now() - start).toFixed(2)}ms | userId: ${decoded.userId} | role: ${decoded.role}`);
    return decoded;
  } catch (err: any) {
    console.error(`[DIAGNOSTIC][AUTH] verifyToken FAILURE | duration: ${(performance.now() - start).toFixed(2)}ms | error: ${err.message}`);
    return null;
  }
}

export async function getAuthUser(request?: Request): Promise<TokenPayload | null> {
  const reqId = `req_${Math.random().toString(36).substring(2, 9)}`;
  const start = performance.now();
  try {
    let token: string | undefined;
    let tokenSource = "none";

    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
        tokenSource = "authorization_header";
      }
    }

    if (!token) {
      const cookieStore = await cookies();
      const cookieObj = cookieStore.get("auth_token");
      token = cookieObj?.value;
      if (token) tokenSource = "cookie_store";
    }

    const cookieExists = !!token;
    console.log(`[DIAGNOSTIC][AUTH][${reqId}] getAuthUser check | cookieExists: ${cookieExists} | source: ${tokenSource}`);

    if (!token) {
      console.warn(`[DIAGNOSTIC][AUTH][${reqId}] getAuthUser FAILURE: No auth_token found | duration: ${(performance.now() - start).toFixed(2)}ms`);
      return null;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.warn(`[DIAGNOSTIC][AUTH][${reqId}] getAuthUser FAILURE: Token verification failed | duration: ${(performance.now() - start).toFixed(2)}ms`);
    } else {
      console.log(`[DIAGNOSTIC][AUTH][${reqId}] getAuthUser SUCCESS | duration: ${(performance.now() - start).toFixed(2)}ms | userId: ${decoded.userId} | role: ${decoded.role}`);
    }
    return decoded;
  } catch (err: any) {
    console.error(`[DIAGNOSTIC][AUTH][${reqId}] getAuthUser EXCEPTION | duration: ${(performance.now() - start).toFixed(2)}ms | error: ${err.message}`);
    return null;
  }
}


