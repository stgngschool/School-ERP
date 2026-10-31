import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { BoundedCache } from '@/lib/cache/BoundedCache';
import { clearServerBillingCache } from '@/lib/cache/billingCache';
import { getCachedActiveSession } from '@/lib/cache/sessionCache';
import { validateCsrfOrigin } from '@/lib/security';
import { SessionError } from '@/lib/sessionPolicy';
import { feeStructureName, feeStructureLabel, selectSessionStructures } from '@/lib/sessionFees';
import { lockSessionWorkflow } from '@/lib/sessionWorkflow';

export const dynamic = 'force-dynamic';
const serverFeeConfigCache = new BoundedCache(20, 60 * 1000);
export async function GET(request: Request) {
  try {
    if (!await getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const current = await getCachedActiveSession();
    const id = new URL(request.url).searchParams.get('sessionId');
    const session = id ? await db.academicSession.findUnique({ where: { id } }) : current;
    if (!session) throw new SessionError('Academic session not found.', 404);
    const cacheKey = `${session.id}:${current?.id ?? ''}`;
    const cached = serverFeeConfigCache.get(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'private, max-age=30' } });
    const [heads, all] = await Promise.all([
      db.feeHead.findMany({ where: { status: 'ACTIVE' } }),
      db.feeStructure.findMany({ where: { OR: [{ name: { startsWith: `[Session ${session.name}] ` } }, ...(session.id === current?.id ? [{ name: { not: { startsWith: '[Session ' } } }] : [])] }, include: { items: { include: { feeHead: true } } } }),
    ]);
    const result = { sessionId: session.id, sessionName: session.name,
      feeHeads: heads.map(h => ({ name: h.name, frequency: h.frequency })),
      feeStructures: selectSessionStructures(all, session.name, current?.name).map(s => ({
        name: feeStructureLabel(s.name), frequency: s.frequency, className: s.className || 'All',
        total: s.items.reduce((sum, i) => sum + i.amount, 0) / 100,
        items: s.items.map(i => ({ headName: i.feeHead.name, amount: i.amount / 100 })),
      })),
    };
    serverFeeConfigCache.set(cacheKey, result);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!['ADMIN', 'ACCOUNTANT'].includes(user.role)) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  try {
    const body = await request.json();
    const { action } = body;
    // Fee generation is a separate, bounded, explicit operation.
    if (action === 'GENERATE_STUDENT_LEDGER') throw new SessionError('Use Generate fees in Session & Promotion. Saving fee setup never generates bills.', 409);
    if (action === 'CLEANUP_DUPLICATES') throw new SessionError('Automatic financial deletion is disabled. Review duplicate entries before making corrections.', 409);
    const result = await db.$transaction(async tx => {
      await lockSessionWorkflow(tx);
      const current = await tx.academicSession.findFirst({ where: { isCurrent: true } });
      const session = body.sessionId ? await tx.academicSession.findUnique({ where: { id: body.sessionId } }) : current;
      if (!session || !current) throw new SessionError('Select a valid academic session.', 409);
      if (session.startDate < current.startDate) throw new SessionError('Historical fee templates are read-only.', 409);
      if (action === 'ADD_HEAD') {
        const name = String(body.name || '').trim();
        if (!name || !['monthly', 'annual', 'one_time', 'exam', 'ad_hoc'].includes(body.frequency)) throw new SessionError('Enter a fee head and valid frequency.');
        const existingHead = await tx.feeHead.findUnique({ where: { name } });
        if (existingHead && existingHead.frequency !== body.frequency && await tx.feeStructureItem.count({ where: { feeHeadId: existingHead.id } })) throw new SessionError('This fee head is already used. Create a separate fee head for a different frequency; previous sessions were preserved.', 409);
        const head = await tx.feeHead.upsert({ where: { name }, update: { frequency: body.frequency, status: 'ACTIVE' }, create: { name, frequency: body.frequency } });
        return { head };
      }
      if (action === 'COPY_SESSION') {
        if (session.id === current.id || session.startDate <= current.endDate) throw new SessionError('Copy fees into a future session.');
        const all = await tx.feeStructure.findMany({ include: { items: true } });
        if (selectSessionStructures(all, session.name, current.name).length) throw new SessionError('Target session already has fee templates. Existing rates were preserved.', 409);
        const source = selectSessionStructures(all, current.name, current.name);
        if (!source.length) throw new SessionError('Current session has no fee templates to copy.');
        for (const s of source) await tx.feeStructure.create({ data: {
          name: feeStructureName(session.name, s.name), className: s.className, frequency: s.frequency,
          items: { createMany: { data: s.items.map(i => ({ feeHeadId: i.feeHeadId, amount: i.amount })) } },
        } });
        await log(tx, user.userId, session.id, 'SESSION_FEES_COPIED');
        return { count: source.length };
      }
      let name = String(body.name || '').trim();
      let className = String(body.className || 'All').trim();
      let frequency = String(body.frequency || 'monthly');
      let items: { headName: string; amount: number }[] = [];
      if (action === 'CLONE_STRUCTURE') {
        if (!body.fromClassName || !body.toClassName) throw new SessionError('Choose source and target classes.');
        const all = await tx.feeStructure.findMany({ include: { items: { include: { feeHead: true } } } });
        const source = selectSessionStructures(all, session.name, current.name).find(s => s.className === body.fromClassName);
        if (!source) throw new SessionError('Source fee structure not found.', 404);
        className = body.toClassName; name = `${className} Fee Structure`; frequency = source.frequency;
        items = source.items.map(i => ({ headName: i.feeHead.name, amount: i.amount }));
      } else if (action === 'ADD_STRUCTURE') {
        if (!Array.isArray(body.items)) throw new SessionError('Fee items are required.');
        items = body.items;
      } else throw new SessionError('Invalid fee action.');
      if (!name || !className || !items.length || items.length > 100 || !['monthly', 'quarterly', 'half-yearly', 'annual', 'one_time', 'exam', 'ad_hoc'].includes(frequency)) throw new SessionError('Enter a valid fee template with 1 to 100 items.');
      const seen = new Set<string>();
      for (const item of items) {
        if (typeof item.headName !== 'string' || !item.headName.trim() || !Number.isSafeInteger(item.amount) || item.amount < 0 || item.amount > 100000000) throw new SessionError('Fee amounts must be non-negative integer paisa.');
        const key = item.headName.trim().toLowerCase();
        if (seen.has(key)) throw new SessionError('Duplicate fee head in this template.');
        seen.add(key);
      }
      const scopedName = feeStructureName(session.name, name);
      const candidates = selectSessionStructures(await tx.feeStructure.findMany({ where: { className } }), session.name, current.name);
      if (candidates.length > 1) throw new SessionError('Multiple fee templates for this class need review before editing.', 409);
      const existing = candidates[0];
      const prepared: { feeHeadId: string; amount: number }[] = [];
      for (const item of items) {
        const head = await tx.feeHead.upsert({ where: { name: item.headName.trim() }, update: { status: 'ACTIVE' }, create: { name: item.headName.trim(), frequency: 'monthly' } });
        prepared.push({ feeHeadId: head.id, amount: item.amount });
      }
      const structure = existing ? await tx.feeStructure.update({ where: { id: existing.id }, data: { name: scopedName, frequency } }) : await tx.feeStructure.create({ data: { name: scopedName, frequency, className } });
      await tx.feeStructureItem.deleteMany({ where: { feeStructureId: structure.id } });
      await tx.feeStructureItem.createMany({ data: prepared.map(i => ({ ...i, feeStructureId: structure.id })) });
      await log(tx, user.userId, session.id, 'SESSION_FEES_SAVED');
      return { structure };
    }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
    serverFeeConfigCache.clear(); clearServerBillingCache();
    return NextResponse.json({ success: true, ...result, message: 'Fee setup saved. Existing bills and receipts were preserved.' });
  } catch (error) { return failure(error); }
}
async function log(tx: Prisma.TransactionClient, userId: string, sessionId: string, action: string) {
  await tx.auditLog.create({ data: { userId, action, entityType: 'AcademicSession', entityId: sessionId } });
}
function failure(error: unknown) {
  if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
  console.error('Fee setup failed:', error);
  return NextResponse.json({ error: 'Unable to save fee setup. Refresh and try again.' }, { status: 409 });
}
export async function DELETE(request: Request) {
  if (!validateCsrfOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!['ADMIN', 'ACCOUNTANT'].includes(user.role)) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  try {
    const body = await request.json();
    if (body.action !== 'DELETE_HEAD' || typeof body.name !== 'string' || !body.name.trim()) throw new SessionError('Select a fee head.');
    await db.$transaction(async tx => {
      await lockSessionWorkflow(tx);
      const head = await tx.feeHead.findUnique({ where: { name: body.name.trim() } });
      if (!head) throw new SessionError('Fee head not found.', 404);
      if (await tx.feeStructureItem.count({ where: { feeHeadId: head.id } })) throw new SessionError('This fee head belongs to fee templates. Remove it from the intended template instead; other sessions were preserved.', 409);
      await tx.feeHead.update({ where: { id: head.id }, data: { status: 'ARCHIVED' } });
    }, { isolationLevel: 'ReadCommitted' });
    serverFeeConfigCache.clear(); return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}
