import type { Prisma } from "@prisma/client";

type SearchStudent = {
  name: string;
  admissionNumber: string;
  fatherName: string | null;
  fatherMobile: string | null;
};

// The caller normalizes the query with trim().toLowerCase(), as before.
export function buildExportSearchWhere(scope: Prisma.StudentWhereInput, query: string): Prisma.StudentWhereInput {
  // PostgreSQL's Unicode case folding can differ from JavaScript's. Preserve
  // the original predicate for those searches rather than exclude valid rows.
  if (!query || /[^\x00-\x7F]/.test(query)) return scope;
  const literal = query.replace(/[\\%_]/g, "\\$&");
  return {
    AND: [scope, { OR: [
      { name: { contains: literal, mode: "insensitive" } },
      { admissionNumber: { contains: literal, mode: "insensitive" } },
      { fatherName: { contains: literal, mode: "insensitive" } },
      { fatherMobile: { contains: literal } },
    ] }],
  };
}

export function matchesExportSearch(student: SearchStudent, query: string): boolean {
  return !query || student.name.toLowerCase().includes(query) ||
    student.admissionNumber.toLowerCase().includes(query) ||
    Boolean(student.fatherName?.toLowerCase().includes(query)) ||
    Boolean(student.fatherMobile?.includes(query));
}

export function getExportStudentSelect(type: string) {
  const directory = type === "directory" || type === "students";
  return {
    id: true,
    name: true,
    admissionNumber: true,
    rollNumber: true,
    fatherName: true,
    fatherMobile: true,
    class: { select: { name: true, section: true } },
    parentProfile: {
      select: directory
        ? { familyCode: true, address: true, user: { select: { name: true, phone: true, email: true } } }
        : { user: { select: { name: true, phone: true } } },
    },
    ledgerEntries: {
      where: { entryType: "CHARGE" },
      select: {
        amount: true,
        ...(!directory ? { description: true } : {}),
        ...(type === "statement" ? { createdAt: true } : {}),
        receiptItems: { where: { receipt: { status: "ACTIVE" } }, select: { amount: true } },
      },
      orderBy: { createdAt: "asc" },
    },
    ...(directory ? {
      gender: true, dob: true, admissionDate: true, status: true, category: true, isRte: true,
      motherName: true, motherMobile: true, aadhaar: true, fatherAadhaar: true, motherAadhaar: true,
      religion: true, motherTongue: true, nationality: true, disability: true, parentOccupation: true,
      familyIncome: true, emergencyName: true, emergencyPhone: true, transportMode: true,
      busRoute: true, busStop: true, prevSchoolName: true, prevClassPassed: true, tcNumber: true,
      boardRegNo: true,
    } : {}),
  } as const satisfies Prisma.StudentSelect;
}

// Bound each database response without imposing a total export row ceiling.
export async function readExportPages<T extends { id: string }>(
  fetchPage: (afterId: string | undefined, pageSize: number) => Promise<T[]>,
): Promise<T[]> {
  const pageSize = 250;
  const rows: T[] = [];
  let afterId: string | undefined;
  while (true) {
    const page = await fetchPage(afterId, pageSize);
    rows.push(...page);
    if (page.length < pageSize) return rows;
    afterId = page[page.length - 1].id;
  }
}
