"use client";

import { useEffect } from "react";

export default function PWAInitializer() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // In development mode, automatically unregister active service workers
      // to prevent stale asset caching and ensure code edits apply instantly on reload.
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
              reg.update();
            })
            .catch((err) => {
              console.error("PWA Service Worker registration error:", err);
            });
        });
      }
    }
  }, []);

  return null;
}
