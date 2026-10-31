/** Shared read contracts. These helpers have no database or browser side effects. */
export function shouldRetryRead(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

export function cacheableRead(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  return !('error' in data) && !('success' in data && data.success === false);
}

export function allocationScope(chargeIds: string[]) {
  return { ledgerEntryId: { in: chargeIds }, receipt: { status: 'ACTIVE' as const } };
}

export function successfulStudentIds(ids: string[], results: unknown[]): string[] {
  return ids.filter((_, i) => {
    const result = results[i] as Record<string, unknown> | null;
    return !!result && Array.isArray(result.dueItems) && Array.isArray(result.receipts) && Array.isArray(result.ledgerEntries);
  });
}

/** In-flight sharing only; never a cache of a completed or failed read. */
export function createReadDeduplicator() {
  const pending = new Map<string, Promise<unknown>>();
  return function read<T>(key: string, job: () => Promise<T>): Promise<T> {
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const work = job().finally(() => {
      if (pending.get(key) === work) pending.delete(key);
    });
    pending.set(key, work);
    return work;
  };
}
