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

/** A family receipt can occur in several student responses. Keep one by ID. */
export function mergeBillingReceipts<T extends { id: string }>(previous: T[], fresh: T[]): T[] {
  const freshById = new Map(fresh.map(receipt => [receipt.id, receipt]));
  const previousById = new Map(previous.map(receipt => [receipt.id, receipt]));
  return [
    ...Array.from(freshById.values()).filter(receipt => !previousById.has(receipt.id)),
    ...Array.from(previousById.values()).map(receipt => freshById.get(receipt.id) ?? receipt),
  ];
}

/** Retry only superseded reads; genuine failures still reach the recovery UI. */
export async function retrySupersededBillingRead<T>(read: () => Promise<T>, active: () => boolean = () => true): Promise<T | undefined> {
  for (let attempt = 0; attempt < 3 && active(); attempt++) {
    try { return await read(); }
    catch (error) {
      if (!active()) return;
      if (!(error instanceof Error) || error.message !== 'Billing session changed. Please reload fee details.' || attempt === 2) throw error;
    }
  }
}
