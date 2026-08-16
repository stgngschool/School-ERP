/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Filter out API routes from default caching to prevent stale financial balances & auth session bleeding
const customRuntimeCaching = [
  {
    matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  ...defaultCache.filter((cacheRule) => {
    // Avoid caching any dynamic backend APIs
    return !cacheRule.matcher.toString().includes("api");
  }),
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customRuntimeCaching,
});

serwist.addEventListeners();

