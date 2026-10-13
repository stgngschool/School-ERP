import { unstable_cache, revalidateTag } from "next/cache";
import db from "@/lib/db";

const ACTIVE_SESSION_TAG = "active-session";

const getCachedSession = unstable_cache(
  async () => {
    const session = await db.academicSession.findFirst({
      where: { isCurrent: true },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
    });
    return session ?? null;
  },
  ["active-session-current"],
  { tags: [ACTIVE_SESSION_TAG], revalidate: 300 } // 5 min TTL
);

export async function getCachedActiveSession() {
  return getCachedSession();
}

export function clearActiveSessionCache() {
  try {
    revalidateTag(ACTIVE_SESSION_TAG, { expire: 0 });
  } catch (err) {
    console.warn("[SessionCache] revalidateTag notice:", (err as Error)?.message);
  }
}
