import { NextResponse } from "next/server";
import db from "@/lib/db";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyToken, getAuthUser } from "@/lib/auth";
import { PaymentMethod, EntryType } from "@prisma/client";
import { getNextReceiptNumber } from "@/lib/family";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Execute all database queries concurrently in parallel
    const [ledger, receipts, charges, discounts] = await Promise.all([
      db.ledgerEntry.findMany({
        take: 300,
        orderBy: { createdAt: "desc" },
      }),
      db.receipt.findMany({
        take: 200,
        include: {
          student: {
            include: {
              class: true,
            },
          },
          createdBy: true,
          items: {
            include: {
              ledgerEntry: {
                include: {
                  student: {
                    include: {
                      class: true,
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
        where: { entryType: EntryType.CHARGE },
        include: {
          receiptItems: true,
        },
      }),
      db.ledgerEntry.findMany({
        where: { entryType: EntryType.DISCOUNT },
      }),
    ]);

    const formattedLedger = ledger.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      type: l.entryType,
      amount: l.amount / 100,
      description: l.description,
      createdAt: l.createdAt.toISOString().split("T")[0],
      createdById: l.createdById,
    }));

    // Optimize discount lookup by grouping by studentId
    const discountsByStudent = new Map<string, typeof discounts>();
    for (const d of discounts) {
      if (!discountsByStudent.has(d.studentId)) {
        discountsByStudent.set(d.studentId, []);
      }
      discountsByStudent.get(d.studentId)!.push(d);
    }

    const configPath = path.join(process.cwd(), "src/data/school.json");
    let schoolConfig = { enableLateFee: false, lateFeeGraceDays: 10, lateFeeAmount: 50, lateFeeType: "FLAT" };
    try {
      if (fs.existsSync(configPath)) {
        schoolConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch (e) {
      console.error("Failed to read school config inside billing API:", e);
    }

    const formattedDues = charges
      .map((c) => {
        // Calculate total payments applied to this specific charge
        const totalPaid = c.receiptItems.reduce((sum, item) => sum + item.amount, 0);

        // Find any ad-hoc discounts applied to this charge description
        const chargeName = c.description.replace("Assigned: ", "");
        const studentDiscounts = discountsByStudent.get(c.studentId) || [];
        const associatedDiscounts = studentDiscounts
          .filter((d) => d.description.endsWith(`: ${chargeName}`) || d.description === `Discount for: ${chargeName}`)
          .reduce((sum, d) => sum + Math.abs(d.amount), 0);


        const outstanding = c.amount - associatedDiscounts - totalPaid;

        const graceDays = schoolConfig.lateFeeGraceDays ?? 10;
        const dueTime = c.createdAt.getTime() + 15 * 24 * 60 * 60 * 1000;
        const graceTime = dueTime + graceDays * 24 * 60 * 60 * 1000;

        let fineAmount = 0;
        if (schoolConfig.enableLateFee && Date.now() > graceTime && outstanding > 0) {
          if (schoolConfig.lateFeeType === "DAILY") {
            const msDiff = Date.now() - graceTime;
            const daysOver = Math.floor(msDiff / (24 * 60 * 60 * 1000)) + 1; // At least 1 day over
            fineAmount = daysOver * (schoolConfig.lateFeeAmount ?? 5);
          } else {
            fineAmount = schoolConfig.lateFeeAmount ?? 50;
          }
        }

        return {
          id: c.id,
          studentId: c.studentId,
          name: chargeName,
          amount: outstanding / 100,
          originalAmount: c.amount / 100,
          totalPaid: totalPaid / 100,
          totalDiscount: associatedDiscounts / 100,
          dueDate: new Date(dueTime).toISOString().split("T")[0],
          status: outstanding <= 0 ? "PAID" : "UNPAID",
          fine: fineAmount,
        };
      })
      .filter((d) => d.status === "UNPAID" && d.amount > 0);

    return NextResponse.json({
      ledgerEntries: formattedLedger,
      receipts: formattedReceipts,
      dueItems: formattedDues,
    });
  } catch (error) {
    console.error("Fetch billing error:", error);
    return NextResponse.json({ error: "Failed to fetch billing ledger" }, { status: 500 });
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

    const receiptNo = await getNextReceiptNumber();

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
        const requestedPayPaisa = Math.round(Number(payAmount) * 100);
        const discountAmountPaisa = Math.round(Number(discountAmount) * 100);
        const fineAmountPaisa = Math.round(Number(fineAmount || 0) * 100);

        const charge = await tx.ledgerEntry.findUnique({
          where: { id: ledgerEntryId },
          include: { receiptItems: true },
        });

        if (!charge) continue;

        const chargeName = charge.description.replace("Assigned: ", "");
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

        // Cap payment amount to outstanding balance to prevent overpayment
        const payAmountPaisa = Math.min(requestedPayPaisa, outstandingPaisa);

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
      const receipt = await tx.receipt.create({
        data: {
          studentId: resolvedStudentId,
          parentProfileId: resolvedParentProfileId,
          receiptNumber: receiptNo,
          paymentMethod: paymentMethod as PaymentMethod,
          transactionReference: transactionRef || null,
          amountPaid: actualTotalPayPaisa,
          createdById: creatorUserId,
        },
      });

      // 3. Apply items to ledger and receipt
      for (const vi of validatedItems) {
        const { charge, itemStudentId, chargeName, payAmountPaisa, discountAmountPaisa, fineAmountPaisa } = vi;

        // C. Handle Fine if any
        if (fineAmountPaisa > 0) {
          await tx.ledgerEntry.create({
            data: {
              studentId: itemStudentId,
              feeHeadId: charge.feeHeadId,
              entryType: EntryType.FINE,
              amount: fineAmountPaisa,
              description: `Late Fee Fine: ${chargeName}`,
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

    return NextResponse.json({
      success: true,
      receipt: {
        id: result.id,
        studentId: result.studentId,
        receiptNo: result.receiptNumber,
        amount: result.amountPaid / 100,
        paymentMethod: result.paymentMethod,
        transactionRef: result.transactionReference || "",
        createdAt: result.createdAt.toISOString().split("T")[0],
        studentName: student?.name || "Multiple Siblings",
        classSection: student ? `${student.class.name}-${student.class.section}` : "Unified Family",
        items: items.map((i: any) => ({
          name: `Payment applied (incl. discount: Rs. ${i.discountAmount})`,
          amount: i.payAmount,
        })),
      },
    });
  } catch (error: any) {
    console.error("Payment checkout error:", error);
    return NextResponse.json({ error: "Checkout transaction failed" }, { status: 500 });
  }
}

