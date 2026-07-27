import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning database and setting up single Admin user...");

  // Clean existing records in reverse order of foreign key dependencies
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
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.accountantProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log("All data, mock users, students, teachers, parents, fees, classes cleaned.");

  // Password hash for shubham admin
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  // Create ONLY ONE Single Fresh Admin User: shubham
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

  console.log(`Database clean setup completed successfully! Single Admin created: ${adminUser.username} (${adminUser.name})`);
}

main()
  .catch((e) => {
    console.error("Database reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
