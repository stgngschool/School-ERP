import { test } from 'node:test';
import assert from 'node:assert/strict';

test('homework POST rejects blocked/revoked teachers and unknown classes without writes', async () => {
  process.env.JWT_SECRET = 'offline-homework-regression-key';
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://offline-test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'offline-test-key';
  const { default: db } = await import('../src/lib/db');
  const { signToken, invalidateUserAuthCache } = await import('../src/lib/auth');
  const { POST } = await import('../src/app/api/homework/route');
  const original = { user: db.user.findUnique, teacher: db.teacherProfile.findFirst, class: db.class.findFirst, createClass: db.class.create, createHomework: db.homework.create };
  let status = 'BLOCKED'; let version = 1; let teacherReads = 0; let writes = 0;
  db.user.findUnique = (async () => ({ status, tokenVersion: version })) as never;
  db.teacherProfile.findFirst = (async () => { teacherReads++; return { id: 'teacher' }; }) as never;
  db.class.findFirst = (async () => null) as never;
  db.class.create = (async () => { writes++; throw new Error('unexpected class write'); }) as never;
  db.homework.create = (async () => { writes++; throw new Error('unexpected homework write'); }) as never;
  const request = () => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ classSection: 'Class 9-Z', subject: 'Maths', title: 'Work', description: 'Exercise', dueDate: '2026-11-02' })) data.set(key, value);
    return new Request('http://localhost/api/homework', { method: 'POST', headers: { authorization: `Bearer ${signToken({ userId: 'regression-teacher', username: 'teacher', role: 'TEACHER', tokenVersion: 1 })}` }, body: data });
  };
  try {
    invalidateUserAuthCache();
    assert.equal((await POST(request())).status, 401);
    status = 'ACTIVE'; version = 2; invalidateUserAuthCache();
    assert.equal((await POST(request())).status, 401);
    assert.equal(teacherReads, 0);
    version = 1; invalidateUserAuthCache();
    assert.equal((await POST(request())).status, 400);
    assert.equal(teacherReads, 1);
    assert.equal(writes, 0);
  } finally {
    db.user.findUnique = original.user; db.teacherProfile.findFirst = original.teacher; db.class.findFirst = original.class;
    db.class.create = original.createClass; db.homework.create = original.createHomework;
    invalidateUserAuthCache();
  }
});
