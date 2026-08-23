import { NextResponse } from "next/server";
import db from "@/lib/db";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyToken, getAuthUser } from "@/lib/auth";
import { PaymentMethod, EntryType } from "@prisma/client";
import { getNextReceiptNumber } from "@/lib/family";
import fs from "fs";
import path from "path";
import { getAcademicYear } from "@/lib/generateYearlyCharges";

function getChargeDueDate(chargeName: string, fallbackTime: number): string {
  const nameLower = chargeName.toLowerCase();
  
  if (nameLower.includes("april")) return "2026-04-10";
  if (nameLower.includes("may")) return "2026-05-10";
  if (nameLower.includes("june")) return "2026-06-10";
  if (nameLower.includes("july")) {
    if (nameLower.includes("unit 1") || nameLower.includes("exam")) return "2026-07-15";
    return "2026-07-10";
  }
  if (nameLower.includes("august")) return "2026-08-10";
  if (nameLower.includes("september")) return "2026-09-10";
  if (nameLower.includes("october")) {
    if (nameLower.includes("half yearly") || nameLower.includes("exam")) return "2026-10-15";
    return "2026-10-10";
  }
  if (nameLower.includes("november")) return "2026-11-10";
  if (nameLower.includes("december")) {
    if (nameLower.includes("unit 2") || nameLower.includes("exam")) return "2026-12-15";
    return "2026-12-10";
  }
  if (nameLower.includes("january")) return "2027-01-10";
  if (nameLower.includes("february")) return "2027-02-10";
  if (nameLower.includes("march")) {
    if (nameLower.includes("yearly") || nameLower.includes("exam")) return "2027-03-15";
    return "2027-03-10";
  }
  if (nameLower.includes("m/s") || nameLower.includes("annual") || nameLower.includes("admission") || nameLower.includes("previous session")) {
    return "2026-04-10";
  }
  
  return new Date(fallbackTime).toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    let ledgerWhere: any = {};
    let receiptWhere: any = {};
    let chargesWhere: any = { entryType: EntryType.CHARGE };
    let discountsWhere: any = { entryType: EntryType.DISCOUNT };

    if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: true }
      });
      const classIds = teacherProfile?.classes.map(c => c.id) || [];
      if (classIds.length === 0) {
        return NextResponse.json({
          ledgerEntries: [],
          receipts: [],
          dueItems: [],
        });
      }
      const teacherStudents = await db.student.findMany({
        where: { classId: { in: classIds } },
        select: { id: true }
      });
      const studentIds = teacherStudents.map((s) => s.id);
      ledgerWhere = { studentId: { in: studentIds } };
      receiptWhere = { studentId: { in: studentIds } };
      chargesWhere = { entryType: EntryType.CHARGE, studentId: { in: studentIds } };
      discountsWhere = { entryType: EntryType.DISCOUNT, studentId: { in: studentIds } };
    }

    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId }
      });
      if (!parentProfile) {
        return NextResponse.json({
          ledgerEntries: [],
          receipts: [],
          dueItems: [],
        });
      }

      const students = await db.student.findMany({
        where: { parentProfileId: parentProfile.id },
        select: { id: true }
      });
      const studentIds = students.map((s) => s.id);

      ledgerWhere = { studentId: { in: studentIds } };
      receiptWhere = { 
        OR: [
          { studentId: { in: studentIds } },
          { parentProfileId: parentProfile.id }
        ]
      };
      chargesWhere = { 
        entryType: EntryType.CHARGE,
        studentId: { in: studentIds }
      };
      discountsWhere = { 
        entryType: EntryType.DISCOUNT,
        studentId: { in: studentIds }
      };
    }

    const acYear = getAcademicYear();
    const startYear = parseInt(acYear.split("-")[0]);
    // Fetch charges created from March 1st of the current academic year to cover early assignments
    const sessionStartDate = new Date(`${startYear}-03-01T00:00:00.000Z`);
    chargesWhere.createdAt = { gte: sessionStartDate };
    discountsWhere.createdAt = { gte: sessionStartDate };

    // Execute optimized queries concurrently
    const [ledger, receipts, charges, discounts, paidGroups] = await Promise.all([
      db.ledgerEntry.findMany({
        where: ledgerWhere,
        take: 300,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          studentId: true,
          entryType: true,
          amount: true,
          description: true,
          createdById: true,
        },
      }),
      db.receipt.findMany({
        where: receiptWhere,
        take: 300,
        select: {
          id: true,
          studentId: true,
          receiptNumber: true,
          paymentMethod: true,
          transactionReference: true,
          amountPaid: true,
          remarks: true,
          createdAt: true,
          createdById: true,
          student: {
            select: {
              id: true,
              name: true,
              admissionNumber: true,
              fatherName: true,
              class: {
                select: {
                  name: true,
                  section: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              name: true,
              role: true,
            },
          },
          items: {
            select: {
              amount: true,
              ledgerEntry: {
                select: {
                  id: true,
                  studentId: true,
                  description: true,
                  amount: true,
                  student: {
                    select: {
                      id: true,
                      name: true,
                      admissionNumber: true,
                      fatherName: true,
                      class: {
                        select: {
                          name: true,
                          section: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.ledgerEntry.findMany({
        where: chargesWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          studentId: true,
          description: true,
          amount: true,
          createdAt: true,
          sessionId: true,
        },
      }),
      db.ledgerEntry.findMany({
        where: discountsWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          studentId: true,
          description: true,
          amount: true,
        },
      }),
      db.receiptItem.groupBy({
        by: ["ledgerEntryId"],
        _sum: { amount: true },
      }),
    ]);

    const formattedLedger = ledger.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      type: l.entryType,
      amount: l.amount,
      description: l.description,
      createdById: l.createdById,
    }));

    const formattedReceipts = receipts.map((r: any) => {
      const studentIds = Array.from(
        new Set(r.items.map((i: any) => i.ledgerEntry?.studentId).filter(Boolean))
      );
      const studentNames = Array.from(
        new Set(r.items.map((i: any) => i.ledgerEntry?.student?.name).filter(Boolean))
      );
      const classSections = Array.from(
        new Set(
          r.items
            .map((i: any) => {
              const cls = i.ledgerEntry?.student?.class;
              return cls ? `${cls.name}-${cls.section}` : "";
            })
            .filter(Boolean)
        )
      );

      const sClass = r.student?.class
        ? `${r.student.class.name}-${r.student.class.section}`
        : classSections.join(", ");

      let meta: any = null;
      if (r.remarks) {
        try {
          meta = JSON.parse(r.remarks);
        } catch {}
      }

      const fallbackSubtotal = r.items.reduce(
        (sum: number, i: any) => sum + (i.ledgerEntry?.amount || i.amount),
        0
      );
      const subtotal = meta?.subtotal ?? (fallbackSubtotal > r.amountPaid ? fallbackSubtotal : r.amountPaid);
      const discount = meta?.discount ?? 0;
      const arrears = meta?.arrears ?? Math.max(0, subtotal - r.amountPaid - discount);

      const fallbackItems = r.items.map((i: any) => {
        const sName = i.ledgerEntry?.student?.name ? `${i.ledgerEntry.student.name}: ` : "";
        const desc = (i.ledgerEntry?.description || "")
          .replace("Payment for: Assigned: ", "")
          .replace("Payment for: ", "");
        const orig = i.ledgerEntry?.amount || i.amount;
        return {
          name: `${sName}${desc || "Fee Particular"}`,
          originalAmount: orig,
          amount: i.amount,
          discount: 0,
          balance: Math.max(0, orig - i.amount),
        };
      });

      const items =
        meta?.items && Array.isArray(meta.items) && meta.items.length > 0
          ? meta.items
          : fallbackItems;

      const admissionNo =
        meta?.admissionNo ||
        r.student?.admissionNumber ||
        r.items[0]?.ledgerEntry?.student?.admissionNumber ||
        "Unified Family";

      const fatherName =
        meta?.fatherName ||
        r.student?.fatherName ||
        r.items[0]?.ledgerEntry?.student?.fatherName ||
        "";

      return {
        id: r.id,
        studentId: r.studentId || (studentIds.length === 1 ? (studentIds[0] as string) : null),
        studentIds,
        receiptNo: r.receiptNumber,
        amount: r.amountPaid,
        subtotal,
        discount,
        arrears,
        paymentMethod: r.paymentMethod,
        method: r.paymentMethod,
        transactionRef: r.transactionReference || "",
        createdAt: r.createdAt.toISOString().split("T")[0],
        studentName: r.student?.name || studentNames.join(", "),
        classSection: sClass,
        admissionNo,
        fatherName,
        collectedBy: r.createdBy?.name || "System",
        collectedByRole: r.createdBy?.role || "ADMIN",
        createdById: r.createdById,
        details: r.items
          .map((i: any) => {
            const sName = i.ledgerEntry?.student?.name || "Student";
            const desc = (i.ledgerEntry?.description || "")
              .replace("Payment for: Assigned: ", "")
              .replace("Payment for: ", "");
            return `${sName}: ${desc} (Rs. ${i.amount / 100})`;
          })
          .join(" + "),
        items,
      };
    });

    // O(1) paid lookup map
    const paidMap = new Map<string, number>();
    for (const p of paidGroups) {
      if (p.ledgerEntryId) {
        paidMap.set(p.ledgerEntryId, p._sum.amount || 0);
      }
    }

    // O(1) discount lookup map by studentId + chargeName
    const discountMap = new Map<string, number>();
    for (const d of discounts) {
      const dName = d.description.replace("Discount for: ", "").replace(/.*: /, "").trim().toLowerCase();
      const key = `${d.studentId}||${dName}`;
      discountMap.set(key, (discountMap.get(key) || 0) + Math.abs(d.amount));
    }

    const configPath = path.join(process.cwd(), "src/data/school.json");
    let schoolConfig = { enableLateFee: false, lateFeeGraceDays: 10, lateFeeAmount: 50, lateFeeType: "FLAT" };
    try {
      if (fs.existsSync(configPath)) {
        schoolConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch (e) {
      // Graceful fallback to default config
    }

    const now = Date.now();
    const graceDays = schoolConfig.lateFeeGraceDays ?? 10;
    const isLateFeeEnabled = !!schoolConfig.enableLateFee;
    const isDailyFine = schoolConfig.lateFeeType === "DAILY";
    const baseFineAmount = (schoolConfig.lateFeeAmount ?? 50) * 100;
    const dailyFineUnit = (schoolConfig.lateFeeAmount ?? 5) * 100;

    const formattedDues = charges.map((c) => {
      const chargeName = c.description.replace("Assigned: ", "").trim();
      const totalPaid = paidMap.get(c.id) || 0;
      const dKey = `${c.studentId}||${chargeName.toLowerCase()}`;
      const totalDiscount = discountMap.get(dKey) || 0;

      const outstanding = c.amount - totalDiscount - totalPaid;
      const cTime = c.createdAt.getTime();
      const dueTime = cTime + 15 * 24 * 60 * 60 * 1000;
      const graceTime = dueTime + graceDays * 24 * 60 * 60 * 1000;

      let fineAmount = 0;
      if (isLateFeeEnabled && now > graceTime && outstanding > 0) {
        if (isDailyFine) {
          const daysOver = Math.floor((now - graceTime) / (24 * 60 * 60 * 1000)) + 1;
          fineAmount = daysOver * dailyFineUnit;
        } else {
          fineAmount = baseFineAmount;
        }
      }

      const chargeDueDate = getChargeDueDate(chargeName, dueTime);

      return {
        id: c.id,
        studentId: c.studentId,
        name: chargeName,
        amount: Math.max(0, outstanding),
        originalAmount: c.amount,
        totalPaid: totalPaid,
        totalDiscount: totalDiscount,
        dueDate: chargeDueDate,
        sessionName: acYear,
        isCurrentSession: true,
        status: (outstanding <= 0 ? "PAID" : "UNPAID") as "PAID" | "UNPAID",
        fine: fineAmount,
      };
    });

    return NextResponse.json({
      ledgerEntries: formattedLedger,
      receipts: formattedReceipts,
      dueItems: formattedDues,
    });
  } catch (error: any) {
    console.error("Fetch billing error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing ledger: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    const creatorUserId = authUser.userId;

    const body = await request.json();
    const { action, studentId, parentProfileId, items, paymentMethod, transactionRef, title, amount, headName } = body;

    // Single student custom charge handler
    if (action === "ADD_CUSTOM_CHARGE") {
      if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
        return NextResponse.json({ error: "Only admins and accountants can add charges." }, { status: 403 });
      }

      if (!studentId || !title || !amount || parseFloat(amount) <= 0) {
        return NextResponse.json({ error: "Student ID, title, and valid positive amount are required." }, { status: 400 });
      }

      const amountInPaisa = Math.round(parseFloat(amount) * 100);
      let feeHead = await db.feeHead.findFirst({
        where: { name: headName || "Other Fee" },
      });

      if (!feeHead) {
        feeHead = await db.feeHead.create({
          data: {
            name: headName || "Other Fee",
            frequency: "ad_hoc",
          },
        });
      }

      const entry = await db.ledgerEntry.create({
        data: {
          studentId,
          feeHeadId: feeHead.id,
          entryType: EntryType.CHARGE,
          amount: amountInPaisa,
          description: `Assigned: ${title.trim()}`,
          createdById: creatorUserId,
        },
      });

      return NextResponse.json({ success: true, entry });
    }

    if (!items || items.length === 0 || !paymentMethod) {
      return NextResponse.json({ error: "Missing required checkout parameters." }, { status: 400 });
    }

    // Role check: Only ADMIN and ACCOUNTANT can record offline receipts or grant fee discounts
    if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden. Only authorized finance staff can record fee receipts." }, { status: 403 });
    }

    // Resolve parent profile ID and student ID
    let resolvedParentProfileId = parentProfileId || null;
    let resolvedStudentId = studentId || null;

    if (resolvedStudentId && !resolvedParentProfileId) {
      const std = await db.student.findUnique({
        where: { id: resolvedStudentId },
      });
      if (std) {
        resolvedParentProfileId = std.parentProfileId;
      }
    }

    // Double check item level parent lookup if needed
    if (!resolvedParentProfileId && items.length > 0) {
      const firstCharge = await db.ledgerEntry.findUnique({
        where: { id: items[0].ledgerEntryId },
        include: { student: true },
      });
      if (firstCharge && firstCharge.student) {
        resolvedParentProfileId = firstCharge.student.parentProfileId;
      }
    }

    const uniqueStudentIds = Array.from(new Set(items.map((i: any) => i.studentId).filter(Boolean)));
    if (!resolvedStudentId && uniqueStudentIds.length === 1) {
      resolvedStudentId = uniqueStudentIds[0] as string;
    }

    if (!resolvedStudentId && !resolvedParentProfileId) {
      return NextResponse.json({ error: "Could not resolve student or family profile." }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const receiptNo = await getNextReceiptNumber(tx);
      let actualTotalPayPaisa = 0;

      // 1. Calculate and validate charges/overpayments first
      const validatedItems: Array<{
        charge: any;
        itemStudentId: string;
        chargeName: string;
        payAmountPaisa: number;
        discountAmountPaisa: number;
        fineAmountPaisa: number;
      }> = [];

      for (const item of items) {
        const { ledgerEntryId, payAmount, discountAmount, fineAmount } = item;
        const requestedPayPaisa = Math.max(0, Math.round(Number(payAmount) || 0));
        const requestedDiscountPaisa = Math.max(0, Math.round(Number(discountAmount) || 0));
        const fineAmountPaisa = Math.max(0, Math.round(Number(fineAmount || 0)));

        const charge = await tx.ledgerEntry.findUnique({
          where: { id: ledgerEntryId },
          include: { receiptItems: true },
        });

        if (!charge) continue;

        const chargeName = charge.description.replace("Assigned: ", "").trim();
        const itemStudentId = charge.studentId;

        // Calculate existing paid and discounts
        const existingPaid = charge.receiptItems.reduce((sum, ri) => sum + ri.amount, 0);
        const discounts = await tx.ledgerEntry.findMany({
          where: { studentId: itemStudentId, entryType: EntryType.DISCOUNT },
        });
        const associatedDiscounts = discounts
          .filter((d) => d.description.endsWith(`: ${chargeName}`) || d.description === `Discount for: ${chargeName}`)
          .reduce((sum, d) => sum + Math.abs(d.amount), 0);

        const outstandingPaisa = Math.max(0, charge.amount - associatedDiscounts - existingPaid);

        // Cap discount to outstanding balance
        const discountAmountPaisa = Math.min(requestedDiscountPaisa, outstandingPaisa);

        // Cap payment amount to remaining balance after discount
        const maxPayablePaisa = Math.max(0, outstandingPaisa - discountAmountPaisa);
        const payAmountPaisa = Math.min(requestedPayPaisa, maxPayablePaisa);

        actualTotalPayPaisa += payAmountPaisa + fineAmountPaisa;

        validatedItems.push({
          charge,
          itemStudentId,
          chargeName,
          payAmountPaisa,
          discountAmountPaisa,
          fineAmountPaisa,
        });
      }

      // 2. Create Receipt with actual total paid
      const totalOriginalDues = validatedItems.reduce((sum, vi) => sum + vi.charge.amount, 0);
      const totalDiscountPaisa = validatedItems.reduce((sum, vi) => sum + vi.discountAmountPaisa, 0);
      const remainingArrearsPaisa = Math.max(0, totalOriginalDues - actualTotalPayPaisa - totalDiscountPaisa);

      const snapshot = {
        subtotal: totalOriginalDues,
        discount: totalDiscountPaisa,
        arrears: remainingArrearsPaisa,
        items: validatedItems.map((vi) => ({
          name: vi.chargeName,
          originalAmount: vi.charge.amount,
          amount: vi.payAmountPaisa,
          discount: vi.discountAmountPaisa,
          balance: Math.max(0, vi.charge.amount - vi.payAmountPaisa - vi.discountAmountPaisa),
        })),
      };

      const receipt = await tx.receipt.create({
        data: {
          studentId: resolvedStudentId,
          parentProfileId: resolvedParentProfileId,
          receiptNumber: receiptNo,
          paymentMethod: paymentMethod as PaymentMethod,
          transactionReference: transactionRef || null,
          amountPaid: actualTotalPayPaisa,
          remarks: JSON.stringify(snapshot),
          createdById: creatorUserId,
        },
      });

      // 3. Apply items to ledger and receipt
      for (const vi of validatedItems) {
        const { charge, itemStudentId, chargeName, payAmountPaisa, discountAmountPaisa, fineAmountPaisa } = vi;

        // C. Handle Fine if any
        if (fineAmountPaisa > 0) {
          const fineEntry = await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.FINE,
              amount: fineAmountPaisa,
              description: `Late Fee Fine: ${chargeName}`,
              createdById: creatorUserId,
            },
          });

          // Create offsetting PAYMENT for the fine (so it doesn't show as permanently unpaid)
          await tx.receiptItem.create({
            data: {
              receiptId: receipt.id,
              ledgerEntryId: fineEntry.id,
              amount: fineAmountPaisa,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.PAYMENT,
              amount: -fineAmountPaisa,
              referenceId: receipt.id,
              description: `Payment for: Late Fee Fine: ${chargeName}`,
              createdById: creatorUserId,
            },
          });
        }

        // A. Handle Discount if any
        if (discountAmountPaisa > 0) {
          await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.DISCOUNT,
              amount: -discountAmountPaisa,
              referenceId: receipt.id,
              description: `Discount for: ${chargeName}`,
              createdById: creatorUserId,
            },
          });
        }

        // B. Handle Payment if any
        if (payAmountPaisa > 0) {
          await tx.receiptItem.create({
            data: {
              receiptId: receipt.id,
              ledgerEntryId: charge.id,
              amount: payAmountPaisa,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.PAYMENT,
              amount: -payAmountPaisa,
              referenceId: receipt.id,
              description: `Payment for: ${chargeName}`,
              createdById: creatorUserId,
            },
          });
        }
      }

      return receipt;
    });

    // Return receipt formatted with details
    const student = resolvedStudentId
      ? await db.student.findUnique({
          where: { id: resolvedStudentId },
          include: { class: true },
        })
      : null;

    const collectorUser = await db.user.findUnique({
      where: { id: authUser.userId },
      select: { name: true, role: true },
    });

    return NextResponse.json({
      success: true,
      receipt: {
        id: result.id,
        studentId: result.studentId,
        receiptNo: result.receiptNumber,
        amount: result.amountPaid,
        paymentMethod: result.paymentMethod,
        transactionRef: result.transactionReference || "",
        createdAt: result.createdAt.toISOString().split("T")[0],
        studentName: student?.name || "Multiple Siblings",
        classSection: student ? `${student.class.name}-${student.class.section}` : "Unified Family",
        collectedBy: collectorUser?.name || authUser.username || "Finance Staff",
        collectedByRole: collectorUser?.role || authUser.role || "ADMIN",
        items: items.map((i: any) => ({
          name: `Payment applied (incl. discount: Rs. ${(Number(i.discountAmount) || 0) / 100})`,
          amount: i.payAmount,
        })),
      },
    });
  } catch (error: any) {
    console.error("Payment checkout error:", error);
    return NextResponse.json({ error: "Checkout transaction failed" }, { status: 500 });
  }
}
