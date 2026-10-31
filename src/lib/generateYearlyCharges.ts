import db from "@/lib/db";
import { EntryType, type Prisma } from "@prisma/client";
import { lockSessionWorkflow } from "./sessionWorkflow";
import { resolveChargeSession, entryBelongsToSession } from "./chargeSession";
import { selectSessionStructures } from "./sessionFees";

// Academic year months in order: April → March
const ACADEMIC_MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March",
];

// Scheduled months for standard exams
export function getExamMonthsForHead(headName: string): string[] {
  const n = headName.toLowerCase();
  if (n.includes("unit 1") || n.includes("unit-1") || n.includes("unit1")) {
    return ["July"];
  }
  if (n.includes("half yearly") || n.includes("half-yearly") || n.includes("mid term") || n.includes("term 1") || n.includes("quarterly")) {
    return ["October"];
  }
  if (n.includes("unit 2") || n.includes("unit-2") || n.includes("unit2")) {
    return ["December"];
  }
  if (n.includes("yearly") || n.includes("annual") || n.includes("final") || n.includes("term 2")) {
    return ["March"];
  }
  for (const month of ACADEMIC_MONTHS) {
    if (n.includes(month.toLowerCase())) {
      return [month];
    }
  }
  return ["July", "October", "December", "March"];
}

/**
 * Helper to normalize charge description keys so "Auto-Assigned: July Tuition Fee"
 * and "Assigned: Tuition Fee - July 2026-2027" normalize to the same key "tuition fee_july_2026-2027".
 */
function getNormalizedChargeKey(description: string, feeHeadName: string, fallbackYear?: string): string {
  const descLower = description.toLowerCase();
  const headLower = feeHeadName.toLowerCase().trim();
  const yearMatch = description.match(/\d{4}-\d{4}/);
  const yearSuffix = yearMatch ? `_${yearMatch[0]}` : (fallbackYear ? `_${fallbackYear}` : "");
  
  if (descLower.includes("one-time") || descLower.includes("onetime")) return `${headLower}_onetime`;
  for (const month of ACADEMIC_MONTHS) {
    if (descLower.includes(month.toLowerCase())) {
      return `${headLower}_${month.toLowerCase()}${yearSuffix}`;
    }
  }
  if (descLower.includes("annual")) {
    return `${headLower}_annual${yearSuffix}`;
  }
  if (descLower.includes("one-time") || descLower.includes("onetime")) {
    return `${headLower}_onetime${yearSuffix}`;
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
async function generateYearlyChargesInTransaction(
  db: Prisma.TransactionClient,
  studentId: string,
  className: string,
  createdById: string,
  academicYear?: string,
  startingFeeMonth?: string,
  targetFeeHeadName?: string
): Promise<{ generated: number; skipped: number }> {
  // ── GY-04: Resolve active academic session
  const { target: targetSession, current: activeSession } = await resolveChargeSession(db, academicYear);
  const acYear = targetSession.name;
  const targetSessionId = targetSession.id;

  const enrollment = await db.studentSession.findUnique({
    where: { studentId_sessionId: { studentId, sessionId: targetSessionId } },
    select: { class: { select: { name: true } } },
  });
  if (enrollment) className = enrollment.class.name;
  else throw new Error("Target-session enrollment is required before generating fees. Review existing data first.");

  // Determine active months based on startingFeeMonth
  let activeMonths = ACADEMIC_MONTHS;
  if (startingFeeMonth && ACADEMIC_MONTHS.includes(startingFeeMonth)) {
    const startIndex = ACADEMIC_MONTHS.indexOf(startingFeeMonth);
    activeMonths = ACADEMIC_MONTHS.slice(startIndex);
  }

  // Find class-specific structure, fall back to "All"
  const allStructures = await db.feeStructure.findMany({
    where: { AND: [
      { OR: [{ className }, { className: "All" }] },
      { OR: [{ name: { startsWith: `[Session ${acYear}] ` } }, ...(targetSession.id === activeSession?.id ? [{ name: { not: { startsWith: "[Session " } } }] : [])] },
    ] },
    include: {
      items: { include: { feeHead: true } },
    },
  });

  const structures = selectSessionStructures(allStructures, acYear, activeSession?.name);

  if (structures.length === 0) {
    return { generated: 0, skipped: 0 };
  }

  // Merge items: class-specific takes priority over "All" for the same fee head
  const headMap = new Map<string, { feeHeadId: string; amount: number; frequency: string; name: string }>();
  // Process "All" first
  for (const struct of structures.filter((s) => s.className === "All")) {
    for (const item of struct.items) {
      if (item.feeHead.status === "ARCHIVED") continue;
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
      if (item.feeHead.status === "ARCHIVED") continue;
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
    where: { studentId, OR: [{ sessionId: targetSessionId }, { sessionId: null, description: { contains: acYear } }, { description: { contains: "One-Time", mode: "insensitive" } }, { description: { contains: "onetime", mode: "insensitive" } }] },
    select: { id: true, description: true, entryType: true, amount: true, receiptItems: { select: { id: true } }, sessionId: true, feeHead: { select: { name: true } } },
  });
  const existingChargesMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.CHARGE && (/one-?time/i.test(e.description) || entryBelongsToSession(e, targetSessionId, acYear))).map(e => [
      `${studentId}_${getNormalizedChargeKey(e.description, e.feeHead?.name || "", acYear)}`, e
    ])
  );
  const existingDiscountsMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.DISCOUNT && (/one-?time/i.test(e.description) || entryBelongsToSession(e, targetSessionId, acYear))).map(e => [
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
      const examMonths = getExamMonthsForHead(name);
      for (const month of examMonths) {
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
      if (existingChargeEntry?.receiptItems.length) { skipped++; continue; }
      if (frequency === "one_time" && existingChargeEntry && existingChargeEntry.sessionId !== targetSessionId) { skipped++; continue; }
      if (existingChargeEntry && existingChargeEntry.receiptItems.length === 0) {
        if (existingChargeEntry.amount !== charge.amount) toUpdate.push({ id: existingChargeEntry.id, amount: charge.amount });
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

  if (toCreate.length) await db.ledgerEntry.createMany({ data: toCreate });
  await applyUnpaidUpdates(db, toUpdate);

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
async function generateYearlyChargesBulkInTransaction(
  db: Prisma.TransactionClient,
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
  const { target: targetSession, current: activeSession } = await resolveChargeSession(db, academicYear);
  const acYear = targetSession.name;
  const targetSessionId = targetSession.id;

  if (students.length > 100) throw new Error("Generate fees in batches of at most 100 students.");
  const enrollments = await db.studentSession.findMany({
    where: { sessionId: targetSessionId, studentId: { in: students.map(s => s.id) } },
    select: { studentId: true, class: { select: { name: true } } },
  });
  const classByStudent = new Map(enrollments.map(e => [e.studentId, e.class]));
  if (students.some(s => !classByStudent.has(s.id))) throw new Error("Target-session enrollments are missing. Review existing data first.");
  students = students.map(s => ({ ...s, class: classByStudent.get(s.id)! }));

  // 1. Fetch all structures
  const allStructures = await db.feeStructure.findMany({
    where: { OR: [{ name: { startsWith: `[Session ${acYear}] ` } }, ...(targetSession.id === activeSession?.id ? [{ name: { not: { startsWith: "[Session " } } }] : [])] },
    include: {
      items: { include: { feeHead: true } },
    },
  });

  const structures = selectSessionStructures(allStructures, acYear, activeSession?.name);

  // 2. Fetch all existing entries (charges and discounts) for these students
  const existingEntries = await db.ledgerEntry.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      OR: [{ sessionId: targetSessionId }, { sessionId: null, description: { contains: acYear } }, { description: { contains: "One-Time", mode: "insensitive" } }, { description: { contains: "onetime", mode: "insensitive" } }],
    },
    select: {
      id: true,
      studentId: true,
      description: true,
      entryType: true,
      amount: true,
      receiptItems: { select: { id: true } },
      sessionId: true,
      feeHead: { select: { name: true } },
    },
  });

  const existingChargesMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.CHARGE && (/one-?time/i.test(e.description) || entryBelongsToSession(e, targetSessionId, acYear))).map((e) => {
      // Find matching fee head or description name with session-scoping
      const normKey = `${e.studentId}_${getNormalizedChargeKey(e.description, e.feeHead?.name || "", acYear)}`;
      return [normKey, e];
    })
  );
  const existingChargesSet = new Set(existingChargesMap.keys());
  const existingDiscountsMap = new Map(
    existingEntries.filter(e => e.entryType === EntryType.DISCOUNT && (/one-?time/i.test(e.description) || entryBelongsToSession(e, targetSessionId, acYear))).map((e) => [
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
        if (item.feeHead.status === "ARCHIVED") continue;
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
        if (item.feeHead.status === "ARCHIVED") continue;
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
        const examMonths = getExamMonthsForHead(name);
        for (const month of examMonths) {
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
        if (existingChargeEntry?.receiptItems.length) { skipped++; continue; }
        if (frequency === "one_time" && existingChargeEntry && existingChargeEntry.sessionId !== targetSessionId) { skipped++; continue; }
        if (existingChargeEntry && existingChargeEntry.receiptItems.length === 0) {
          // Synchronize unpaid charge and waiver amounts independently.
          if (existingChargeEntry.amount !== charge.amount) toUpdate.push({ id: existingChargeEntry.id, amount: charge.amount });
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

  // The outer workflow-locked transaction cover reads and writes.
  // This prevents concurrent retries from generating duplicate charges.
  await applyUnpaidUpdates(db, toUpdate);
  for (let i = 0; i < toCreate.length; i += 1000) await db.ledgerEntry.createMany({ data: toCreate.slice(i, i + 1000) });
  return { generated, skipped, failed: 0, errors: [] as string[] };
}

async function applyUnpaidUpdates(tx: Prisma.TransactionClient, updates: { id: string; amount: number }[]) {
  const groups = new Map<number, string[]>();
  for (const update of updates) {
    if (!groups.has(update.amount)) groups.set(update.amount, []);
    groups.get(update.amount)!.push(update.id);
  }
  for (const [amount, ids] of groups) {
    for (let start = 0; start < ids.length; start += 1000) await tx.ledgerEntry.updateMany({ where: { id: { in: ids.slice(start, start + 1000) } }, data: { amount } });
  }
}

export async function generateYearlyCharges(...args: Parameters<typeof generateYearlyChargesInTransaction> extends [Prisma.TransactionClient, ...infer Rest] ? Rest : never) {
  return db.$transaction(async tx => {
    await lockSessionWorkflow(tx);
    return generateYearlyChargesInTransaction(tx, ...args);
  }, { isolationLevel: "ReadCommitted", timeout: 30000, maxWait: 10000 });
}

export async function generateYearlyChargesBulk(...args: Parameters<typeof generateYearlyChargesBulkInTransaction> extends [Prisma.TransactionClient, ...infer Rest] ? Rest : never) {
  return db.$transaction(async tx => {
    await lockSessionWorkflow(tx);
    return generateYearlyChargesBulkInTransaction(tx, ...args);
  }, { isolationLevel: "ReadCommitted", timeout: 30000, maxWait: 10000 });
}

// No production corrections or automatic legacy enrollment backfill occur here.
