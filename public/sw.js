// St. GNG School Finance OS — Service Worker v7 (Android PWA Production Fix)
// CRITICAL CHANGES FROM v6:
// 1. Navigation requests now pass credentials:"include" so cookies are forwarded correctly
// 2. Version bumped to v7 to force cache purge and re-registration on all devices
// 3. API routes are always bypassed (return early) — never intercepted
// 4. Stale shell cache is never served for navigation — always network-first with credentials

const CACHE_VERSION = "v8-mobile-data-fix";
const STATIC_CACHE = `gng-static-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/logo.png",
  "/manifest.json",
];

// ─── Install: Cache static assets only (NOT the "/" shell — it's auth-gated) ──
self.addEventListener("install", (event) => {
  console.log("[SW v7] Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Only cache static assets, NOT "/" — caching the HTML shell can serve
      // a stale unauthenticated shell to returning users on Android cold start.
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Take over immediately — don't wait for existing tabs to close
  self.skipWaiting();
});

// ─── Activate: Purge ALL caches from previous versions ──────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW v7] Activating — purging all legacy caches...");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => {
            console.log(`[SW v7] Purging legacy cache: ${name}`);
            return caches.delete(name);
          })
      )
    ).then(() => {
      console.log("[SW v7] All legacy caches purged. Taking control of clients.");
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Fetch: Smart routing with Android PWA credential safety ─────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. ALL API ROUTES (/api/*): ALWAYS BYPASS the Service Worker completely.
  //    This is CRITICAL — browser native fetch handles cookie headers correctly.
  //    Any SW interception of API calls risks breaking cookie-based auth on Android.
  if (url.pathname.startsWith("/api/")) {
    return; // Let the browser handle it natively — no SW interception
  }

  // 2. Skip non-GET requests, cross-origin requests, and browser extensions
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // 3. Next.js static bundles (/_next/*): Network-first, fallback to cache
  //    Never serve stale JS bundles — they could be from an old deployment
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request, { credentials: "same-origin" }).catch(() =>
        caches.match(request)
      )
    );
    return;
  }

  // 4. Navigation requests (HTML page loads): ALWAYS network-first with credentials.
  //    ANDROID PWA FIX: Must pass credentials:"include" so the auth_token cookie
  //    is forwarded correctly in standalone mode. Without this, Android PWA can
  //    serve a cached 401-causing shell instead of a fresh auth-aware response.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, {
        credentials: "include",        // ← Critical for Android PWA cookie auth
        cache: "no-store",             // ← Always get fresh HTML, never stale
      }).catch(() => {
        // Offline fallback — try cache, then minimal offline response
        return caches.match("/").then(
          (r) => r || new Response(
            `<!DOCTYPE html>
            <html><head><title>Offline - GNG School</title>
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;}
            .box{text-align:center;padding:2rem;}.title{font-size:1.25rem;font-weight:800;color:#1e293b;margin-bottom:0.5rem;}
            .sub{color:#64748b;font-size:0.875rem;margin-bottom:1.5rem;}
            .btn{background:#4f46e5;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:0.75rem;font-size:0.875rem;font-weight:700;cursor:pointer;}
            </style></head>
            <body><div class="box">
            <div class="title">You're offline</div>
            <div class="sub">Please check your internet connection and try again.</div>
            <button class="btn" onclick="location.reload()">Retry</button>
            </div></body></html>`,
            { status: 503, headers: { "Content-Type": "text/html" } }
          )
        );
      })
    );
    return;
  }

  // 5. Static media assets (images, fonts, icons): Cache-first strategy
  //    These don't change often and are safe to cache aggressively
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf)$/)) {
    event.respondWith(cacheFirstWithFetch(request, STATIC_CACHE));
    return;
  }

  // 6. Default: Network-first for everything else
  event.respondWith(
    fetch(request, { credentials: "same-origin" }).catch(() =>
      caches.match(request)
    )
  );
});

// ─── Cache-first helper ──────────────────────────────────────────────────────
async function cacheFirstWithFetch(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request, { credentials: "same-origin" });
    if (networkResponse.ok) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
      } catch (cacheErr) {
        // Silently ignore cache storage errors (e.g. storage quota exceeded)
        console.warn("[SW v7] Cache put failed:", cacheErr);
      }
    }
    return networkResponse;
  } catch (fetchErr) {
    console.warn("[SW v7] Network fetch failed for:", request.url, fetchErr);
    return new Response("Asset not available offline", { status: 503 });
  }
}
