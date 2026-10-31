export type SyncAction = "SYNC_DIRECTORY" | "SYNC_FEE_REGISTER" | "SYNC_STUDENTS" | "SYNC_RECEIPTS" | "SYNC_LEDGER" | "SYNC_MARKS" | "SYNC_ALL";
type SyncResult = { success: boolean };
type SyncMetadata = { skipped?: boolean; lastSynced?: string };

const COOLDOWN_MS = 2 * 60 * 1000;

/** Warm-process protection only: this is not a durable, cross-instance lock. */
export function createSyncCoordinator(now: () => number = Date.now) {
  const inFlight = new Map<string, Promise<SyncResult>>();
  const completed = new Map<string, { result: SyncResult; completedAt: number }>();
  return async function run<T extends SyncResult>(
    spreadsheetId: string,
    action: SyncAction,
    operation: () => Promise<T>,
  ): Promise<T & SyncMetadata> {
    const key = JSON.stringify([spreadsheetId, action]);
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const timestamp = now();
    // Discard expired counts, including those for spreadsheets no longer configured.
    for (const [cachedKey, value] of completed) {
      if (timestamp < value.completedAt || timestamp - value.completedAt >= COOLDOWN_MS) {
        completed.delete(cachedKey);
      }
    }
    const previous = completed.get(key);
    if (previous) {
      return {
        ...previous.result as T,
        skipped: true,
        lastSynced: new Date(previous.completedAt).toISOString(),
      };
    }

    // Register before invoking the operation, including synchronous throws.
    const execution = Promise.resolve().then(operation).then((result) => {
      if (result.success) completed.set(key, { result, completedAt: now() });
      return result;
    }).finally(() => { inFlight.delete(key); });
    inFlight.set(key, execution);
    return execution;
  };
}

// Shared by every exported sheet sync entry point, including manual and cron calls.
// A cold start or another serverless instance has independent state. Backups bypass it.
// globalThis also lets separately loaded route bundles in this process share it.
const processState = globalThis as unknown as {
  googleSheetSyncRunner?: ReturnType<typeof createSyncCoordinator>;
};
export const runGoogleSheetSync = processState.googleSheetSyncRunner ??= createSyncCoordinator();
