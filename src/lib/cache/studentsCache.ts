import { BoundedCache } from "./BoundedCache";

// Bounded LRU cache (max 30 entries, 5-minute TTL) for student lists
export const serverStudentsCache = new BoundedCache(30, 5 * 60 * 1000);

export function clearServerStudentsCache() {
  serverStudentsCache.clear();
}
