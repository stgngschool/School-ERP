import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { validateCsrfOrigin } from '@/lib/security';
import { preparePromotion } from '@/lib/sessionWorkflow';
import { SessionError } from '@/lib/sessionPolicy';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const params = new URL(request.url).searchParams;
    const classId = params.get('classId');
    const targetId = params.get('targetSessionId');
    const page = Math.floor(Math.max(1, Math.min(10000, Number(params.get('page')) || 1)));
    const [sessions, classes, activeCount] = await Promise.all([
      db.academicSession.findMany({ orderBy: { startDate: 'desc' } }),
      db.class.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, section: true }, orderBy: [{ name: 'asc' }, { section: 'asc' }] }),
      db.student.count({ where: { status: 'ACTIVE' } }),
    ]);
    const current = sessions.find(s => s.isCurrent);
    const count = current ? await db.studentSession.count({ where: { sessionId: current.id, student: { status: 'ACTIVE' } } }) : 0;
    const where = { sessionId: current?.id ?? '__none__', classId: classId ?? '__none__', student: { status: 'ACTIVE' } };
    const [enrollments, total] = classId && current ? await Promise.all([
      db.studentSession.findMany({ where, take: 100, skip: (page - 1) * 100, orderBy: { studentId: 'asc' }, select: { studentId: true, classId: true, rollNumber: true, student: { select: { name: true, admissionNumber: true } } } }),
      db.studentSession.count({ where }),
    ]) : [[], 0];
    const ids = enrollments.map(e => e.studentId);
    const [prepared, exits] = targetId && ids.length ? await Promise.all([
      db.studentSession.findMany({ where: { sessionId: targetId, studentId: { in: ids } }, select: { studentId: true, classId: true } }),
      db.auditLog.findMany({ where: { entityType: 'SessionExit', entityId: targetId, action: 'SESSION_EXIT_PREPARED' }, select: { newValues: true } }),
    ]) : [[], []];
    const exitIds = new Set(exits.map(e => (JSON.parse(e.newValues || '{}') as { studentId: string }).studentId));
    const preparedMap = new Map(prepared.map(e => [e.studentId, e.classId]));
    return NextResponse.json({ sessions, classes, currentSessionId: current?.id ?? '', missingEnrollments: activeCount - count, activeCount,
      roster: enrollments.map(e => ({ id: e.studentId, name: e.student.name, admissionNumber: e.student.admissionNumber, rollNumber: e.rollNumber, classId: e.classId, preparedClassId: preparedMap.get(e.studentId), preparedLeft: exitIds.has(e.studentId) })),
      page, total, hasMore: page * 100 < total,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Promotion roster failed:', error);
    return NextResponse.json({ error: 'Unable to load promotion setup.' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const body = await request.json();
    if (body.action !== 'preview' && body.action !== 'save') throw new SessionError('Preview the promotion before saving.');
    const result = await preparePromotion(db, user.userId, body, body.action === 'save');
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
    console.error('Promotion failed:', error);
    return NextResponse.json({ error: 'Promotion could not be saved. Refresh the preview and try again.' }, { status: 409 });
  }
}
