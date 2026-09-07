import fs from "fs";
import path from "path";
import db from "../src/lib/db";
import * as XLSX from "xlsx";

// Standard Subject Maps
const PRE_PRIMARY_SUBJECTS = ["ENGLISH", "HINDI", "MATHEMATICS", "DRAWING"];
const PRIMARY_SUBJECTS = ["ENGLISH", "HINDI", "MATHEMATICS", "SCIENCE/EVS", "COMPUTER", "DRAWING", "G.K.", "SANSKRIT"];
const MIDDLE_SUBJECTS = ["ENGLISH", "HINDI", "MATHEMATICS", "SCIENCE/EVS", "COMPUTER", "DRAWING", "G.K.", "SOCIAL SCIENCE", "SANSKRIT"];

const ALL_POSSIBLE_SUBJECTS = [
  "ENGLISH",
  "HINDI",
  "MATHEMATICS",
  "SCIENCE/EVS",
  "SOCIAL SCIENCE",
  "COMPUTER",
  "DRAWING",
  "G.K.",
  "SANSKRIT"
];

function normalizeSubjectName(sub: string): string {
  const norm = sub.toUpperCase().trim();
  if (norm === "EVS" || norm === "SCIENCE" || norm === "SCIENCE/EVS") return "SCIENCE/EVS";
  if (norm === "SOCIAL STUDIES" || norm === "SST" || norm === "SOCIAL SCIENCE") return "SOCIAL SCIENCE";
  if (norm === "ART" || norm === "DRAWING") return "DRAWING";
  if (norm === "GK" || norm === "GENERAL KNOWLEDGE" || norm === "G.K.") return "G.K.";
  if (norm === "MATHS" || norm === "MATH" || norm === "MATHEMATICS") return "MATHEMATICS";
  return norm;
}

function getExpectedSubjectsForClass(className: string): string[] {
  const norm = className.toUpperCase().trim();
  if (
    norm.includes("NURSERY") ||
    norm.includes("LKG") ||
    norm.includes("UKG") ||
    norm.includes("PRE-KG") ||
    norm.includes("PLAY") ||
    norm.startsWith("KG") ||
    norm.includes(" KG") ||
    norm.includes("-KG")
  ) {
    return PRE_PRIMARY_SUBJECTS;
  }

  const match = norm.match(/\d+/);
  if (match) {
    const classNum = parseInt(match[0], 10);
    if (classNum >= 6) return MIDDLE_SUBJECTS;
    return PRIMARY_SUBJECTS;
  }

  return PRIMARY_SUBJECTS;
}

// Natural sort for roll numbers
function sortRoll(a: string | null | undefined, b: string | null | undefined): number {
  const rawA = (a || "").toString().trim();
  const rawB = (b || "").toString().trim();
  const numA = parseInt(rawA.replace(/\D/g, ""), 10);
  const numB = parseInt(rawB.replace(/\D/g, ""), 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  if (!isNaN(numA)) return -1;
  if (!isNaN(numB)) return 1;
  return rawA.localeCompare(rawB);
}

// Class sorting order
const CLASS_ORDER: Record<string, number> = {
  "PLAY": 1,
  "NURSERY": 2,
  "LKG": 3,
  "UKG": 4,
  "KG": 5,
  "1": 6,
  "2": 7,
  "3": 8,
  "4": 9,
  "5": 10,
  "6": 11,
  "7": 12,
  "8": 13,
  "9": 14,
  "10": 15,
};

function getClassSortWeight(className: string): number {
  const clean = className.toUpperCase().replace(/CLASS/g, "").trim().split(" ")[0];
  return CLASS_ORDER[clean] || 99;
}

// Helper to escape CSV cell value
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

async function main() {
  console.log("Fetching data from database...");

  // 1. Fetch current session
  const currentSession = await db.academicSession.findFirst({
    where: { isCurrent: true }
  });

  const sessionId = currentSession?.id;
  const sessionName = currentSession?.name || "2026-2027";
  console.log(`Current Academic Session: ${sessionName} (${sessionId})`);

  // 2. Fetch all classes with class teacher
  const classes = await db.class.findMany({
    where: { status: "ACTIVE" },
    include: {
      classTeacher: {
        include: {
          user: { select: { name: true, phone: true } }
        }
      }
    }
  });

  // 3. Fetch all active students
  const students = await db.student.findMany({
    where: { status: "ACTIVE" },
    include: {
      class: true,
      parentProfile: true,
    }
  });

  console.log(`Loaded ${classes.length} active classes and ${students.length} active students.`);

  // 4. Fetch all marks (filtered by current session or Unit-1)
  const allMarks = await db.mark.findMany({
    where: {
      examName: "Unit-1",
      ...(sessionId ? { sessionId } : {})
    },
    select: {
      id: true,
      studentId: true,
      subject: true,
      examName: true,
      marksObtained: true,
      maxMarks: true,
      remarks: true,
      updatedAt: true,
    }
  });

  console.log(`Loaded ${allMarks.length} marks records for Unit-1.`);

  // Map student marks by studentId -> normalized subject -> mark record
  const studentMarksMap: Record<string, Record<string, any>> = {};
  allMarks.forEach(m => {
    if (!studentMarksMap[m.studentId]) {
      studentMarksMap[m.studentId] = {};
    }
    const normSubject = normalizeSubjectName(m.subject);
    studentMarksMap[m.studentId][normSubject] = m;
  });

  // Sort students by Class hierarchy, then by Section, then by Roll No
  students.sort((a, b) => {
    const weightA = getClassSortWeight(a.class?.name || "");
    const weightB = getClassSortWeight(b.class?.name || "");
    if (weightA !== weightB) return weightA - weightB;

    const classComp = (a.class?.name || "").localeCompare(b.class?.name || "");
    if (classComp !== 0) return classComp;

    const secComp = (a.class?.section || "").localeCompare(b.class?.section || "");
    if (secComp !== 0) return secComp;

    return sortRoll(a.rollNumber, b.rollNumber);
  });

  // --- BUILD STUDENT DETAIL ROWS ---
  interface StudentRow {
    sNo: number;
    className: string;
    section: string;
    rollNo: string;
    admissionNo: string;
    studentName: string;
    fatherName: string;
    fatherMobile: string;
    exam: string;
    status: "COMPLETED" | "PARTIAL" | "NOT_STARTED";
    expectedSubjectsCount: number;
    enteredSubjectsCount: number;
    coveragePct: string;
    totalObtained: number;
    totalMax: number;
    percentage: string;
    missingSubjects: string;
    subjectMarks: Record<string, string>;
    lastUpdated: string;
  }

  const studentRows: StudentRow[] = [];
  let sNo = 1;

  students.forEach(student => {
    const classNameStr = student.class?.name || "";
    const sectionStr = student.class?.section || "";
    const fullClass = `${classNameStr} ${sectionStr}`.trim();
    const expectedSubjects = getExpectedSubjectsForClass(classNameStr);
    const marksForStudent = studentMarksMap[student.id] || {};

    let enteredCount = 0;
    let totalObtained = 0;
    let totalMax = 0;
    const missing: string[] = [];
    const subjectMarks: Record<string, string> = {};
    let latestUpdate: Date | null = null;

    // Check each expected subject
    expectedSubjects.forEach(sub => {
      const record = marksForStudent[sub];
      if (record) {
        enteredCount++;
        const isAbsent = record.remarks?.toUpperCase().includes("ABSENT") || false;
        if (isAbsent) {
          subjectMarks[sub] = "AB";
          totalMax += record.maxMarks || 20;
        } else {
          subjectMarks[sub] = String(record.marksObtained);
          totalObtained += record.marksObtained;
          totalMax += record.maxMarks || 20;
        }
        if (record.updatedAt && (!latestUpdate || record.updatedAt > latestUpdate)) {
          latestUpdate = record.updatedAt;
        }
      } else {
        missing.push(sub);
        subjectMarks[sub] = "-";
      }
    });

    // Also check if student has marks in any subjects outside expected (e.g. Social Science in Class 5 if any)
    Object.keys(marksForStudent).forEach(sub => {
      if (!expectedSubjects.includes(sub) && !subjectMarks[sub]) {
        const record = marksForStudent[sub];
        enteredCount++;
        const isAbsent = record.remarks?.toUpperCase().includes("ABSENT") || false;
        subjectMarks[sub] = isAbsent ? "AB" : String(record.marksObtained);
        if (!isAbsent) totalObtained += record.marksObtained;
        totalMax += record.maxMarks || 20;
      }
    });

    let status: "COMPLETED" | "PARTIAL" | "NOT_STARTED" = "NOT_STARTED";
    if (enteredCount >= expectedSubjects.length) {
      status = "COMPLETED";
    } else if (enteredCount > 0) {
      status = "PARTIAL";
    }

    const pct = totalMax > 0 ? `${((totalObtained / totalMax) * 100).toFixed(1)}%` : "0.0%";
    const coveragePct = expectedSubjects.length > 0 ? `${((enteredCount / expectedSubjects.length) * 100).toFixed(0)}%` : "0%";

    studentRows.push({
      sNo: sNo++,
      className: classNameStr,
      section: sectionStr,
      rollNo: student.rollNumber || "--",
      admissionNo: student.admissionNumber,
      studentName: student.name,
      fatherName: student.fatherName || "--",
      fatherMobile: student.fatherMobile || "--",
      exam: "Unit-1",
      status,
      expectedSubjectsCount: expectedSubjects.length,
      enteredSubjectsCount: enteredCount,
      coveragePct,
      totalObtained,
      totalMax,
      percentage: pct,
      missingSubjects: missing.join("; "),
      subjectMarks,
      lastUpdated: latestUpdate ? new Date(latestUpdate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "--"
    });
  });

  // --- BUILD CLASS-WISE SUMMARY ---
  interface ClassSummaryRow {
    className: string;
    section: string;
    classTeacher: string;
    teacherPhone: string;
    totalStudents: number;
    completedStudents: number;
    partialStudents: number;
    notStartedStudents: number;
    fedCount: number; // completed + partial
    coveragePct: string;
    subjectStats: Record<string, string>;
  }

  const classSummaryMap: Record<string, ClassSummaryRow> = {};

  classes.sort((a, b) => {
    const weightA = getClassSortWeight(a.name);
    const weightB = getClassSortWeight(b.name);
    if (weightA !== weightB) return weightA - weightB;
    return a.name.localeCompare(b.name) || a.section.localeCompare(b.section);
  });

  classes.forEach(c => {
    const key = `${c.name} ${c.section}`.trim();
    classSummaryMap[key] = {
      className: c.name,
      section: c.section,
      classTeacher: c.classTeacher?.user?.name || "Unassigned",
      teacherPhone: c.classTeacher?.user?.phone || "--",
      totalStudents: 0,
      completedStudents: 0,
      partialStudents: 0,
      notStartedStudents: 0,
      fedCount: 0,
      coveragePct: "0%",
      subjectStats: {}
    };
  });

  studentRows.forEach(sr => {
    const key = `${sr.className} ${sr.section}`.trim();
    if (!classSummaryMap[key]) {
      classSummaryMap[key] = {
        className: sr.className,
        section: sr.section,
        classTeacher: "Unassigned",
        teacherPhone: "--",
        totalStudents: 0,
        completedStudents: 0,
        partialStudents: 0,
        notStartedStudents: 0,
        fedCount: 0,
        coveragePct: "0%",
        subjectStats: {}
      };
    }
    const cObj = classSummaryMap[key];
    cObj.totalStudents++;
    if (sr.status === "COMPLETED") cObj.completedStudents++;
    else if (sr.status === "PARTIAL") cObj.partialStudents++;
    else cObj.notStartedStudents++;

    if (sr.enteredSubjectsCount > 0) cObj.fedCount++;

    // Track subject-wise count
    Object.entries(sr.subjectMarks).forEach(([sub, mark]) => {
      if (mark !== "-") {
        cObj.subjectStats[sub] = String((parseInt(cObj.subjectStats[sub] || "0", 10) + 1));
      }
    });
  });

  Object.values(classSummaryMap).forEach(cObj => {
    cObj.coveragePct = cObj.totalStudents > 0 ? `${((cObj.fedCount / cObj.totalStudents) * 100).toFixed(1)}%` : "0%";
  });

  // --- GENERATE CSV 1: ALL STUDENTS DETAILED MARKS STATUS ---
  const csv1Headers = [
    "S.No",
    "Class",
    "Section",
    "Roll No",
    "Admission No",
    "Student Name",
    "Father Name",
    "Mobile",
    "Exam",
    "Feeding Status",
    "Entered Subjects",
    "Total Subjects",
    "Coverage %",
    "Total Obtained",
    "Total Max",
    "Percentage",
    ...ALL_POSSIBLE_SUBJECTS,
    "Missing Subjects",
    "Last Updated"
  ];

  const csv1Lines = [csv1Headers.map(escapeCSV).join(",")];

  studentRows.forEach(sr => {
    const line = [
      sr.sNo,
      sr.className,
      sr.section,
      sr.rollNo,
      sr.admissionNo,
      sr.studentName,
      sr.fatherName,
      sr.fatherMobile,
      sr.exam,
      sr.status,
      sr.enteredSubjectsCount,
      sr.expectedSubjectsCount,
      sr.coveragePct,
      sr.totalObtained,
      sr.totalMax,
      sr.percentage,
      ...ALL_POSSIBLE_SUBJECTS.map(sub => sr.subjectMarks[sub] || "-"),
      sr.missingSubjects,
      sr.lastUpdated
    ];
    csv1Lines.push(line.map(escapeCSV).join(","));
  });

  const csv1Content = "\uFEFF" + csv1Lines.join("\r\n"); // UTF-8 BOM for Excel compatibility

  // --- GENERATE CSV 2: CLASS SUMMARY STATUS ---
  const csv2Headers = [
    "Class",
    "Section",
    "Class Teacher",
    "Teacher Phone",
    "Total Students",
    "Fully Completed",
    "Partially Entered",
    "Not Started",
    "Total Fed (Any)",
    "Feeding Coverage %",
    ...ALL_POSSIBLE_SUBJECTS.map(sub => `${sub} (Fed Count)`)
  ];

  const csv2Lines = [csv2Headers.map(escapeCSV).join(",")];

  Object.values(classSummaryMap).forEach(cObj => {
    const line = [
      cObj.className,
      cObj.section,
      cObj.classTeacher,
      cObj.teacherPhone,
      cObj.totalStudents,
      cObj.completedStudents,
      cObj.partialStudents,
      cObj.notStartedStudents,
      cObj.fedCount,
      cObj.coveragePct,
      ...ALL_POSSIBLE_SUBJECTS.map(sub => cObj.subjectStats[sub] || "0")
    ];
    csv2Lines.push(line.map(escapeCSV).join(","));
  });

  const csv2Content = "\uFEFF" + csv2Lines.join("\r\n");

  // --- GENERATE CSV 3: PENDING STUDENTS ONLY ---
  const pendingRows = studentRows.filter(sr => sr.status !== "COMPLETED");
  const csv3Lines = [
    [
      "S.No",
      "Class",
      "Section",
      "Roll No",
      "Admission No",
      "Student Name",
      "Father Name",
      "Mobile",
      "Status",
      "Entered Subjects",
      "Total Expected",
      "Missing Subjects"
    ].map(escapeCSV).join(",")
  ];

  pendingRows.forEach((sr, idx) => {
    const line = [
      idx + 1,
      sr.className,
      sr.section,
      sr.rollNo,
      sr.admissionNo,
      sr.studentName,
      sr.fatherName,
      sr.fatherMobile,
      sr.status,
      sr.enteredSubjectsCount,
      sr.expectedSubjectsCount,
      sr.missingSubjects
    ];
    csv3Lines.push(line.map(escapeCSV).join(","));
  });

  const csv3Content = "\uFEFF" + csv3Lines.join("\r\n");

  // Output directories
  const rootDir = path.resolve(".");
  const publicExportsDir = path.join(rootDir, "public", "exports");
  if (!fs.existsSync(publicExportsDir)) {
    fs.mkdirSync(publicExportsDir, { recursive: true });
  }

  // 1. Write CSV files to Root and to Public/exports
  const filesToWrite = [
    {
      rootPath: path.join(rootDir, "marks_feeding_all_students.csv"),
      publicPath: path.join(publicExportsDir, "marks_feeding_all_students.csv"),
      content: csv1Content,
    },
    {
      rootPath: path.join(rootDir, "marks_feeding_class_summary.csv"),
      publicPath: path.join(publicExportsDir, "marks_feeding_class_summary.csv"),
      content: csv2Content,
    },
    {
      rootPath: path.join(rootDir, "marks_feeding_pending_students.csv"),
      publicPath: path.join(publicExportsDir, "marks_feeding_pending_students.csv"),
      content: csv3Content,
    }
  ];

  filesToWrite.forEach(f => {
    fs.writeFileSync(f.rootPath, f.content, "utf-8");
    fs.writeFileSync(f.publicPath, f.content, "utf-8");
    console.log(`Saved: ${f.rootPath}`);
    console.log(`Saved: ${f.publicPath}`);
  });

  // --- GENERATE EXCEL WORKBOOK (XLSX) WITH 3 TABS ---
  const wb = XLSX.utils.book_new();

  // Tab 1: Class Summary
  const wsSummaryData = Object.values(classSummaryMap).map(c => ({
    "Class": `${c.className} ${c.section}`.trim(),
    "Class Teacher": c.classTeacher,
    "Total Students": c.totalStudents,
    "Fully Completed": c.completedStudents,
    "Partially Entered": c.partialStudents,
    "Not Started": c.notStartedStudents,
    "Fed (At least 1 sub)": c.fedCount,
    "Coverage %": c.coveragePct,
    ...Object.fromEntries(ALL_POSSIBLE_SUBJECTS.map(sub => [sub, parseInt(c.subjectStats[sub] || "0", 10)]))
  }));
  const wsSummary = XLSX.utils.json_to_sheet(wsSummaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Class-wise Summary");

  // Tab 2: All Students Detail
  const wsAllStudentsData = studentRows.map(sr => ({
    "Roll No": sr.rollNo,
    "Class": `${sr.className} ${sr.section}`.trim(),
    "Admission No": sr.admissionNo,
    "Student Name": sr.studentName,
    "Father Name": sr.fatherName,
    "Mobile": sr.fatherMobile,
    "Status": sr.status,
    "Entered Subjects": sr.enteredSubjectsCount,
    "Total Subjects": sr.expectedSubjectsCount,
    "Coverage %": sr.coveragePct,
    "Total Obtained": sr.totalObtained,
    "Total Max": sr.totalMax,
    "Percentage": sr.percentage,
    ...sr.subjectMarks,
    "Missing Subjects": sr.missingSubjects,
    "Last Updated": sr.lastUpdated
  }));
  const wsAllStudents = XLSX.utils.json_to_sheet(wsAllStudentsData);
  XLSX.utils.book_append_sheet(wb, wsAllStudents, "All Students (623)");

  // Tab 3: Pending Students
  const wsPendingData = pendingRows.map(sr => ({
    "Roll No": sr.rollNo,
    "Class": `${sr.className} ${sr.section}`.trim(),
    "Admission No": sr.admissionNo,
    "Student Name": sr.studentName,
    "Father Name": sr.fatherName,
    "Mobile": sr.fatherMobile,
    "Status": sr.status,
    "Entered Subjects": sr.enteredSubjectsCount,
    "Total Expected": sr.expectedSubjectsCount,
    "Missing Subjects": sr.missingSubjects
  }));
  const wsPending = XLSX.utils.json_to_sheet(wsPendingData);
  XLSX.utils.book_append_sheet(wb, wsPending, "Pending Students");

  const xlsxPathRoot = path.join(rootDir, "marks_feeding_full_report.xlsx");
  const xlsxPathPublic = path.join(publicExportsDir, "marks_feeding_full_report.xlsx");
  XLSX.writeFile(wb, xlsxPathRoot);
  XLSX.writeFile(wb, xlsxPathPublic);
  console.log(`Saved Excel Report: ${xlsxPathRoot}`);
  console.log(`Saved Excel Report: ${xlsxPathPublic}`);

  console.log("\n================ EXPORT COMPLETE ================");
  console.log(`Total Students: ${studentRows.length}`);
  console.log(`Fully Completed: ${studentRows.filter(s => s.status === "COMPLETED").length}`);
  console.log(`Partially Entered: ${studentRows.filter(s => s.status === "PARTIAL").length}`);
  console.log(`Not Started: ${studentRows.filter(s => s.status === "NOT_STARTED").length}`);
  console.log(`Total With At Least 1 Mark: ${studentRows.filter(s => s.enteredSubjectsCount > 0).length} / ${studentRows.length}`);
}

main()
  .catch(e => {
    console.error("Export failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
