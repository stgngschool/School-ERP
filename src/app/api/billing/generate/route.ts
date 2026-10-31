import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateYearlyChargesBulk } from '@/lib/generateYearlyCharges';
import { getAuthUser } from '@/lib/auth';
import { validateCsrfOrigin } from '@/lib/security';
import { clearServerBillingCache } from '@/lib/cache/billingCache';
import { SessionError } from '@/lib/sessionPolicy';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!['ADMIN', 'ACCOUNTANT'].includes(user.role)) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  try {
    const body = await request.json();
    const session = body.sessionId ? await db.academicSession.findUnique({ where: { id: body.sessionId } }) : body.academicYear ? await db.academicSession.findUnique({ where: { name: body.academicYear } }) : await db.academicSession.findFirst({ where: { isCurrent: true } });
    if (!session) throw new SessionError('Select a valid academic session.', 404);
    const current = await db.academicSession.findFirst({ where: { isCurrent: true } });
    if (current && session.startDate < current.startDate) throw new SessionError("Historical fees are read-only.", 409);
    if (session.isCurrent) {
      const missing = await db.student.count({ where: { status: 'ACTIVE', ...(body.studentId ? { id: body.studentId } : {}), studentSessions: { none: { sessionId: session.id } } } });
      if (missing) throw new SessionError('Current-session enrollments are missing. Complete the reviewed baseline correction before generating fees.', 409);
    }
    const rows = await db.studentSession.findMany({
      where: { sessionId: session.id, ...(body.studentId ? { studentId: body.studentId } : {}), ...(body.classId ? { classId: body.classId } : {}), ...(body.className && body.className !== "All" ? { class: { name: body.className } } : {}), student: { status: 'ACTIVE' } },
      orderBy: { id: 'asc' }, take: 101, ...(body.cursor ? { cursor: { id: body.cursor }, skip: 1 } : {}),
      select: { id: true, studentId: true, class: { select: { name: true } }, student: { select: { admissionDate: true } } },
    });
    const batch = rows.slice(0, 100);
    const result = batch.length ? await generateYearlyChargesBulk(batch.map(e => ({ id: e.studentId, class: e.class, admissionDate: e.student.admissionDate })), user.userId, session.name, body.targetFeeHeadName) : { generated: 0, skipped: 0, failed: 0, errors: [] };
    clearServerBillingCache();
    return NextResponse.json({ success: true, sessionId: session.id, academicYear: session.name, totalGenerated: result.generated, totalSkipped: result.skipped, totalFailed: result.failed ?? 0, studentCount: batch.length, nextCursor: rows.length > 100 ? batch[batch.length - 1].id : null, message: 'Fee batch completed. Existing paid entries were preserved.' });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
    console.error('Fee generation failed:', error);
    return NextResponse.json({ error: 'Fee batch was not saved. Refresh and retry; completed earlier batches are preserved.' }, { status: 409 });
  }
}
