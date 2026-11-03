"use client";

import { useEffect, useState } from "react";
import { formatP } from "@/lib/currency";

type CancelledReceipt = {
  id: string; receiptNo: string; manualReceiptNo?: string; amount: number;
  students: { name: string }[]; reversedAt: string | null;
  reversedBy: { name: string; role: string } | null; reversalReason: string | null;
};

export default function CancelledReceiptsHistory() {
  const [receipts, setReceipts] = useState<CancelledReceipt[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const reload = () => setRevision((value) => value + 1);
    window.addEventListener("receipt-cancelled", reload);
    return () => window.removeEventListener("receipt-cancelled", reload);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/billing/cancelled?search=${encodeURIComponent(search)}&page=${page}&limit=25`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load cancelled receipts.");
        if (!controller.signal.aborted) { setReceipts(data.receipts || []); setHasMore(Boolean(data.pagination?.hasMore)); }
      })
      .catch((error) => { if (!controller.signal.aborted) setError(error.message || "Unable to load cancelled receipts."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, page, revision]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Cancelled receipt history">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Cancelled receipts</h2>
        <p className="mt-1 text-sm text-slate-600">Original receipt numbers are retained for audit. Cancellation does not refund money.</p>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(query.trim()); }} className="flex flex-wrap gap-2">
        <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">Search cancelled receipts
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Receipt number or student name" className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus:outline-2 focus:outline-indigo-600" />
        </label>
        <button type="submit" className="min-h-11 self-end rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">Search</button>
        <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading} className="min-h-11 self-end rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 disabled:opacity-50">Refresh</button>
      </form>
      {loading ? <p role="status" className="text-sm text-slate-600">Loading cancelled receipts…</p> : error ? (
        <p role="alert" className="text-sm text-rose-700">{error} Use Refresh to try again.</p>
      ) : receipts.length === 0 ? <p className="py-6 text-sm text-slate-600">{search ? "No cancelled receipts match your search." : "No cancelled receipts yet."}</p> : (
        <ul className="divide-y divide-slate-200">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="space-y-2 py-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{receipt.receiptNo}{receipt.manualReceiptNo ? ` · Book ${receipt.manualReceiptNo}` : ""}</p>
                <span className="font-bold text-rose-700">Cancelled · {formatP(receipt.amount)}</span>
              </div>
              <p className="text-slate-700">{receipt.students.map((student) => student.name).join(", ") || "Student record unavailable"}</p>
              <p className="text-slate-600">Cancelled by {receipt.reversedBy ? `${receipt.reversedBy.name} (${receipt.reversedBy.role})` : "Staff record unavailable"} · {receipt.reversedAt ? new Date(receipt.reversedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Time unavailable"}</p>
              <p className="whitespace-pre-wrap break-words text-slate-800"><strong>Reason: </strong>{receipt.reversalReason || "No reason recorded"}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 text-sm">
        <button type="button" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-11 rounded-lg border border-slate-300 px-3 font-medium disabled:opacity-40">Previous</button>
        <span className="text-slate-600">Page {page}</span>
        <button type="button" disabled={!hasMore || loading || Boolean(error)} onClick={() => setPage((value) => value + 1)} className="min-h-11 rounded-lg border border-slate-300 px-3 font-medium disabled:opacity-40">Next</button>
      </div>
    </section>
  );
}
