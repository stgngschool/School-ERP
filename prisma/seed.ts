import { PrismaClient, Role, UserStatus, AttendanceStatus, LeaveStatus, EntryType, PaymentMethod } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database seeding (Month-wise April to March)...");

  // Clean existing records in reverse order of dependencies
  await prisma.auditLog.deleteMany();
  await prisma.receiptItem.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.feeAssignment.deleteMany();
  await prisma.feeStructureItem.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.feeHead.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.accountantProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database cleaned.");

  // Password hashes
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const accountantPasswordHash = await bcrypt.hash("accountant123", 10);
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
  const parentPasswordHash = await bcrypt.hash("parent123", 10);

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@school.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      name: "Shubham (Admin)",
      phone: "+919876543210",
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      username: "accountant",
      email: "accountant@school.com",
      passwordHash: accountantPasswordHash,
      role: Role.ACCOUNTANT,
      name: "Rajesh Kumar (Accountant)",
      phone: "+919876543211",
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      username: "teacher",
      email: "teacher@school.com",
      passwordHash: teacherPasswordHash,
      role: Role.TEACHER,
      name: "Meenakshi Sharma (Maths Teacher)",
      phone: "+919876543212",
    },
  });

  const parentUser = await prisma.user.create({
    data: {
      username: "parent",
      email: "parent@school.com",
      passwordHash: parentPasswordHash,
      role: Role.PARENT,
      name: "Rajesh Gupta (Parent)",
      phone: "+91 98765 43210", // matches parentStudents filter phone number
    },
  });

  // 2. Create Profiles
  const accountantProfile = await prisma.accountantProfile.create({
    data: {
      userId: accountantUser.id,
      employeeId: "EMP-ACC-01",
    },
  });

  const teacherProfile = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser.id,
      employeeId: "EMP-TCH-10",
    },
  });

  const parentProfile = await prisma.parentProfile.create({
    data: {
      userId: parentUser.id,
      familyCode: "FAM-1",
      address: "B-402, Green Valley Apartments, Varanasi, UP - 221007",
    },
  });

  console.log("Seeding classes KG to 8th...");
  const classNames = ["KG", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"];
  const classesList: any[] = [];
  
  for (const name of classNames) {
    const cls = await prisma.class.create({
      data: {
        name,
        section: "A",
      },
    });
    classesList.push(cls);
  }

  // Create standard Fee Heads
  console.log("Seeding fee heads...");
  const tuitionHead = await prisma.feeHead.create({
    data: { name: "Tuition Fee", frequency: "monthly" },
  });
  const admissionHead = await prisma.feeHead.create({
    data: { name: "Admission Fee", frequency: "one_time" },
  });
  const examHead = await prisma.feeHead.create({
    data: { name: "Exam Fee", frequency: "exam" },
  });

  // Create additional parents for realistic distribution
  console.log("Seeding additional parents...");
  const parentProfiles: any[] = [{ ...parentProfile, user: parentUser }];
  const lastNames = [
    "Gupta", "Sharma", "Kumar", "Singh", "Verma", "Sen", "Joshi", "Mehta", "Patel", "Shah",
    "Nair", "Iyer", "Rao", "Das", "Choudhury", "Mukherjee", "Banerjee", "Chatterjee", "Bose", "Dutta",
    "Tiwari", "Mishra", "Dubey", "Pandey", "Choudhary", "Gill", "Suri", "Kapoor", "Jha", "Prasad"
  ];
  const parentFirstNames = [
    "Rajesh", "Sunil", "Anil", "Sanjay", "Ramesh", "Vijay", "Amit", "Suresh", "Manoj", "Harish",
    "Ashok", "Alok", "Vivek", "Dinesh", "Pradeep", "Gopal", "Hari", "Karan", "Sunil", "Amit",
    "Sanjeev", "Rakesh", "Vikram", "Ajay", "Vijay", "Sandip", "Pankaj", "Mohan", "Devendra", "Kishore",
    "Arvind", "Lalit", "Naveen", "Pramod", "Abhay", "Anurag", "Kamal", "Mahesh", "Rajendra"
  ];

  for (let i = 1; i <= 99; i++) {
    const parentPassHash = await bcrypt.hash("parent123", 10);
    const pFn = parentFirstNames[i % parentFirstNames.length];
    const pLn = lastNames[i % lastNames.length];
    const parentName = `${pFn} ${pLn}`;

    const pUser = await prisma.user.create({
      data: {
        username: `parent_${i}`,
        email: `parent${i}@school.com`,
        passwordHash: parentPassHash,
        role: Role.PARENT,
        name: parentName,
        phone: `+9198765432${String(10 + i).padStart(2, '0')}`,
      },
    });
    const pProfile = await prisma.parentProfile.create({
      data: {
        userId: pUser.id,
        familyCode: `FAM-${1 + i}`,
        address: `${i * 10}-B, Sector ${i % 15}, Varanasi, UP - 221007`,
      },
    });
    parentProfiles.push({
      ...pProfile,
      user: pUser
    });
  }

  // Generate students distributed realistically (max 4 per parent)
  console.log("Generating fake Indian students (max 4 per parent)...");
  const firstNames = [
    "Aarav", "Diya", "Anya", "Rohan", "Kabir", "Sai", "Ishaan", "Ananya", "Kiara", "Vivaan",
    "Aditya", "Rahul", "Amit", "Priya", "Sneha", "Pooja", "Neha", "Arjun", "Yash", "Dev",
    "Karan", "Riya", "Siddharth", "Simran", "Vikram", "Kajal", "Manish", "Preeti", "Sanjay", "Shalini",
    "Ramesh", "Deepika", "Suresh", "Kiran", "Vijay", "Aisha", "Rajesh", "Jyoti", "Sunil", "Meera",
    "Anil", "Geeta", "Harish", "Rekha", "Abhishek", "Sunita", "Vivek", "Anita", "Sandeep", "Kavita",
    "Pradeep", "Mamta", "Manoj", "Babita", "Raj", "Sapna", "Alok", "Poonam", "Dinesh", "Usha"
  ];

  const studentsData: any[] = [];
  let studentCounter = 1;

  for (let p = 0; p < parentProfiles.length; p++) {
    const parent = parentProfiles[p];
    // Each parent gets 1 to 4 children (randomly)
    const numChildren = Math.floor(Math.random() * 4) + 1;

    for (let c = 0; c < numChildren; c++) {
      const randomClass = classesList[Math.floor(Math.random() * classesList.length)];
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      // Student shares parent's last name for realism!
      const parentNameParts = parent.user.name.split(" ");
      const ln = parentNameParts[parentNameParts.length - 1];
      const fullName = `${fn} ${ln}`;

      studentsData.push({
        id: `std-id-${studentCounter}`,
        name: fullName,
        admissionNumber: `ADM-2026-${1000 + studentCounter}`,
        rollNumber: `${randomClass.name}-A-${String(c + 1).padStart(2, '0')}`,
        parentProfileId: parent.id,
        classId: randomClass.id,
        fatherName: parent.user.name,
        fatherMobile: parent.user.phone,
      });
      studentCounter++;
    }
  }

  await prisma.student.createMany({
    data: studentsData,
  });

  // Generate marks for each student
  console.log("Seeding marks for students...");
  const subjects = ["Mathematics", "Science", "English", "Hindi", "Social Studies"];
  const exams = ["Quarterly", "Half Yearly", "Annual"];
  const marksData: any[] = [];

  for (let i = 1; i < studentCounter; i++) {
    const studentId = `std-id-${i}`;
    
    // Seed marks for each exam and subject
    for (const exam of exams) {
      for (const subject of subjects) {
        // Random marks between 40 and 100
        const maxMarks = 100;
        const marksObtained = Math.floor(Math.random() * 61) + 40; // 40 to 100
        const remarksList = ["Good performance", "Excellent", "Needs improvement", "Satisfactory", "Very Good"];
        const remarks = marksObtained > 80 ? remarksList[Math.floor(Math.random() * 2)] : (marksObtained > 60 ? remarksList[3] : remarksList[2]);

        marksData.push({
          studentId,
          subject,
          examName: exam,
          marksObtained,
          maxMarks,
          remarks,
        });
      }
    }
  }

  // Insert marks in chunks of 1000 to prevent query size limit issues
  const marksChunkSize = 1000;
  for (let i = 0; i < marksData.length; i += marksChunkSize) {
    const chunk = marksData.slice(i, i + marksChunkSize);
    await prisma.mark.createMany({
      data: chunk,
    });
  }
  console.log(`Seeded ${marksData.length} marks entries successfully.`);

  // Generate ledger entries for students
  console.log("Seeding billing ledger entries for fake students...");
  const ledgerEntries: any[] = [];
  
  for (let i = 1; i < studentCounter; i++) {
    const studentId = `std-id-${i}`;
    
    // Monthly Tuition Fee charge
    ledgerEntries.push({
      studentId,
      feeHeadId: tuitionHead.id,
      entryType: EntryType.CHARGE,
      amount: 150000, // Rs. 1500 in Paisa
      description: "Auto-Assigned: July Tuition Fee",
      createdById: accountantUser.id,
    });

    // One-Time Admission Fee charge
    ledgerEntries.push({
      studentId,
      feeHeadId: admissionHead.id,
      entryType: EntryType.CHARGE,
      amount: 500000, // Rs. 5000 in Paisa
      description: "Auto-Assigned: One-Time Admission Fee",
      createdById: accountantUser.id,
    });

    // Distribute payments: 60% paid, 20% partial, 20% unpaid
    const rand = Math.random();
    if (rand < 0.60) {
      // Paid fully (Rs. 6500)
      ledgerEntries.push({
        studentId,
        feeHeadId: tuitionHead.id,
        entryType: EntryType.PAYMENT,
        amount: 150000, // payment of charge
        description: "Paid: Cash Receipt Tuition",
        createdById: accountantUser.id,
      });
      ledgerEntries.push({
        studentId,
        feeHeadId: admissionHead.id,
        entryType: EntryType.PAYMENT,
        amount: 500000,
        description: "Paid: Cash Receipt Admission",
        createdById: accountantUser.id,
      });
    } else if (rand < 0.80) {
      // Paid partially (Rs. 3000)
      ledgerEntries.push({
        studentId,
        feeHeadId: admissionHead.id,
        entryType: EntryType.PAYMENT,
        amount: 300000,
        description: "Paid: Cash Receipt Partial Admission",
        createdById: accountantUser.id,
      });
    }
  }

  await prisma.ledgerEntry.createMany({
    data: ledgerEntries,
  });

  console.log(`Database seeded successfully with ${studentCounter - 1} dynamic students and realistic family linkages!`);

}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
