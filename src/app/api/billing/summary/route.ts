import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import { getCachedActiveSession } from '@/lib/cache/sessionCache';
import { serverBillingSummaryCache, BILLING_SUMMARY_TAG } from '@/lib/cache/billingCache';
import { billingTotals } from '@/lib/billingTotals';
export const dynamic = 'force-dynamic';
const staffTotals = unstable_cache(async (startDate: string) => billingTotals(db, new Date(startDate)), ['billing-summary-session-v2'], { tags: [BILLING_SUMMARY_TAG], revalidate: 60 });
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const session = await getCachedActiveSession();
    if (!session) return NextResponse.json({ error: 'An active academic session is required.' }, { status: 409 });
    const staff = ['ADMIN', 'ACCOUNTANT'].includes(user.role);
    const key = `${session.id}:${user.role}:${user.userId}`;
    const cached = !staff ? serverBillingSummaryCache.get(key) : undefined;
    if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'private, max-age=30' } });
    let ids: string[] | undefined;
    if (user.role === 'TEACHER') {
      const profile = await db.teacherProfile.findUnique({ where: { userId: user.userId }, select: { classes: { where: { status: 'ACTIVE' }, select: { id: true } } } });
      ids = (await db.student.findMany({ where: { classId: { in: profile?.classes.map(c => c.id) || [] } }, select: { id: true } })).map(s => s.id);
    } else if (user.role === 'PARENT') {
      ids = (await db.student.findMany({ where: { parentProfile: { userId: user.userId } }, select: { id: true } })).map(s => s.id);
    } else if (!staff) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    const summary = staff ? await staffTotals(new Date(session.startDate).toISOString()) : await billingTotals(db, new Date(session.startDate), ids);
    const result = { success: true, academicYear: session.name, summary, includesPreviousDues: true };
    if (!staff) serverBillingSummaryCache.set(key, result);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (error) { console.error('Billing summary failed:', error); return NextResponse.json({ error: 'Unable to load billing summary.' }, { status: 500 }); }
}
