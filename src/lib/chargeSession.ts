import type { PrismaClient } from '@prisma/client';
import { SessionError } from './sessionPolicy';
export async function resolveChargeSession(db: Pick<PrismaClient, "academicSession">, academicYear?: string) {
  const current = await db.academicSession.findFirst({ where: { isCurrent: true } });
  const target = academicYear ? await db.academicSession.findUnique({ where: { name: academicYear } }) : current;
  if (!target) throw new SessionError('Create/select a valid academic session before generating fees.', 409);
  if (current && target.startDate && current.startDate && target.startDate < current.startDate) throw new SessionError("Historical fees are read-only. Existing amounts and concessions were preserved.", 409);
  return { target, current };
}
export function entryBelongsToSession(entry: { sessionId: string | null; description: string }, sessionId: string, year: string) {
  if (entry.sessionId) return entry.sessionId === sessionId;
  return entry.description.includes(year);
}
