export type Session = { id: string; name: string; startDate: string | Date; endDate: string | Date; isCurrent: boolean };
export type Enrollment = { studentId: string; classId: string; rollNumber?: string | null };
export type PromotionDecision = { studentId: string; decision: 'PROMOTE' | 'REPEAT' | 'LEFT'; classId?: string };

export class SessionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function assertSessionIntent(expectedId: unknown, currentId: string | undefined) {
  if (!currentId || expectedId !== currentId) throw new SessionError('Academic session changed or the edit form is outdated. Reopen the student profile before saving.', 409);
}

export function requireCurrentAttendanceDate(session: Pick<Session, 'id' | 'startDate' | 'endDate'> | null, date: unknown) {
  const day = typeof date === 'string' ? date.split('T')[0] : '';
  const time = Date.parse(`${day}T00:00:00.000Z`);
  if (!session || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== day || time < new Date(session.startDate).getTime() || time > new Date(session.endDate).getTime()) {
    throw new SessionError('Choose an attendance date within the current academic session. Historical records were preserved.', 409);
  }
  return session.id;
}

export function validateSession(value: { name: string; startDate: string | Date; endDate: string | Date }) {
  if (typeof value.name !== 'string' || !/^20\d{2}-20\d{2}$/.test(value.name)) throw new SessionError('Use a session name such as 2027-2028.');
  const [start, end] = value.name.split('-').map(Number);
  const startDate = new Date(value.startDate);
  const endDate = new Date(value.endDate);
  if (end !== start + 1 || !Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) ||
    startDate.toISOString().slice(0, 10) !== `${start}-04-01` || endDate.toISOString().slice(0, 10) !== `${end}-03-31`) {
    throw new SessionError('Session dates must run from 1 April to 31 March of the next year.');
  }
  return { name: value.name, startDate, endDate };
}

export function requireFutureSession(source: Session, target: Session) {
  if (!source.isCurrent || target.isCurrent || target.id === source.id || new Date(target.startDate) <= new Date(source.endDate) || new Date(target.startDate).getUTCFullYear() !== new Date(source.endDate).getUTCFullYear()) {
    throw new SessionError('Choose the next future session immediately after the current session.', 409);
  }
}

export type PromotionInput = {
  source: Session; target: Session; sourceEnrollments: Enrollment[]; targetEnrollments: Enrollment[];
  exitStudentIds: string[]; activeStudentIds: string[]; classIds: string[]; decisions: PromotionDecision[];
};

export function planPromotion(input: PromotionInput) {
  requireFutureSession(input.source, input.target);
  if (!Array.isArray(input.decisions) || input.decisions.length < 1 || input.decisions.length > 100) throw new SessionError('Select between 1 and 100 students.');
  const seen = new Set<string>();
  const source = new Map(input.sourceEnrollments.map(e => [e.studentId, e]));
  const target = new Map(input.targetEnrollments.map(e => [e.studentId, e]));
  const exits = new Set(input.exitStudentIds);
  const active = new Set(input.activeStudentIds);
  const classIds = new Set(input.classIds);
  const enrollments: (Enrollment & { sessionId: string })[] = [];
  const leaving: string[] = [];
  let skipped = 0;
  for (const d of input.decisions) {
    if (!d || typeof d.studentId !== 'string' || !d.studentId || !['PROMOTE', 'REPEAT', 'LEFT'].includes(d.decision)) throw new SessionError('Invalid promotion decision.');
    if (seen.has(d.studentId)) throw new SessionError('Duplicate student in this batch.');
    seen.add(d.studentId);
    const from = source.get(d.studentId);
    if (!from || !active.has(d.studentId)) throw new SessionError('Current-session enrollment is missing or the student is no longer active. Review existing data first.', 409);
    if (d.decision === 'LEFT') {
      if (target.has(d.studentId)) throw new SessionError('Student already has a prepared enrollment. Review it before marking left.', 409);
      if (exits.has(d.studentId)) { skipped++; continue; }
      leaving.push(d.studentId);
      continue;
    }
    if (exits.has(d.studentId)) throw new SessionError('Student already has a left/passed-out decision.', 409);
    const classId = d.decision === 'REPEAT' ? from.classId : d.classId;
    if (!classId || !classIds.has(classId)) throw new SessionError('Select an active target class.');
    if (d.decision === 'PROMOTE' && classId === from.classId) throw new SessionError('Use Repeat to keep a student in the same class.');
    const existing = target.get(d.studentId);
    if (existing) {
      if (existing.classId !== classId) throw new SessionError('Student already has a different target enrollment. No record was overwritten.', 409);
      skipped++;
      continue;
    }
    enrollments.push({ studentId: d.studentId, classId, sessionId: input.target.id, rollNumber: null });
  }
  return { enrollments, exits: leaving, skipped };
}

export function planActivation(input: { sourceStudentIds: string[]; activeStudentIds: string[]; enrollments: Enrollment[]; exitStudentIds: string[] }) {
  const enrolled = new Map(input.enrollments.map(e => [e.studentId, e]));
  const source = new Set(input.sourceStudentIds);
  const exits = new Set(input.exitStudentIds);
  if (input.activeStudentIds.some(id => !source.has(id))) throw new SessionError('Current-session enrollments are missing. Complete the reviewed baseline correction first.', 409);
  if (input.activeStudentIds.some(id => !enrolled.has(id) && !exits.has(id))) throw new SessionError('Promotion decisions are still pending for some active students.', 409);
  if ([...exits].some(id => enrolled.has(id))) throw new SessionError('Conflicting enrollment and left decisions found.', 409);
  return { classes: input.enrollments, exits: input.exitStudentIds };
}
