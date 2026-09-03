import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAuthUser } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validation";
import { getNextEmployeeId } from "@/lib/family";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // ── U-05: Scope the user list by caller role.
    // ADMIN: sees all users. ACCOUNTANT: cannot see ADMIN accounts
    // (they should only be managing teachers / parent accounts).
    const roleWhereClause = authUser.role === "ACCOUNTANT"
      ? { role: { not: "ADMIN" as const } }
      : {};

    const users = await db.user.findMany({
      where: roleWhereClause,
      include: {
        teacherProfile: {
          include: {
            classes: {
              where: { status: "ACTIVE" },
              select: { id: true, name: true, section: true }
            }
          }
        }
      },
      orderBy: { role: "asc" },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
      teacherProfile: u.teacherProfile ? {
        id: u.teacherProfile.id,
        employeeId: u.teacherProfile.employeeId,
        classes: u.teacherProfile.classes
      } : null
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch user accounts" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can modify user accounts." }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, newPassword, name, username, email, phone } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (action === "RESET_PASSWORD") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.user.update({
        where: { id: userId },
        // ── A-02: Also increment tokenVersion so any live sessions with the
        // old password are immediately revoked. The user must re-login.
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });

      // ── E-02: Structured Audit Logging
      await db.auditLog.create({
        data: {
          userId: authUser.userId,
          action: "USER_PASSWORD_RESET",
          entityType: "User",
          entityId: userId,
          newValues: JSON.stringify({ targetUsername: user.username, resetBy: authUser.username }),
        },
      }).catch((err) => console.error("Audit log error on password reset:", err));

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    if (action === "ASSIGN_CLASS") {
      const { classId } = body;
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: userId }
      });
      if (!teacherProfile) {
        return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
      }

      await db.$transaction(async (tx) => {
        // Unbind teacher from any classes they currently manage
        await tx.class.updateMany({
          where: { classTeacherId: teacherProfile.id },
          data: { classTeacherId: null }
        });

        // Bind teacher to the new class if classId is specified
        if (classId) {
          await tx.class.update({
            where: { id: classId },
            data: { classTeacherId: teacherProfile.id }
          });
        }
      });

      // ── E-02: Structured Audit Logging
      await db.auditLog.create({
        data: {
          userId: authUser.userId,
          action: "TEACHER_CLASS_ASSIGNED",
          entityType: "TeacherProfile",
          entityId: teacherProfile.id,
          newValues: JSON.stringify({ teacherUserId: userId, assignedClassId: classId || null }),
        },
      }).catch((err) => console.error("Audit log error on class assign:", err));

      return NextResponse.json({ success: true, message: "Class assigned successfully" });
    }

    if (action === "UPDATE_PROFILE") {
      if (!name || !username || !email) {
        return NextResponse.json({ error: "Name, username, and email are required." }, { status: 400 });
      }
      const existing = await db.user.findFirst({
        where: {
          OR: [{ username }, { email }],
          NOT: { id: userId }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "Username or Email is already taken by another account." }, { status: 400 });
      }
      await db.user.update({
        where: { id: userId },
        data: { name, username, email, phone },
      });
      return NextResponse.json({ success: true, message: "Profile updated successfully" });
    }

    const newStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";

    // ── A-02: Increment tokenVersion when blocking a user so all their live
    // JWT sessions are immediately rejected by getAuthUser() — no need to wait
    // for the 7-day token expiry. On unblock, leave tokenVersion unchanged;
    // the user gets a new token (with the current version) on their next login.
    const tokenVersionUpdate = newStatus === "BLOCKED"
      ? { tokenVersion: { increment: 1 } }
      : {};

    const updated = await db.user.update({
      where: { id: userId },
      data: { status: newStatus, ...tokenVersionUpdate },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error("Toggle/Reset user status error:", error);
    return NextResponse.json({ error: "Failed to update user security profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can create staff accounts." }, { status: 403 });
    }

    const { name, username, email, password, role, phone, employeeId, classId } = await request.json();
    if (!name || !username || !email || !password || !role) {
      return NextResponse.json({ error: "Name, username, email, password, and role are required." }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanEmployeeId = employeeId ? employeeId.trim() : undefined;

    // Check if username/email already exists (case-insensitive)
    const existing = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: "insensitive" } },
          { email: { equals: cleanEmail, mode: "insensitive" } }
        ]
      }
    });
    if (existing) {
      return NextResponse.json({ error: "Username or Email is already registered." }, { status: 400 });
    }

    // ── U-03: Validate uniqueness of custom employeeId if provided
    if (cleanEmployeeId) {
      const [existingTch, existingAcc] = await Promise.all([
        db.teacherProfile.findUnique({ where: { employeeId: cleanEmployeeId } }),
        db.accountantProfile.findUnique({ where: { employeeId: cleanEmployeeId } }),
      ]);
      if (existingTch || existingAcc) {
        return NextResponse.json({ error: `Employee ID "${cleanEmployeeId}" is already in use.` }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);

    const newUser = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          role,
          phone: cleanPhone
        }
      });

      if (role === "TEACHER") {
        // ── U-03: Atomic sequential employeeId generation
        const assignedEmployeeId = employeeId || (await getNextEmployeeId("TEACHER", tx));
        const tp = await tx.teacherProfile.create({
          data: {
            userId: u.id,
            employeeId: assignedEmployeeId
          }
        });

        if (classId) {
          await tx.class.update({
            where: { id: classId },
            data: { classTeacherId: tp.id }
          });
        }
      } else if (role === "ACCOUNTANT") {
        // ── U-03: Atomic sequential employeeId generation
        const assignedEmployeeId = employeeId || (await getNextEmployeeId("ACCOUNTANT", tx));
        await tx.accountantProfile.create({
          data: {
            userId: u.id,
            employeeId: assignedEmployeeId
          }
        });
      }
      return u;
    });

    // ── E-02: Structured Audit Logging
    await db.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "USER_CREATED",
        entityType: "User",
        entityId: newUser.id,
        newValues: JSON.stringify({ username: newUser.username, name: newUser.name, role: newUser.role }),
      },
    }).catch((err) => console.error("Audit log error on user create:", err));

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role }
    });
  } catch (error: any) {
    console.error("Create staff error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to register staff account.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can delete user accounts." }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (userId === authUser.userId) {
      return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: {
          include: {
            students: true
          }
        },
        teacherProfile: true,
        accountantProfile: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Safely reassign or delete user and their associated entities in a transaction
    await db.$transaction(async (tx) => {
      // ── U-01: Locate a valid fallback admin FIRST, before touching any records.
      // Without a fallback admin we cannot safely reassign financial history or
      // attendance records — abort cleanly with a clear message instead of letting
      // a FK constraint fire an opaque error deep in the transaction.
      const fallbackAdmin = await tx.user.findFirst({
        where: { role: "ADMIN", NOT: { id: userId }, status: "ACTIVE" }
      });

      if (!fallbackAdmin) {
        throw new Error("Cannot delete user: no other active Admin account exists to preserve audit trails and financial records.");
      }

      // ── U-01: Reassign Attendance.markedBy BEFORE deleting the user.
      // Attendance.markedBy is a required FK to User.id with no onDelete action
      // (defaults to Restrict in PostgreSQL). Without this reassignment the final
      // tx.user.delete() would throw a FK constraint violation for any user who
      // has ever marked attendance. Attendance records are kept intact; only the
      // marker attribution is transferred to the fallback admin.
      await tx.attendance.updateMany({
        where: { markedBy: userId },
        data: { markedBy: fallbackAdmin.id },
      });

      if (user.role === "PARENT" && user.parentProfile) {
        // ── U-02: Truly delete PARENT user account without deceptive blocking.
        // Unlink parentProfile's userId so the login User account is deleted
        // while preserving the ParentProfile, familyCode, students, and receipts.
        await tx.parentProfile.update({
          where: { id: user.parentProfile.id },
          data: { userId: null }
        });
      } else if (user.role === "TEACHER" && user.teacherProfile) {
        // Unbind as class teacher
        await tx.class.updateMany({
          where: { classTeacherId: user.teacherProfile.id },
          data: { classTeacherId: null }
        });
        await tx.homework.deleteMany({ where: { teacherId: user.teacherProfile.id } });
        await tx.leaveRequest.updateMany({
          where: { teacherId: user.teacherProfile.id },
          data: { teacherId: null }
        });
        await tx.teacherProfile.delete({ where: { id: user.teacherProfile.id } });
      } else if (user.role === "ACCOUNTANT" && user.accountantProfile) {
        await tx.accountantProfile.delete({ where: { id: user.accountantProfile.id } });
      }

      // Reassign financial records created by this user to the fallback admin
      await tx.receipt.updateMany({
        where: { createdById: userId },
        data: { createdById: fallbackAdmin.id },
      });
      await tx.ledgerEntry.updateMany({
        where: { createdById: userId },
        data: { createdById: fallbackAdmin.id },
      });
      await tx.notice.updateMany({
        where: { createdById: userId },
        data: { createdById: fallbackAdmin.id },
      });

      // ── U-04: Never delete audit logs. Foreign key onDelete: SetNull sets userId
      //    to null when the user is deleted, keeping the full compliance audit trail.
      // ── E-02: Structured Audit Logging
      await tx.auditLog.create({
        data: {
          userId: authUser.userId,
          action: "USER_DELETED",
          entityType: "User",
          entityId: userId,
          oldValues: JSON.stringify({ username: user.username, role: user.role, name: user.name }),
        },
      });

      // Finally delete the user account
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true, message: "User account deleted cleanly while preserving financial records." });
  } catch (error: any) {
    console.error("Delete user error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to delete user account.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

