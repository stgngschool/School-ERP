import { BoundedCache } from "./BoundedCache";
import db from "@/lib/db";

// In-memory cache for SchoolConfig singleton row (60 seconds TTL)
// Avoids 40,000+ repetitive Postgres hits across API endpoints.
const schoolConfigCache = new BoundedCache<Record<string, unknown> | null>(5, 60 * 1000);

export async function getCachedSchoolConfig() {
  const cached = schoolConfigCache.get("singleton");
  if (cached) {
    return cached;
  }

  try {
    const row = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
    if (row) {
      schoolConfigCache.set("singleton", row);
    }
    return row;
  } catch (err) {
    console.error("[SchoolConfigCache] Error fetching schoolConfig:", err);
    return null;
  }
}

export function clearSchoolConfigCache() {
  schoolConfigCache.clear();
}
