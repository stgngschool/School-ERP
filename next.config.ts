import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // ─── HTTP Security & Cache Headers ──────────────────────────────────────────
  // ANDROID PWA FIX: Auth API responses must never be cached by Android Chrome.
  // Without "no-store" on /api/auth/* routes, Chrome may cache a 401 response
  // from a previous unauthenticated state and serve it again on the next cold start,
  // making it appear that the session is always invalid on mobile.
  async headers() {
    return [
      // Auth routes — never cache, always re-validate
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          { key: "Surrogate-Control", value: "no-store" },
        ],
      },
      // All API routes — no caching (they return user-specific data)
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          // ANDROID PWA CORS: Allow credentials from same origin in standalone mode
          { key: "Vary", value: "Cookie" },
        ],
      },
      // Security headers for all routes
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Allow PWA install prompts and standalone mode
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
