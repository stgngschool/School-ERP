export function receiptSettlement(balance: unknown): "cleared" | "outstanding" | "unknown" {
  if (typeof balance !== "number" || !Number.isFinite(balance) || balance < 0) return "unknown";
  return balance === 0 ? "cleared" : "outstanding";
}
