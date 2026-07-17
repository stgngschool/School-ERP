import db from "@/lib/db";
import { EntryType } from "@prisma/client";

// Academic year months in order: April → March
const ACADEMIC_MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March",
];

// Exam months — charge 3 times a year
const EXAM_MONTHS = ["October", "March", "May"];

/**
 * Returns the current academic year string, e.g. "2026-2027"
 */
export function getAcademicYear(date = new Date()): string {
  const month = date.getMonth(); // 0=Jan, 3=Apr
  const year = date.getFullYear();
  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Generates LedgerEntry CHARGE records for a student for the full academic year.
 * Skips months that already have a charge (idempotent / safe to call multiple times).
 *
 * @param studentId  - The student's DB id
 * @param className  - Student's class name (e.g. "10", "KG")
 * @param createdById - Admin/Accountant user id for audit
 * @param academicYear - e.g. "2026-2027" (defaults to current)
 */
export async function generateYearlyCharges(
  studentId: string,
  className: string,
  createdById: string,
  academicYear?: string
): Promise<{ generated: number; skipped: number }> {
  const acYear = academicYear || getAcademicYear();

  // Find class-specific structure, fall back to "All"
  const structures = await db.feeStructure.findMany({
    where: {
      OR: [{ className }, { className: "All" }],
    },
    include: {
      items: { include: { feeHead: true } },
    },
  });

  if (structures.length === 0) {
    return { generated: 0, skipped: 0 };
  }

  // Merge items: class-specific takes priority over "All" for the same fee head
  const headMap = new Map<string, { feeHeadId: string; amount: number; frequency: string; name: string }>();
  // Process "All" first
  for (const struct of structures.filter((s) => s.className === "All")) {
    for (const item of struct.items) {
      headMap.set(item.feeHead.name, {
        feeHeadId: item.feeHeadId,
        amount: item.amount,
        frequency: item.feeHead.frequency,
        name: item.feeHead.name,
      });
    }
  }
  // Process class-specific
  for (const struct of structures.filter((s) => s.className !== "All")) {
    for (const item of struct.items) {
      headMap.set(item.feeHead.name, {
        feeHeadId: item.feeHeadId,
        amount: item.amount,
        frequency: item.feeHead.frequency,
        name: item.feeHead.name,
      });
    }
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { isRte: true, concession: true },
  });
  const isRte = student?.isRte ?? false;
  const concession = student?.concession ?? null;

  // Fetch all existing entries (charges and discounts) for this student
  const existingEntries = await db.ledgerEntry.findMany({
    where: { studentId },
    select: { description: true, entryType: true },
  });
  const existingCharges = new Set(existingEntries.filter(e => e.entryType === EntryType.CHARGE).map((e) => e.description));
  const existingDiscounts = new Set(existingEntries.filter(e => e.entryType === EntryType.DISCOUNT).map((e) => e.description));

  let generated = 0;
  let skipped = 0;
  const toCreate: any[] = [];

  for (const [, head] of headMap) {
    const { feeHeadId, amount, frequency, name } = head;

    if (frequency === "ad_hoc") continue;

    const charges: { description: string; amount: number }[] = [];

    if (frequency === "monthly") {
      for (const month of ACADEMIC_MONTHS) {
        charges.push({
          description: `Assigned: ${name} - ${month} ${acYear}`,
          amount,
        });
      }
    } else if (frequency === "annual") {
      charges.push({
        description: `Assigned: ${name} - Annual ${acYear}`,
        amount,
      });
    } else if (frequency === "one_time") {
      charges.push({
        description: `Assigned: ${name} - One-Time`,
        amount,
      });
    } else if (frequency === "exam") {
      for (const month of EXAM_MONTHS) {
        charges.push({
          description: `Assigned: ${name} - Exam (${month} ${acYear})`,
          amount,
        });
      }
    }

    for (const charge of charges) {
      const chargeName = charge.description.replace("Assigned: ", "");
      const discountDesc = `RTE Fee Waiver: ${chargeName}`;
      const concessionDesc = concession && concession.feeHeadName === name
        ? `Concession Waiver (${concession.name}): ${chargeName}`
        : "";

      const needCharge = !existingCharges.has(charge.description);
      const needDiscount = isRte && !existingDiscounts.has(discountDesc);
      const needConcessionDiscount = !isRte && concessionDesc && !existingDiscounts.has(concessionDesc);

      if (!needCharge && !needDiscount && !needConcessionDiscount) {
        skipped++;
        continue;
      }

      if (needCharge) {
        toCreate.push({
          studentId,
          feeHeadId,
          entryType: EntryType.CHARGE,
          amount: charge.amount,
          description: charge.description,
          createdById,
        });
        generated++;
      }

      if (needDiscount) {
        toCreate.push({
          studentId,
          feeHeadId,
          entryType: EntryType.DISCOUNT,
          amount: -charge.amount,
          description: discountDesc,
          createdById,
        });
        generated++;
      } else if (needConcessionDiscount && concession) {
        const concessionAmount = Math.round((charge.amount * concession.percentage) / 100);
        toCreate.push({
          studentId,
          feeHeadId,
          entryType: EntryType.DISCOUNT,
          amount: -concessionAmount,
          description: concessionDesc,
          createdById,
        });
        generated++;
      }
    }
  }

  if (toCreate.length > 0) {
    await db.ledgerEntry.createMany({
      data: toCreate,
    });
  }

  return { generated, skipped };
}

/**
 * Optimised bulk generator of Yearly charges for multiple active students.
 * Reduces database roundtrips from O(N * M) to O(1) query-sets.
 */
export async function generateYearlyChargesBulk(
  students: { id: string; class: { name: string } }[],
  createdById: string,
  academicYear: string
): Promise<{ generated: number; skipped: number }> {
  // 1. Fetch all structures
  const structures = await db.feeStructure.findMany({
    include: {
      items: { include: { feeHead: true } },
    },
  });

  // 2. Fetch all existing entries (charges and discounts) for these students
  const existingEntries = await db.ledgerEntry.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
    },
    select: {
      studentId: true,
      description: true,
      entryType: true,
    },
  });

  const existingChargesSet = new Set(
    existingEntries.filter(e => e.entryType === EntryType.CHARGE).map((e) => `${e.studentId}_${e.description}`)
  );
  const existingDiscountsSet = new Set(
    existingEntries.filter(e => e.entryType === EntryType.DISCOUNT).map((e) => `${e.studentId}_${e.description}`)
  );

  // 3. Fetch isRte details for all these students
  const studentDbDetails = await db.student.findMany({
    where: { id: { in: students.map(s => s.id) } },
    select: { id: true, isRte: true, concession: true },
  });
  const rteMap = new Map(studentDbDetails.map(s => [s.id, s.isRte]));
  const concessionMap = new Map(studentDbDetails.map(s => [s.id, s.concession]));

  let generated = 0;
  let skipped = 0;
  const toCreate: any[] = [];

  // Cache class mapping structures
  const classHeadMaps = new Map<string, { feeHeadId: string; amount: number; frequency: string; name: string }[]>();

  const getClassHeadMap = (className: string) => {
    if (classHeadMaps.has(className)) {
      return classHeadMaps.get(className)!;
    }

    const classStructures = structures.filter(
      (s) => s.className === className || s.className === "All"
    );

    const headMap = new Map<string, { feeHeadId: string; amount: number; frequency: string; name: string }>();

    // Process "All" first
    for (const struct of classStructures.filter((s) => s.className === "All")) {
      for (const item of struct.items) {
        headMap.set(item.feeHead.name, {
          feeHeadId: item.feeHeadId,
          amount: item.amount,
          frequency: item.feeHead.frequency,
          name: item.feeHead.name,
        });
      }
    }
    // Process class-specific
    for (const struct of classStructures.filter((s) => s.className !== "All")) {
      for (const item of struct.items) {
        headMap.set(item.feeHead.name, {
          feeHeadId: item.feeHeadId,
          amount: item.amount,
          frequency: item.feeHead.frequency,
          name: item.feeHead.name,
        });
      }
    }

    const list = Array.from(headMap.values());
    classHeadMaps.set(className, list);
    return list;
  };

  for (const student of students) {
    const headList = getClassHeadMap(student.class.name);

    for (const head of headList) {
      const { feeHeadId, amount, frequency, name } = head;

      if (frequency === "ad_hoc") continue;

      const charges: { description: string; amount: number }[] = [];

      if (frequency === "monthly") {
        for (const month of ACADEMIC_MONTHS) {
          charges.push({
            description: `Assigned: ${name} - ${month} ${academicYear}`,
            amount,
          });
        }
      } else if (frequency === "annual") {
        charges.push({
          description: `Assigned: ${name} - Annual ${academicYear}`,
          amount,
        });
      } else if (frequency === "one_time") {
        charges.push({
          description: `Assigned: ${name} - One-Time`,
          amount,
        });
      } else if (frequency === "exam") {
        for (const month of EXAM_MONTHS) {
          charges.push({
            description: `Assigned: ${name} - Exam (${month} ${academicYear})`,
            amount,
          });
        }
      }

      for (const charge of charges) {
        const chargeName = charge.description.replace("Assigned: ", "");
        const discountDesc = `RTE Fee Waiver: ${chargeName}`;

        const keyCharge = `${student.id}_${charge.description}`;
        const keyDiscount = `${student.id}_${discountDesc}`;

        const isRte = rteMap.get(student.id) ?? false;
        const concession = concessionMap.get(student.id) ?? null;

        const concessionDesc = concession && concession.feeHeadName === name
          ? `Concession Waiver (${concession.name}): ${chargeName}`
          : "";
        const keyConcessionDiscount = concessionDesc ? `${student.id}_${concessionDesc}` : "";

        const needCharge = !existingChargesSet.has(keyCharge);
        const needDiscount = isRte && !existingDiscountsSet.has(keyDiscount);
        const needConcessionDiscount = !isRte && concessionDesc && !existingDiscountsSet.has(keyConcessionDiscount);

        if (!needCharge && !needDiscount && !needConcessionDiscount) {
          skipped++;
          continue;
        }

        if (needCharge) {
          toCreate.push({
            studentId: student.id,
            feeHeadId,
            entryType: EntryType.CHARGE,
            amount: charge.amount,
            description: charge.description,
            createdById,
          });
          generated++;
        }

        if (needDiscount) {
          toCreate.push({
            studentId: student.id,
            feeHeadId,
            entryType: EntryType.DISCOUNT,
            amount: -charge.amount,
            description: discountDesc,
            createdById,
          });
          generated++;
        } else if (needConcessionDiscount && concession) {
          const concessionAmount = Math.round((charge.amount * concession.percentage) / 100);
          toCreate.push({
            studentId: student.id,
            feeHeadId,
            entryType: EntryType.DISCOUNT,
            amount: -concessionAmount,
            description: concessionDesc,
            createdById,
          });
          generated++;
        }
      }
    }
  }

  if (toCreate.length > 0) {
    await db.ledgerEntry.createMany({
      data: toCreate,
    });
  }

  return { generated, skipped };
}
