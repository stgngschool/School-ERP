export function requireCancellationReason(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error('A cancellation reason is required.'), { code: 'INVALID_PAYMENT' });
  }
  return value.trim();
}

export function validatePaymentBalance(outstanding: number, payment: number, discount: number) {
  if (payment + discount > outstanding) {
    throw Object.assign(new Error('Payment and discount exceed the outstanding balance. Refresh the dues and try again.'), { code: 'INVALID_PAYMENT' });
  }
  if (payment + discount <= 0) {
    throw Object.assign(new Error('Each selected charge must have a positive payment or discount.'), { code: 'INVALID_PAYMENT' });
  }
}
