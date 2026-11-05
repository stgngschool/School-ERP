"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

const detailTabs = new Set(['students', 'ledger', 'defaulters']);

/** Ledger empty states are meaningful only after the full billing read succeeds. */
export default function BillingDataBoundary({ children }: { children: ReactNode }) {
  const { user, authLoading, activeTab, billingDetailsLoaded, dashboardBillingError, refreshDashboardBilling, refreshBilling, billingHasOlder, loadOlderBilling } = useAuth();
  const [error, setError] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const refreshRef = useRef(refreshBilling);
  useEffect(() => { refreshRef.current = refreshBilling; }, [refreshBilling]);
  const staff = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const dashboard = staff && activeTab === 'dashboard';
  const needsDetails = staff && detailTabs.has(activeTab);

  useEffect(() => {
    if (authLoading || !needsDetails || billingDetailsLoaded) return;
    let cancelled = false;
    setError(false);
    void refreshRef.current(false, true).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => { cancelled = true; };
  }, [authLoading, needsDetails, billingDetailsLoaded, activeTab, user?.id]);

  const ledgerPending = staff && activeTab === 'ledger' && !billingDetailsLoaded;

  return <>
    {dashboard && dashboardBillingError && <p role="alert" className="mb-4 text-sm text-amber-800">Dashboard totals could not be refreshed. <button type="button" onClick={() => void refreshDashboardBilling()} className="font-bold underline">Retry</button></p>}
    {error && needsDetails && !billingDetailsLoaded && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      Fee details could not be refreshed. <button type="button" className="font-bold underline" onClick={() => {
        setError(false);
        void refreshRef.current(true, true).catch(() => setError(true));
      }}>Retry</button>
    </p>}
    {needsDetails && billingDetailsLoaded && billingHasOlder && <div role="status" className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      Older records are available.
      <button type="button" disabled={olderLoading} className="ml-2 font-bold underline disabled:opacity-50" onClick={async () => {
        setOlderLoading(true); setOlderError(false);
        try { await loadOlderBilling(); } catch { setOlderError(true); } finally { setOlderLoading(false); }
      }}>{olderLoading ? 'Loading…' : 'Load older records'}</button>
      {olderError && <span role="alert" className="ml-2">Could not load older records. Please retry.</span>}
    </div>}
    {ledgerPending ? (error ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Receipts are unavailable until fee details load. Use Retry above to reload them.
      </div>
    ) : (
      <section role="status" aria-live="polite" aria-busy="true" aria-label="Loading receipts and ledger" className="space-y-6">
        <span className="sr-only">Loading receipts and ledger…</span>
        <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-2"><div className="h-3 w-56 rounded bg-slate-200" /><div className="h-2 w-72 max-w-full rounded bg-slate-100" /></div>
            <div className="h-9 w-64 rounded-xl bg-slate-200/70" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-10 rounded-xl border border-slate-200 bg-slate-100" />)}</div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="h-2 w-24 rounded bg-slate-100" /><div className="h-4 w-20 rounded bg-slate-200" /></div>)}</div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="h-11 border-b border-slate-200 bg-slate-50" />
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="grid grid-cols-3 gap-6 border-b border-slate-100 p-5 last:border-0"><div className="h-3 rounded bg-slate-100" /><div className="h-3 rounded bg-slate-100" /><div className="h-3 w-16 justify-self-end rounded bg-slate-100" /></div>)}
          </div>
        </div>
      </section>
    )) : children}
  </>;
}
