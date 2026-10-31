import type { PrismaClient, Prisma } from '@prisma/client';
import { payableSessions } from './billingSessionScope';
import { getTodayIST } from './dateUtils';

export async function billingTotals(db: Pick<PrismaClient, 'ledgerEntry' | 'receiptItem' | 'receipt'>, startDate: Date, studentIds?: string[]) {
  const scope: Prisma.LedgerEntryWhereInput = { ...payableSessions(startDate), ...(studentIds ? { studentId: { in: studentIds } } : {}) };
  const receipt = { status: 'ACTIVE' as const };
  const items = { ledgerEntry: { ...scope, entryType: { in: ['CHARGE' as const, 'FINE' as const] } }, receipt };
  const today = new Date(`${getTodayIST()}T00:00:00+05:30`);
  const [charge, discount, paid, todayPaid, count] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { ...scope, entryType: { in: ['CHARGE', 'FINE'] } }, _sum: { amount: true } }),
    db.ledgerEntry.aggregate({ where: { ...scope, entryType: 'DISCOUNT', AND: [{ OR: [{ referenceId: null }, { receipt }] }] }, _sum: { amount: true } }),
    db.receiptItem.aggregate({ where: items, _sum: { amount: true } }),
    db.receiptItem.aggregate({ where: { ...items, receipt: { ...receipt, createdAt: { gte: today } } }, _sum: { amount: true } }),
    db.receipt.count({ where: { ...receipt, items: { some: { ledgerEntry: { ...scope, entryType: { in: ['CHARGE', 'FINE'] } } } } } }),
  ]);
  const totalChargesPaisa = charge._sum.amount || 0;
  const totalDiscountsPaisa = Math.abs(discount._sum.amount || 0);
  const totalCollectedPaisa = paid._sum.amount || 0;
  return { totalChargesPaisa, totalDiscountsPaisa, totalCollectedPaisa, todayCollectedPaisa: todayPaid._sum.amount || 0, netDuesPaisa: Math.max(0, totalChargesPaisa - totalDiscountsPaisa - totalCollectedPaisa), totalReceiptsCount: count };
}
