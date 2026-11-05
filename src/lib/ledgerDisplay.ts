type ReceiptStudent = {
  studentId?: string | null;
  studentIds?: string[];
  studentName?: string;
  studentsList?: { id?: string }[];
};

export function receiptBelongsToStudent(receipt: ReceiptStudent, student: { id: string; name: string }): boolean {
  // Names are neither unique nor immutable; family/discount-only vouchers may
  // identify the child through their allocation IDs or saved snapshot instead.
  return receipt.studentId === student.id
    || receipt.studentIds?.includes(student.id) === true
    || receipt.studentsList?.some(child => child.id === student.id) === true;
}

export function ledgerIncreasesBalance(entry: { type: string; amount: number }): boolean {
  return entry.amount > 0;
}
