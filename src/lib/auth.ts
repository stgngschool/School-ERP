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
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

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
    return decoded;
  } catch (err: any) {
    return null;
  }
}


