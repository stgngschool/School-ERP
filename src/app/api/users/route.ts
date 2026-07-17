import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { role: "asc" },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch user accounts" }, { status: 500 });
  }
}export async function PATCH(request: Request) {
  try {
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
    const { name, username, email, password, role, phone, employeeId } = await request.json();
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
        await tx.teacherProfile.create({
          data: {
            userId: u.id,
            employeeId: employeeId || `TCH-${Math.floor(1000 + Math.random() * 9000)}`
          }
        });
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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
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

    // Safely delete user and their associated entities in a transaction
    await db.$transaction(async (tx) => {
      if (user.role === "PARENT" && user.parentProfile) {
        const studentIds = user.parentProfile.students.map((s) => s.id);
        if (studentIds.length > 0) {
          // Delete student references to prevent constraints failure
          await tx.feeAssignment.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.attendance.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.leaveRequest.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.ledgerEntry.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.student.deleteMany({ where: { id: { in: studentIds } } });
        }
        await tx.parentProfile.delete({ where: { id: user.parentProfile.id } });
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

      // Finally delete the user account
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true, message: "User account and all dependencies deleted successfully" });
  } catch (error: any) {
    console.error("Delete user status error:", error);
    return NextResponse.json({ error: "Failed to delete user and dependencies: " + error.message }, { status: 500 });
  }
}
