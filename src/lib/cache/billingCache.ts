import { BoundedCache } from "./BoundedCache";

// Bounded LRU cache (max 50 entries, 3-minute TTL) for full billing ledger datasets
export const serverBillingCache = new BoundedCache(50, 3 * 60 * 1000);

// Bounded LRU cache (max 20 entries, 30-second TTL) for lightweight billing summary aggregates
export const serverBillingSummaryCache = new BoundedCache(20, 30 * 1000);

export function clearServerBillingCache() {
  serverBillingCache.clear();
  serverBillingSummaryCache.clear();
}
