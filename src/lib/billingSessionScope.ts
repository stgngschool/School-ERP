import type { Prisma } from '@prisma/client';
export function payableSessions(startDate: Date): Prisma.LedgerEntryWhereInput {
  return { OR: [{ sessionId: null }, { session: { startDate: { lte: startDate } } }] };
}
