/** Trust only the hosting platform's overwritten header, never arbitrary forwarding headers. */
export function getTrustedClientIp(request: Request): string {
  if (process.env.VERCEL === "1") {
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (ip) return ip;
  }
  // Unknown/self-hosted ingress shares a conservative bucket until a trusted proxy is configured.
  return "unknown";
}
