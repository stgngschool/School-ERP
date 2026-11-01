import { test } from 'node:test';
import assert from 'node:assert/strict';

test('admission collision rolls back newly created parent, user and class', async () => {
  process.env.JWT_SECRET = 'offline-admission-regression-key';
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
  const { default: db } = await import('../src/lib/db');
  const { signToken, invalidateUserAuthCache } = await import('../src/lib/auth');
  const { POST } = await import('../src/app/api/admissions/[id]/approve/route');
  const original = { user: db.user.findUnique, application: db.admissionApplication.findUnique, transaction: db.$transaction };
  const application = { id: 'application', status: 'PENDING', enrolledStudentId: null, classApplied: 'Class 9', fatherName: 'Parent', fatherMobile: '9876543210' };
  let state: string[] = []; let attemptedWrites = 0;
  const create = (label: string, result: object) => async () => { attemptedWrites++; state.push(label); return result; };
  const tx = {
    $queryRaw: async () => [], $queryRawUnsafe: async () => [{ value: 1 }],
    admissionApplication: { findUnique: async () => application },
    academicSession: { findFirst: async () => ({ id: 'session', name: '2026-2027' }) },
    class: { findFirst: async () => null, create: create('class', { id: 'class' }) },
    user: { findUnique: async () => null, create: create('user', { id: 'parent-user' }) },
    parentProfile: { findMany: async () => [], create: create('parent', { id: 'parent', user: { name: 'Parent' } }) },
    student: { findUnique: async () => ({ id: 'existing-student' }) },
  };
  db.user.findUnique = (async () => ({ status: 'ACTIVE', tokenVersion: 1 })) as never;
  db.admissionApplication.findUnique = (async () => application) as never;
  db.$transaction = (async (callback: (client: typeof tx) => Promise<unknown>) => {
    const before = [...state];
    try { return await callback(tx); } catch (error) { state = before; throw error; }
  }) as never;
  try {
    invalidateUserAuthCache();
    const response = await POST(new Request('http://localhost/api/admissions/application/approve', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${signToken({ userId: 'admin', username: 'admin', role: 'ADMIN', tokenVersion: 1 })}` },
      body: JSON.stringify({ customAdmissionNo: 'ALREADY-TAKEN' }),
    }), { params: Promise.resolve({ id: 'application' }) });
    assert.equal(response.status, 400);
    assert.equal(attemptedWrites, 3);
    assert.deepEqual(state, []);
  } finally {
    db.user.findUnique = original.user; db.admissionApplication.findUnique = original.application; db.$transaction = original.transaction;
    invalidateUserAuthCache();
  }
});
