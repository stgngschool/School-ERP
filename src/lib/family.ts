import db from "./db";

export async function getNextFamilyCode(tx?: any): Promise<string> {
  const client = tx || db;
  // Fetch all parent profiles to parse familyCode and find the max suffix number
  const parents = await client.parentProfile.findMany({
    select: { familyCode: true },
  });

  let maxNum = 0;
  for (const parent of parents) {
    if (parent.familyCode && parent.familyCode.startsWith("FAM-")) {
      const numStr = parent.familyCode.replace("FAM-", "");
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `FAM-${maxNum + 1}`;
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
  const receipts = await client.receipt.findMany({
    select: { receiptNumber: true },
  });

  let maxNum = 0;
  for (const r of receipts) {
    if (r.receiptNumber) {
      const parts = r.receiptNumber.split("-");
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `REC-${year}-${String(maxNum + 1).padStart(5, "0")}`;
}
