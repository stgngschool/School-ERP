import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateYearlyCharges, getAcademicYear } from "@/lib/generateYearlyCharges";
import { getNextFamilyCode, getNextAdmissionNumber, getNextRollNumber, findMatchingParentProfile } from "@/lib/family";
import { getAuthUser } from "@/lib/auth";
import { boundPagination, getSafeErrorMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

const serverStudentsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 25000; // 25 seconds

function clearServerStudentsCache() {
  serverStudentsCache.clear();
}

export async function GET(request: Request) {
  const reqId = `std_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = performance.now();

  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const cacheKey = `${authUser.role}_${authUser.userId}`;
    const cached = serverStudentsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
          "X-Server-Cache": "HIT",
        },
      });
    }

    let whereClause: Record<string, any> = {};
    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId }
      });
      if (!parentProfile) {
        return NextResponse.json([]);
      }
      whereClause = { parentProfileId: parentProfile.id };
    }
    // Teachers, Admins, and Accountants have school-wide access to all students and classes for grading, attendance, and coursework.

    const { searchParams } = new URL(request.url);
    const hasExplicitPagination = searchParams.has("limit") || searchParams.has("take") || searchParams.has("page") || searchParams.has("offset") || searchParams.has("skip");
    const { limit, offset } = boundPagination(searchParams, { defaultLimit: 2500, maxLimit: 5000 });

    const dbStart = performance.now();
    const students = await db.student.findMany({
      where: whereClause,
      ...(hasExplicitPagination ? { take: limit, skip: offset } : {}),
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        rollNumber: true,
        gender: true,
        dob: true,
        aadhaar: true,
        fatherName: true,
        fatherMobile: true,
        motherName: true,
        motherMobile: true,
        isRte: true,
        isMarksheetClaimed: true,
        photoUrl: true,
        concessionId: true,
        class: {
          select: { name: true, section: true }
        },
        parentProfile: {
          select: { 
            familyCode: true,
            address: true,
            user: { select: { name: true, phone: true } }
          }
        },
        concession: {
          select: { id: true, name: true, percentage: true, feeHeadName: true }
        },
      },
      orderBy: { name: "asc" },
    });
    const dbDuration = (performance.now() - dbStart).toFixed(2);
    console.log(`[DIAGNOSTIC][DB][${reqId}] db.student.findMany | duration: ${dbDuration}ms | rows: ${students.length}`);

    const formatted = students.map((s) => ({
      id: s.id,
      name: s.name,
      admissionNo: s.admissionNumber,
      rollNo: s.rollNumber || "",
      gender: s.gender || "",
      dob: s.dob ? s.dob.toISOString().split("T")[0] : "",
      aadhaar: s.aadhaar || "",
      fatherName: s.fatherName || "",
      fatherMobile: s.fatherMobile || "",
      motherName: s.motherName || "",
      motherMobile: s.motherMobile || "",
      address: s.parentProfile?.address || "",
      isRte: s.isRte,
      isMarksheetClaimed: s.isMarksheetClaimed,
      class: s.class.name,
      section: s.class.section,
      parentName: s.parentProfile?.user?.name || "",
      parentPhone: s.parentProfile?.user?.phone || "",
      familyCode: s.parentProfile?.familyCode || "",
      concessionId: s.concessionId || "",
      photoUrl: s.photoUrl || "",
      concession: s.concession ? {
        id: s.concession.id,
        name: s.concession.name,
        percentage: s.concession.percentage,
        feeHeadName: s.concession.feeHeadName,
      } : null,
    }));

    serverStudentsCache.set(cacheKey, {
      data: formatted,
      timestamp: Date.now(),
    });

    return NextResponse.json(formatted, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
        "X-Server-Cache": "MISS",
      },
    });
  } catch (error: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error(`[DIAGNOSTIC][API][ERROR] GET /api/students [${reqId}] | status: 500 | duration: ${duration}ms | error: ${error.message}`);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // Invalidate server cache on student creation
    clearServerStudentsCache();

    const body = await request.json();
    const {
      name,
      classVal,
      section,
      dob,
      aadhaar,
      disability,
      fatherName,
      motherName,
      fatherMobile,
      motherMobile,
      fatherAadhaar,
      address,
      parentEmail,
      category,
      religion,
      motherTongue,
      nationality,
      admissionDate,
      boardRegNo,
      prevSchoolName,
      prevClassPassed,
      tcNumber,
      parentOccupation,
      familyIncome,
      emergencyName,
      emergencyPhone,
      motherAadhaar,
      transportMode,
      busRoute,
      busStop,
      isRte,
      initialDues,
      familyCode,
      previousDues,
      concessionId,
      startingFeeMonth,
      admissionNo: customAdmissionNo,
      rollNo: customRollNo,
      gender,
    } = body;

    if (!name || !classVal || !section || !fatherName || !fatherMobile || !address) {
      return NextResponse.json(
        { error: "Name, class, section, father's name, father's mobile, and address are required." },
        { status: 400 }
      );
    }

    let classObj = await db.class.findFirst({
      where: { name: classVal, section: section },
    });

    if (!classObj) {
      classObj = await db.class.create({
        data: { name: classVal, section: section },
      });
    }

    let parent = null;

    if (familyCode) {
      parent = await db.parentProfile.findUnique({
        where: { familyCode },
        include: { user: true },
      });
    }

    if (!parent) {
      const existingProfiles = await db.parentProfile.findMany({
        include: {
          user: true,
          students: { select: { fatherName: true, motherName: true, fatherMobile: true, motherMobile: true } },
        },
      });

      const matched = findMatchingParentProfile(
        {
          fatherMobile: fatherMobile ? String(fatherMobile).trim() : undefined,
          motherMobile: motherMobile ? String(motherMobile).trim() : undefined,
          fatherName: fatherName ? String(fatherName).trim() : undefined,
          motherName: motherName ? String(motherName).trim() : undefined,
          parentEmail: parentEmail ? String(parentEmail).trim() : undefined,
          address: address ? String(address).trim() : undefined,
        },
        existingProfiles
      );

      if (matched) {
        parent = matched;
        if (!parent.address && address) {
          await db.parentProfile.update({
            where: { id: parent.id },
            data: { address },
          });
        }
      }
    }

    // ── LF-01 / S-01 / S-02 fix ─────────────────────────────────────────────
    // All three number-generation steps (family code, admission number, roll
    // number) and the student row insert run inside a single transaction.
    // The atomic UPDATE...RETURNING counter pattern acquires row-level locks
    // that serialise concurrent admissions automatically:
    //   - Two requests for the same class block on ROLL-<classId>- counter
    //   - Two requests generating new families block on FAM-<year>- counter
    //   - Two requests generating admission numbers block on ADM-<year>- counter
    // If anything inside the transaction fails, all changes roll back cleanly.

    const systemUser = await db.user.findFirst({
      where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
    });

    const { student, parentResult } = await db.$transaction(async (tx) => {
      // ── Resolve or create the parent profile inside the transaction ─────────
      let resolvedParent = parent as any;

      if (!resolvedParent) {
        // Need to create a new parent user + profile atomically
        const sanitizedPhone = (fatherMobile || "").replace(/\s+/g, "");
        const username = `parent_${sanitizedPhone || Date.now()}`;
        const baseEmail = parentEmail || `${username}@school.com`;

        // Check email uniqueness inside transaction (we do a raw SELECT to avoid
        // re-querying the entire users table outside the tx boundary)
        const emailConflict: any[] = await tx.$queryRawUnsafe(
          `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
          baseEmail
        );
        const finalEmail = emailConflict.length > 0
          ? `parent_${Date.now()}@school.com`
          : baseEmail;

        const secureRandomPassword = crypto.randomBytes(16).toString("hex");
        const passwordHash = await bcrypt.hash(secureRandomPassword, 10);

        const newUser = await tx.user.create({
          data: {
            username: `parent_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            email: finalEmail,
            passwordHash,
            role: "PARENT",
            name: fatherName,
            phone: fatherMobile,
          },
        });

        // ── LF-01 fix: family code generated atomically inside transaction ──
        const newFamilyCode = await getNextFamilyCode(tx);

        resolvedParent = await tx.parentProfile.create({
          data: {
            userId: newUser.id,
            familyCode: newFamilyCode,
            address: address || null,
          },
          include: { user: true },
        });
      } else if (!resolvedParent.user) {
        // resolvedParent found by findUnique/findMany outside tx — re-fetch
        // its user inside the tx to have a consistent snapshot
        const pp = await tx.parentProfile.findUnique({
          where: { id: resolvedParent.id },
          include: { user: true },
        });
        resolvedParent = pp ?? resolvedParent;

        // Update address if missing
        if (!resolvedParent.address && address) {
          await tx.parentProfile.update({
            where: { id: resolvedParent.id },
            data: { address },
          });
        }
      }

      // ── S-01 fix: Admission number generated atomically inside transaction ──
      let admissionNo = (customAdmissionNo || "").trim();
      if (admissionNo) {
        // Custom number — check uniqueness inside transaction to prevent races
        const conflict: any[] = await tx.$queryRawUnsafe(
          `SELECT id FROM "Student" WHERE "admissionNumber" = $1 LIMIT 1`,
          admissionNo
        );
        if (conflict.length > 0) {
          throw Object.assign(new Error(`Admission Number "${admissionNo}" is already taken.`), {
            code: "DUPLICATE_ADMISSION_NO",
          });
        }
      } else {
        admissionNo = await getNextAdmissionNumber(tx);
      }

      // ── S-02 fix: Roll number generated atomically inside transaction ────────
      let rollNumber = (customRollNo || "").trim();
      if (!rollNumber) {
        rollNumber = await getNextRollNumber(classObj.id, classVal, section, tx);
      }

      // ── Create the student record ────────────────────────────────────────────
      const newStudent = await tx.student.create({
        data: {
          name,
          admissionNumber: admissionNo,
          rollNumber,
          gender: gender || null,
          dob: dob ? new Date(dob) : null,
          aadhaar: aadhaar || null,
          disability: disability || null,
          fatherName: fatherName || null,
          motherName: motherName || null,
          fatherMobile: fatherMobile || null,
          motherMobile: motherMobile || null,
          fatherAadhaar: fatherAadhaar || null,
          category: category || null,
          religion: religion || null,
          motherTongue: motherTongue || null,
          nationality: nationality || null,
          admissionDate: admissionDate ? new Date(admissionDate) : null,
          boardRegNo: boardRegNo || null,
          prevSchoolName: prevSchoolName || null,
          prevClassPassed: prevClassPassed || null,
          tcNumber: tcNumber || null,
          parentOccupation: parentOccupation || null,
          familyIncome: familyIncome || null,
          emergencyName: emergencyName || null,
          emergencyPhone: emergencyPhone || null,
          motherAadhaar: motherAadhaar || null,
          transportMode: transportMode || null,
          busRoute: busRoute || null,
          busStop: busStop || null,
          parentProfileId: resolvedParent.id,
          classId: classObj.id,
          isRte: !!isRte,
          concessionId: concessionId || null,
        },
      });

      return { student: newStudent, parentResult: resolvedParent };
    }, {
      // Raise timeout for the admission transaction — it includes bcrypt hashing
      // for new parents. 30s is safe; this is a one-at-a-time serialized path.
      timeout: 30000,
    });

    // Auto-generate full academic year charges OUTSIDE the admission transaction.
    // generateYearlyCharges is idempotent (skips existing entries) and does not
    // need to be atomic with the student record creation.
    if (systemUser) {
      await generateYearlyCharges(student.id, classVal, systemUser.id, getAcademicYear(), startingFeeMonth);
      if (previousDues && parseFloat(previousDues) > 0) {
        const prevDuesAmountInPaisa = Math.round(parseFloat(previousDues) * 100);
        await db.ledgerEntry.create({
          data: {
            studentId: student.id,
            entryType: "CHARGE",
            amount: prevDuesAmountInPaisa,
            description: "Assigned: Previous Session Dues",
            createdById: systemUser.id,
          }
        });
      }
    }

    // ── E-02: Structured Audit Logging
    await db.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "STUDENT_ADMITTED",
        entityType: "Student",
        entityId: student.id,
        newValues: JSON.stringify({
          name: student.name,
          admissionNumber: student.admissionNumber,
          class: classVal,
          section,
        }),
      },
    }).catch((err) => console.error("Audit log error on student admit:", err));

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNumber,
        rollNo: student.rollNumber,
        class: classVal,
        section,
        parentName: parentResult?.user?.name ?? fatherName,
        parentPhone: parentResult?.user?.phone ?? fatherMobile ?? "",
      },
    });
  } catch (error: any) {
    console.error("Add student error:", error);
    if (error.code === "DUPLICATE_ADMISSION_NO") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const safeError = getSafeErrorMessage(error, "Failed to create student record.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}


export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, action, data } = body;

    if (!studentId || !action) {
      return NextResponse.json({ error: "Missing studentId or action." }, { status: 400 });
    }

    const studentIds = Array.isArray(studentId) ? studentId : [studentId];

    if (action === "updateStatus") {
      const updated = await db.student.updateMany({
        where: { id: { in: studentIds } },
        data: { status: data.status },
      });
      return NextResponse.json({ success: true, count: updated.count });
    }

    if (action === "promote") {
      const { classVal, section } = data;
      let classObj = await db.class.findFirst({
        where: { name: classVal, section: section },
      });

      if (!classObj) {
        classObj = await db.class.create({
          data: { name: classVal, section: section },
        });
      }

      const updated = await db.student.updateMany({
        where: { id: { in: studentIds } },
        data: { classId: classObj.id },
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

    if (action === "updateDetails") {
      const targetId = Array.isArray(studentId) ? studentId[0] : studentId;
      const student = await db.student.findUnique({
        where: { id: targetId },
        include: { parentProfile: { include: { user: true } } }
      });

      // Check admissionNumber uniqueness if changed
      if (data.admissionNo && data.admissionNo !== student?.admissionNumber) {
        const existing = await db.student.findUnique({
          where: { admissionNumber: data.admissionNo },
        });
        if (existing) {
          return NextResponse.json(
            { error: `Admission Number "${data.admissionNo}" is already taken.` },
            { status: 400 }
          );
        }
      }

      // ── S-05: Parent email must not be silently overwritten ──────────────────
      if (data.parentEmail && student?.parentProfile?.user) {
        const existingEmail = student.parentProfile.user.email;
        const newEmail = data.parentEmail.trim().toLowerCase();
        if (newEmail && newEmail !== existingEmail.toLowerCase()) {
          return NextResponse.json(
            {
              error:
                "Parent login email cannot be changed via student profile update. " +
                "Please use the parent account management page to request a verified email change.",
            },
            { status: 400 }
          );
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Capture pre-update state for change-detection (S-03, S-04, C-03, T-03)
      const wasRte = student?.isRte ?? false;
      const previousConcessionId = student?.concessionId ?? null;
      const previousTransportStopId = student?.transportStopId ?? null;
      const newRte = data.isRte !== undefined ? !!data.isRte : wasRte;
      const newConcessionId = data.concessionId || null;
      // ── T-03: Accept transportStopId in the update payload
      const newTransportStopId = data.transportStopId !== undefined
        ? (data.transportStopId || null)
        : previousTransportStopId;

      const rteJustEnabled = !wasRte && newRte;
      const rteDisabled = wasRte && !newRte;
      const concessionChanged = newConcessionId !== previousConcessionId;
      const transportStopChanged = newTransportStopId !== previousTransportStopId;

      // ── C-03 + T-03 + BL-05: Wrap the student update, stale-discount cleanup,
      // and transport charge management in ONE transaction so the student record and
      // its financial adjustments are either both committed or both rolled back.
      let updated = await db.$transaction(async (tx) => {
        const updatedStudent = await tx.student.update({
          where: { id: targetId },
          data: {
            name: data.name,
            admissionNumber: data.admissionNo || undefined,
            rollNumber: data.rollNo || undefined,
            gender: data.gender !== undefined ? data.gender : undefined,
            dob: data.dob ? new Date(data.dob) : null,
            aadhaar: data.aadhaar || null,
            disability: data.disability || null,
            fatherName: data.fatherName,
            motherName: data.motherName || null,
            fatherMobile: data.fatherMobile,
            motherMobile: data.motherMobile || null,
            fatherAadhaar: data.fatherAadhaar || null,
            category: data.category || null,
            religion: data.religion || null,
            motherTongue: data.motherTongue || null,
            nationality: data.nationality || null,
            parentOccupation: data.parentOccupation || null,
            familyIncome: data.familyIncome || null,
            emergencyName: data.emergencyName || null,
            emergencyPhone: data.emergencyPhone || null,
            motherAadhaar: data.motherAadhaar || null,
            transportMode: data.transportMode || null,
            busRoute: data.busRoute || null,
            busStop: data.busStop || null,
            transportStopId: newTransportStopId,
            isRte: data.isRte !== undefined ? !!data.isRte : undefined,
            concessionId: newConcessionId,
          },
        });

        if (student?.parentProfile) {
          await tx.parentProfile.update({
            where: { id: student.parentProfile.id },
            data: {
              address: data.address || null,
              user: {
                update: {
                  name: data.fatherName,
                  phone: data.fatherMobile,
                }
              }
            }
          });
        }

        // ── BL-05: When RTE is turned OFF (true → false), remove stale unpaid
        // "RTE Fee Waiver:" DISCOUNT entries. Committed discounts with receiptItems
        // are strictly preserved.
        if (rteDisabled) {
          const staleRteDiscounts = await tx.ledgerEntry.findMany({
            where: {
              studentId: targetId,
              entryType: "DISCOUNT",
              description: { startsWith: "RTE Fee Waiver:" },
            },
            include: { receiptItems: { select: { id: true } } },
          });

          const deletableRteIds = staleRteDiscounts
            .filter((d) => d.receiptItems.length === 0)
            .map((d) => d.id);

          if (deletableRteIds.length > 0) {
            await tx.ledgerEntry.deleteMany({ where: { id: { in: deletableRteIds } } });
          }
        }

        // ── BL-05: When RTE is turned ON (false → true), remove any stale unpaid
        // concession waivers so they do not conflict with the 100% RTE fee waiver.
        if (rteJustEnabled) {
          const staleConcessionDiscounts = await tx.ledgerEntry.findMany({
            where: {
              studentId: targetId,
              entryType: "DISCOUNT",
              description: { contains: "Concession Waiver" },
            },
            include: { receiptItems: { select: { id: true } } },
          });

          const deletableConcIds = staleConcessionDiscounts
            .filter((d) => d.receiptItems.length === 0)
            .map((d) => d.id);

          if (deletableConcIds.length > 0) {
            await tx.ledgerEntry.deleteMany({ where: { id: { in: deletableConcIds } } });
          }
        }

        // ── C-03: When concession changes, remove stale DISCOUNT entries for the
        // OLD concession before generating new ones. Only entries with NO receipt
        // items are removed; committed historical discounts are preserved.
        if (concessionChanged && previousConcessionId) {
          const oldConcession = await tx.concession.findUnique({
            where: { id: previousConcessionId },
            select: { name: true },
          });
          if (oldConcession) {
            const stalePrefix = `Concession Waiver (${oldConcession.name}):`;
            const staleDiscounts = await tx.ledgerEntry.findMany({
              where: {
                studentId: targetId,
                entryType: "DISCOUNT",
                description: { contains: stalePrefix },
              },
              include: { receiptItems: { select: { id: true } } },
            });

            const deletableIds = staleDiscounts
              .filter((d) => d.receiptItems.length === 0)
              .map((d) => d.id);

            if (deletableIds.length > 0) {
              await tx.ledgerEntry.deleteMany({ where: { id: { in: deletableIds } } });
            }
          }
        }

        // ── T-03: When transport stop assignment changes, manage the corresponding
        // charge entry. Rules:
        //  - A charge with ANY receipt items is immutable — leave it alone.
        //  - When assigning a new stop: create or update the unpaid charge to match
        //    the stop's current amount.
        //  - When removing the stop (null): delete the unpaid charge if it exists.
        //  - Idempotent: a repeated update with the same stop produces no extra rows.
        if (transportStopChanged) {
          // Find any existing unpaid transport charge for this student
          const existingTransportCharge = await tx.ledgerEntry.findFirst({
            where: {
              studentId: targetId,
              entryType: "CHARGE",
              description: { startsWith: "Transport Fee:" },
            },
            include: { receiptItems: { select: { id: true } } },
          });

          if (newTransportStopId) {
            // Fetch the stop's fee amount
            const newStop = await tx.transportStop.findUnique({
              where: { id: newTransportStopId },
              select: { id: true, name: true, amount: true },
            });

            if (newStop) {
              if (existingTransportCharge) {
                if (existingTransportCharge.receiptItems.length === 0) {
                  // Fully unpaid — update to new stop/amount
                  await tx.ledgerEntry.update({
                    where: { id: existingTransportCharge.id },
                    data: {
                      description: `Transport Fee: ${newStop.name}`,
                      amount: newStop.amount,
                    },
                  });
                }
                // If partially/fully paid, leave it immutable
              } else {
                // Create a new transport charge
                await tx.ledgerEntry.create({
                  data: {
                    studentId: targetId,
                    entryType: "CHARGE",
                    description: `Transport Fee: ${newStop.name}`,
                    amount: newStop.amount,
                    createdById: authUser.userId,
                  },
                });
              }
            }
          } else {
            // Transport stop removed
            if (existingTransportCharge && existingTransportCharge.receiptItems.length === 0) {
              // Fully unpaid — safe to void
              await tx.ledgerEntry.delete({ where: { id: existingTransportCharge.id } });
            }
            // If partially/fully paid, leave it immutable
          }
        }

        return updatedStudent;
      });

      // ── S-03 & BL-05: Regenerate discounts when isRte status changes or concessionId changes
      // generateYearlyCharges is idempotent: it skips existing charges and only
      // creates or updates DISCOUNT entries for the current concession or RTE status.
      if (rteJustEnabled || rteDisabled || concessionChanged) {
        const systemUser = await db.user.findFirst({
          where: { OR: [{ role: "ADMIN" }, { role: "ACCOUNTANT" }] },
        });
        const studentClass = await db.class.findUnique({
          where: { id: updated.classId },
        });
        if (systemUser && studentClass) {
          await generateYearlyCharges(updated.id, studentClass.name, systemUser.id, getAcademicYear());
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      return NextResponse.json({ success: true, student: updated });
    }


    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Student update error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to update student record.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

