import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { fixtureDatabase } from './fixtures/sessionDatabase';
import { activateAcademicSession, createAcademicSession, preparePromotion } from '../src/lib/sessionWorkflow';

const body = { sourceSessionId: 's1', nextSessionId: 's2', sourceClassId: 'c4', decisions: [{ studentId: 'a', decision: 'PROMOTE' as const, classId: 'c5' }, { studentId: 'b', decision: 'LEFT' as const }] };
test('prepare/save/retry preserves current students and makes no ledger writes', async () => {
  const f = fixtureDatabase(); const db = f.db as unknown as PrismaClient; const before = f.snapshot();
  const preview = await preparePromotion(db, 'admin', body);
  assert.deepEqual(f.snapshot(), before);
  const saved = await preparePromotion(db, 'admin', { ...body, previewToken: 'previewToken' in preview ? preview.previewToken : '' }, true);
  assert.equal('prepared' in saved && saved.prepared, 1);
  assert.deepEqual(f.snapshot().student, before.student);
  const retry = await preparePromotion(db, 'admin', body, true);
  assert.equal('skipped' in retry && retry.skipped, 2);
  assert.equal(f.snapshot().studentSession.length, 3);
});
test('activation updates classes only after preparation; failure rolls back all changes', async () => {
  const f = fixtureDatabase(); const db = f.db as unknown as PrismaClient;
  await assert.rejects(activateAcademicSession(db, 'admin', { id: 's2' }), /pending/i);
  const p = await preparePromotion(db, 'admin', body);
  await preparePromotion(db, 'admin', { ...body, previewToken: 'previewToken' in p ? p.previewToken : '' }, true);
  const a = await activateAcademicSession(db, 'admin', { id: 's2' });
  const before = f.snapshot(); f.failActivation();
  await assert.rejects(activateAcademicSession(db, 'admin', { id: 's2', previewToken: 'previewToken' in a ? a.previewToken : '' }, true), /Simulated/);
  assert.deepEqual(f.snapshot(), before);
});
test('successful activation preserves outgoing enrollments and archives legacy fee scope', async () => {
  const f = fixtureDatabase(); const db = f.db as unknown as PrismaClient;
  const p = await preparePromotion(db, 'admin', body);
  await preparePromotion(db, 'admin', { ...body, previewToken: 'previewToken' in p ? p.previewToken : '' }, true);
  const a = await activateAcademicSession(db, 'admin', { id: 's2' });
  await activateAcademicSession(db, 'admin', { id: 's2', previewToken: 'previewToken' in a ? a.previewToken : '' }, true);
  const s = f.snapshot();
  assert.equal(s.student.find(r => r.id === 'a')?.classId, 'c5');
  assert.equal(s.student.find(r => r.id === 'b')?.status, 'LEFT');
  assert.equal(s.studentSession.find(r => r.id === 'e1')?.classId, 'c4');
  assert.equal(s.feeStructure[0].name, '[Session 2026-2027] Class 4 Fee Structure');
  assert.equal(s.academicSession.filter(r => r.isCurrent).length, 1);
});
test('stale previews cannot save and duplicate session creation preserves current flag', async () => {
  const f = fixtureDatabase(); const db = f.db as unknown as PrismaClient; const before = f.snapshot();
  await assert.rejects(preparePromotion(db, 'admin', { ...body, previewToken: 'stale' }, true), /Preview has changed/);
  await assert.rejects(createAcademicSession(db, 'admin', { name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31' }), /already exists/);
  assert.deepEqual(f.snapshot(), before);
});
