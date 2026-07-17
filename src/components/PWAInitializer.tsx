"use client";

import { useEffect } from "react";

export default function PWAInitializer() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("St. GNG School PWA Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.error("PWA Service Worker registration error:", err);
          });
      });
    }
  }, []);

  return null;
}
