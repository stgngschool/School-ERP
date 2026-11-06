import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getCachedActiveSession } from '@/lib/cache/sessionCache';
import { BILLING_SUMMARY_TAG } from '@/lib/cache/billingCache';
import { dashboardBilling } from '@/lib/dashboardBilling';

export const dynamic = 'force-dynamic';
const cachedDashboard = unstable_cache(
  async (startDate: string, endDate: string, name: string, receiptCreator: string | null) =>
    dashboardBilling(db, { startDate, endDate, name }, receiptCreator),
  ['dashboard-billing-v1'], { revalidate: 45, tags: [BILLING_SUMMARY_TAG] },
);

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    if (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    const session = await getCachedActiveSession();
    if (!session) return NextResponse.json({ error: 'An active academic session is required.' }, { status: 409 });
    const dashboard = await cachedDashboard(new Date(session.startDate).toISOString(), new Date(session.endDate).toISOString(), session.name,
      user.role === 'ACCOUNTANT' ? user.userId : null);
    return NextResponse.json({ success: true, dashboard }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Billing dashboard failed:', error);
    return NextResponse.json({ error: 'Unable to load billing dashboard.' }, { status: 500 });
  }
}
