// St. GNG School Finance OS — Service Worker v6 (Production PWA Fix)
// Strategy: Network-first for static assets, ALWAYS bypass SW for /api/ routes to ensure cookie auth works on PWA standalone

const CACHE_VERSION = "v6-pwa-fix";
const STATIC_CACHE = `gng-static-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/logo.png",
  "/manifest.json",
];

// ─── Install: Skip waiting immediately ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: Purge ALL old caches (including legacy gng-api-* & gng-static-*)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => {
            console.log(`[SW v6] Purging legacy cache: ${name}`);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Smart routing & API bypass ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. ALL API ROUTES (/api/*): ALWAYS BYPASS Service Worker!
  // Direct network fetch ensures native browser cookie handling & credentials work in PWA standalone mode.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 2. Skip non-GET or cross-origin requests
  if (
    request.method !== "GET" ||
    !url.origin.includes(self.location.origin) ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // 3. Next.js static bundles & scripts: ALWAYS Network First (never serve stale JS code)
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // 4. Navigation requests (HTML pages): Network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // 5. Static media assets (images, fonts): Cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(cacheFirstWithFetch(request, STATIC_CACHE));
    return;
  }

  // Default: Network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

async function cacheFirstWithFetch(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
      } catch (e) {
        // Silently ignore cache storage errors
      }
    }
    return networkResponse;
  } catch {
    return new Response("Asset not available offline", { status: 503 });
  }
}
