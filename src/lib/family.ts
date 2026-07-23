import db from "./db";

export async function getNextFamilyCode(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const parents = await client.parentProfile.findMany({
    select: { familyCode: true },
  });

  let maxNum = 0;
  for (const parent of parents) {
    if (parent.familyCode) {
      const parts = parent.familyCode.split("-");
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `FAM-${year}-${String(maxNum + 1).padStart(4, "0")}`;
}

export async function getNextAdmissionNumber(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const students = await client.student.findMany({
    select: { admissionNumber: true },
  });

  let maxNum = 0;
  for (const s of students) {
    if (s.admissionNumber) {
      const parts = s.admissionNumber.split("-");
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `ADM-${year}-${String(maxNum + 1).padStart(4, "0")}`;
}

export async function getNextReceiptNumber(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const receipts = await client.receipt.findMany({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    select: { receiptNumber: true },
  });

  let maxNum = 0;
  for (const r of receipts) {
    if (r.receiptNumber && r.receiptNumber.startsWith(prefix)) {
      const numStr = r.receiptNumber.replace(prefix, "");
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  if (maxNum === 0 && receipts.length === 0) {
    const allReceipts = await client.receipt.findMany({
      select: { receiptNumber: true },
    });
    for (const r of allReceipts) {
      if (r.receiptNumber) {
        const parts = r.receiptNumber.split("-");
        if (parts.length === 3 && parts[1] === String(year)) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
  }

  return `${prefix}${String(maxNum + 1).padStart(5, "0")}`;
}

