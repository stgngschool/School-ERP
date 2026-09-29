import { BoundedCache } from "./BoundedCache";

// Bounded LRU cache (max 50 entries, 5-minute TTL) for full billing ledger datasets
export const serverBillingCache = new BoundedCache(50, 5 * 60 * 1000);

// Bounded LRU cache (max 20 entries, 60-second TTL) for lightweight billing summary aggregates
export const serverBillingSummaryCache = new BoundedCache(20, 60 * 1000);

export function clearServerBillingCache() {
  serverBillingCache.clear();
  serverBillingSummaryCache.clear();
}
