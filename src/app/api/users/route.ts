import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const users = await db.user.findMany({
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
        data: { passwordHash },
      });
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

    const updated = await db.user.update({
      where: { id: userId },
      data: { status: newStatus },
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

    // Check if username/email already exists
    const existing = await db.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });
    if (existing) {
      return NextResponse.json({ error: "Username or Email is already registered." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name,
          username,
          email,
          passwordHash,
          role,
          phone
        }
      });

      if (role === "TEACHER") {
        const tp = await tx.teacherProfile.create({
          data: {
            userId: u.id,
            employeeId: employeeId || `TCH-${Math.floor(1000 + Math.random() * 9000)}`
          }
        });

        if (classId) {
          await tx.class.update({
            where: { id: classId },
            data: { classTeacherId: tp.id }
          });
        }
      } else if (role === "ACCOUNTANT") {
        await tx.accountantProfile.create({
          data: {
            userId: u.id,
            employeeId: employeeId || `ACC-${Math.floor(1000 + Math.random() * 9000)}`
          }
        });
      }
      return u;
    });

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role }
    });
  } catch (error: any) {
    console.error("Create staff error:", error);
    return NextResponse.json({ error: "Failed to register staff: " + error.message }, { status: 500 });
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
      if (user.role === "PARENT" && user.parentProfile) {
        // Mark user account as BLOCKED to prevent login while keeping all student linkages, ledger entries and receipts intact
        await tx.user.update({
          where: { id: user.id },
          data: { status: "BLOCKED" }
        });
        return;
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

      // Reassign financial records created by this user to another active admin user to preserve financial history
      const fallbackAdmin = await tx.user.findFirst({
        where: { role: "ADMIN", NOT: { id: userId }, status: "ACTIVE" }
      });

      if (fallbackAdmin) {
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
      } else {
        // If no fallback admin exists, soft-delete by blocking account
        throw new Error("Cannot delete staff user when no alternative Admin exists to preserve audit trails.");
      }

      await tx.auditLog.deleteMany({ where: { userId: userId } });

      // Finally delete the user account
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true, message: "User account deleted cleanly while preserving financial records." });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user: " + error.message }, { status: 500 });
  }
}

