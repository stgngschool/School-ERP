/**
 * ── Security Utilities for School Finance OS
 *
 * Provides defense-in-depth protections including CSRF origin verification
 * for state-mutating requests (POST, PUT, PATCH, DELETE).
 */

/**
 * Validates that a mutating HTTP request originates from the same host.
 *
 * In browser environments:
 *   - The browser automatically attaches the `Origin` header to cross-origin POST/PATCH requests.
 *   - If `Origin` or `Referer` does not match the request's `Host`, the request is rejected.
 *   - Same-origin and non-browser API calls (e.g. mobile PWA fetch, server actions) without cross-site headers pass.
 */
export function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!host) return true;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  // If neither origin nor referer is provided (e.g., direct curl, internal fetch), allow
  return true;
}
