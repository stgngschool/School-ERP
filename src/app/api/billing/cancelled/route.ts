import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    if (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT') {
      return NextResponse.json({ error: 'Only finance staff can view cancelled receipts.' }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Math.min(100000, Number.parseInt(params.get('page') || '1', 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(params.get('limit') || '50', 10) || 50));
    const search = (params.get('search') || '').trim();
    const where: Prisma.ReceiptWhereInput = {
      status: 'REVERSED',
      ...(search ? { OR: [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { manualReceiptNo: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { items: { some: { ledgerEntry: { student: { name: { contains: search, mode: 'insensitive' } } } } } },
      ] } : {}),
    };
    const [rows, count] = await Promise.all([
      db.receipt.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        select: { id: true, receiptNumber: true, manualReceiptNo: true, amountPaid: true, remarks: true, createdAt: true,
          student: { select: { id: true, name: true } },
          items: { select: { ledgerEntry: { select: { student: { select: { id: true, name: true } } } } } },
        },
      }),
      db.receipt.count({ where }),
    ]);
    const metadata = rows.map(row => {
      try { const value = JSON.parse(row.remarks || '{}'); return value && typeof value === 'object' ? value : {}; }
      catch { return {}; }
    });
    const userIds = [...new Set(metadata.map(meta => meta.reversedBy).filter((id): id is string => typeof id === 'string'))];
    const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, role: true } }) : [];
    const usersById = new Map(users.map(person => [person.id, person]));
    return NextResponse.json({
      receipts: rows.map((row, index) => {
        const meta = metadata[index];
        const students = new Map<string, { id: string; name: string }>();
        if (row.student) students.set(row.student.id, row.student);
        for (const item of row.items) if (item.ledgerEntry.student) students.set(item.ledgerEntry.student.id, item.ledgerEntry.student);
        // Discount-only receipts may have no ReceiptItems; retain their snapshot students.
        if (Array.isArray(meta.studentsList)) for (const student of meta.studentsList) {
          if (typeof student.id === 'string' && typeof student.name === 'string') students.set(student.id, { id: student.id, name: student.name });
        }
        return { id: row.id, receiptNo: row.receiptNumber, manualReceiptNo: row.manualReceiptNo,
          amount: row.amountPaid, students: [...students.values()], createdAt: row.createdAt,
          reversedAt: meta.reversedAt || null, reversedBy: usersById.get(meta.reversedBy) || null,
          reversalReason: meta.reversalReason || 'Reason not recorded',
        };
      }),
      pagination: { page, limit, totalReceipts: count, totalPages: Math.ceil(count / limit), hasMore: page * limit < count },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Cancelled receipt history failed:', error);
    return NextResponse.json({ error: 'Unable to load cancelled receipts.' }, { status: 500 });
  }
}
