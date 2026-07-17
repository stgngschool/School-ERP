import { NextResponse } from "next/server";
import db from "@/lib/db";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { PaymentMethod, EntryType } from "@prisma/client";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const ledger = await db.ledgerEntry.findMany({
      orderBy: { createdAt: "desc" },
    });

    const formattedLedger = ledger.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      type: l.entryType,
      amount: l.amount / 100,
      description: l.description,
      createdAt: l.createdAt.toISOString().split("T")[0],
    }));

    const receipts = await db.receipt.findMany({
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
    });

    const formattedReceipts = receipts.map((r) => {
      const studentIds = Array.from(new Set(r.items.map((i) => i.ledgerEntry.studentId)));
      const studentNames = Array.from(
        new Set(r.items.map((i) => i.ledgerEntry.student?.name).filter(Boolean))
      );
      const classSections = Array.from(
        new Set(
          r.items
            .map((i) => {
              const cls = i.ledgerEntry.student?.class;
              return cls ? `${cls.name}-${cls.section}` : "";
            })
            .filter(Boolean)
        )
      );

      return {
        id: r.id,
        studentId: r.studentId || (studentIds.length === 1 ? studentIds[0] : null),
        studentIds,
        receiptNo: r.receiptNumber,
        amount: r.amountPaid / 100,
        paymentMethod: r.paymentMethod,
        method: r.paymentMethod,
        transactionRef: r.transactionReference || "",
        createdAt: r.createdAt.toISOString().split("T")[0],
        studentName: r.student?.name || studentNames.join(", "),
        classSection: r.student
          ? `${r.student.class.name}-${r.student.class.section}`
          : classSections.join(", "),
        collectedBy: r.createdBy?.name || "System",
        collectedByRole: r.createdBy?.role || "ADMIN",
        details: r.items
          .map((i) => {
            const sName = i.ledgerEntry.student?.name || "Student";
            const desc = i.ledgerEntry.description
              .replace("Payment for: Assigned: ", "")
              .replace("Payment for: ", "");
            return `${sName}: ${desc} (Rs. ${i.amount / 100})`;
          })
          .join(" + "),
        items: r.items.map((i) => ({
          name: `${i.ledgerEntry.student?.name || "Student"}: ${i.ledgerEntry.description}`,
          amount: i.amount / 100,
        })),
      };
    });

    // Calculate due items dynamically
    // A charge is unpaid if total charges (plus/minus discounts/charges) exceed total payments applied to it.
    const charges = await db.ledgerEntry.findMany({
      where: { entryType: EntryType.CHARGE },
      include: {
        // Find all receipt items and discounts linked to this charge
        receiptItems: true,
      },
    });

    // Also get all discount entries. In schema, we can match discount entries by description or links.
    // For simplicity, we can fetch all DISCOUNT entries and group them.
    const discounts = await db.ledgerEntry.findMany({
      where: { entryType: EntryType.DISCOUNT },
    });

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
          .filter((d) => d.description.includes(chargeName))
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
    const { studentId, parentProfileId, items, paymentMethod, transactionRef } = await request.json();

    if (!items || items.length === 0 || !paymentMethod) {
      return NextResponse.json({ error: "Missing required checkout parameters." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    let creatorUserId = "";

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        creatorUserId = decoded.userId;
      }
    }

    if (!creatorUserId) {
      const accountant = await db.user.findFirst({ where: { role: "ACCOUNTANT" } });
      creatorUserId = accountant?.id || "";
    }

    const totalPayAmountPaisa = items.reduce(
      (sum: number, item: any) => sum + Math.floor(Number(item.payAmount) * 100),
      0
    );
    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

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
      // 1. Create Receipt
      const receipt = await tx.receipt.create({
        data: {
          studentId: resolvedStudentId,
          parentProfileId: resolvedParentProfileId,
          receiptNumber: receiptNo,
          paymentMethod: paymentMethod as PaymentMethod,
          transactionReference: transactionRef || null,
          amountPaid: totalPayAmountPaisa,
          createdById: creatorUserId,
        },
      });

       // 2. Loop through each item and apply payment / discount
      for (const item of items) {
        const { ledgerEntryId, payAmount, discountAmount, fineAmount } = item;
        const payAmountPaisa = Math.floor(Number(payAmount) * 100);
        const discountAmountPaisa = Math.floor(Number(discountAmount) * 100);
        const fineAmountPaisa = Math.floor(Number(fineAmount || 0) * 100);

        // Fetch original charge details
        const charge = await tx.ledgerEntry.findUnique({
          where: { id: ledgerEntryId },
        });

        if (!charge) continue;

        const chargeName = charge.description.replace("Assigned: ", "");
        const itemStudentId = charge.studentId;

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
