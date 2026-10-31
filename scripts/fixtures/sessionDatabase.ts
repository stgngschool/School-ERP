// In-memory Prisma boundary for workflow tests. No network or environment access.
type Row = Record<string, unknown>;
type Where = Record<string, unknown>;
function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return (value as Where[]).some(w => matches(row, w));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const f = value as Record<string, unknown>;
      if ('in' in f) return (f.in as unknown[]).includes(row[key]);
      if ('startsWith' in f) return String(row[key]).startsWith(String(f.startsWith));
      return matches((row[key] ?? {}) as Row, f);
    }
    return row[key] === value;
  });
}
export function fixtureDatabase() {
  let data: Record<string, Row[]> = {
    academicSession: [
      { id: 's1', name: '2026-2027', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
      { id: 's2', name: '2027-2028', startDate: new Date('2027-04-01'), endDate: new Date('2028-03-31'), isCurrent: false },
    ],
    student: [{ id: 'a', status: 'ACTIVE', classId: 'c4', rollNumber: '7' }, { id: 'b', status: 'ACTIVE', classId: 'c4', rollNumber: '8' }],
    class: [{ id: 'c4', name: '4', section: 'A', status: 'ACTIVE' }, { id: 'c5', name: '5', section: 'A', status: 'ACTIVE' }],
    studentSession: [{ id: 'e1', studentId: 'a', sessionId: 's1', classId: 'c4', rollNumber: '7' }, { id: 'e2', studentId: 'b', sessionId: 's1', classId: 'c4', rollNumber: '8' }],
    auditLog: [],
    feeStructure: [{ id: 'f1', name: 'Class 4 Fee Structure', className: '4', items: [{ feeHeadId: 'tuition', amount: 80000 }] }, { id: 'f2', name: '[Session 2027-2028] Class 5 Fee Structure', className: '5', items: [{ feeHeadId: 'tuition', amount: 90000 }] }],
  };
  let failActivation = false;
  const api = (state: Record<string, Row[]>) => {
    const tables: Record<string, unknown> = { $queryRaw: async () => [] };
    for (const table of Object.keys(state)) {
      const enrich = (r: Row) => table === 'studentSession' ? { ...r, class: state.class.find(c => c.id === r.classId), student: state.student.find(s => s.id === r.studentId) } : r;
      tables[table] = {
        findMany: async (args: { where?: Where } = {}) => state[table].map(enrich).filter(r => matches(r, args.where)),
        findUnique: async ({ where }: { where: Where }) => state[table].map(enrich).find(r => matches(r, where)) ?? null,
        create: async ({ data: item }: { data: Row }) => { const r = { id: `${table}-${state[table].length}`, ...item }; state[table].push(r); return r; },
        createMany: async ({ data: items }: { data: Row[] }) => { for (const item of items) state[table].push({ id: `${table}-${state[table].length}`, ...item }); return { count: items.length }; },
        update: async ({ where, data: update }: { where: Where; data: Row }) => {
          if (failActivation && table === 'academicSession' && update.isCurrent === true) throw new Error('Simulated activation failure');
          const row = state[table].find(r => matches(r, where)); if (!row) throw new Error('Not found'); Object.assign(row, update); return row;
        },
        updateMany: async ({ where, data: update }: { where: Where; data: Row }) => { const rows = state[table].filter(r => matches(r, where)); rows.forEach(r => Object.assign(r, update)); return { count: rows.length }; },
      };
    }
    return tables;
  };
  return {
    snapshot: () => structuredClone(data),
    replace: (table: string, rows: Row[]) => { data[table] = structuredClone(rows); },
    failActivation: () => { failActivation = true; },
    // Services only run queries against this in-memory object.
    db: { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => { const copy = structuredClone(data); const result = await fn(api(copy)); data = copy; return result; } },
  };
}
