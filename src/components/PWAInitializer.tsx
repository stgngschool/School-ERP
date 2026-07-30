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



  return null;
}
