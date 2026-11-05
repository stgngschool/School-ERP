import type { Prisma, PrismaClient } from "@prisma/client";

/** Single-receipt append never needs a full student profile or charge row. */
export const liveReceiptSelect = {
  receiptNumber: true, manualReceiptNo: true, createdAt: true,
  amountPaid: true, paymentMethod: true, transactionReference: true,
  status: true, remarks: true,
  student: { select: { name: true, admissionNumber: true, fatherName: true,
    class: { select: { name: true, section: true } } } },
  createdBy: { select: { name: true, role: true } },
  items: { select: { amount: true, ledgerEntry: { select: {
    description: true, feeHead: { select: { name: true } },
  } } } },
} satisfies Prisma.ReceiptSelect;

// Preserve raw reversal history in the ledger sheet, but exclude cancelled
// allocations from student balances and the fee register.
export const activeFinancialEntries = {
  AND: [
    { OR: [{ referenceId: null }, { receipt: { status: 'ACTIVE' } }] },
    { OR: [{ entryType: { not: 'FINE' } }, { receiptItems: { none: { receipt: { status: 'REVERSED' } } } }] },
  ],
} satisfies Prisma.LedgerEntryWhereInput;

// Shared directory/register profile: no passwords, photo bytes, or unused relations.
export const syncStudentProfileSelect = {
  id: true,
  admissionNumber: true,
  rollNumber: true,
  name: true,
  fatherName: true,
  motherName: true,
  fatherMobile: true,
  motherMobile: true,
  dob: true,
  admissionDate: true,
  aadhaar: true,
  category: true,
  religion: true,
  isRte: true,
  transportMode: true,
  busRoute: true,
  busStop: true,
  status: true,
  class: { select: { name: true, section: true } },
  parentProfile: {
    select: {
      familyCode: true,
      address: true,
      user: { select: { phone: true, email: true } },
    },
  },
  concession: { select: { name: true, percentage: true } },
} as const satisfies Prisma.StudentSelect;

export const syncStudentOrder = [
  { class: { name: "asc" } },
  { class: { section: "asc" } },
  { admissionNumber: "asc" },
] satisfies Prisma.StudentOrderByWithRelationInput[];

export type DirectoryFinancialTotals = {
  totalChargesPaisa: number;
  totalPaymentsPaisa: number;
  totalDiscountsPaisa: number;
};

/** All-time legacy sheet totals, aggregated in the DB instead of loading ledger details. */
export async function fetchDirectoryStudents(db: Pick<PrismaClient, "student" | "ledgerEntry">) {
  const students = await db.student.findMany({ select: syncStudentProfileSelect, orderBy: syncStudentOrder });
  // Separate signs preserve sum(abs(amount)) even for mixed signed payment/discount
  // entries. abs(sum(amount)) would silently change the existing sheet totals.
  const grouped = await Promise.all([true, false].map((negative) => db.ledgerEntry.groupBy({
    by: ["studentId", "entryType"],
    where: {
      ...activeFinancialEntries,
      entryType: { in: ["CHARGE", "FINE", "PAYMENT", "DISCOUNT"] },
      amount: negative ? { lt: 0 } : { gte: 0 },
    },
    _sum: { amount: true },
  })));
  const totalsByStudent = new Map<string, DirectoryFinancialTotals>();
  for (const group of grouped.flat()) {
    const totals = totalsByStudent.get(group.studentId) ?? { totalChargesPaisa: 0, totalPaymentsPaisa: 0, totalDiscountsPaisa: 0 };
    const amount = group._sum.amount ?? 0;
    if (group.entryType === "CHARGE" || group.entryType === "FINE") totals.totalChargesPaisa += amount;
    else if (group.entryType === "PAYMENT") totals.totalPaymentsPaisa += Math.abs(amount);
    else if (group.entryType === "DISCOUNT") totals.totalDiscountsPaisa += Math.abs(amount);
    totalsByStudent.set(group.studentId, totals);
  }
  return students.map((student) => ({
    ...student,
    financialTotals: totalsByStudent.get(student.id) ?? { totalChargesPaisa: 0, totalPaymentsPaisa: 0, totalDiscountsPaisa: 0 },
  }));
}
