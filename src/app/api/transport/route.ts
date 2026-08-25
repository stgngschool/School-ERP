import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { validatePaisaAmount, getSafeErrorMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const stops = await db.transportStop.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(stops, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Fetch transport stops error:", error);
    return NextResponse.json({ error: "Failed to fetch transport stops" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
  }

  try {
    const { name, amount } = await request.json();
    if (!name || amount === undefined) {
      return NextResponse.json({ error: "Name and amount are required" }, { status: 400 });
    }

    const nameStr = String(name).trim();
    if (!nameStr) {
      return NextResponse.json({ error: "Transport stop name cannot be empty." }, { status: 400 });
    }

    let amountInPaisa: number;
    try {
      amountInPaisa = validatePaisaAmount(amount, "Transport amount", { isRupeesInput: true, min: 0 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // ── T-03: Fetch existing stop (if any) so we can detect an amount change.
    const existingStop = await db.transportStop.findUnique({ where: { name: nameStr } });
    const amountChanged = existingStop && existingStop.amount !== amountInPaisa;

    const stop = await db.$transaction(async (tx) => {
      const upserted = await tx.transportStop.upsert({
        where: { name: nameStr },
        update: { amount: amountInPaisa },
        create: { name: nameStr, amount: amountInPaisa },
      });

      // ── T-03: When an existing stop's fee amount changes, update all UNPAID
      // transport charge entries for students assigned to this stop.
      // A charge with ANY ReceiptItem is immutable — partial payments must not
      // be silently altered.  This update is idempotent and produces no duplicates.
      if (amountChanged) {
        const chargeDescription = `Transport Fee: ${nameStr}`;

        // Find students assigned to this stop
        const assignedStudents = await tx.student.findMany({
          where: { transportStopId: upserted.id },
          select: { id: true },
        });
        const assignedStudentIds = assignedStudents.map((s) => s.id);

        if (assignedStudentIds.length > 0) {
          // Find unpaid transport charges for these students
          const unpaidCharges = await tx.ledgerEntry.findMany({
            where: {
              studentId: { in: assignedStudentIds },
              entryType: "CHARGE",
              description: { startsWith: "Transport Fee:" },
            },
            include: { receiptItems: { select: { id: true } } },
          });

          const updatableIds = unpaidCharges
            .filter((c) => c.receiptItems.length === 0)
            .map((c) => c.id);

          if (updatableIds.length > 0) {
            await tx.ledgerEntry.updateMany({
              where: { id: { in: updatableIds } },
              data: {
                description: chargeDescription,
                amount: amountInPaisa,
              },
            });
          }
        }
      }

      return upserted;
    });

    // ── E-02: Structured Audit Logging
    await db.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "TRANSPORT_STOP_UPDATED",
        entityType: "TransportStop",
        entityId: stop.id,
        newValues: JSON.stringify({ name: nameStr, amount: amountInPaisa }),
      },
    }).catch((err) => console.error("Audit log error on transport:", err));

    return NextResponse.json({ success: true, stop });
  } catch (error) {
    console.error("Create transport stop error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to create transport stop.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Transport stop ID is required" }, { status: 400 });
    }

    try {
      await db.transportStop.delete({
        where: { id },
      });
    } catch (e: any) {
      if (e?.code !== "P2025") throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transport stop error:", error);
    return NextResponse.json({ error: "Failed to delete transport stop" }, { status: 500 });
  }
}

export const PUT = POST;
export const PATCH = POST;
