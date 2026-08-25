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

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

/**
 * Returns true if the request is allowed, false if rate-limited.
 *
 * Uses a single atomic UPSERT so concurrent requests from the same IP
 * cannot race past the limit.
 */
export async function checkLoginRateLimit(ip: string): Promise<boolean> {
  // Normalise the IP: take only the first value from x-forwarded-for chains
  // (e.g. "1.2.3.4, 10.0.0.1" → "1.2.3.4") to avoid trivial bypass.
  const clientIp = ip.split(",")[0].trim() || "unknown";

  // Single atomic statement:
  //   • INSERT a fresh row on first attempt from this IP.
  //   • On conflict (IP already exists):
  //       - If the window has expired → reset count to 1 and windowStart to NOW.
  //       - If within the window → increment count by 1.
  //   • RETURNING lets us read the resulting count + windowStart in one round-trip.
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
    clientIp,
    WINDOW_SECONDS
  );

  const count = Number(rows[0]?.count ?? 1);
  return count <= MAX_ATTEMPTS;
}

/**
 * Clear the rate limit record for an IP (e.g. after a successful login).
 * Optional — the window expiry resets automatically, but clearing on success
 * prevents legitimate users from being locked out after a failed-then-succeeded sequence.
 */
export async function clearLoginRateLimit(ip: string): Promise<void> {
  const clientIp = ip.split(",")[0].trim() || "unknown";
  await db.$queryRawUnsafe(
    `DELETE FROM "LoginAttempt" WHERE "ip" = $1`,
    clientIp
  );
}
