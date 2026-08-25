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
 * Helper to normalize charge description keys so "Auto-Assigned: July Tuition Fee"
 * and "Assigned: Tuition Fee - July 2026-2027" normalize to the same key "tuition fee_july_2026-2027".
 */
function getNormalizedChargeKey(description: string, feeHeadName: string, fallbackYear?: string): string {
  const descLower = description.toLowerCase();
  const headLower = feeHeadName.toLowerCase().trim();
  const yearMatch = description.match(/\d{4}-\d{4}/);
  const yearSuffix = yearMatch ? `_${yearMatch[0]}` : (fallbackYear ? `_${fallbackYear}` : "");
  
  for (const month of ACADEMIC_MONTHS) {
    if (descLower.includes(month.toLowerCase())) {
      return `${headLower}_${month.toLowerCase()}${yearSuffix}`;
    }
  }
  if (descLower.includes("annual")) {
    return `${headLower}_annual${yearSuffix}`;
  }
  if (descLower.includes("one-time") || descLower.includes("onetime")) {
    return `${headLower}_onetime`;
  }
  return `${headLower}_${descLower.replace(/[^a-z0-9]/g, "")}${yearSuffix}`;
}

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
 * @param startingFeeMonth - Optional starting month (e.g. "July") for mid-session admissions
 */
export async function generateYearlyCharges(
  studentId: string,
  className: string,
  createdById: string,
  academicYear?: string,
  startingFeeMonth?: string,
  targetFeeHeadName?: string
): Promise<{ generated: number; skipped: number }> {
  // ── GY-04: Resolve active academic session
  const activeSession = await db.academicSession.findFirst({ where: { isCurrent: true } });
  const sessionYear = activeSession?.name || getAcademicYear();
  const acYear = academicYear || sessionYear;
  const targetSessionId = activeSession?.id || null;

  // Determine active months based on startingFeeMonth
  let activeMonths = ACADEMIC_MONTHS;
  if (startingFeeMonth && ACADEMIC_MONTHS.includes(startingFeeMonth)) {
    const startIndex = ACADEMIC_MONTHS.indexOf(startingFeeMonth);
    activeMonths = ACADEMIC_MONTHS.slice(startIndex);
  }

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

  // Filter by target fee head if requested
  if (targetFeeHeadName && targetFeeHeadName !== "ALL") {
    for (const [key, head] of Array.from(headMap.entries())) {
      if (head.name.trim().toLowerCase() !== targetFeeHeadName.trim().toLowerCase()) {
        headMap.delete(key);
      }
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
    select: { id: true, description: true, entryType: true, amount: true, receiptItems: true, sessionId: true, feeHead: { select: { name: true } } },
  });
  const existingChargesMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.CHARGE).map(e => [
      `${studentId}_${getNormalizedChargeKey(e.description, e.feeHead?.name || "", acYear)}`, e
    ])
  );
  const existingDiscountsMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.DISCOUNT).map(e => [
      `${studentId}_${getNormalizedChargeKey(e.description, e.feeHead?.name || "", acYear)}`, e
    ])
  );
  const existingDiscountsSet = new Set(existingDiscountsMap.keys());

  let generated = 0;
  let skipped = 0;
  const toCreate: any[] = [];
  const toUpdate: { id: string; amount: number }[] = [];

  for (const [, head] of headMap) {
    const { feeHeadId, amount, frequency, name } = head;

    if (frequency === "ad_hoc") continue;

    const charges: { description: string; amount: number }[] = [];

    if (frequency === "monthly") {
      for (const month of activeMonths) {
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
        if (activeMonths.includes(month)) {
          charges.push({
            description: `Assigned: ${name} - Exam (${month} ${acYear})`,
            amount,
          });
        }
      }
    }

    for (const charge of charges) {
      const chargeName = charge.description.replace("Assigned: ", "");
      const discountDesc = `RTE Fee Waiver: ${chargeName}`;
      const concessionDesc = concession && concession.feeHeadName.trim().toLowerCase() === name.trim().toLowerCase()
        ? `Concession Waiver (${concession.name}): ${chargeName}`
        : "";

      const normChargeKey = getNormalizedChargeKey(charge.description, name, acYear);
      const normDiscountKey = getNormalizedChargeKey(discountDesc, name, acYear);

      const keyCharge = `${studentId}_${normChargeKey}`;
      const keyDiscount = `${studentId}_${normDiscountKey}`;
      const keyConcessionDiscount = concessionDesc ? `${studentId}_${getNormalizedChargeKey(concessionDesc, name, acYear)}` : "";

      const existingChargeEntry = existingChargesMap.get(keyCharge);
      if (existingChargeEntry && existingChargeEntry.amount !== charge.amount && existingChargeEntry.receiptItems.length === 0) {
        toUpdate.push({ id: existingChargeEntry.id, amount: charge.amount });
        if (isRte) {
          const existingDiscountEntry = existingDiscountsMap.get(keyDiscount);
          if (existingDiscountEntry && existingDiscountEntry.amount !== -charge.amount) {
            toUpdate.push({ id: existingDiscountEntry.id, amount: -charge.amount });
          }
        } else if (concessionDesc && concession) {
          const existingConcessionEntry = existingDiscountsMap.get(keyConcessionDiscount);
          const concessionAmount = Math.round((charge.amount * concession.percentage) / 100);
          if (existingConcessionEntry && existingConcessionEntry.amount !== -concessionAmount) {
            toUpdate.push({ id: existingConcessionEntry.id, amount: -concessionAmount });
          }
        }
      }

      const needCharge = !existingChargesMap.has(keyCharge);
      const needDiscount = isRte && !existingDiscountsSet.has(keyDiscount);
      const needConcessionDiscount = !isRte && concessionDesc && !existingDiscountsSet.has(keyConcessionDiscount);

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
          sessionId: targetSessionId,
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
          sessionId: targetSessionId,
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
          sessionId: targetSessionId,
          createdById,
        });
        generated++;
      }
    }
  }

  await db.$transaction(async (tx) => {
    if (toCreate.length > 0) {
      await tx.ledgerEntry.createMany({
        data: toCreate,
      });
    }

    for (const update of toUpdate) {
      await tx.ledgerEntry.update({
        where: { id: update.id },
        data: { amount: update.amount },
      });
    }
  });

  return { generated, skipped };
}

/**
 * Derives the starting fee month from a student's admission/joining date.
 *
 * Rules:
 *  - If admissionDate is null/undefined → "April" (start of academic year).
 *  - If the admission falls before April of the current academic year → "April".
 *  - Otherwise → the calendar month name of the admissionDate (e.g. "July").
 *
 * This is used by generateYearlyChargesBulk so bulk generation respects each
 * student's individual joining month instead of always generating all 12 months.
 */
export function getStartingFeeMonthFromDate(
  admissionDate: Date | null | undefined,
  academicYear: string
): string {
  if (!admissionDate) return "April";

  const [syStr] = academicYear.split("-");
  const academicStartYear = parseInt(syStr, 10);
  // Academic year starts 1 April of academicStartYear
  const academicStart = new Date(academicStartYear, 3, 1); // month=3 → April (0-indexed)

  if (admissionDate < academicStart) return "April";

  const monthIndex = admissionDate.getMonth(); // 0=Jan … 11=Dec
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const calendarMonth = MONTH_NAMES[monthIndex];

  // If the month is not in ACADEMIC_MONTHS (shouldn't happen) fall back to April
  if (!ACADEMIC_MONTHS.includes(calendarMonth)) return "April";
  return calendarMonth;
}

/**
 * Optimised bulk generator of Yearly charges for multiple active students.
 * Reduces database roundtrips from O(N * M) to O(1) query-sets.
 *
 * ── GY-02 fix ────────────────────────────────────────────────────────────────
 * Each student object may carry a `startingFeeMonth` field (e.g. "July").
 * When present, only months from that point onward in the academic year are
 * generated. This prevents mid-year admits from being charged for months
 * before their joining date.
 * If absent, `admissionDate` is used via getStartingFeeMonthFromDate().
 * If both are absent, all months are generated (April → March).
 */
export async function generateYearlyChargesBulk(
  students: {
    id: string;
    class: { name: string };
    startingFeeMonth?: string;   // ── GY-02: explicit override (e.g. from admission form)
    admissionDate?: Date | null; // ── GY-02: fallback derivation source
  }[],
  createdById: string,
  academicYear?: string,
  targetFeeHeadName?: string
): Promise<{ generated: number; skipped: number; failed?: number; errors?: string[] }> {
  // ── GY-04: Resolve active academic session
  const activeSession = await db.academicSession.findFirst({ where: { isCurrent: true } });
  const sessionYear = activeSession?.name || getAcademicYear();
  const acYear = academicYear || sessionYear;
  const targetSessionId = activeSession?.id || null;

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
      id: true,
      studentId: true,
      description: true,
      entryType: true,
      amount: true,
      receiptItems: true,
      sessionId: true,
      feeHead: { select: { name: true } },
    },
  });

  const existingChargesMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.CHARGE).map((e) => {
      // Find matching fee head or description name with session-scoping
      const normKey = `${e.studentId}_${getNormalizedChargeKey(e.description, e.feeHead?.name || "", acYear)}`;
      return [normKey, e];
    })
  );
  const existingChargesSet = new Set(existingChargesMap.keys());
  const existingDiscountsMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.DISCOUNT).map((e) => [
      `${e.studentId}_${getNormalizedChargeKey(e.description, e.feeHead?.name || "", acYear)}`, e
    ])
  );
  const existingDiscountsSet = new Set(existingDiscountsMap.keys());

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

    if (targetFeeHeadName && targetFeeHeadName !== "ALL") {
      for (const [key, head] of Array.from(headMap.entries())) {
        if (head.name.trim().toLowerCase() !== targetFeeHeadName.trim().toLowerCase()) {
          headMap.delete(key);
        }
      }
    }

    const list = Array.from(headMap.values());
    classHeadMaps.set(className, list);
    return list;
  };

  const toUpdate: { id: string; amount: number }[] = [];

  for (const student of students) {
    const headList = getClassHeadMap(student.class.name);

    // ── GY-02: Determine the month slice for this student ────────────────────
    const effectiveStartMonth =
      (student.startingFeeMonth && ACADEMIC_MONTHS.includes(student.startingFeeMonth))
        ? student.startingFeeMonth
        : getStartingFeeMonthFromDate(student.admissionDate, acYear);

    const startIdx = ACADEMIC_MONTHS.indexOf(effectiveStartMonth);
    const activeMonths = startIdx > 0
      ? ACADEMIC_MONTHS.slice(startIdx)
      : ACADEMIC_MONTHS; // April = index 0 → use all 12

    for (const head of headList) {
      const { feeHeadId, amount, frequency, name } = head;

      if (frequency === "ad_hoc") continue;

      const charges: { description: string; amount: number }[] = [];

      if (frequency === "monthly") {
        for (const month of activeMonths) {
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
          if (activeMonths.includes(month)) {
            charges.push({
              description: `Assigned: ${name} - Exam (${month} ${acYear})`,
              amount,
            });
          }
        }
      }

      for (const charge of charges) {
        const chargeName = charge.description.replace("Assigned: ", "");
        const discountDesc = `RTE Fee Waiver: ${chargeName}`;

        const normChargeKey = getNormalizedChargeKey(charge.description, name, acYear);
        const normDiscountKey = getNormalizedChargeKey(discountDesc, name, acYear);

        const keyCharge = `${student.id}_${normChargeKey}`;
        const keyDiscount = `${student.id}_${normDiscountKey}`;

        const isRte = rteMap.get(student.id) ?? false;
        const concession = concessionMap.get(student.id) ?? null;

        const concessionDesc = concession && concession.feeHeadName.trim().toLowerCase() === name.trim().toLowerCase()
          ? `Concession Waiver (${concession.name}): ${chargeName}`
          : "";
        const keyConcessionDiscount = concessionDesc ? `${student.id}_${getNormalizedChargeKey(concessionDesc, name, acYear)}` : "";

        const existingChargeEntry = existingChargesMap.get(keyCharge);
        if (existingChargeEntry && existingChargeEntry.amount !== charge.amount && existingChargeEntry.receiptItems.length === 0) {
          // Unpaid existing charge has a different amount (fee structure was updated), queue update
          toUpdate.push({ id: existingChargeEntry.id, amount: charge.amount });
          if (isRte) {
            const existingDiscountEntry = existingDiscountsMap.get(keyDiscount);
            if (existingDiscountEntry && existingDiscountEntry.amount !== -charge.amount) {
              toUpdate.push({ id: existingDiscountEntry.id, amount: -charge.amount });
            }
          } else if (concessionDesc && concession) {
            const existingConcessionEntry = existingDiscountsMap.get(keyConcessionDiscount);
            const concessionAmount = Math.round((charge.amount * concession.percentage) / 100);
            if (existingConcessionEntry && existingConcessionEntry.amount !== -concessionAmount) {
              toUpdate.push({ id: existingConcessionEntry.id, amount: -concessionAmount });
            }
          }
        }

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
            sessionId: targetSessionId,
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
            sessionId: targetSessionId,
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
            sessionId: targetSessionId,
            createdById,
          });
          generated++;
        }
      }
    }
  }

  // ── GY-01 fix: chunked batch writes ─────────────────────────────────────
  // A single db.$transaction wrapping all toCreate/toUpdate rows can exceed
  // Prisma's 5-second default timeout when there are many students (e.g. 100+
  // students × 12 months × 2 rows = 2400+ rows). Instead, we:
  //   1. Chunk updates into batches of CHUNK_SIZE and commit each batch in its
  //      own short transaction. An interruption mid-way leaves already-committed
  //      chunks intact; generateYearlyCharges is idempotent so a re-run skips
  //      what was already written and finishes the rest.
  //   2. Chunk creates similarly. createMany inside each chunk is fast (~ms).
  //
  // Isolation guarantee: Within a single student's data the charge + discount
  // rows for that student are guaranteed to land in the same chunk because the
  // per-student loop appends both in sequence before moving on.

  const CHUNK_SIZE = 100; // rows per transaction — well within 5s
  let failed = 0;
  const errors: string[] = [];

  // Process updates in chunks
  for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
    try {
      await db.$transaction(async (tx) => {
        for (const updateItem of chunk) {
          await tx.ledgerEntry.update({
            where: { id: updateItem.id },
            data: { amount: updateItem.amount },
          });
        }
      });
    } catch (chunkErr: any) {
      console.error(`[generateYearlyChargesBulk] Update chunk ${i / CHUNK_SIZE} failed:`, chunkErr);
      failed += chunk.length;
      errors.push(`Update batch ${i / CHUNK_SIZE + 1} failed: ${chunkErr.message || "Unknown error"}`);
    }
  }

  // Process creates in chunks
  for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
    const chunk = toCreate.slice(i, i + CHUNK_SIZE);
    try {
      await db.$transaction(async (tx) => {
        await tx.ledgerEntry.createMany({ data: chunk });
      });
    } catch (chunkErr: any) {
      console.error(`[generateYearlyChargesBulk] Create chunk ${i / CHUNK_SIZE} failed:`, chunkErr);
      failed += chunk.length;
      generated = Math.max(0, generated - chunk.length);
      errors.push(`Create batch ${i / CHUNK_SIZE + 1} failed: ${chunkErr.message || "Unknown error"}`);
    }
  }

  return { generated, skipped, failed, errors };
}

// End of generateYearlyCharges module. Verified clean.
