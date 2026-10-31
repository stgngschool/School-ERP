'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { makeSessionDemo } from '@/lib/sessionDemo';
import type { PromotionDecision, Session } from '@/lib/sessionPolicy';
import styles from './SessionManagementTab.module.css';
import { clearClientAcademicCaches } from '@/lib/cache/clientAcademicCache';

type SchoolClass = { id: string; name: string; section: string };
type RosterStudent = { id: string; name: string; admissionNumber: string; rollNumber: string | null; classId: string; preparedClassId?: string; preparedLeft: boolean };
type Overview = { sessions: Session[]; classes: SchoolClass[]; currentSessionId: string; activeCount: number; missingEnrollments: number; roster: RosterStudent[]; page: number; total: number; hasMore: boolean };
type FeeTemplate = { name: string; className: string; frequency: string; items: { headName: string; amount: number }[] };
type Decision = { decision: 'PENDING' | PromotionDecision['decision']; classId: string };
type PromotionPreview = { previewToken: string; enrollments: unknown[]; exits: string[]; skipped: number };
type ActivationPreview = { previewToken: string; students: number; left: number; from: string; to: string };

export default function SessionManagementTab({ demo = false }: { demo?: boolean }) {
  const [demoRequest] = useState(() => makeSessionDemo());
  const request = useCallback(async <T,>(path: string, body?: object, method = 'POST'): Promise<T> => {
    const init = body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined;
    if (demo) return await demoRequest(path, init) as T;
    const response = await fetch(path, { ...init, cache: 'no-store', credentials: 'same-origin' });
    const result = await response.json();
    if (!response.ok || result.success === false) throw new Error(result.error || 'The operation could not be completed.');
    return result as T;
  }, [demo, demoRequest]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sourceClass, setSourceClass] = useState('');
  const [targetId, setTargetId] = useState('');
  const [page, setPage] = useState(1);
  const [year, setYear] = useState('2027');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);
  const [activationPreview, setActivationPreview] = useState<ActivationPreview | null>(null);
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>([]);
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const serial = useRef(0);
  const current = overview?.sessions.find(s => s.id === overview.currentSessionId);
  const future = useMemo(() => overview?.sessions.filter(s => !s.isCurrent && (!current || new Date(s.startDate) > new Date(current.endDate))) ?? [], [overview, current]);
  const load = useCallback(async () => {
    const n = ++serial.current;
    try {
      const query = new URLSearchParams({ classId: sourceClass, targetSessionId: targetId, page: String(page) });
      const data = await request<Overview>(`/api/promotion?${query}`);
      if (n !== serial.current) return;
      setOverview(data);
      if (!targetId) {
        const active = data.sessions.find(s => s.isCurrent);
        const next = data.sessions.filter(s => !s.isCurrent && active && new Date(s.startDate) > new Date(active.endDate)).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
        if (next) setTargetId(next.id);
        if (active) setYear(String(Number(active.name.split('-')[0]) + 1));
      }
    } catch (e) { if (n === serial.current) setError((e as Error).message); }
    finally { if (n === serial.current) setLoading(false); }
  }, [sourceClass, targetId, page, request]);
  // The loader synchronizes external data; its state updates follow the awaited request.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const loadFees = useCallback(async () => {
    if (!targetId) { setFeeTemplates([]); return; }
    const result = await request<{ feeStructures: FeeTemplate[] }>(`/api/fee-config?sessionId=${encodeURIComponent(targetId)}`);
    setFeeTemplates(result.feeStructures);
    const inputs: Record<string, string> = {};
    result.feeStructures.forEach((t, i) => t.items.forEach((item, j) => { inputs[`${i}:${j}`] = String(item.amount); }));
    setFeeInputs(inputs);
  }, [request, targetId]);
  useEffect(() => {
    let cancelled = false;
    if (targetId) void request<{ feeStructures: FeeTemplate[] }>(`/api/fee-config?sessionId=${encodeURIComponent(targetId)}`).then(result => {
      if (cancelled) return;
      setFeeTemplates(result.feeStructures);
      const values: Record<string, string> = {};
      result.feeStructures.forEach((t, i) => t.items.forEach((item, j) => { values[`${i}:${j}`] = String(item.amount); }));
      setFeeInputs(values);
    }).catch(e => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [targetId, request]);
  async function perform(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await fn(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function invalidate() { setPromotionPreview(null); setActivationPreview(null); }
  function updateDecision(id: string, decision: Decision) { invalidate(); setDecisions(prev => ({ ...prev, [id]: decision })); }
  const chosen = (overview?.roster || []).flatMap(s => {
    const d = decisions[s.id];
    return !d || d.decision === 'PENDING' ? [] : [{ studentId: s.id, decision: d.decision, ...(d.decision === 'PROMOTE' ? { classId: d.classId } : {}) }];
  });
  const payload = { sourceSessionId: current?.id, nextSessionId: targetId, sourceClassId: sourceClass, decisions: chosen };
  const classLabel = (id: string) => { const c = overview?.classes.find(c => c.id === id); return c ? `Class ${c.name}-${c.section}` : 'Choose class'; };

  return <section className={styles.root} aria-busy={busy}>
    {demo && <div className={styles.demo}><strong>Demo workspace</strong><span>Sample students only. Nothing here connects to your school database. Refresh to reset.</span></div>}
    <header className={styles.header}><div><p className={styles.eyebrow}>Academic setup</p><h1><CalendarDays size={24} aria-hidden="true" /> Session &amp; Promotion</h1><p>Prepare the next year while the current session keeps running.</p></div><button className={styles.secondary} disabled={busy || loading} onClick={() => { invalidate(); void perform(load); }}><RefreshCw size={16} aria-hidden="true" />Refresh</button></header>
    <div aria-live="polite">{error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success}>{message}</p>}</div>
    {loading && !overview ? <p className={styles.empty}>Loading session setup…</p> : <>
      <div className={styles.current}><div><span className={styles.eyebrow}>Current session</span><strong>{current?.name || 'Not configured'}</strong></div><p>Current classes stay unchanged until you confirm activation.</p></div>
      {!!overview?.missingEnrollments && <div className={styles.warning}><strong>{overview.missingEnrollments} students need current-session enrollment review.</strong><p>Existing student and financial data is preserved. Complete the reviewed baseline correction after backup verification before promoting these students.</p></div>}
      <div className={styles.setup}>
        <form className={styles.panel} onSubmit={e => { e.preventDefault(); void perform(async () => { const start = Number(year); await request('/api/sessions', { name: `${start}-${start + 1}`, startDate: `${start}-04-01`, endDate: `${start + 1}-03-31`, isCurrent: false }); setMessage('Future session created. No student or fee record was changed.'); await load(); }); }}>
          <h2>1. Create a session</h2><p>Create it first. It becomes current only after preparation and activation.</p>
          <label className={styles.field}>Starting year<input type="number" min="2020" max="2099" value={year} onChange={e => setYear(e.target.value)} required disabled={busy} /></label>
          <p className={styles.muted}>1 April {year} — 31 March {Number(year) + 1}</p><button disabled={busy} className={styles.secondary}>Create future session</button>
        </form>
        <div className={styles.panel}><h2>2. Choose the next session</h2><p>Promotion, fee setup and activation below apply to this session.</p><label className={styles.field}>Target session<select value={targetId} disabled={busy} onChange={e => { setLoading(true); setTargetId(e.target.value); setPage(1); setMessage(''); setFeeTemplates([]); setDecisions({}); invalidate(); }}><option value="">Select a future session</option>{future.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><p className={styles.muted}>Previous dues stay on their original entries. Pending fees do not stop promotion.</p></div>
      </div>
      <section className={styles.panel}><h2>3. Prepare student decisions</h2><p>Promote to another class, repeat the same class, or mark left/passed out for the next session.</p>
        <div className={styles.toolbar}><label className={styles.field}>Current class<select value={sourceClass} disabled={busy} onChange={e => { setLoading(true); setSourceClass(e.target.value); setPage(1); setDecisions({}); invalidate(); }}><option value="">Select a class</option>{overview?.classes.map(c => <option key={c.id} value={c.id}>{classLabel(c.id)}</option>)}</select></label><span>{overview?.total || 0} students · up to 100 per page</span></div>
        {!sourceClass ? <p className={styles.empty}>Choose a current class to load its enrolled students.</p> : !overview?.roster.length ? <p className={styles.empty}>No current-session enrollments in this class. Existing students have not been moved.</p> : <>
          <div className={styles.tableWrap}><table><caption className={styles.srOnly}>Promotion decisions for {classLabel(sourceClass)}</caption><thead><tr><th>Student</th><th>Next-session decision</th><th>Target class</th></tr></thead><tbody>{overview.roster.map(s => {
            const d = decisions[s.id] || { decision: 'PENDING', classId: '' };
            const saved = s.preparedLeft || !!s.preparedClassId;
            return <tr key={s.id}><td><strong>{s.name}</strong><small>Adm No {s.admissionNumber} · Roll {s.rollNumber || '—'}</small></td><td>{saved ? <span className={styles.saved}><CheckCircle2 size={14} aria-hidden="true" />{s.preparedLeft ? 'Left / Passed out saved' : 'Enrollment prepared'}</span> : <select aria-label={`Decision for ${s.name}`} disabled={busy || !!promotionPreview} value={d.decision} onChange={e => updateDecision(s.id, { ...d, decision: e.target.value as Decision['decision'] })}><option value="PENDING">Pending</option><option value="PROMOTE">Promote</option><option value="REPEAT">Repeat</option><option value="LEFT">Left / Passed out</option></select>}</td><td>{saved ? s.preparedClassId ? classLabel(s.preparedClassId) : 'No new enrollment' : d.decision === 'PROMOTE' ? <select aria-label={`Target class for ${s.name}`} disabled={busy || !!promotionPreview} value={d.classId} onChange={e => updateDecision(s.id, { ...d, classId: e.target.value })}><option value="">Choose class</option>{overview.classes.filter(c => c.id !== sourceClass).map(c => <option value={c.id} key={c.id}>{classLabel(c.id)}</option>)}</select> : d.decision === 'REPEAT' ? classLabel(s.classId) : '—'}</td></tr>;
          })}</tbody></table></div>
          <div className={styles.actions}><button className={styles.secondary} disabled={busy || page <= 1} onClick={() => { setLoading(true); setPage(p => p - 1); setDecisions({}); invalidate(); }}>Previous page</button><span>Page {page}</span><button className={styles.secondary} disabled={busy || !overview.hasMore} onClick={() => { setLoading(true); setPage(p => p + 1); setDecisions({}); invalidate(); }}>Next page</button></div>
          {promotionPreview ? <div className={styles.review}><strong>Review before saving</strong><p>{promotionPreview.enrollments.length} enrollments · {promotionPreview.exits.length} left/passed out · {promotionPreview.skipped} already saved. Current classes and fees stay unchanged.</p><div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={invalidate}>Edit decisions</button><button className={styles.primary} disabled={busy} onClick={() => void perform(async () => { await request('/api/promotion', { ...payload, action: 'save', previewToken: promotionPreview.previewToken }); invalidate(); setDecisions({}); setMessage('Decisions saved for the next session. Current classes are unchanged.'); await load(); })}>Save prepared decisions</button></div></div> : <button className={styles.primary} disabled={busy || !targetId || !chosen.length || loading} onClick={() => void perform(async () => { setPromotionPreview(await request('/api/promotion', { ...payload, action: 'preview' })); })}>Preview {chosen.length || ''} decisions <ArrowRight size={16} aria-hidden="true" /></button>}
        </>}
      </section>
      <section className={styles.panel}><h2>4. Review next-session fees</h2><p>Copy current rates, then edit amounts in rupees. Saving templates does not create bills.</p>
        <button className={styles.secondary} disabled={busy || !targetId || feeTemplates.length > 0} onClick={() => void perform(async () => { await request('/api/fee-config', { action: 'COPY_SESSION', sessionId: targetId }); invalidate(); await loadFees(); setMessage('Fee templates copied. Review rates before activation.'); })}>Copy current fee templates</button>
        {!feeTemplates.length ? <p className={styles.empty}>{targetId ? 'No fee templates prepared for this session yet.' : 'Choose a target session to prepare fees.'}</p> : <div className={styles.feeList}>{feeTemplates.map((t, i) => <details key={`${t.className}:${t.name}`}><summary>Class {t.className}<span>{t.items.length} fee heads</span></summary><form onSubmit={e => { e.preventDefault(); void perform(async () => { const items = t.items.map((item, j) => ({ headName: item.headName, amount: Math.round(Number(feeInputs[`${i}:${j}`]) * 100) })); await request('/api/fee-config', { action: 'ADD_STRUCTURE', sessionId: targetId, name: t.name, className: t.className, frequency: t.frequency, items }); invalidate(); await loadFees(); setMessage(`Class ${t.className} fee template saved. Existing bills were preserved.`); }); }}><div className={styles.feeGrid}>{t.items.map((item, j) => <label className={styles.field} key={item.headName}>{item.headName} (₹)<input type="number" min="0" step="0.01" required disabled={busy} value={feeInputs[`${i}:${j}`] ?? ''} onChange={e => { invalidate(); setFeeInputs(prev => ({ ...prev, [`${i}:${j}`]: e.target.value })); }} /></label>)}</div><button className={styles.secondary} disabled={busy}>Save this class template</button></form></details>)}</div>}
      </section>
      <section className={styles.panel}><h2>5. Activate when ready</h2><p>Every active student needs a decision and each target class needs a fee template. Activation updates current classes and preserves previous-session enrollments.</p>
        {activationPreview ? <div className={styles.review}><strong>{activationPreview.from} → {activationPreview.to}</strong><p>{activationPreview.students} enrolled · {activationPreview.left} left/passed out. New roll numbers can be assigned separately. No fees will be generated.</p><div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={() => setActivationPreview(null)}>Cancel</button><button className={styles.primary} disabled={busy} onClick={() => void perform(async () => { await request('/api/sessions', { id: targetId, isCurrent: true, action: 'activate', previewToken: activationPreview.previewToken }, 'PATCH'); invalidate(); setSourceClass(''); setTargetId(''); setDecisions({}); setFeeTemplates([]); setMessage('Session activated. Prepared students are now in their new classes.'); if (!demo) { clearClientAcademicCaches(); window.location.reload(); return; } await load(); })}>Confirm activation</button></div></div> : <button className={styles.primary} disabled={busy || !targetId || !!overview?.missingEnrollments} onClick={() => void perform(async () => { setActivationPreview(await request('/api/sessions', { id: targetId, isCurrent: true, action: 'preview' }, 'PATCH')); })}>Review activation</button>}
      </section>
      <section className={styles.panel}><h2>6. Generate fees separately</h2><p>After activation, generate the current session’s fees in batches of 100. Existing paid charges and previous dues are preserved.</p><button className={styles.secondary} disabled={busy || !current || !!overview?.missingEnrollments} onClick={() => void perform(async () => {
        let cursor: string | undefined; let total = 0;
        do { const r = await request<{ totalGenerated: number; nextCursor?: string; totalFailed: number }>('/api/billing/generate', { sessionId: current!.id, cursor }); total += r.totalGenerated; cursor = r.nextCursor; if (r.totalFailed) throw new Error('A batch failed. Already completed batches are preserved; review before retrying.'); } while (cursor);
        setMessage(`${total} fee entries generated for ${current!.name}. Repeating this action skips existing entries.`);
      })}>Generate current-session fees</button></section>
      <p className={styles.footnote}>Late fee automation is OFF by default. Manage it under Fee Structure → Late Fine. Existing saved settings are respected.</p>
    </>}
  </section>;
}
