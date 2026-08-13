import db from "./db";

export async function getNextFamilyCode(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const prefix = `FAM-${year}-`;

  const latest = await client.parentProfile.findFirst({
    where: { familyCode: { startsWith: prefix } },
    orderBy: { familyCode: "desc" },
    select: { familyCode: true },
  });

  let maxNum = 0;
  if (latest?.familyCode) {
    const num = parseInt(latest.familyCode.replace(prefix, ""), 10);
    if (!isNaN(num)) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

export async function getNextAdmissionNumber(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const prefix = `ADM-${year}-`;

  const latest = await client.student.findFirst({
    where: { admissionNumber: { startsWith: prefix } },
    orderBy: { admissionNumber: "desc" },
    select: { admissionNumber: true },
  });

  let maxNum = 0;
  if (latest?.admissionNumber) {
    const num = parseInt(latest.admissionNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

export async function getNextReceiptNumber(tx?: any): Promise<string> {
  const client = tx || db;
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const latest = await client.receipt.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true },
  });

  let maxNum = 0;
  if (latest?.receiptNumber) {
    const num = parseInt(latest.receiptNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(5, "0")}`;
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findMatchingParentProfile(
  record: {
    fatherMobile?: string;
    motherMobile?: string;
    fatherName?: string;
    motherName?: string;
    parentEmail?: string;
    address?: string;
  },
  existingProfiles: Array<{
    id: string;
    familyCode: string;
    user: { name: string; phone?: string | null; email?: string | null };
    address?: string | null;
    students: Array<{ fatherName?: string | null; motherName?: string | null; fatherMobile?: string | null; motherMobile?: string | null }>;
  }>
) {
  const cleanFatherMobile = record.fatherMobile?.trim();
  const cleanMotherMobile = record.motherMobile?.trim();
  const cleanEmail = record.parentEmail?.trim().toLowerCase();
  const normFather = normalizeName(record.fatherName);
  const normMother = normalizeName(record.motherName);
  const normAddr = normalizeName(record.address);

  for (const profile of existingProfiles) {
    const userPhone = profile.user.phone?.trim();

    // 1. Mobile Phone Match (User phone or any sibling father/mother mobile)
    if (cleanFatherMobile && (userPhone === cleanFatherMobile || profile.students.some((s) => s.fatherMobile?.trim() === cleanFatherMobile || s.motherMobile?.trim() === cleanFatherMobile))) {
      return profile;
    }
    if (cleanMotherMobile && (userPhone === cleanMotherMobile || profile.students.some((s) => s.fatherMobile?.trim() === cleanMotherMobile || s.motherMobile?.trim() === cleanMotherMobile))) {
      return profile;
    }

    // 2. Father Name + Mother Name Match (Case-insensitive normalized comparison)
    if (normFather && normMother) {
      const matchParents = profile.students.some((s) => {
        const sFather = normalizeName(s.fatherName);
        const sMother = normalizeName(s.motherName);
        return (sFather === normFather && sMother === normMother) || (sFather === normFather && normalizeName(profile.user.name) === normFather);
      });
      if (matchParents) return profile;
    }

    // 3. Father Name + Address Match (Handles alternate mobile numbers)
    if (normFather && normAddr && normAddr.length >= 5) {
      const profileAddr = normalizeName(profile.address);
      const matchAddr = (profileAddr.length >= 5 && (profileAddr.includes(normAddr) || normAddr.includes(profileAddr))) &&
        (normalizeName(profile.user.name) === normFather || profile.students.some((s) => normalizeName(s.fatherName) === normFather));
      if (matchAddr) return profile;
    }

    // 4. Email Match
    if (cleanEmail && profile.user.email?.trim().toLowerCase() === cleanEmail) {
      return profile;
    }
  }

  return null;
}

