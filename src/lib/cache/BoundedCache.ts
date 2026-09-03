/**
 * ── C-02 fix: Bounded LRU (Least Recently Used) cache with TTL expiry.
 *
 * Replaces the unbounded `new Map()` caches in billing/route.ts and
 * students/route.ts that could grow indefinitely when hit with varied
 * query parameters — causing an Out of Memory (OOM) server crash.
 *
 * Design:
 *   - Fixed maximum capacity (default 100 entries).
 *   - Each entry has a TTL (time to live) in milliseconds.
 *   - On `get()`, expired entries return undefined and are pruned.
 *   - On `set()`, if the cache is at max capacity, the oldest entry
 *     (least recently inserted) is evicted before inserting the new one.
 *   - `clear()` wipes all entries (used on mutations to invalidate).
 *
 * This ensures the server process memory usage stays bounded regardless
 * of how many unique query parameter combinations are requested.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class BoundedCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  /**
   * @param maxSize  Maximum number of entries before LRU eviction (default: 100)
   * @param ttlMs   Time-to-live per entry in milliseconds (default: 20000 = 20s)
   */
  constructor(maxSize: number = 100, ttlMs: number = 20000) {
    this.cache = new Map();
    this.maxSize = Math.max(1, maxSize);
    this.ttlMs = ttlMs;
  }

  /**
   * Get a cached value by key. Returns undefined if missing or expired.
   * Expired entries are automatically pruned on access.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL expiry
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Store a value in the cache. If the cache is at max capacity,
   * the oldest (first-inserted) entry is evicted.
   */
  set(key: string, data: T): void {
    // If key already exists, delete it first so it moves to the end (most recent)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      // Map iteration order is insertion order — first key is the oldest
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear all cached entries. Called on data mutations (POST/PATCH/DELETE)
   * to ensure stale data is never served.
   */
  clear(): void {
    this.cache.clear();
  }

  /** Current number of entries (for diagnostics). */
  get size(): number {
    return this.cache.size;
  }
}
