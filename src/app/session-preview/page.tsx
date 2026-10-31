import { notFound } from 'next/navigation';
import SessionManagementTab from '@/components/admin/SessionManagementTab';

export const dynamic = 'force-dynamic';
export default function SessionPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <main style={{ minHeight: '100vh', background: '#f7f9fc', padding: '24px 12px' }}><SessionManagementTab demo /></main>;
}
