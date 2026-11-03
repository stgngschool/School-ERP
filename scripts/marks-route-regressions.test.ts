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
  vm.runInNewContext(code, { exports, URL, console, require: (id: string) => {
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
