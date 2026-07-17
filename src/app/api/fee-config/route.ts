import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateYearlyChargesBulk, getAcademicYear } from "@/lib/generateYearlyCharges";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let heads = await db.feeHead.findMany({ where: { status: "ACTIVE" } });
    if (heads.length === 0) {
      const defaults = [
        { name: "Tuition Fee", frequency: "monthly" },
        { name: "Admission Fee", frequency: "one_time" },
        { name: "Exam Fee", frequency: "exam" },
        { name: "Transport Fee", frequency: "monthly" },
        { name: "Computer Fee", frequency: "monthly" },
      ];
      for (const item of defaults) {
        await db.feeHead.upsert({
          where: { name: item.name },
          update: { frequency: item.frequency },
          create: { name: item.name, frequency: item.frequency },
        });
      }
      heads = await db.feeHead.findMany({ where: { status: "ACTIVE" } });
    }

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
    const body = await request.json();
    const { action, name, frequency, total } = body;

    if (action === "ADD_HEAD") {
      if (!name) return NextResponse.json({ error: "Fee head name is required." }, { status: 400 });
      
      const head = await db.feeHead.upsert({
        where: { name },
        update: { frequency: frequency || "monthly" },
        create: { name, frequency: frequency || "monthly" },
      });

      return NextResponse.json({ success: true, head });
    }

    if (action === "ADD_STRUCTURE") {
      const { className, items } = body;
      if (!name || !frequency) {
        return NextResponse.json({ error: "Name and frequency are required." }, { status: 400 });
      }

      let structure = await db.feeStructure.findFirst({
        where: { name, className: className || "All" },
      });

      if (structure) {
        await db.feeStructureItem.deleteMany({
          where: { feeStructureId: structure.id },
        });
      } else {
        structure = await db.feeStructure.create({
          data: {
            name,
            frequency,
            className: className || "All",
          },
        });
      }

      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          let feeHead = await db.feeHead.findFirst({
            where: { name: item.headName },
          });

          if (!feeHead) {
            feeHead = await db.feeHead.create({
              data: { name: item.headName },
            });
          }

          await db.feeStructureItem.create({
            data: {
              feeStructureId: structure.id,
              feeHeadId: feeHead.id,
              amount: Math.round(Number(item.amount) * 100), // convert to Paisa
            },
          });
        }
      }

      // Backfill: regenerate full-year charges for all existing students in this class
      const targetClass = className || "All";
      const systemUser = await db.user.findFirst({
        where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
      });
      if (systemUser) {
        let studentsToBackfill: { id: string; class: { name: string } }[] = [];
        if (targetClass === "All") {
          // All students in all classes
          studentsToBackfill = await db.student.findMany({
            where: { status: "ACTIVE" },
            include: { class: true },
          });
        } else {
          // Only students in this specific class
          studentsToBackfill = await db.student.findMany({
            where: { status: "ACTIVE", class: { name: targetClass } },
            include: { class: true },
          });
        }
        if (studentsToBackfill.length > 0) {
          await generateYearlyChargesBulk(studentsToBackfill, systemUser.id, getAcademicYear());
        }
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

      let targetStructure = await db.feeStructure.findFirst({
        where: { className: toClassName },
      });

      if (targetStructure) {
        await db.feeStructureItem.deleteMany({
          where: { feeStructureId: targetStructure.id },
        });
      } else {
        targetStructure = await db.feeStructure.create({
          data: {
            name: `${toClassName} Fee Structure`,
            frequency: sourceStructure.frequency,
            className: toClassName,
          },
        });
      }

      for (const item of sourceStructure.items) {
        await db.feeStructureItem.create({
          data: {
            feeStructureId: targetStructure.id,
            feeHeadId: item.feeHeadId,
            amount: item.amount,
          },
        });
      }

      const systemUser = await db.user.findFirst({
        where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
      });
      if (systemUser) {
        const studentsToBackfill = await db.student.findMany({
          where: { status: "ACTIVE", class: { name: toClassName } },
          include: { class: true },
        });
        if (studentsToBackfill.length > 0) {
          await generateYearlyChargesBulk(studentsToBackfill, systemUser.id, getAcademicYear());
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
  } catch (error: any) {
    console.error("Fee config error:", error);
    return NextResponse.json({ error: "Failed to modify fee structure settings" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
