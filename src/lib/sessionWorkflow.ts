import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { SessionError, planActivation, planPromotion, requireFutureSession, validateSession, type PromotionDecision } from './sessionPolicy';
import { feeStructureName, feeStructureYear, selectSessionStructures } from './sessionFees';

type Tx = Prisma.TransactionClient;
export type PromotionRequest = { sourceSessionId: string; nextSessionId: string; sourceClassId: string; decisions: PromotionDecision[]; previewToken?: string };

// Shared by all school-session/financial writers. Use READ COMMITTED with this
// mutex: a Serializable snapshot established before waiting can miss the prior
// lock holder's newly committed receipts/enrollments. Reads after the lock must
// see those commits.
export async function lockSessionWorkflow(tx: Tx) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(7281028)::text`;
}
function token(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
async function exitsFor(tx: Tx, sessionId: string) {
  const records = await tx.auditLog.findMany({ where: { entityType: 'SessionExit', entityId: sessionId, action: 'SESSION_EXIT_PREPARED' }, select: { newValues: true } });
  return records.map(r => {
    const value = JSON.parse(r.newValues || '{}') as { studentId?: string };
    if (!value.studentId) throw new SessionError('An exit decision needs review.', 409);
    return value.studentId;
  });
}

export async function createAcademicSession(db: PrismaClient, userId: string, body: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) {
  const data = validateSession(body);
  if (body.isCurrent) throw new SessionError('Create the session first, then prepare and activate it separately.');
  return db.$transaction(async tx => {
    await lockSessionWorkflow(tx);
    if (await tx.academicSession.findUnique({ where: { name: data.name } })) throw new SessionError('This academic session already exists.', 409);
    const session = await tx.academicSession.create({ data: { ...data, isCurrent: false } });
    await tx.auditLog.create({ data: { userId, action: 'SESSION_CREATED', entityType: 'AcademicSession', entityId: session.id, newValues: JSON.stringify({ name: session.name }) } });
    return session;
  }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
}

async function promotionState(tx: Tx, body: PromotionRequest) {
  if (!body.sourceSessionId || !body.nextSessionId || !body.sourceClassId || !Array.isArray(body.decisions) || body.decisions.length < 1 || body.decisions.length > 100) throw new SessionError('Choose source class, target session and up to 100 students.');
  if (body.decisions.some(d => !d || typeof d.studentId !== 'string')) throw new SessionError('Invalid student selection.');
  const ids = body.decisions.map(d => d.studentId);
  const [source, target, from, to, active, classes, exits] = await Promise.all([
    tx.academicSession.findUnique({ where: { id: body.sourceSessionId } }),
    tx.academicSession.findUnique({ where: { id: body.nextSessionId } }),
    tx.studentSession.findMany({ where: { sessionId: body.sourceSessionId, classId: body.sourceClassId, studentId: { in: ids } }, select: { studentId: true, classId: true, rollNumber: true }, orderBy: { studentId: 'asc' } }),
    tx.studentSession.findMany({ where: { sessionId: body.nextSessionId, studentId: { in: ids } }, select: { studentId: true, classId: true, rollNumber: true }, orderBy: { studentId: 'asc' } }),
    tx.student.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, select: { id: true }, orderBy: { id: 'asc' } }),
    tx.class.findMany({ where: { status: 'ACTIVE' }, select: { id: true }, orderBy: { id: 'asc' } }),
    exitsFor(tx, body.nextSessionId),
  ]);
  if (!source || !target) throw new SessionError('Academic session not found.', 404);
  const input = { source, target, sourceEnrollments: from, targetEnrollments: to, activeStudentIds: active.map(s => s.id), classIds: classes.map(c => c.id), exitStudentIds: exits.sort(), decisions: body.decisions };
  return { plan: planPromotion(input), previewToken: token(input) };
}

export async function preparePromotion(db: PrismaClient, userId: string, body: PromotionRequest, save = false) {
  return db.$transaction(async tx => {
    if (save) await lockSessionWorkflow(tx);
    const state = await promotionState(tx, body);
    if (!save) return { ...state.plan, previewToken: state.previewToken };
    // Repeating the exact save is safe even if its earlier token no longer matches.
    const hasWrites = state.plan.enrollments.length > 0 || state.plan.exits.length > 0;
    if (hasWrites && (!body.previewToken || body.previewToken !== state.previewToken)) throw new SessionError('Preview has changed. Review the students again before saving.', 409);
    if (state.plan.enrollments.length) await tx.studentSession.createMany({ data: state.plan.enrollments });
    if (hasWrites) {
      await tx.auditLog.createMany({ data: [
        ...state.plan.exits.map(studentId => ({ userId, action: 'SESSION_EXIT_PREPARED', entityType: 'SessionExit', entityId: body.nextSessionId, newValues: JSON.stringify({ studentId, sourceSessionId: body.sourceSessionId }) })),
        { userId, action: 'PROMOTION_PREPARED', entityType: 'AcademicSession', entityId: body.nextSessionId, newValues: JSON.stringify({ sourceSessionId: body.sourceSessionId, decisions: body.decisions }) },
      ] });
    }
    return { prepared: state.plan.enrollments.length, left: state.plan.exits.length, skipped: state.plan.skipped };
  }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
}

async function activationState(tx: Tx, id: string) {
  const currents = await tx.academicSession.findMany({ where: { isCurrent: true } });
  if (currents.length !== 1) throw new SessionError('Exactly one current session is required. Review session setup first.', 409);
  const source = currents[0];
  const target = await tx.academicSession.findUnique({ where: { id } });
  if (!target) throw new SessionError('Target session not found.', 404);
  requireFutureSession(source, target);
  const [from, to, active, exits, structures] = await Promise.all([
    tx.studentSession.findMany({ where: { sessionId: source.id }, select: { studentId: true }, orderBy: { studentId: 'asc' } }),
    tx.studentSession.findMany({ where: { sessionId: id }, select: { studentId: true, classId: true, rollNumber: true, class: { select: { name: true, status: true } }, student: { select: { status: true } } }, orderBy: { studentId: 'asc' } }),
    tx.student.findMany({ where: { status: 'ACTIVE' }, select: { id: true }, orderBy: { id: 'asc' } }),
    exitsFor(tx, id),
    tx.feeStructure.findMany({ select: { id: true, name: true, className: true, items: { select: { amount: true, feeHeadId: true } } }, orderBy: { id: 'asc' } }),
  ]);
  if (to.some(e => e.class.status !== 'ACTIVE' || e.student.status !== 'ACTIVE')) throw new SessionError('A target class or student is no longer active. Review the prepared enrollments.', 409);
  const plan = planActivation({ sourceStudentIds: from.map(e => e.studentId), activeStudentIds: active.map(s => s.id), enrollments: to, exitStudentIds: exits });
  const targetStructures = selectSessionStructures(structures, target.name, source.name);
  const feeClasses = new Set(targetStructures.filter(s => s.items.length).map(s => s.className));
  if (to.some(e => !feeClasses.has('All') && !feeClasses.has(e.class.name))) throw new SessionError('Prepare a fee structure for every target class before activation.', 409);
  return { source, target, plan, structures, previewToken: token({ source, target, from, to, active, exits: exits.sort(), targetStructures }) };
}

export async function activateAcademicSession(db: PrismaClient, userId: string, body: { id: string; previewToken?: string }, save = false) {
  return db.$transaction(async tx => {
    if (save) await lockSessionWorkflow(tx);
    const state = await activationState(tx, body.id);
    if (!save) return { previewToken: state.previewToken, students: state.plan.classes.length, left: state.plan.exits.length, from: state.source.name, to: state.target.name };
    if (body.previewToken !== state.previewToken) throw new SessionError('Activation preview changed. Review it again.', 409);
    // Bind legacy templates to their outgoing session without changing IDs, rates or assignments.
    for (const s of state.structures.filter(s => !feeStructureYear(s.name))) {
      const name = feeStructureName(state.source.name, s.name);
      if (state.structures.some(other => other.id !== s.id && other.name === name && other.className === s.className)) throw new SessionError('Duplicate outgoing fee templates need review before activation.', 409);
      await tx.feeStructure.update({ where: { id: s.id }, data: { name } });
    }
    // Group updates by class and roll to avoid one write per student where possible.
    const groups = new Map<string, { classId: string; rollNumber: string | null; ids: string[] }>();
    for (const e of state.plan.classes) {
      const key = JSON.stringify([e.classId, e.rollNumber ?? null]);
      if (!groups.has(key)) groups.set(key, { classId: e.classId, rollNumber: e.rollNumber ?? null, ids: [] });
      groups.get(key)!.ids.push(e.studentId);
    }
    for (const g of groups.values()) await tx.student.updateMany({ where: { id: { in: g.ids } }, data: { classId: g.classId, rollNumber: g.rollNumber } });
    if (state.plan.exits.length) await tx.student.updateMany({ where: { id: { in: state.plan.exits } }, data: { status: 'LEFT' } });
    await tx.academicSession.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    const session = await tx.academicSession.update({ where: { id: state.target.id }, data: { isCurrent: true } });
    await tx.auditLog.create({ data: { userId, action: 'SESSION_ACTIVATED', entityType: 'AcademicSession', entityId: session.id, newValues: JSON.stringify({ sourceSessionId: state.source.id, students: state.plan.classes.length, left: state.plan.exits.length }) } });
    return { session, students: state.plan.classes.length, left: state.plan.exits.length };
  }, { isolationLevel: 'ReadCommitted', timeout: 20000 });
}
