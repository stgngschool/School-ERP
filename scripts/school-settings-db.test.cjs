// Opt-in database regression check. All writes are rolled back.
require('@next/env').loadEnvConfig(process.cwd());
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

test('school settings lock and JSON merge work with the Prisma database adapter', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const source = readFileSync('src/app/api/school/route.ts', 'utf8');
  const lockSql = source.match(/await tx\.\$queryRaw`([^`]+)`/)[1];
  const mergeSql = source.match(/return tx\.\$queryRawUnsafe\(\s*`([^`]+)`/)[1];
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 }) });
  const rollback = new Error('Intentional test rollback');
  let verified = false;
  try {
    await assert.rejects(db.$transaction(async tx => {
      await tx.$queryRawUnsafe(lockSql);
      const before = await tx.schoolConfig.findUniqueOrThrow({ where: { id: 'singleton' } });
      const patch = { enablePublicResults: true, allowedPublicExams: ['Unit-1', 'Half Yearly'], lockedExams: ['Unit-1', 'Unit-2', 'Annual'] };
      const rows = await tx.$queryRawUnsafe(mergeSql, 'singleton', JSON.stringify(patch));
      assert.deepEqual(rows[0].data, { ...before.data, ...patch });
      verified = true;
      throw rollback;
    }), error => error === rollback);
    assert.equal(verified, true);
  } finally {
    await db.$disconnect();
  }
});
