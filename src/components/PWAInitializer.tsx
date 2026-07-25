"use client";

import { useEffect } from "react";

export default function PWAInitializer() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      } else {
        window.addEventListener("load", () => {
          navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
              console.log("[PWAInitializer] Service Worker v6 registered successfully.");
              reg.update();
            })
            .catch((err) => {
              console.error("[PWAInitializer] Service Worker registration error:", err);
            });
        });
      }
    }

    // Diagnostic PWA display-mode detection
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;
      console.log(`[PWAInitializer] Display Mode: ${isStandalone ? "Installed PWA (Standalone)" : "Standard Browser Window"}`);
    }
  }, []);

  return null;
}
