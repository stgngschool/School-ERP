import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sessionClassFilter } from '@/lib/sessionClassFilter';
import { formatCanonicalDOBIso } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!['ADMIN', 'ACCOUNTANT', 'TEACHER'].includes(user.role)) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  try {
    const p = new URL(request.url).searchParams;
    const sessionId = p.get('sessionId'); const name = p.get('className'); const section = p.get('section') || '';
    if (!sessionId || !name) return NextResponse.json({ error: 'Select a session and class.' }, { status: 400 });
    const session = await db.academicSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    const clean = name.replace(/^class\s*/i, '').trim();
    const classWhere: Prisma.ClassWhereInput = { OR: [{ name: { equals: clean, mode: 'insensitive' } }, { name: { equals: `Class ${clean}`, mode: 'insensitive' } }], section: { equals: section, mode: 'insensitive' } };
    if (user.role === 'TEACHER') {
      const profile = await db.teacherProfile.findUnique({ where: { userId: user.userId }, select: { classes: { select: { id: true } } } });
      classWhere.id = { in: profile?.classes.map(c => c.id) || [] };
    }
    const rows = await db.student.findMany({
      where: sessionClassFilter(session.id, classWhere, session.isCurrent), take: 101, orderBy: { id: 'asc' },
      ...(p.get('cursor') ? { cursor: { id: p.get('cursor')! }, skip: 1 } : {}),
      select: { id: true, name: true, admissionNumber: true, rollNumber: true, gender: true, dob: true, fatherName: true, motherName: true, photoUrl: true, status: true, isMarksheetClaimed: true, class: { select: { name: true, section: true } }, studentSessions: { where: { sessionId }, select: { rollNumber: true, class: { select: { name: true, section: true } } } } },
    });
    const batch = rows.slice(0, 100);
    return NextResponse.json({ students: batch.map(s => {
      const enrollment = s.studentSessions[0];
      return { id: s.id, name: s.name, admissionNo: s.admissionNumber, rollNo: enrollment ? enrollment.rollNumber || '' : s.rollNumber || '', class: enrollment?.class.name || s.class.name, section: enrollment?.class.section || s.class.section, gender: s.gender || '', dob: formatCanonicalDOBIso(s.dob), fatherName: s.fatherName || '', motherName: s.motherName || '', photoUrl: s.photoUrl || '', status: s.status, isMarksheetClaimed: s.isMarksheetClaimed };
    }), nextCursor: rows.length > 100 ? batch[batch.length - 1].id : null }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (error) { console.error('Session roster failed:', error); return NextResponse.json({ error: 'Unable to load session roster.' }, { status: 500 }); }
}
