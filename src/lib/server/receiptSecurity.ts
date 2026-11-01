import { createHmac, timingSafeEqual } from "node:crypto";

// Imported only by server routes. Never export through the browser receipts utility.
export function generateReceiptSecurityToken(receiptNumber: string): string {
  const secret = process.env.RECEIPT_VERIFY_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("Receipt verification signing key is not configured");
  return createHmac("sha256", secret).update(`receipt:v2:${receiptNumber.trim().toUpperCase()}`).digest("hex");
}

export function isValidReceiptSecurityToken(receiptNumber: string, token: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const expected = Buffer.from(generateReceiptSecurityToken(receiptNumber), "hex");
  return timingSafeEqual(expected, Buffer.from(token, "hex"));
}
