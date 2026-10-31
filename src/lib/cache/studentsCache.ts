import { BoundedCache } from "./BoundedCache";
import { unstable_cache, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { formatCanonicalDOB, formatCanonicalDOBIso } from "@/lib/dateUtils";

// Bounded LRU cache (max 30 entries, 5-minute TTL) for student lists
export const serverStudentsCache = new BoundedCache(30, 5 * 60 * 1000);

const STUDENTS_TAG = "students-roster";

// Authorization is resolved outside this cache. The resolved predicate and page
// are cache arguments, so family/class scopes and offsets cannot share entries.
// Cache the formatted strings to preserve date output on durable cache hits.
export const getCachedSlimStudents = unstable_cache(
  async (where: Prisma.StudentWhereInput, pagination: { take?: number; skip?: number }) => {
    const rows = await db.student.findMany({
      where,
      ...pagination,
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, admissionNumber: true, rollNumber: true, gender: true,
        dob: true, aadhaar: true, category: true, religion: true, motherName: true,
        status: true, isRte: true, isMarksheetClaimed: true, photoUrl: true, concessionId: true,
        fatherName: true, fatherMobile: true, motherMobile: true, admissionDate: true,
        class: { select: { name: true, section: true } },
        parentProfile: { select: { familyCode: true, address: true, user: { select: { name: true, phone: true } } } },
        concession: { select: { id: true, name: true, percentage: true, feeHeadName: true } },
      },
    });
    return rows.map((s) => ({
      id: s.id, name: s.name, admissionNo: s.admissionNumber, rollNo: s.rollNumber || "",
      gender: s.gender || "", status: s.status || "ACTIVE", isRte: s.isRte,
      isMarksheetClaimed: s.isMarksheetClaimed, photoUrl: s.photoUrl || "", concessionId: s.concessionId || "",
      dob: formatCanonicalDOBIso(s.dob), dobDisplay: formatCanonicalDOB(s.dob),
      aadhaar: s.aadhaar || "", category: s.category || "General", religion: s.religion || "Hinduism",
      admissionDate: formatCanonicalDOBIso(s.admissionDate), admissionDateDisplay: formatCanonicalDOB(s.admissionDate),
      fatherName: s.fatherName || "", fatherMobile: s.fatherMobile || "",
      motherName: s.motherName || "", motherMobile: s.motherMobile || "",
      class: s.class.name, section: s.class.section,
      parentName: s.parentProfile?.user?.name || "", parentPhone: s.parentProfile?.user?.phone || "",
      familyCode: s.parentProfile?.familyCode || "",
      address: s.parentProfile?.address || "",
      concession: s.concession
        ? { id: s.concession.id, name: s.concession.name, percentage: s.concession.percentage, feeHeadName: s.concession.feeHeadName }
        : null,
    }));
  },
  ["students-slim-roster-v1"],
  { tags: [STUDENTS_TAG], revalidate: 300 },
);

export function clearServerStudentsCache() {
  serverStudentsCache.clear();
  try {
    // Hard expiration: the next request on any instance must read committed data.
    revalidateTag(STUDENTS_TAG, { expire: 0 });
  } catch (err) {
    console.warn("[studentsCache] revalidateTag notice:", (err as Error)?.message);
  }
}
