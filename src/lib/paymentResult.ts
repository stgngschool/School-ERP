/** Expose only the committed server receipt; keep balance verification separate. */
export function savedPaymentResult<T>(receipt: T, refresh: () => Promise<void>, onFailure: (error: unknown) => void) {
  return {
    success: true as const,
    receipt,
    refresh: Promise.resolve().then(refresh).catch(onFailure),
  };
}
