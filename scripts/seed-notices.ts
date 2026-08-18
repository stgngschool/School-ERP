import prisma from "../src/lib/db";

const defaultNotices = [
  {
    title: "Admission Open for Session 2026-2027 (Nursery to Class 8th)",
    content: "Admissions are open for the academic session 2026-2027 for Classes Nursery to 8th. Parents are requested to collect the admission registration forms from the school office between 8:00 AM to 1:30 PM on working days or submit an online enquiry on the website. Limited seats are available per section to maintain individual teacher attention.",
    category: "ADMISSION",
    target: "ALL",
    isUrgent: true,
    isActive: true,
  },
  {
    title: "Half-Yearly Examination Datesheet & Syllabus Notification",
    content: "All students and parents are hereby notified that the Half-Yearly Examinations for Classes 1st to 8th are scheduled to commence from next month. Complete subject-wise syllabus and date sheet have been posted on the Parent Portal. Students must ensure their notebooks and practical activities are checked before exam commencement.",
    category: "EXAM",
    target: "ALL",
    isUrgent: true,
    isActive: true,
  },
  {
    title: "Parent-Teacher Meeting (PTM) & First Term Evaluation Review",
    content: "Respected parents are invited to attend the Parent-Teacher Meeting on Saturday between 8:30 AM to 12:30 PM. Teachers will discuss student academic progress, unit test marks, and handwriting improvement. Parent attendance is mandatory.",
    category: "ACADEMIC",
    target: "ALL",
    isUrgent: false,
    isActive: true,
  },
  {
    title: "Independence Day Celebrations & Cultural Program Schedule",
    content: "St. GNG School will celebrate 15th August Independence Day with great enthusiasm. Flag hoisting ceremony will take place at 8:00 AM sharp, followed by patriotic songs, speech competitions, and prize distribution. Regular classes will remain suspended on the occasion.",
    category: "HOLIDAY",
    target: "ALL",
    isUrgent: false,
    isActive: true,
  },
  {
    title: "Monthly Fee Dues Clearance Reminder & Online Receipts",
    content: "Respected parents are kindly requested to clear pending monthly tuition fees either at the school fee collection counter or online via the Parent ERP Portal. Instant digital receipts can be downloaded directly from your login dashboard.",
    category: "FEE",
    target: "PARENTS",
    isUrgent: false,
    isActive: true,
  },
  {
    title: "School Uniform, Morning Assembly & Discipline Guidelines",
    content: "All students must adhere strictly to the prescribed school uniform code including black polished shoes and student ID cards. Morning assembly starts at 7:30 AM sharp; late entries will not be permitted. Parents are requested to ensure punctuality.",
    category: "GENERAL",
    target: "ALL",
    isUrgent: false,
    isActive: true,
  }
];

async function seed() {
  console.log("Finding admin user...");
  const adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    console.error("No user found in database");
    process.exit(1);
  }
  console.log("Admin user found:", adminUser.username);

  console.log("Seeding default notices into PostgreSQL database...");
  for (const n of defaultNotices) {
    const existing = await prisma.notice.findFirst({ where: { title: n.title } });
    if (!existing) {
      await prisma.notice.create({
        data: {
          ...n,
          createdById: adminUser.id,
        },
      });
      console.log("Created notice:", n.title);
    } else {
      console.log("Notice already exists:", n.title);
    }
  }
  const total = await prisma.notice.count();
  console.log("Total notices in database now:", total);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
