/** Fine charges and their offsetting payments do not reduce outstanding fee principal. */
export function receiptArrears(outstanding: number, feePaid: number, discount: number): number {
  return Math.max(0, outstanding - feePaid - discount);
}
