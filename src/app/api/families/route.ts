import { NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/security";
import { getNextFamilyCode } from "@/lib/family";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isAudit = searchParams.get("audit") === "true";
    const search = searchParams.get("search")?.trim().toLowerCase();
    const filter = searchParams.get("filter") || "all"; // all, siblings, single, conflicts
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "30", 10)));

    // ── 1. Audit / Conflict Scanner
    const allMultiFamilies = await db.parentProfile.findMany({
      where: {
        students: {
          some: {},
        },
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
        students: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            rollNumber: true,
            fatherName: true,
            motherName: true,
            fatherMobile: true,
            motherMobile: true,
            status: true,
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: { familyCode: "asc" },
    });

    const flaggedFamilies: any[] = [];
    let multiCount = 0;
    let singleCount = 0;

    for (const fam of allMultiFamilies) {
      if (fam.students.length > 1) {
        multiCount++;
      } else {
        singleCount++;
      }

      if (fam.students.length <= 1) continue;

      const fatherMobiles = new Set(
        fam.students.map((s) => s.fatherMobile?.trim().replace(/\D/g, "")).filter(Boolean)
      );
      const motherNames = new Set(
        fam.students.map((s) => s.motherName?.trim().toLowerCase()).filter(Boolean)
      );
      const fatherNames = new Set(
        fam.students.map((s) => s.fatherName?.trim().toLowerCase()).filter(Boolean)
      );

      let discrepancyReason: string | null = null;

      if (fatherMobiles.size > 1) {
        discrepancyReason = `Conflicting Father Mobile numbers (${Array.from(fatherMobiles).join(", ")})`;
      } else if (motherNames.size > 1) {
        discrepancyReason = `Different Mother Names (${Array.from(motherNames).join(", ")})`;
      } else if (fatherNames.size > 1) {
        discrepancyReason = `Different Father Names recorded (${Array.from(fatherNames).join(", ")})`;
      }

      if (discrepancyReason) {
        flaggedFamilies.push({
          parentProfileId: fam.id,
          familyCode: fam.familyCode,
          address: fam.address,
          user: fam.user,
          studentCount: fam.students.length,
          reason: discrepancyReason,
          students: fam.students.map((s) => ({
            id: s.id,
            name: s.name,
            admissionNo: s.admissionNumber,
            rollNo: s.rollNumber || "",
            class: `${s.class.name}-${s.class.section}`,
            fatherName: s.fatherName || "",
            motherName: s.motherName || "",
            fatherMobile: s.fatherMobile || "",
            motherMobile: s.motherMobile || "",
          })),
        });
      }
    }

    if (isAudit) {
      return NextResponse.json({
        totalFamiliesChecked: allMultiFamilies.length,
        flaggedCount: flaggedFamilies.length,
        flaggedFamilies,
      });
    }

    // ── 2. Filter & Search Pool
    let pool = allMultiFamilies;

    // 2a. Omni-search filter
    if (search) {
      pool = pool.filter((fam) => {
        if (fam.familyCode.toLowerCase().includes(search)) return true;
        if (fam.user?.name?.toLowerCase().includes(search)) return true;
        if (fam.user?.phone?.includes(search)) return true;
        if (fam.address?.toLowerCase().includes(search)) return true;
        return fam.students.some((s) =>
          s.name.toLowerCase().includes(search) ||
          s.admissionNumber.toLowerCase().includes(search) ||
          (s.rollNumber && s.rollNumber.toLowerCase().includes(search)) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(search)) ||
          (s.fatherMobile && s.fatherMobile.includes(search))
        );
      });
    }

    // 2b. Classification filter
    if (filter === "siblings") {
      pool = pool.filter((f) => f.students.length > 1);
    } else if (filter === "single") {
      pool = pool.filter((f) => f.students.length === 1);
    } else if (filter === "conflicts") {
      const flaggedIds = new Set(flaggedFamilies.map((f) => f.parentProfileId));
      pool = pool.filter((f) => flaggedIds.has(f.id));
    }

    const totalMatching = pool.length;
    const totalPages = Math.ceil(totalMatching / pageSize) || 1;
    const paginatedFamilies = pool.slice((page - 1) * pageSize, page * pageSize);

    // Compute ledger balance sums for current paginated students
    const studentIds = paginatedFamilies.flatMap((f) => f.students.map((s) => s.id));
    const ledgerSums = studentIds.length > 0 ? await db.ledgerEntry.groupBy({
      by: ["studentId"],
      _sum: { amount: true },
      where: { studentId: { in: studentIds } },
    }) : [];

    const balanceMap: Record<string, number> = {};
    for (const item of ledgerSums) {
      balanceMap[item.studentId] = item._sum.amount || 0;
    }

    return NextResponse.json({
      stats: {
        totalFamilies: allMultiFamilies.length,
        multiChildFamilies: multiCount,
        singleChildFamilies: singleCount,
        conflictCount: flaggedFamilies.length,
      },
      pagination: {
        page,
        pageSize,
        total: totalMatching,
        totalPages,
      },
      flaggedFamilies: flaggedFamilies.slice(0, 20),
      families: paginatedFamilies.map((f) => {
        const isFlagged = flaggedFamilies.some((fl) => fl.parentProfileId === f.id);
        const totalFamilyDuePaisa = f.students.reduce((acc, s) => acc + (balanceMap[s.id] || 0), 0);
        return {
          id: f.id,
          familyCode: f.familyCode,
          parentName: f.user?.name || f.students[0]?.fatherName || "Parent",
          parentPhone: f.user?.phone || f.students[0]?.fatherMobile || "",
          parentEmail: f.user?.email || "",
          address: f.address || "",
          studentCount: f.students.length,
          isFlagged,
          totalDuePaisa: totalFamilyDuePaisa,
          students: f.students.map((s) => ({
            id: s.id,
            name: s.name,
            admissionNo: s.admissionNumber,
            rollNo: s.rollNumber || "",
            class: `${s.class.name}-${s.class.section}`,
            fatherName: s.fatherName || "",
            motherName: s.motherName || "",
            fatherMobile: s.fatherMobile || "",
            motherMobile: s.motherMobile || "",
            status: s.status,
            duePaisa: balanceMap[s.id] || 0,
          })),
        };
      }),
    });
  } catch (error: any) {
    console.error("Family API GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to query families" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin (CSRF verification failed)." }, { status: 403 });
    }

    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { action, studentId, targetFamilyCode, targetParentProfileId, sourceFamilyCode } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing required field: action." }, { status: 400 });
    }

    if ((action === "SPLIT" || action === "TRANSFER") && !studentId) {
      return NextResponse.json({ error: "Missing required fields: action and studentId are mandatory for SPLIT and TRANSFER." }, { status: 400 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: SPLIT — Detach a student into an independent Family ID & ParentProfile
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "SPLIT") {
      const student = await db.student.findUnique({
        where: { id: studentId },
        include: {
          parentProfile: {
            include: {
              students: { select: { id: true, name: true } },
              user: true,
            },
          },
        },
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      if (!student.parentProfile) {
        return NextResponse.json({ error: "Student has no current family profile." }, { status: 400 });
      }

      const currentSiblingsCount = student.parentProfile.students.length;
      if (currentSiblingsCount <= 1) {
        return NextResponse.json({
          error: `Student ${student.name} is already the only child in Family ${student.parentProfile.familyCode}. No split needed.`,
        }, { status: 400 });
      }

      const oldFamilyCode = student.parentProfile.familyCode;
      const oldParentProfileId = student.parentProfile.id;

      const result = await db.$transaction(async (tx) => {
        // 1. Generate atomic sequential Family Code (FAM-YYYY-XXXX)
        const newFamilyCode = await getNextFamilyCode(tx);

        // 2. Create independent Parent User for this student
        const sanitizedPhone = (student.fatherMobile || student.motherMobile || "").trim().replace(/\D/g, "");
        const parentName = student.fatherName || student.motherName || `${student.name}'s Parent`;
        const email = `parent_${newFamilyCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}@school.com`;
        const passwordHash = `PENDING_ACTIVATION:${crypto.randomBytes(16).toString("hex")}`;

        const newParentUser = await tx.user.create({
          data: {
            username: `parent_${newFamilyCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Math.floor(Math.random() * 1000)}`,
            email,
            passwordHash,
            role: "PARENT",
            name: parentName,
            phone: student.fatherMobile || student.motherMobile || null,
          },
        });

        // 3. Create independent ParentProfile
        const newParentProfile = await tx.parentProfile.create({
          data: {
            userId: newParentUser.id,
            familyCode: newFamilyCode,
            address: student.parentProfile?.address || null,
          },
        });

        // 4. Update the Student to point to the new ParentProfile
        const updatedStudent = await tx.student.update({
          where: { id: studentId },
          data: {
            parentProfileId: newParentProfile.id,
          },
          include: {
            parentProfile: true,
          },
        });

        // 5. Update Receipts associated specifically with this student to point to new ParentProfile
        await tx.receipt.updateMany({
          where: {
            studentId: studentId,
            parentProfileId: oldParentProfileId,
          },
          data: {
            parentProfileId: newParentProfile.id,
          },
        });

        // 6. Record Audit Log
        await tx.auditLog.create({
          data: {
            userId: authUser.userId,
            action: "SPLIT_FAMILY",
            entityType: "STUDENT",
            entityId: student.id,
            oldValues: JSON.stringify({ familyCode: oldFamilyCode, parentProfileId: oldParentProfileId }),
            newValues: JSON.stringify({ familyCode: newFamilyCode, parentProfileId: newParentProfile.id }),
          },
        });

        return {
          student: updatedStudent,
          oldFamilyCode,
          newFamilyCode,
          newParentProfileId: newParentProfile.id,
        };
      });

      return NextResponse.json({
        success: true,
        message: `Successfully separated ${result.student.name} from Family ${result.oldFamilyCode}. New Family ID: ${result.newFamilyCode}`,
        newFamilyCode: result.newFamilyCode,
        student: result.student,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: TRANSFER — Move student to an existing target Family Profile
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "TRANSFER") {
      let targetProfile = null;

      if (targetParentProfileId) {
        targetProfile = await db.parentProfile.findUnique({
          where: { id: targetParentProfileId },
          include: { user: true, students: { select: { name: true } } },
        });
      } else if (targetFamilyCode) {
        targetProfile = await db.parentProfile.findUnique({
          where: { familyCode: targetFamilyCode.trim().toUpperCase() },
          include: { user: true, students: { select: { name: true } } },
        });
      }

      if (!targetProfile) {
        return NextResponse.json({ error: "Target family profile not found." }, { status: 404 });
      }

      const student = await db.student.findUnique({
        where: { id: studentId },
        include: { parentProfile: true },
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      if (student.parentProfileId === targetProfile.id) {
        return NextResponse.json({
          error: `Student ${student.name} is already linked with Family ${targetProfile.familyCode}.`,
        }, { status: 400 });
      }

      const oldFamilyCode = student.parentProfile?.familyCode || "None";
      const oldParentProfileId = student.parentProfileId;

      await db.$transaction(async (tx) => {
        // 1. Re-link student to target parentProfile
        await tx.student.update({
          where: { id: studentId },
          data: {
            parentProfileId: targetProfile.id,
          },
        });

        // 2. Shift existing single-student receipts to target parentProfile
        if (oldParentProfileId) {
          await tx.receipt.updateMany({
            where: {
              studentId: studentId,
              parentProfileId: oldParentProfileId,
            },
            data: {
              parentProfileId: targetProfile.id,
            },
          });
        }

        // 3. Record Audit Log
        await tx.auditLog.create({
          data: {
            userId: authUser.userId,
            action: "TRANSFER_FAMILY",
            entityType: "STUDENT",
            entityId: student.id,
            oldValues: JSON.stringify({ familyCode: oldFamilyCode, parentProfileId: oldParentProfileId }),
            newValues: JSON.stringify({ familyCode: targetProfile.familyCode, parentProfileId: targetProfile.id }),
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Successfully transferred ${student.name} to Family ${targetProfile.familyCode}.`,
        targetFamilyCode: targetProfile.familyCode,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: MERGE_FAMILIES — Merge two entire families into one
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "MERGE_FAMILIES") {
      if (!sourceFamilyCode || !targetFamilyCode) {
        return NextResponse.json({ error: "sourceFamilyCode and targetFamilyCode are required for merge." }, { status: 400 });
      }

      const cleanSourceCode = sourceFamilyCode.trim().toUpperCase();
      const cleanTargetCode = targetFamilyCode.trim().toUpperCase();

      if (cleanSourceCode === cleanTargetCode) {
        return NextResponse.json({ error: "Source and target families must be different." }, { status: 400 });
      }

      const sourceFamily = await db.parentProfile.findUnique({
        where: { familyCode: cleanSourceCode },
        include: { students: true, receipts: true, user: true },
      });

      const targetFamily = await db.parentProfile.findUnique({
        where: { familyCode: cleanTargetCode },
        include: { students: true, receipts: true, user: true },
      });

      if (!sourceFamily) {
        return NextResponse.json({ error: `Source family "${cleanSourceCode}" not found.` }, { status: 404 });
      }

      if (!targetFamily) {
        return NextResponse.json({ error: `Target family "${cleanTargetCode}" not found.` }, { status: 404 });
      }

      const movedStudentNames = sourceFamily.students.map((s) => s.name).join(", ");
      const studentCount = sourceFamily.students.length;

      await db.$transaction(async (tx) => {
        // 1. Move all students from source to target
        await tx.student.updateMany({
          where: { parentProfileId: sourceFamily.id },
          data: { parentProfileId: targetFamily.id },
        });

        // 2. Move all receipts from source to target
        await tx.receipt.updateMany({
          where: { parentProfileId: sourceFamily.id },
          data: { parentProfileId: targetFamily.id },
        });

        // 3. Delete empty source parent profile
        await tx.parentProfile.delete({
          where: { id: sourceFamily.id },
        });

        // If source user has role PARENT and no other profiles, remove orphaned user
        if (sourceFamily.userId && sourceFamily.user?.role === "PARENT") {
          try {
            await tx.user.delete({
              where: { id: sourceFamily.userId },
            });
          } catch {
            // Safe ignore if user has relations
          }
        }

        // 4. Record Audit Log
        await tx.auditLog.create({
          data: {
            userId: authUser.userId,
            action: "MERGE_FAMILIES",
            entityType: "PARENT_PROFILE",
            entityId: targetFamily.id,
            oldValues: JSON.stringify({ sourceFamilyCode: cleanSourceCode, movedStudents: movedStudentNames }),
            newValues: JSON.stringify({ targetFamilyCode: cleanTargetCode, totalStudentsNow: targetFamily.students.length + studentCount }),
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Successfully merged Family ${cleanSourceCode} into Family ${cleanTargetCode}. (${studentCount} student(s) moved: ${movedStudentNames})`,
        targetFamilyCode: cleanTargetCode,
      });
    }

    return NextResponse.json({ error: `Invalid action "${action}". Allowed: SPLIT, TRANSFER, MERGE_FAMILIES.` }, { status: 400 });
  } catch (error: any) {
    console.error("Family API POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process family operation." }, { status: 500 });
  }
}
