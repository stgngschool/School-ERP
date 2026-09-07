import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

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
  const norm = (sub || "").toUpperCase().trim();
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

function calculateGrade(percentage: number, isAbsent: boolean = false): string {
  if (isAbsent) return "AB";
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 33) return "E";
  return "F";
}

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

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function applyAutoColumnWidths(ws: XLSX.WorkSheet, data: any[]) {
  if (!data || data.length === 0) return;
  const colKeys = Object.keys(data[0]);
  const colWidths = colKeys.map(key => {
    let maxLen = key.length;
    for (let i = 0; i < Math.min(data.length, 200); i++) {
      const val = data[i][key];
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 9), 32) };
  });
  ws["!cols"] = colWidths;
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT" && authUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden. Admin or Staff access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // "all" | "summary" | "pending" | "xlsx"
    const examParam = searchParams.get("exam") || "Unit-1";
    const classParam = searchParams.get("class"); // optional e.g. "LKG-A" or "1-A"

    // 1. Session
    const currentSession = await db.academicSession.findFirst({
      where: { isCurrent: true }
    });
    const sessionId = currentSession?.id;

    // 2. Classes & Teachers
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

    // 3. Students
    const allActiveStudents = await db.student.findMany({
      where: { status: "ACTIVE" },
      include: {
        class: true,
      }
    });

    // Sort classes
    classes.sort((a, b) => {
      const weightA = getClassSortWeight(a.name);
      const weightB = getClassSortWeight(b.name);
      if (weightA !== weightB) return weightA - weightB;
      const nameComp = a.name.localeCompare(b.name);
      if (nameComp !== 0) return nameComp;
      return (a.section || "").localeCompare(b.section || "");
    });

    // Sort students
    allActiveStudents.sort((a, b) => {
      const weightA = getClassSortWeight(a.class?.name || "");
      const weightB = getClassSortWeight(b.class?.name || "");
      if (weightA !== weightB) return weightA - weightB;

      const classComp = (a.class?.name || "").localeCompare(b.class?.name || "");
      if (classComp !== 0) return classComp;

      const secComp = (a.class?.section || "").localeCompare(b.class?.section || "");
      if (secComp !== 0) return secComp;

      return sortRoll(a.rollNumber, b.rollNumber);
    });

    // 4. Marks
    const marks = await db.mark.findMany({
      where: {
        examName: { equals: examParam, mode: "insensitive" },
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

    const studentMarksMap: Record<string, Record<string, any>> = {};
    marks.forEach(m => {
      if (!studentMarksMap[m.studentId]) studentMarksMap[m.studentId] = {};
      const normSub = normalizeSubjectName(m.subject);
      studentMarksMap[m.studentId][normSub] = m;
    });

    // Filter students by class if specified for single-class export
    const isSingleClass = !!(classParam && classParam !== "ALL");
    const exportStudents = isSingleClass
      ? allActiveStudents.filter(s => {
          const cName = (s.class?.name || "").trim().toUpperCase();
          const cSec = (s.class?.section || "").trim().toUpperCase();
          const target = classParam!.replace(/^Class\s+/i, "").trim().toUpperCase();
          return (
            target === `${cName}-${cSec}` ||
            target === `${cName} ${cSec}` ||
            target === cName ||
            target === (s.class?.name || "").toUpperCase()
          );
        })
      : allActiveStudents;

    // Helper to process a student's marks
    function processStudent(student: any, sNo: number) {
      const classNameStr = student.class?.name || "";
      const sectionStr = student.class?.section || "";
      const classDisplayName = `${classNameStr} ${sectionStr}`.trim();
      const expectedSubjects = getExpectedSubjectsForClass(classNameStr);
      const marksForStudent = studentMarksMap[student.id] || {};

      let enteredCount = 0;
      let totalObtained = 0;
      let totalMax = 0;
      let absentCount = 0;
      const missing: string[] = [];
      const subjectMarks: Record<string, string> = {};
      let latestUpdate: Date | null = null;

      expectedSubjects.forEach(sub => {
        const record = marksForStudent[sub];
        if (record) {
          enteredCount++;
          const isAbsent = record.remarks?.toUpperCase().includes("ABSENT") || false;
          if (isAbsent) {
            absentCount++;
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

      // Include non-standard subjects if teacher fed them
      Object.keys(marksForStudent).forEach(sub => {
        if (!expectedSubjects.includes(sub) && !subjectMarks[sub]) {
          const record = marksForStudent[sub];
          enteredCount++;
          const isAbsent = record.remarks?.toUpperCase().includes("ABSENT") || false;
          if (isAbsent) {
            absentCount++;
            subjectMarks[sub] = "AB";
            totalMax += record.maxMarks || 20;
          } else {
            subjectMarks[sub] = String(record.marksObtained);
            totalObtained += record.marksObtained;
            totalMax += record.maxMarks || 20;
          }
        }
      });

      let status = "NOT_STARTED";
      if (enteredCount >= expectedSubjects.length && expectedSubjects.length > 0) {
        status = "COMPLETED";
      } else if (enteredCount > 0) {
        status = "PARTIAL";
      }

      const isAllAbsent = enteredCount > 0 && absentCount === enteredCount;
      const pctNum = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const percentageStr = enteredCount > 0 ? `${pctNum.toFixed(1)}%` : "--";

      let grade = "--";
      let result = "PENDING";
      if (enteredCount > 0) {
        if (isAllAbsent) {
          grade = "AB";
          result = "ABSENT";
        } else {
          grade = calculateGrade(pctNum);
          result = pctNum >= 33 ? "PASS" : "FAIL";
        }
      }

      return {
        sNo,
        className: classNameStr,
        section: sectionStr,
        classDisplayName,
        rollNo: student.rollNumber || "--",
        admissionNo: student.admissionNumber,
        studentName: student.name,
        fatherName: student.fatherName || "--",
        fatherMobile: student.fatherMobile || "--",
        exam: examParam,
        status,
        expectedSubjects,
        expectedSubjectsCount: expectedSubjects.length,
        enteredSubjectsCount: enteredCount,
        totalObtained,
        totalMax,
        pctNum,
        percentage: percentageStr,
        grade,
        result,
        missingSubjects: missing.join("; "),
        subjectMarks,
        lastUpdated: latestUpdate ? new Date(latestUpdate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "--"
      };
    }

    // Process all students
    const allProcessedStudents = allActiveStudents.map((s, idx) => processStudent(s, idx + 1));
    const exportProcessedStudents = isSingleClass
      ? exportStudents.map((s, idx) => processStudent(s, idx + 1))
      : allProcessedStudents;

    // Build School Summary Map
    const classSummaryMap: Record<string, any> = {};
    classes.forEach(c => {
      const key = `${c.name} ${c.section}`.trim();
      classSummaryMap[key] = {
        className: c.name,
        section: c.section,
        classDisplayName: key,
        classTeacher: c.classTeacher?.user?.name || "Unassigned",
        teacherPhone: c.classTeacher?.user?.phone || "--",
        totalStudents: 0,
        appearedStudents: 0,
        completedStudents: 0,
        partialStudents: 0,
        notStartedStudents: 0,
        passCount: 0,
        failCount: 0,
        absentCount: 0,
        totalMarksSum: 0,
        totalMaxSum: 0,
        topScore: -1,
        topScorerName: "--",
        subjectStats: {} as Record<string, number>
      };
    });

    allProcessedStudents.forEach(sr => {
      const key = sr.classDisplayName;
      if (!classSummaryMap[key]) {
        classSummaryMap[key] = {
          className: sr.className,
          section: sr.section,
          classDisplayName: key,
          classTeacher: "Unassigned",
          teacherPhone: "--",
          totalStudents: 0,
          appearedStudents: 0,
          completedStudents: 0,
          partialStudents: 0,
          notStartedStudents: 0,
          passCount: 0,
          failCount: 0,
          absentCount: 0,
          totalMarksSum: 0,
          totalMaxSum: 0,
          topScore: -1,
          topScorerName: "--",
          subjectStats: {} as Record<string, number>
        };
      }
      const cObj = classSummaryMap[key];
      cObj.totalStudents++;

      if (sr.status === "COMPLETED") cObj.completedStudents++;
      else if (sr.status === "PARTIAL") cObj.partialStudents++;
      else cObj.notStartedStudents++;

      if (sr.enteredSubjectsCount > 0) {
        cObj.appearedStudents++;
        cObj.totalMarksSum += sr.totalObtained;
        cObj.totalMaxSum += sr.totalMax;

        if (sr.result === "PASS") cObj.passCount++;
        else if (sr.result === "FAIL") cObj.failCount++;
        else if (sr.result === "ABSENT") cObj.absentCount++;

        if (sr.totalObtained > cObj.topScore) {
          cObj.topScore = sr.totalObtained;
          cObj.topScorerName = `${sr.studentName} (${sr.totalObtained}/${sr.totalMax})`;
        }
      }

      Object.entries(sr.subjectMarks).forEach(([sub, mark]) => {
        if (mark !== "-") {
          cObj.subjectStats[sub] = (cObj.subjectStats[sub] || 0) + 1;
        }
      });
    });

    const nowStr = new Date().toISOString().split("T")[0];
    const cleanExam = examParam.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanClass = isSingleClass ? classParam!.replace(/[^a-zA-Z0-9_-]/g, "_") : "All_Students";

    // ─────────────────────────────────────────────────────────────────────────────
    // FORMAT 1: EXCEL (.xlsx) WORKBOOK
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === "xlsx") {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive School Summary
      const wsSummaryData = Object.values(classSummaryMap).map((c, idx) => {
        const passPct = c.appearedStudents > 0 ? `${((c.passCount / c.appearedStudents) * 100).toFixed(1)}%` : "0.0%";
        const classAvg = c.totalMaxSum > 0 ? `${((c.totalMarksSum / c.totalMaxSum) * 100).toFixed(1)}%` : "0.0%";
        const feedingStatus = c.totalStudents === 0 ? "No Students" : c.completedStudents === c.totalStudents ? "Fully Completed" : c.appearedStudents > 0 ? `In Progress (${c.appearedStudents}/${c.totalStudents})` : "Not Started";

        return {
          "S.No": idx + 1,
          "Class & Section": c.classDisplayName,
          "Class Teacher": c.classTeacher,
          "Teacher Phone": c.teacherPhone,
          "Total Strength": c.totalStudents,
          "Appeared": c.appearedStudents,
          "Passed": c.passCount,
          "Failed": c.failCount,
          "Pass %": passPct,
          "Class Average": classAvg,
          "Top Scorer": c.topScorerName,
          "Marks Feeding Status": feedingStatus,
          ...Object.fromEntries(ALL_POSSIBLE_SUBJECTS.map(sub => [`${sub} (Fed)`, c.subjectStats[sub] || 0]))
        };
      });
      const wsSummary = XLSX.utils.json_to_sheet(wsSummaryData);
      applyAutoColumnWidths(wsSummary, wsSummaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "School Summary");

      // Sheet 2: Master Tabulation Register (All Students)
      const wsAllStudentsData = allProcessedStudents.map(sr => ({
        "S.No": sr.sNo,
        "Class": sr.classDisplayName,
        "Roll No": sr.rollNo,
        "Adm No": sr.admissionNo,
        "Student Name": sr.studentName,
        "Father Name": sr.fatherName,
        "Mobile": sr.fatherMobile,
        ...sr.subjectMarks,
        "Grand Total": sr.totalObtained,
        "Max Marks": sr.totalMax,
        "Percentage": sr.percentage,
        "Grade": sr.grade,
        "Result": sr.result,
        "Feeding Status": sr.status
      }));
      const wsAll = XLSX.utils.json_to_sheet(wsAllStudentsData);
      applyAutoColumnWidths(wsAll, wsAllStudentsData);
      XLSX.utils.book_append_sheet(wb, wsAll, "Master Register (All)");

      // Sheet 3 to N: Individual Class-Wise Tabs
      // Generates an isolated tab for every class containing only relevant subjects!
      const classGroups: Record<string, typeof allProcessedStudents> = {};
      allProcessedStudents.forEach(sr => {
        if (!classGroups[sr.classDisplayName]) classGroups[sr.classDisplayName] = [];
        classGroups[sr.classDisplayName].push(sr);
      });

      Object.entries(classGroups).forEach(([classTitle, studentsInClass]) => {
        const sampleStudent = studentsInClass[0];
        const classSubjects = sampleStudent ? sampleStudent.expectedSubjects : ALL_POSSIBLE_SUBJECTS;

        const classSheetData = studentsInClass.map((sr, idx) => {
          const rowObj: Record<string, any> = {
            "S.No": idx + 1,
            "Roll No": sr.rollNo,
            "Adm No": sr.admissionNo,
            "Student Name": sr.studentName,
            "Father Name": sr.fatherName,
            "Mobile": sr.fatherMobile,
          };
          // Insert relevant subjects only
          classSubjects.forEach(sub => {
            rowObj[sub] = sr.subjectMarks[sub] || "-";
          });
          rowObj["Grand Total"] = sr.totalObtained;
          rowObj["Max Marks"] = sr.totalMax;
          rowObj["Percentage"] = sr.percentage;
          rowObj["Grade"] = sr.grade;
          rowObj["Result"] = sr.result;
          return rowObj;
        });

        const wsClass = XLSX.utils.json_to_sheet(classSheetData);
        applyAutoColumnWidths(wsClass, classSheetData);

        // Sanitize sheet name (Excel limit: 31 chars, no forbidden chars)
        const safeSheetName = classTitle.replace(/[:\\/?*\[\]]/g, "_").substring(0, 31);
        XLSX.utils.book_append_sheet(wb, wsClass, safeSheetName);
      });

      // Sheet Last: Pending Marks Feeding List
      const pendingRows = allProcessedStudents.filter(sr => sr.status !== "COMPLETED");
      const wsPendingData = pendingRows.map((sr, idx) => ({
        "S.No": idx + 1,
        "Class": sr.classDisplayName,
        "Roll No": sr.rollNo,
        "Adm No": sr.admissionNo,
        "Student Name": sr.studentName,
        "Father Name": sr.fatherName,
        "Mobile": sr.fatherMobile,
        "Status": sr.status === "NOT_STARTED" ? "Not Started" : "Partially Entered",
        "Fed / Expected": `${sr.enteredSubjectsCount} / ${sr.expectedSubjectsCount}`,
        "Missing Subjects": sr.missingSubjects
      }));
      const wsPending = XLSX.utils.json_to_sheet(wsPendingData);
      applyAutoColumnWidths(wsPending, wsPendingData);
      XLSX.utils.book_append_sheet(wb, wsPending, "Pending Feeding");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        headers: {
          "Content-Disposition": `attachment; filename="Marks_Tabulation_Report_${cleanExam}_${nowStr}.xlsx"`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FORMAT 2: SUMMARY CSV
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === "summary") {
      const csvSummaryHeaders = [
        "S.No", "Class & Section", "Class Teacher", "Teacher Phone", "Total Strength",
        "Appeared", "Passed", "Failed", "Pass %", "Class Average", "Top Scorer", "Feeding Status",
        ...ALL_POSSIBLE_SUBJECTS.map(sub => `${sub} (Fed)`)
      ];
      const csvSummaryLines = [csvSummaryHeaders.map(escapeCSV).join(",")];
      Object.values(classSummaryMap).forEach((cObj, idx) => {
        const passPct = cObj.appearedStudents > 0 ? `${((cObj.passCount / cObj.appearedStudents) * 100).toFixed(1)}%` : "0.0%";
        const classAvg = cObj.totalMaxSum > 0 ? `${((cObj.totalMarksSum / cObj.totalMaxSum) * 100).toFixed(1)}%` : "0.0%";
        const feedingStatus = cObj.totalStudents === 0 ? "No Students" : cObj.completedStudents === cObj.totalStudents ? "Fully Completed" : cObj.appearedStudents > 0 ? `In Progress (${cObj.appearedStudents}/${cObj.totalStudents})` : "Not Started";

        csvSummaryLines.push([
          idx + 1, cObj.classDisplayName, cObj.classTeacher, cObj.teacherPhone, cObj.totalStudents,
          cObj.appearedStudents, cObj.passCount, cObj.failCount, passPct, classAvg, cObj.topScorerName, feedingStatus,
          ...ALL_POSSIBLE_SUBJECTS.map(sub => cObj.subjectStats[sub] || 0)
        ].map(escapeCSV).join(","));
      });

      return new NextResponse("\uFEFF" + csvSummaryLines.join("\r\n"), {
        headers: {
          "Content-Disposition": `attachment; filename="Marks_Summary_${cleanExam}_${nowStr}.csv"`,
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FORMAT 3: PENDING STUDENTS CSV
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === "pending") {
      const pendingRows = exportProcessedStudents.filter(sr => sr.status !== "COMPLETED");
      const csvPendingHeaders = [
        "S.No", "Class", "Roll No", "Adm No", "Student Name",
        "Father Name", "Mobile", "Status", "Entered", "Total Expected", "Missing Subjects"
      ];
      const csvPendingLines = [csvPendingHeaders.map(escapeCSV).join(",")];
      pendingRows.forEach((sr, idx) => {
        csvPendingLines.push([
          idx + 1, sr.classDisplayName, sr.rollNo, sr.admissionNo, sr.studentName,
          sr.fatherName, sr.fatherMobile, sr.status === "NOT_STARTED" ? "Not Started" : "Partially Entered",
          sr.enteredSubjectsCount, sr.expectedSubjectsCount, sr.missingSubjects
        ].map(escapeCSV).join(","));
      });

      return new NextResponse("\uFEFF" + csvPendingLines.join("\r\n"), {
        headers: {
          "Content-Disposition": `attachment; filename="Marks_Pending_${cleanClass}_${cleanExam}_${nowStr}.csv"`,
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FORMAT 4: TABULATION REGISTER CSV (Single Class OR Master All Students)
    // ─────────────────────────────────────────────────────────────────────────────
    // If exporting a single class (e.g. LKG-A), include ONLY that class's relevant subjects!
    const activeSubjects = isSingleClass && exportProcessedStudents.length > 0
      ? exportProcessedStudents[0].expectedSubjects
      : ALL_POSSIBLE_SUBJECTS;

    const csvHeaders = [
      "S.No",
      ...(isSingleClass ? [] : ["Class"]),
      "Roll No",
      "Adm No",
      "Student Name",
      "Father Name",
      "Mobile",
      ...activeSubjects,
      "Grand Total",
      "Max Marks",
      "Percentage",
      "Grade",
      "Result"
    ];

    const csvLines = [csvHeaders.map(escapeCSV).join(",")];
    exportProcessedStudents.forEach(sr => {
      const row = [
        sr.sNo,
        ...(isSingleClass ? [] : [sr.classDisplayName]),
        sr.rollNo,
        sr.admissionNo,
        sr.studentName,
        sr.fatherName,
        sr.fatherMobile,
        ...activeSubjects.map(sub => sr.subjectMarks[sub] || "-"),
        sr.totalObtained,
        sr.totalMax,
        sr.percentage,
        sr.grade,
        sr.result
      ];
      csvLines.push(row.map(escapeCSV).join(","));
    });

    return new NextResponse("\uFEFF" + csvLines.join("\r\n"), {
      headers: {
        "Content-Disposition": `attachment; filename="Marks_${cleanClass}_${cleanExam}_${nowStr}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });

  } catch (error: any) {
    console.error("Failed to export marks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
