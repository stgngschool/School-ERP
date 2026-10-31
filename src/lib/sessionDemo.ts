import { planActivation, planPromotion, validateSession, type PromotionDecision, type Session, type Enrollment } from './sessionPolicy';

// Client-only synthetic workspace. No imports from auth, storage, Prisma or API clients.
export function makeSessionDemo() {
  const sessions: Session[] = [
    { id: 'demo-current', name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31', isCurrent: true },
    { id: 'demo-next', name: '2027-2028', startDate: '2027-04-01', endDate: '2028-03-31', isCurrent: false },
  ];
  const classes = [{ id: 'demo-4', name: '4', section: 'A' }, { id: 'demo-5', name: '5', section: 'A' }];
  const students = ['Aarav Demo', 'Diya Demo', 'Kabir Demo', 'Meera Demo', 'Rohan Demo', 'Zoya Demo'].map((name, index) => ({ id: `demo-${index}`, name, admissionNumber: `DEMO-${index + 1}`, active: true }));
  const enrollments: (Enrollment & { sessionId: string })[] = students.map((s, i) => ({ studentId: s.id, classId: 'demo-4', sessionId: 'demo-current', rollNumber: String(i + 1) }));
  const exits = new Map<string, string[]>();
  const fees = new Map<string, { name: string; className: string; frequency: string; items: { headName: string; amount: number }[] }[]>();
  fees.set('demo-current', classes.map(c => ({ name: `Class ${c.name} Fee Structure`, className: c.name, frequency: 'monthly', items: [{ headName: 'Tuition Fee', amount: c.name === '4' ? 800 : 900 }, { headName: 'Annual Fee', amount: 1000 }] })));
  let version = 0;
  const billed = new Set<string>();
  return async (path: string, init?: RequestInit): Promise<unknown> => {
    const url = new URL(path, 'http://demo.local');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const current = sessions.find(s => s.isCurrent)!;
    const stamp = `demo-preview-${version}`;
    if (url.pathname === '/api/promotion' && (!init?.method || init.method === 'GET')) {
      const targetId = url.searchParams.get('targetSessionId') || '';
      const classId = url.searchParams.get('classId');
      const rows = enrollments.filter(e => e.sessionId === current.id && e.classId === classId && students.find(s => s.id === e.studentId)?.active);
      return { sessions: structuredClone(sessions), classes, currentSessionId: current.id, missingEnrollments: 0, activeCount: students.filter(s => s.active).length, page: 1, total: rows.length, hasMore: false,
        roster: rows.map(e => ({ id: e.studentId, name: students.find(s => s.id === e.studentId)!.name, admissionNumber: students.find(s => s.id === e.studentId)!.admissionNumber, rollNumber: e.rollNumber, classId: e.classId, preparedClassId: enrollments.find(t => t.sessionId === targetId && t.studentId === e.studentId)?.classId, preparedLeft: exits.get(targetId)?.includes(e.studentId) ?? false })),
      };
    }
    if (url.pathname === '/api/sessions' && init?.method === 'POST') {
      const valid = validateSession(body);
      if (sessions.some(s => s.name === valid.name)) throw new Error('This session already exists.');
      sessions.push({ ...valid, id: `demo-session-${sessions.length}`, isCurrent: false }); version++;
      return { success: true };
    }
    if (url.pathname === '/api/promotion' && init?.method === 'POST') {
      const target = sessions.find(s => s.id === body.nextSessionId);
      if (!target) throw new Error('Choose a target session.');
      const plan = planPromotion({ source: current, target, sourceEnrollments: enrollments.filter(e => e.sessionId === current.id && e.classId === body.sourceClassId), targetEnrollments: enrollments.filter(e => e.sessionId === target.id), activeStudentIds: students.filter(s => s.active).map(s => s.id), exitStudentIds: exits.get(target.id) || [], classIds: classes.map(c => c.id), decisions: body.decisions as PromotionDecision[] });
      if (body.action === 'preview') return { ...plan, previewToken: stamp };
      if ((plan.enrollments.length || plan.exits.length) && body.previewToken !== stamp) throw new Error('Preview changed. Review again.');
      enrollments.push(...plan.enrollments); exits.set(target.id, [...(exits.get(target.id) || []), ...plan.exits]); version++;
      return { prepared: plan.enrollments.length, left: plan.exits.length, skipped: plan.skipped };
    }
    if (url.pathname === '/api/fee-config') {
      const id = url.searchParams.get('sessionId') || body.sessionId || current.id;
      const session = sessions.find(s => s.id === id);
      if (!session) throw new Error('Session not found.');
      if (init?.method === 'POST') {
        if (body.action === 'COPY_SESSION') {
          if (fees.get(id)?.length) throw new Error('Target already has fee templates.');
          fees.set(id, structuredClone(fees.get(current.id) || []));
        } else {
          const rows = fees.get(id) || [];
          const updated = { name: body.name, className: body.className, frequency: body.frequency, items: body.items.map((i: { headName: string; amount: number }) => ({ ...i, amount: i.amount / 100 })) };
          const index = rows.findIndex(s => s.name === body.name && s.className === body.className);
          if (index < 0) rows.push(updated); else rows[index] = updated;
          fees.set(id, rows);
        }
        version++; return { success: true };
      }
      return { sessionId: id, sessionName: session.name, feeStructures: structuredClone(fees.get(id) || []) };
    }
    if (url.pathname === '/api/sessions' && init?.method === 'PATCH') {
      const target = sessions.find(s => s.id === body.id);
      if (!target) throw new Error('Choose a target session.');
      const plan = planActivation({ sourceStudentIds: enrollments.filter(e => e.sessionId === current.id).map(e => e.studentId), activeStudentIds: students.filter(s => s.active).map(s => s.id), enrollments: enrollments.filter(e => e.sessionId === target.id), exitStudentIds: exits.get(target.id) || [] });
      const covered = new Set((fees.get(target.id) || []).map(s => s.className));
      if (plan.classes.some(e => !covered.has(classes.find(c => c.id === e.classId)!.name))) throw new Error('Copy and review next-session fees before activation.');
      if (body.action === 'preview') return { previewToken: stamp, students: plan.classes.length, left: plan.exits.length, from: current.name, to: target.name };
      if (body.previewToken !== stamp) throw new Error('Preview changed. Review again.');
      current.isCurrent = false; target.isCurrent = true;
      for (const s of students) if (plan.exits.includes(s.id)) s.active = false;
      version++; return { success: true };
    }
    if (url.pathname === '/api/billing/generate') {
      const rows = enrollments.filter(e => e.sessionId === body.sessionId);
      let totalGenerated = 0;
      for (const r of rows) { const key = `${body.sessionId}:${r.studentId}`; if (!billed.has(key)) { billed.add(key); totalGenerated += 13; } }
      return { success: true, totalGenerated, totalSkipped: totalGenerated ? 0 : rows.length * 13, totalFailed: 0, nextCursor: null };
    }
    throw new Error('Unknown demo operation. No live API was called.');
  };
}
