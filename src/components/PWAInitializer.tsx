"use client";

import { useEffect } from "react";

export default function PWAInitializer() {
  useEffect(() => {
    // ─── Comprehensive Mobile & PWA Diagnostics ──────────────────────────────
    // Logs critical info to help debug Android issues via Chrome DevTools (USB debugging)
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;
      const isAndroid = /Android/i.test(ua);
      const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua);
      const androidVersion = ua.match(/Android\s([\d.]+)/)?.[1] ?? "N/A";
      const chromeVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] ?? "N/A";
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType ?? "unknown";
      const viewport = `${window.innerWidth}x${window.innerHeight}`;
      const screenSize = `${window.screen.width}x${window.screen.height}`;

      // Check if any cookies are present (value redacted for security)
      const cookieNames = document.cookie.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean);

      console.group("[DIAGNOSTIC][PWA] 📱 Device & Service Worker Inspection");
      console.log("[DIAGNOSTIC][PWA] displayMode       :", isStandalone ? "standalone" : "browser");
      console.log("[DIAGNOSTIC][PWA] navigator.onLine  :", navigator.onLine);
      console.log("[DIAGNOSTIC][PWA] effectiveNetwork  :", effectiveType);
      console.log("[DIAGNOSTIC][PWA] swSupported       :", "serviceWorker" in navigator);
      console.log("[DIAGNOSTIC][PWA] swController      :", navigator.serviceWorker?.controller ? "ACTIVE" : "NONE");
      console.log("[DIAGNOSTIC][PWA] cookiesPresent    :", cookieNames.join(", ") || "NONE");
      console.log("[DIAGNOSTIC][PWA] userAgent         :", ua);
      console.groupEnd();

      if ("caches" in window) {
        caches.keys().then((names) => {
          console.log("[DIAGNOSTIC][PWA] activeCacheNames:", names);
        });
      }

      // Log when network goes offline/online during session
      const onOffline = () => console.warn("[PWAInitializer] 📵 Network went OFFLINE");
      const onOnline = () => console.log("[PWAInitializer] 📶 Network came back ONLINE");
      window.addEventListener("offline", onOffline);
      window.addEventListener("online", onOnline);

      return () => {
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
      };
    }
  }, []);

  useEffect(() => {
    // ─── Service Worker Registration ─────────────────────────────────────────
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      // In development: unregister all service workers to prevent caching issues
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log("[PWAInitializer] Dev: Unregistered service worker");
        }
      });
    } else {
      // Production: Register SW after window load to not block initial render
      const registerSW = () => {
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        navigator.serviceWorker
          .register("/sw.js", {
            // updateViaCache: "none" forces Chrome to always check the network for
            // a new SW file, even if the request would normally be cached.
            // This ensures Android PWA always picks up new SW versions.
            updateViaCache: "none",
          })
          .then((reg) => {
            console.log("[PWAInitializer] ✅ Service Worker v8 registered:", reg.scope);

            // Check for waiting SW (new version available)
            if (reg.waiting) {
              console.log("[PWAInitializer] New SW waiting — sending skipWaiting");
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }

            // Force update check to catch any pending new version
            reg.update().catch((err) =>
              console.warn("[PWAInitializer] SW update check failed:", err)
            );

            // Listen for new SW installing
            reg.addEventListener("updatefound", () => {
              const newSW = reg.installing;
              if (newSW) {
                newSW.addEventListener("statechange", () => {
                  if (newSW.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[PWAInitializer] New SW installed — page will use it on next load");
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.error("[PWAInitializer] ❌ Service Worker registration failed:", err);
          });
      };

      // Register after page load to avoid blocking initial render
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW, { once: true });
      }
    }
  }, []);

  return null;
}
