import { revalidateTag } from "next/cache";
import { BoundedCache } from "./BoundedCache";

// Bounded LRU cache (max 50 entries, 5-minute TTL) for full billing ledger datasets
export const serverBillingCache = new BoundedCache(50, 5 * 60 * 1000);

// Bounded LRU cache (max 20 entries, 60-second TTL) for lightweight billing summary aggregates
export const serverBillingSummaryCache = new BoundedCache(20, 60 * 1000);

// ── EGRESS P2: Durable Next.js data-cache tag for the staff-wide billing summary
// (see src/app/api/billing/summary/route.ts). Purged below on every payment/charge mutation.
export const BILLING_SUMMARY_TAG = "billing-summary";

export function clearServerBillingCache() {
  serverBillingCache.clear();
  serverBillingSummaryCache.clear();
  // ── EGRESS P2: Also purge the durable (unstable_cache) staff summary so cross-device
  // and cold-start reads reflect a new payment/charge immediately instead of waiting out
  // the 60s revalidate window. Two-arg form is required in Next 16; { expire: 0 } = hard purge.
  try {
    revalidateTag(BILLING_SUMMARY_TAG, { expire: 0 });
  } catch (err) {
    console.warn("[billingCache] revalidateTag notice:", (err as Error)?.message);
  }
}
