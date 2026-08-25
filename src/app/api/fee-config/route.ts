import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateYearlyCharges, generateYearlyChargesBulk, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // ── F-04: GET must be a pure read operation without database side effects.
    // Return active fee heads directly without upserting defaults on read.
    const heads = await db.feeHead.findMany({ where: { status: "ACTIVE" } });


    const structures = await db.feeStructure.findMany({
      include: {
        items: {
          include: {
            feeHead: true,
          },
        },
      },
    });

    const formattedHeads = heads.map((h) => ({
      name: h.name,
      frequency: h.frequency,
    }));
    const formattedStructures = structures.map((s) => ({
      name: s.name,
      frequency: s.frequency,
      className: s.className || "All",
      total: s.items.reduce((sum, item) => sum + item.amount, 0) / 100,
      items: s.items.map(item => ({
        headName: item.feeHead.name,
        amount: item.amount / 100
      })),
    }));

    return NextResponse.json({
      feeHeads: formattedHeads,
      feeStructures: formattedStructures,
    });
  } catch (error) {
    console.error("Fetch fee config error:", error);
    return NextResponse.json({ error: "Failed to fetch fee structures" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
    }

    const body = await request.json();
    const { action, name, frequency, total } = body;

    if (action === "ADD_HEAD") {
      if (!name) return NextResponse.json({ error: "Fee head name is required." }, { status: 400 });
      
      const headName = String(name).trim();
      const head = await db.feeHead.upsert({
        where: { name: headName },
        update: { frequency: frequency || "monthly", status: "ACTIVE" },
        create: { name: headName, frequency: frequency || "monthly", status: "ACTIVE" },
      });

      return NextResponse.json({ success: true, head });
    }

    if (action === "ADD_STRUCTURE") {
      const { className, items } = body;
      if (!name || !frequency) {
        return NextResponse.json({ error: "Name and frequency are required." }, { status: 400 });
      }

      const structName = String(name).trim();
      const structClass = className || "All";

      const structure = await db.$transaction(async (tx) => {
        // ── F-02: Upsert fee heads safely without concurrency collisions
        const preparedItems: { feeHeadId: string; amount: number }[] = [];
        if (items && Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            const headName = String(item.headName).trim();
            if (!headName) continue;
            const feeHead = await tx.feeHead.upsert({
              where: { name: headName },
              update: { status: "ACTIVE" },
              create: { name: headName, frequency: "monthly", status: "ACTIVE" },
            });
            const itemAmountPaisa = Math.round(Number(item.amount) || 0);
            preparedItems.push({ feeHeadId: feeHead.id, amount: itemAmountPaisa });
          }
        }

        // Upsert structure uniquely by [name, className]
        const struct = await tx.feeStructure.upsert({
          where: {
            name_className: {
              name: structName,
              className: structClass,
            },
          },
          update: { frequency },
          create: {
            name: structName,
            frequency,
            className: structClass,
          },
        });

        // Replace items atomically
        await tx.feeStructureItem.deleteMany({
          where: { feeStructureId: struct.id },
        });

        for (const item of preparedItems) {
          await tx.feeStructureItem.create({
            data: {
              feeStructureId: struct.id,
              feeHeadId: item.feeHeadId,
              amount: item.amount,
            },
          });
        }

        // ── F-03: Ensure fee assignments point to this active structure and clean up stale assignments
        const activeSession = await tx.academicSession.findFirst({ where: { isCurrent: true } });
        if (activeSession) {
          const targetStudents = await tx.student.findMany({
            where: {
              status: "ACTIVE",
              ...(structClass !== "All" ? { class: { name: structClass } } : {}),
            },
            select: { id: true },
          });

          for (const s of targetStudents) {
            await tx.feeAssignment.upsert({
              where: {
                studentId_feeStructureId_sessionId: {
                  studentId: s.id,
                  feeStructureId: struct.id,
                  sessionId: activeSession.id,
                },
              },
              update: {},
              create: {
                studentId: s.id,
                feeStructureId: struct.id,
                sessionId: activeSession.id,
              },
            });
          }
        }

        return struct;
      });

      // ── F-01 fix: detach bulk backfill from the HTTP request path ──────────
      const targetClass = className || "All";
      const systemUser = await db.user.findFirst({
        where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
      });

      if (systemUser) {
        // Kick off the backfill without blocking the response.
        void (async () => {
          try {
            const studentsToBackfill = await db.student.findMany({
              where: {
                status: "ACTIVE",
                ...(targetClass !== "All" ? { class: { name: targetClass } } : {}),
              },
              include: { class: true },
            });
            if (studentsToBackfill.length > 0) {
              await generateYearlyChargesBulk(studentsToBackfill, systemUser.id, getAcademicYear());
            }
          } catch (err) {
            console.error("[fee-config] ADD_STRUCTURE backfill error:", err);
          }
        })();
      }

      return NextResponse.json({ success: true, structure });

    }

    if (action === "CLONE_STRUCTURE") {
      const { fromClassName, toClassName } = body;
      if (!fromClassName || !toClassName) {
        return NextResponse.json({ error: "Source and target class names are required." }, { status: 400 });
      }

      const sourceStructure = await db.feeStructure.findFirst({
        where: { className: fromClassName },
        include: { items: { include: { feeHead: true } } },
      });

      if (!sourceStructure) {
        return NextResponse.json({ error: "Source class fee structure not found." }, { status: 404 });
      }

      const targetStructName = `${toClassName} Fee Structure`;

      const targetStructure = await db.$transaction(async (tx) => {
        const target = await tx.feeStructure.upsert({
          where: {
            name_className: {
              name: targetStructName,
              className: toClassName,
            },
          },
          update: {
            frequency: sourceStructure.frequency,
          },
          create: {
            name: targetStructName,
            frequency: sourceStructure.frequency,
            className: toClassName,
          },
        });

        await tx.feeStructureItem.deleteMany({
          where: { feeStructureId: target.id },
        });

        for (const item of sourceStructure.items) {
          await tx.feeStructureItem.create({
            data: {
              feeStructureId: target.id,
              feeHeadId: item.feeHeadId,
              amount: item.amount,
            },
          });
        }

        // ── F-03: Sync fee assignments for target class
        const activeSession = await tx.academicSession.findFirst({ where: { isCurrent: true } });
        if (activeSession) {
          const targetStudents = await tx.student.findMany({
            where: { status: "ACTIVE", class: { name: toClassName } },
            select: { id: true },
          });

          for (const s of targetStudents) {
            await tx.feeAssignment.upsert({
              where: {
                studentId_feeStructureId_sessionId: {
                  studentId: s.id,
                  feeStructureId: target.id,
                  sessionId: activeSession.id,
                },
              },
              update: {},
              create: {
                studentId: s.id,
                feeStructureId: target.id,
                sessionId: activeSession.id,
              },
            });
          }
        }

        return target;
      });

      const systemUser = await db.user.findFirst({
        where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
      });
      if (systemUser) {
        void (async () => {
          try {
            const studentsToBackfill = await db.student.findMany({
              where: { status: "ACTIVE", class: { name: toClassName } },
              include: { class: true },
            });
            if (studentsToBackfill.length > 0) {
              await generateYearlyChargesBulk(studentsToBackfill, systemUser.id, getAcademicYear());
            }
          } catch (err) {
            console.error("[fee-config] CLONE_STRUCTURE backfill error:", err);
          }
        })();
      }

      return NextResponse.json({ success: true });

    }

    if (action === "GENERATE_STUDENT_LEDGER") {
      const { studentId, className, startingFeeMonth, targetFeeHeadName } = body;
      if (!studentId && !className) {
        return NextResponse.json({ error: "studentId or className is required." }, { status: 400 });
      }

      const systemUser = await db.user.findFirst({
        where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
      });

      if (!systemUser) {
        return NextResponse.json({ error: "System user not found." }, { status: 404 });
      }

      if (studentId) {
        const student = await db.student.findUnique({
          where: { id: studentId },
          include: { class: true },
        });
        if (!student) {
          return NextResponse.json({ error: "Student not found." }, { status: 404 });
        }
        const res = await generateYearlyCharges(student.id, student.class.name, systemUser.id, getAcademicYear(), startingFeeMonth, targetFeeHeadName);
        return NextResponse.json({ success: true, generated: res.generated, skipped: res.skipped });
      } else if (className) {
        const students = await db.student.findMany({
          where: { status: "ACTIVE", ...(className !== "All" ? { class: { name: className } } : {}) },
          include: { class: true },
        });
        const res = await generateYearlyChargesBulk(students, systemUser.id, getAcademicYear(), targetFeeHeadName);
        return NextResponse.json({ success: true, count: students.length, generated: res.generated, skipped: res.skipped });
      }
    }

    if (action === "CLEANUP_DUPLICATES") {
      // ── F-02: Clean up genuine duplicate unpaid CHARGE entries within the SAME
      // academic year/session.
      // Charges with receiptItems (payment history) are strictly IMMUTABLE and never deleted.
      // Charges belonging to different academic sessions (e.g. 2025-2026 vs 2026-2027)
      // are recognized as distinct and preserved.
      const allCharges = await db.ledgerEntry.findMany({
        where: { entryType: "CHARGE" },
        include: { receiptItems: { select: { id: true } } },
        orderBy: { createdAt: "asc" },
      });

      const seen = new Set<string>();
      const duplicateIdsToDelete: string[] = [];

      for (const entry of allCharges) {
        // Rule 1: Never touch or consider an entry with payment history as a deletable duplicate
        if (entry.receiptItems.length > 0) {
          continue;
        }

        // Rule 2: Derive authoritative session year (from description or createdAt)
        const yearMatch = entry.description.match(/(20\d{2}-20\d{2}|20\d{2}-\d{2})/);
        const sessionYear = yearMatch ? yearMatch[1] : getAcademicYear(entry.createdAt);

        // Rule 3: Normalize description without the year or "Assigned:" prefix
        const cleanDesc = entry.description
          .replace(/^Assigned:\s*/i, "")
          .replace(/(20\d{2}-20\d{2}|20\d{2}-\d{2})/g, "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        // Unique charge identity = student + feeHead + academicSession + particular
        const key = `${entry.studentId}_${entry.feeHeadId || "none"}_${sessionYear}_${cleanDesc}`;

        if (seen.has(key)) {
          duplicateIdsToDelete.push(entry.id);
        } else {
          seen.add(key);
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        await db.ledgerEntry.deleteMany({
          where: { id: { in: duplicateIdsToDelete } },
        });
      }

      return NextResponse.json({ success: true, cleanedCount: duplicateIdsToDelete.length });
    }

    return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
  } catch (error: any) {
    console.error("Fee config error:", error);
    return NextResponse.json({ error: "Failed to modify fee structure settings" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, name } = body;

    if (action === "DELETE_HEAD") {
      if (!name) return NextResponse.json({ error: "Fee head name is required." }, { status: 400 });

      const head = await db.feeHead.findUnique({ where: { name } });
      if (!head) return NextResponse.json({ error: "Fee head not found." }, { status: 404 });

      // Mark the fee head as archived
      await db.feeHead.update({
        where: { id: head.id },
        data: { status: "ARCHIVED" },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
  } catch (error: any) {
    console.error("Delete fee head error:", error);
    return NextResponse.json({ error: "Failed to delete fee head" }, { status: 500 });
  }
}
