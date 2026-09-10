/**
 * A-01 fix: DB-backed login rate limiter.
 *
 * Why: The original in-process Map is reset on every cold start and is
 * invisible to other serverless instances. An attacker can bypass the limit
 * by routing requests through multiple Vercel/edge instances.
 *
 * Design:
 *   - One row per IP in the LoginAttempt table (PK = ip).
 *   - On each login attempt, atomically INSERT ... ON CONFLICT DO UPDATE:
 *       • If the existing window has expired → reset count to 1, update windowStart.
 *       • If within the window and count < MAX_ATTEMPTS → increment and allow.
 *       • If within the window and count >= MAX_ATTEMPTS → reject.
 *   - The raw SQL ensures the read-modify-write is atomic (no TOCTOU race across
 *     instances).
 *
 * The same Prisma connection pool is used — no extra infrastructure needed.
 *
 * Window: 15 minutes / 5 attempts (matching the original in-process limiter).
 */

import db from "./db";

const WINDOW_SECONDS = 15 * 60; // 15 minutes

/**
 * Safely extracts client IP from trusted hosting proxy headers.
 * Prioritizes Vercel-generated edge headers (x-vercel-forwarded-for, x-real-ip)
 * which cannot be forged by downstream clients on Vercel infrastructure.
 */
export function getTrustedClientIp(request: Request): string {
  // 1. Vercel trusted edge headers
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp && vercelIp.trim()) {
    return vercelIp.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // 2. Standard proxy header fallback
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return "127.0.0.1";
}

/**
 * Single atomic upsert checking and recording rate limits in LoginAttempt table.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds = WINDOW_SECONDS
): Promise<{ allowed: boolean; remaining: number }> {
  const normalizedKey = key.trim();
  const rows: { count: number; windowStart: Date }[] = await db.$queryRawUnsafe(
    `INSERT INTO "LoginAttempt" ("ip", "count", "windowStart")
     VALUES ($1, 1, NOW())
     ON CONFLICT ("ip") DO UPDATE
       SET
         "count"       = CASE
                           WHEN NOW() - "LoginAttempt"."windowStart" > ($2 * INTERVAL '1 second')
                           THEN 1
                           ELSE "LoginAttempt"."count" + 1
                         END,
         "windowStart" = CASE
                           WHEN NOW() - "LoginAttempt"."windowStart" > ($2 * INTERVAL '1 second')
                           THEN NOW()
                           ELSE "LoginAttempt"."windowStart"
                         END
     RETURNING "count", "windowStart"`,
    normalizedKey,
    windowSeconds
  );

  const count = Number(rows[0]?.count ?? 1);
  return {
    allowed: count <= maxAttempts,
    remaining: Math.max(0, maxAttempts - count),
  };
}

/**
 * IP-level rate limiter: 10 attempts per 15 minutes per network IP.
 */
export async function checkLoginRateLimit(ip: string): Promise<boolean> {
  const normalizedIp = ip.split(",")[0].trim() || "unknown";
  const res = await checkRateLimit(`ip:${normalizedIp}`, 10, WINDOW_SECONDS);
  return res.allowed;
}

/**
 * Account-level lockout: 5 attempts per 15 minutes per username/phone/code.
 * Prevents distributed botnets from brute-forcing individual accounts across multiple IPs.
 */
export async function checkAccountRateLimit(account: string): Promise<boolean> {
  const normalizedAcc = account.toLowerCase().trim() || "unknown";
  const res = await checkRateLimit(`acc:${normalizedAcc}`, 5, WINDOW_SECONDS);
  return res.allowed;
}

/**
 * Clear rate limit records for an IP upon successful login.
 */
export async function clearLoginRateLimit(ip: string): Promise<void> {
  const normalizedIp = ip.split(",")[0].trim() || "unknown";
  await db.$queryRawUnsafe(
    `DELETE FROM "LoginAttempt" WHERE "ip" = $1 OR "ip" = $2`,
    normalizedIp,
    `ip:${normalizedIp}`
  );
}

/**
 * Clear rate limit records for an account upon successful login.
 */
export async function clearAccountRateLimit(account: string): Promise<void> {
  const normalizedAcc = account.toLowerCase().trim() || "unknown";
  await db.$queryRawUnsafe(
    `DELETE FROM "LoginAttempt" WHERE "ip" = $1`,
    `acc:${normalizedAcc}`
  );
}

/**
 * Parent Activation Rate Limiter (SEC-06):
 * Dual-key protection against brute force and account enumeration:
 *   1. Network IP limit: 5 attempts per 15 minutes.
 *   2. Admission + Phone target pair limit: 3 attempts per 15 minutes.
 */
export async function checkActivationRateLimit(
  ip: string,
  admissionNo: string,
  phone: string
): Promise<{ allowed: boolean; reason?: string }> {
  const normalizedIp = ip.split(",")[0].trim() || "unknown";
  const normalizedAdm = admissionNo.toUpperCase().trim();
  const normalizedPhone = phone.replace(/\D/g, "").slice(-10);

  // 1. IP rate check
  const ipRes = await checkRateLimit(`act_ip:${normalizedIp}`, 5, WINDOW_SECONDS);
  if (!ipRes.allowed) {
    return {
      allowed: false,
      reason: "Too many activation attempts from this network. Please try again after 15 minutes.",
    };
  }

  // 2. Target pair rate check
  if (normalizedAdm && normalizedPhone) {
    const pairRes = await checkRateLimit(`act_pair:${normalizedAdm}:${normalizedPhone}`, 3, WINDOW_SECONDS);
    if (!pairRes.allowed) {
      return {
        allowed: false,
        reason: "Too many activation attempts for this student record. Please try again after 15 minutes.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Clear activation rate limit for a student pair upon successful activation.
 */
export async function clearActivationRateLimit(admissionNo: string, phone: string): Promise<void> {
  const normalizedAdm = admissionNo.toUpperCase().trim();
  const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
  await db.$queryRawUnsafe(
    `DELETE FROM "LoginAttempt" WHERE "ip" = $1`,
    `act_pair:${normalizedAdm}:${normalizedPhone}`
  );
}

