import { ArrowLeft, ArrowUpRight, Loader2, Phone, Users } from 'lucide-react';
import { formatP } from '@/lib/currency';
import type { MockStudent } from '@/context/AuthContext';

type Props = {
  student?: MockStudent;
  siblingCount: number;
  invoiceCount: number;
  totalDue: number;
  loading: boolean;
  error: boolean;
  onBack: () => void;
  onProfile: () => void;
};

export default function FeeStudentHeader({ student, siblingCount, invoiceCount, totalDue, loading, error, onBack, onProfile }: Props) {
  const family = siblingCount > 1;
  const phone = student?.fatherMobile || student?.parentPhone || student?.motherMobile;
  return <section aria-label="Selected student and fee balance" className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-100/80">
    <div className="flex items-center justify-between gap-3 px-3 pt-2 sm:px-4">
      <button type="button" onClick={onBack} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-indigo-800 transition-colors hover:bg-indigo-200/60 hover:text-indigo-950 focus-visible:outline-2 focus-visible:outline-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </button>
      <button type="button" onClick={onProfile} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white/70 px-2.5 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-600">
        View profile <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
    <div className="grid gap-3 px-4 pb-3 pt-2 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-5">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="min-w-0 break-words text-lg font-bold tracking-tight text-indigo-950 sm:text-xl">{student?.name}</h3>
          <span className="rounded-md border border-indigo-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Class {student?.class}{student?.section ? `-${student.section}` : ''}</span>
          {student?.isRte && <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">RTE</span>}
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] [&>div]:flex [&>div]:items-baseline [&>div]:gap-1.5">
          <div><dt className="text-indigo-700">Admission no.</dt><dd className="font-semibold text-indigo-950">{student?.admissionNo || '—'}</dd></div>
          <div className="min-w-0"><dt className="text-indigo-700">Parent / guardian</dt><dd className="break-words font-semibold text-indigo-950">{student?.parentName || student?.fatherName || '—'}</dd></div>
          <div><dt className="text-indigo-700">Contact</dt><dd className="font-semibold text-indigo-950">{phone ? <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-indigo-700"><Phone className="h-3 w-3 text-slate-400" />{phone}</a> : '—'}</dd></div>
        </dl>
        {student?.familyCode && <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-indigo-700"><Users className="h-3.5 w-3.5" /><span>Family <span className="font-semibold text-indigo-900">{student.familyCode}</span></span>{family && <span>· {siblingCount} children linked</span>}</p>}
      </div>
      <div aria-live="polite" aria-busy={loading} className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200/80 bg-white/60 px-3 py-2 lg:min-w-52 lg:flex-col lg:items-end lg:justify-center lg:gap-1 lg:px-4 lg:text-right">
        <div><p className="text-[11px] font-semibold text-indigo-800">{family ? 'Family outstanding' : 'Outstanding balance'}</p><p className="mt-0.5 text-[10px] text-indigo-700">{loading ? 'Checking latest balance' : error ? 'Balance unavailable' : `${invoiceCount} unpaid ${invoiceCount === 1 ? 'invoice' : 'invoices'}`}</p></div>
        {loading ? <Loader2 aria-label="Loading balance" className="h-5 w-5 animate-spin text-indigo-600" /> : <p className={`text-2xl font-bold tabular-nums tracking-tight ${error ? 'text-slate-400' : totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{error ? '—' : formatP(totalDue)}</p>}
      </div>
    </div>
  </section>;
}
