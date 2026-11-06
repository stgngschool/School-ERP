"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { retrySupersededBillingRead } from '@/lib/billingRefresh';
import { useAuth } from '@/context/AuthContext';

const staffRole = (role?: string) => role === "ADMIN" || role === "ACCOUNTANT";

const detailTabs = new Set(['students', 'ledger', 'defaulters']);

/** Ledger empty states are meaningful only after the full billing read succeeds. */
export default function BillingDataBoundary({ children }: { children: ReactNode }) {
  const { user, activeTab, billingDetailsLoaded, refreshBilling, dashboardBillingLoaded, refreshDashboardBilling } = useAuth();
  const [error, setError] = useState(false);
  const dashboard = staffRole(user?.role) && activeTab === "dashboard";
  const ready = dashboard ? dashboardBillingLoaded : billingDetailsLoaded;
  const refreshRef = useRef(refreshBilling);
  const dashboardRefreshRef = useRef(refreshDashboardBilling);
  dashboardRefreshRef.current = refreshDashboardBilling;
  useEffect(() => { refreshRef.current = refreshBilling; }, [refreshBilling]);
  const staff = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const needsDetails = staff && detailTabs.has(activeTab);

  useEffect(() => {
    if ((!needsDetails && !dashboard) || ready) return;
    let cancelled = false;
    setError(false);
    void retrySupersededBillingRead(() => dashboard ? dashboardRefreshRef.current() : refreshRef.current(false, true), () => !cancelled).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => { cancelled = true; };
  }, [needsDetails, dashboard, ready, user?.id]);

  useEffect(() => {
    if (!dashboard) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void dashboardRefreshRef.current().then(() => setError(false)).catch(() => setError(true));
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [dashboard, user?.id]);

  const ledgerPending = staff && activeTab === 'ledger' && !billingDetailsLoaded;

  return <>
    {error && (needsDetails || dashboard) && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      Fee details could not be refreshed. <button type="button" className="font-bold underline" onClick={() => {
        setError(false);
        void (dashboard ? dashboardRefreshRef.current() : refreshRef.current(true, true)).catch(() => setError(true));
      }}>Retry</button>
    </p>}
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
