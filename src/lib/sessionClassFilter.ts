import type { Prisma } from '@prisma/client';

// Historical reports use enrollment classes. Legacy current-session data can
// still be read before the reviewed enrollment correction has been applied.
export function sessionClassFilter(sessionId: string, classWhere: Prisma.ClassWhereInput, isCurrent: boolean): Prisma.StudentWhereInput {
  const enrolled = { studentSessions: { some: { sessionId, class: classWhere } } };
  return isCurrent ? { OR: [enrolled, { studentSessions: { none: { sessionId } }, class: classWhere }] } : enrolled;
}
