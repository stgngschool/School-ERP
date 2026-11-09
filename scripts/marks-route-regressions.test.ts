import * as crypto from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isAbsentRemark } from '../src/lib/marksAbsence';
import { sessionClassFilter } from '../src/lib/sessionClassFilter';

type MarkWrite = { update: { marksObtained: number; breakdown: unknown; remarks: string } };
type Route = { POST: (request: Request) => Promise<Response>; GET: (request: Request) => Promise<Response> };

// Only these in-memory dependencies can load: no database or network modules.
function loadRoute(path: string, db: object) {
  const dbNull = Symbol('DbNull');
  const dependencies: Record<string, unknown> = {
    'node:crypto': crypto,
    'next/server': { NextResponse: { json: Response.json } },
    '@prisma/client': { Prisma: { DbNull: dbNull } },
    '@/lib/db': { default: db },
    '@/lib/auth': { getAuthUser: async () => ({ userId: 'admin', role: 'ADMIN' }) },
    '@/lib/cache/schoolConfigCache': { getCachedSchoolConfig: async () => ({ data: {} }) },
    '@/lib/cache/sessionCache': { getCachedActiveSession: async () => ({ id: 'session' }) },
    '@/lib/marksAbsence': { isAbsentRemark },
    '@/lib/sessionClassFilter': { sessionClassFilter },
  };
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {} as Route;
  vm.runInNewContext(code, { exports, URL, Response, console, require: (id: string) => {
    if (!(id in dependencies)) throw new Error(`Blocked dependency: ${id}`);
    return dependencies[id];
  } });
  return { exports, dbNull };
}

test('total-only saves clear the previous split breakdown instead of leaving stale components', async () => {
  let saved: MarkWrite | undefined;
  const { exports, dbNull } = loadRoute('src/app/api/marks/bulk/route.ts', {
    mark: { upsert: (args: MarkWrite) => { saved = args; return Promise.resolve(args); } },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  });
  const response = await exports.POST(new Request('http://localhost/api/marks/bulk', {
    method: 'POST', body: JSON.stringify({ sessionId: 'session', examName: 'Annual', subject: 'ENGLISH', maxMarks: 100,
      marksList: [{ studentId: 'student', marksObtained: 55, breakdown: null }] }),
  }));
  assert.equal(response.status, 200);
  assert.ok(saved);
  assert.equal(saved.update.marksObtained, 55);
  assert.equal(saved.update.breakdown, dbNull);
});

test('explicit absence still writes a recognized marker when free text already mentions absent', async () => {
  let saved: MarkWrite | undefined;
  const { exports } = loadRoute('src/app/api/marks/bulk/route.ts', {
    mark: { upsert: (args: MarkWrite) => { saved = args; return Promise.resolve(args); } },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  });
  const response = await exports.POST(new Request('http://localhost/api/marks/bulk', {
    method: 'POST', body: JSON.stringify({ sessionId: 'session', examName: 'Annual', subject: 'ENGLISH',
      marksList: [{ studentId: 'student', marksObtained: 0, isAbsent: true, remarks: 'Was absent last year' }] }),
  }));
  assert.equal(response.status, 200);
  assert.ok(saved);
  assert.equal(saved.update.remarks, 'Was absent last year (ABSENT)');
  assert.ok(isAbsentRemark(saved.update.remarks));
});

test('class marks return the absence remark alongside a zero score', async () => {
  const mark = { studentId: 'student', subject: 'ENGLISH', examName: 'Annual', marksObtained: 0, remarks: 'ABSENT' };
  const { exports } = loadRoute('src/app/api/marks/class/route.ts', {
    academicSession: { findUnique: async () => ({ id: 'session', isCurrent: true }) },
    mark: { findMany: async ({ select }: { select: Record<string, boolean> }) => [Object.fromEntries(Object.entries(mark).filter(([key]) => select[key]))] },
  });
  const response = await exports.GET(new Request('http://localhost/api/marks/class?class=1&section=A&sessionId=session'));
  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].remarks, 'ABSENT');
});

test('single marksheet queries only the selected student in the requested session', async () => {
  let filter: { studentId?: string; sessionId?: string } | undefined;
  const { exports } = loadRoute('src/app/api/marks/class/route.ts', {
    academicSession: { findUnique: async () => ({ id: 'session', isCurrent: true }) },
    mark: { findMany: async ({ where }: { where: typeof filter }) => { filter = where; return []; } },
  });
  const response = await exports.GET(new Request('http://localhost/api/marks/class?class=UKG&section=A&sessionId=session&studentId=selected'));
  assert.equal(response.status, 200);
  assert.equal(filter?.studentId, 'selected');
  assert.equal(filter?.sessionId, 'session');
});

test('marksheet revalidation skips the full read until a mark changes or is removed', async () => {
  let rows = [{ id: 'mark', studentId: 'student', updatedAt: new Date('2026-11-09'), marksObtained: 70 }];
  let fullReads = 0;
  const { exports } = loadRoute('src/app/api/marks/class/route.ts', {
    academicSession: { findUnique: async () => ({ id: 'session', isCurrent: true }) },
    mark: { findMany: async ({ select }: { select: Record<string, boolean> }) => {
      if (select.marksObtained) fullReads++;
      return rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => select[key])));
    } },
  });
  const url = 'http://localhost/api/marks/class?class=UKG&section=A&sessionId=session&studentId=student&versioned=1';
  const first = await exports.GET(new Request(url));
  const { version } = await first.json();
  const check = (token: string) => exports.GET(new Request(url, { headers: { 'If-None-Match': token } }));
  assert.equal((await check(version)).status, 304);
  assert.equal(fullReads, 1);
  rows = [{ ...rows[0], marksObtained: 85, updatedAt: new Date('2026-11-10') }];
  const updated = await (await check(version)).json();
  assert.equal(updated.marks[0].marksObtained, 85);
  rows = [];
  const deleted = await (await check(updated.version)).json();
  assert.deepEqual(deleted.marks, []);
  assert.equal(fullReads, 3);
});

test('class snapshots supply reusable tokens for individual and empty marksheets', async () => {
  const rows = [
    { id: 'm1', studentId: 's1', updatedAt: new Date('2026-11-09'), marksObtained: 70 },
    { id: 'm2', studentId: 's2', updatedAt: new Date('2026-11-09'), marksObtained: 80 },
  ];
  const { exports } = loadRoute('src/app/api/marks/class/route.ts', {
    academicSession: { findUnique: async () => ({ id: 'session', isCurrent: true }) },
    mark: { findMany: async ({ where }: { where: { studentId?: string } }) =>
      rows.filter(row => !where.studentId || row.studentId === where.studentId) },
  });
  const url = 'http://localhost/api/marks/class?class=UKG&section=A&sessionId=session&versioned=1';
  const batch = await (await exports.GET(new Request(url))).json();
  const check = (studentId: string, token: string) => exports.GET(new Request(url + studentId, {
    headers: { 'If-None-Match': token },
  }));
  assert.equal((await check('', batch.version)).status, 304);
  assert.equal((await check('&studentId=s1', batch.studentVersions.s1)).status, 304);
  assert.equal((await check('&studentId=missing', batch.emptyVersion)).status, 304);
});
