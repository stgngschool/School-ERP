import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { validateCsrfOrigin } from '@/lib/security';
import { SessionError } from '@/lib/sessionPolicy';
import { createAcademicSession, activateAcademicSession } from '@/lib/sessionWorkflow';
import { clearActiveSessionCache } from '@/lib/cache/sessionCache';
import { clearServerStudentsCache } from '@/lib/cache/studentsCache';
import { clearServerBillingCache } from '@/lib/cache/billingCache';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (!await getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const sessions = await db.academicSession.findMany({ orderBy: { startDate: 'desc' } });
    return NextResponse.json(sessions, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch { return NextResponse.json({ error: 'Unable to load academic sessions.' }, { status: 500 }); }
}
export async function POST(request: Request) { return mutate(request, false); }
export async function PATCH(request: Request) { return mutate(request, true); }
async function mutate(request: Request, activating: boolean) {
  if (!validateCsrfOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const body = await request.json();
    if (activating) {
      if (!body.id || body.isCurrent !== true || !['preview', 'activate'].includes(body.action)) throw new SessionError('Use the activation preview to switch the current session.');
      const result = await activateAcademicSession(db, user.userId, body, body.action === 'activate');
      if (body.action === 'activate') {
        clearActiveSessionCache(); clearServerStudentsCache(); clearServerBillingCache();
      }
      return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const session = await createAcademicSession(db, user.userId, body);
    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
    console.error('Session operation failed:', error);
    return NextResponse.json({ error: 'Session could not be saved. Refresh and try again; no partial switch was applied.' }, { status: 409 });
  }
}
