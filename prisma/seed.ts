import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning database and setting up mock data...");

  // Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.receiptItem.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.feeAssignment.deleteMany();
  await prisma.feeStructureItem.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.feeHead.deleteMany();
  await prisma.transportStop.deleteMany();
  await prisma.concession.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.studentSession.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.accountantProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log("All data cleaned.");

  // Password hash for admin
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.create({
    data: {
      username: "shubham",
      email: "shubham@school.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      name: "Shubham",
      phone: "+919876543210",
    },
  });

  // Create Mock Sessions
  const session1 = await prisma.academicSession.create({
    data: {
      name: "2025-2026",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isCurrent: false,
    }
  });

  const session2 = await prisma.academicSession.create({
    data: {
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: true,
    }
  });

  // Create Mock Class
  const class10 = await prisma.class.create({
    data: { name: "Class 10", section: "A" }
  });

  // Create Mock Parent and Student
  const parent = await prisma.parentProfile.create({
    data: {
      familyCode: "FAM-2026-0001",
      user: {
        create: {
          username: "parent1",
          email: "parent1@example.com",
          passwordHash: adminPasswordHash,
          role: Role.PARENT,
          name: "Ramesh Kumar"
        }
      }
    }
  });

  const student = await prisma.student.create({
    data: {
      name: "Rahul Kumar",
      admissionNumber: "ADM-001",
      parentProfileId: parent.id,
      classId: class10.id, // Current class
    }
  });

  // Create Student Sessions (Enrollment History)
  await prisma.studentSession.create({
    data: {
      studentId: student.id,
      sessionId: session1.id,
      classId: class10.id,
      rollNumber: "12"
    }
  });
  
  await prisma.studentSession.create({
    data: {
      studentId: student.id,
      sessionId: session2.id,
      classId: class10.id,
      rollNumber: "12"
    }
  });

  // Create Fee Head and Structure
  const tuitionFeeHead = await prisma.feeHead.create({
    data: { name: "Tuition Fee", frequency: "monthly" }
  });

  const feeStructure = await prisma.feeStructure.create({
    data: {
      name: "Class 10 Tuition",
      frequency: "monthly",
      className: "Class 10"
    }
  });

  await prisma.feeStructureItem.create({
    data: {
      feeStructureId: feeStructure.id,
      feeHeadId: tuitionFeeHead.id,
      amount: 250000 // 2500 INR in paisa
    }
  });

  // Assign fees for both sessions
  await prisma.feeAssignment.create({
    data: {
      studentId: student.id,
      feeStructureId: feeStructure.id,
      sessionId: session1.id
    }
  });
  
  await prisma.feeAssignment.create({
    data: {
      studentId: student.id,
      feeStructureId: feeStructure.id,
      sessionId: session2.id
    }
  });

  // Create Ledger Entries (Past dues and Current dues)
  // 1. Unpaid due from last session (2025-2026) - e.g. March 2026 fee
  await prisma.ledgerEntry.create({
    data: {
      studentId: student.id,
      feeHeadId: tuitionFeeHead.id,
      entryType: "CHARGE",
      amount: 250000,
      description: "Tuition Fee - March 2026 (Pending from last session)",
      sessionId: session1.id,
      createdById: adminUser.id,
      createdAt: new Date("2026-03-01")
    }
  });

  // 2. Current due for active session (2026-2027) - e.g. April 2026 fee
  await prisma.ledgerEntry.create({
    data: {
      studentId: student.id,
      feeHeadId: tuitionFeeHead.id,
      entryType: "CHARGE",
      amount: 250000,
      description: "Tuition Fee - April 2026",
      sessionId: session2.id,
      createdById: adminUser.id,
      createdAt: new Date("2026-04-01")
    }
  });

  console.log(`Database mock setup completed successfully!`);
  console.log(`- Admin: ${adminUser.username}`);
  console.log(`- Student: ${student.name} with past dues in 2025-2026 session.`);
}

main()
  .catch((e) => {
    console.error("Database reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
