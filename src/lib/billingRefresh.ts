/** Serialize billing snapshots so a pre-mutation read cannot replace a newer one. */
export function createBillingReadQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  let generation = 0;
  return {
    invalidate() { generation++; },
    run<T>(job: (isCurrent: () => boolean) => Promise<T>): Promise<T> {
      const requestedGeneration = generation;
      const isCurrent = () => requestedGeneration === generation;
      const work = tail.then(() => {
        if (!isCurrent()) throw new Error('Billing session changed. Please reload fee details.');
        return job(isCurrent);
      });
      tail = work.catch(() => undefined);
      return work;
    },
  };
}

type SyncReceipt = { id: string; amount: number; status?: string; studentId?: string | null; studentIds?: string[] };

export function changedBillingStudentIds(previous: SyncReceipt[], fresh: SyncReceipt[]): string[] {
  const known = new Map(previous.map(row => [row.id, row]));
  return [...new Set(fresh.filter(row => {
    const old = known.get(row.id);
    return !old || old.amount !== row.amount || old.status !== row.status;
  }).flatMap(row => row.studentIds?.length ? row.studentIds : row.studentId ? [row.studentId] : []))];
}

/** Append older pages without moving recent rows down the ledger. */
export function appendBillingHistory<T extends { id: string }>(previous: T[], older: T[]): T[] {
  const rows = new Map(previous.map(row => [row.id, row]));
  for (const row of older) rows.set(row.id, row);
  return [...rows.values()];
}

/** A family receipt can occur in several student responses. Keep one by ID. */
export function mergeBillingReceipts<T extends { id: string }>(previous: T[], fresh: T[]): T[] {
  const freshById = new Map(fresh.map(receipt => [receipt.id, receipt]));
  const previousById = new Map(previous.map(receipt => [receipt.id, receipt]));
  return [
    ...Array.from(freshById.values()).filter(receipt => !previousById.has(receipt.id)),
    ...Array.from(previousById.values()).map(receipt => freshById.get(receipt.id) ?? receipt),
  ];
}
