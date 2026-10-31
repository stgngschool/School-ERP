"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

const detailTabs = new Set(['dashboard', 'collect', 'students', 'ledger', 'defaulters']);

/** Keep the original screen visible while its cached details load in place. */
export default function BillingDataBoundary({ children }: { children: ReactNode }) {
  const { user, activeTab, billingDetailsLoaded, refreshBilling } = useAuth();
  const [error, setError] = useState(false);
  const refreshRef = useRef(refreshBilling);
  useEffect(() => { refreshRef.current = refreshBilling; }, [refreshBilling]);
  const staff = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const needsDetails = staff && detailTabs.has(activeTab);

  useEffect(() => {
    if (!needsDetails || billingDetailsLoaded) return;
    let cancelled = false;
    void refreshRef.current(false, true).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => { cancelled = true; };
  }, [needsDetails, billingDetailsLoaded]);

  return <>
    {error && needsDetails && !billingDetailsLoaded && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      Fee details could not be refreshed. <button type="button" className="font-bold underline" onClick={() => {
        setError(false);
        void refreshRef.current(false, true).catch(() => setError(true));
      }}>Retry</button>
    </p>}
    {children}
  </>;
}
