import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getCachedActiveSession } from '@/lib/cache/sessionCache';
import { BILLING_SUMMARY_TAG } from '@/lib/cache/billingCache';
import { dashboardBilling } from '@/lib/dashboardBilling';
import { getTodayIST } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';
// Cache only after authorization. Account-specific cashier data must never be
// shared across users; the day key also prevents yesterday's totals at midnight.
const report = unstable_cache(
  async (start: string, userId: string, _day: string) => dashboardBilling(db, new Date(start), userId),
  ['dashboard-billing-v1'], { tags: [BILLING_SUMMARY_TAG], revalidate: 60 },
);

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    if (!['ADMIN', 'ACCOUNTANT'].includes(user.role)) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    const session = await getCachedActiveSession();
    if (!session) return NextResponse.json({ error: 'An active session is required.' }, { status: 409 });
    return NextResponse.json({ report: await report(new Date(session.startDate).toISOString(), user.userId, getTodayIST()) },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard report failed:', error);
    return NextResponse.json({ error: 'Dashboard totals could not be loaded.' }, { status: 500 });
  }
}
