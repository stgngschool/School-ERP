'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import PWAInitializer from '@/components/PWAInitializer';

export default function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The synthetic preview must not initialize auth, school fetches or service workers.
  if (process.env.NODE_ENV === 'development' && pathname === '/session-preview') return <>{children}</>;
  return <><PWAInitializer /><AuthProvider>{children}</AuthProvider></>;
}
