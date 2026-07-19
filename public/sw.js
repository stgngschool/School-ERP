// St. GNG School Finance OS — Service Worker v4
// Strategy: Network-first for JS bundles & API, Cache-first only for static media

const CACHE_VERSION = "v4";
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

// ─── Activate: Clean up ALL old caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => caches.delete(name))
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

  // Next.js static bundles & scripts: ALWAYS Network First (never serve stale JS code)
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // API routes: Network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 10));
    return;
  }

  // Navigation requests: Network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // Static media assets (images, fonts): Cache-first
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
