import { unstable_cache, revalidateTag } from "next/cache";
import db from "@/lib/db";

// ── EGRESS P2: SchoolConfig singleton cache.
// Replaces the per-container in-memory BoundedCache with Next.js' durable data cache
// (`unstable_cache`). This survives serverless cold starts and is shared across every
// invocation/instance, so the config is read from Postgres at most once per 60s fleet-wide
// (and immediately after a config mutation purges the tag) instead of on every API call.
//
// Note: `unstable_cache` is marked deprecated in Next 16 in favour of the `use cache`
// directive, but it remains fully supported and is the lowest-risk option here (enabling
// Cache Components / `use cache` is a global, app-wide switch we deliberately avoid).
const SCHOOL_CONFIG_TAG = "school-config";

const getSchoolConfigCached = unstable_cache(
  async () => {
    const row = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
    return row ?? null;
  },
  ["school-config-singleton"],
  { tags: [SCHOOL_CONFIG_TAG], revalidate: 60 }
);

export async function getCachedSchoolConfig() {
  return getSchoolConfigCached();
}

export function clearSchoolConfigCache() {
  // Purge the durable cache on config mutations (school settings / website media updates).
  // Two-arg form is required in Next 16; { expire: 0 } forces an immediate hard invalidation
  // (next read is a fresh DB hit) which is correct for an admin-triggered settings change.
  try {
    revalidateTag(SCHOOL_CONFIG_TAG, { expire: 0 });
  } catch (err) {
    console.warn("[SchoolConfigCache] revalidateTag notice:", (err as Error)?.message);
  }
}
