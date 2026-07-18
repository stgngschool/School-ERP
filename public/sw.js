// St. GNG School Finance OS — Service Worker v3
// Strategy: Network-first for API, Cache-first for static assets

const CACHE_VERSION = "v3";
const STATIC_CACHE = `gng-static-${CACHE_VERSION}`;
const API_CACHE = `gng-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/logo.png",
  "/manifest.json",
];

// ─── Install: Pre-cache static assets ────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: Clean up old caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Smart routing strategy ───────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, chrome-extension requests
  if (
    request.method !== "GET" ||
    !url.origin.includes(self.location.origin) ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // API routes: Network-first, cache fallback (short TTL)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 10));
    return;
  }

  // Navigation requests: Network-first, fallback to cached "/"
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // Static assets (images, fonts, scripts): Cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf)$/) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(cacheFirstWithFetch(request, STATIC_CACHE));
    return;
  }

  // Default: Network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const dateHeader = cached.headers.get("date");
      if (dateHeader) {
        const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
        if (age > maxAgeSeconds * 60) return cached; // stale but better than nothing
      }
      return cached;
    }
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirstWithFetch(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("Asset not available offline", { status: 503 });
  }
}
