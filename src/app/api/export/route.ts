import { NextResponse } from "next/server";
import db from "@/lib/db";
import * as XLSX from "xlsx";
import { getAuthUser } from "@/lib/auth";
import { toRupees } from "@/lib/currency";
import { getSafeErrorMessage } from "@/lib/validation";
import { formatCanonicalDOB } from "@/lib/dateUtils";
import { formatExcelNumericDate } from "@/lib/exportStudentXLS";

export const dynamic = "force-dynamic";

const ACADEMIC_MONTHS = [
  { key: "april", label: "April" },
  { key: "may", label: "May" },
  { key: "june", label: "June" },
  { key: "july", label: "July" },
  { key: "august", label: "August" },
  { key: "september", label: "September" },
  { key: "october", label: "October" },
  { key: "november", label: "November" },
  { key: "december", label: "December" },
  { key: "january", label: "January" },
  { key: "february", label: "February" },
  { key: "march", label: "March" },
];

function getPaidUpToMonth(studentDues: { description: string; amount: number; paidAmount: number }[]): string {
  if (!studentDues || studentDues.length === 0) return "No Fee Structure";

  const monthStatus: { [key: string]: { isPaid: boolean; hasItem: boolean } } = {};
  for (const m of ACADEMIC_MONTHS) {
    const item = studentDues.find((d) => d.description?.toLowerCase().includes(m.key) && !d.description?.toLowerCase().includes("exam"));
    if (item) {
      const isPaid = item.paidAmount >= item.amount;
      monthStatus[m.key] = { isPaid, hasItem: true };
    }
  }

  let consecutivePaidCount = 0;
  for (let i = 0; i < ACADEMIC_MONTHS.length; i++) {
    const m = ACADEMIC_MONTHS[i];
    if (monthStatus[m.key]?.hasItem && monthStatus[m.key]?.isPaid) {
      consecutivePaidCount++;
    } else {
      break;
    }
  }

  if (consecutivePaidCount === 12) return "Full Year Cleared (All 12 Months)";
  if (consecutivePaidCount > 0) {
    const lastPaidMonth = ACADEMIC_MONTHS[consecutivePaidCount - 1].label;
    const laterPaid = ACADEMIC_MONTHS.slice(consecutivePaidCount)
      .filter((m) => monthStatus[m.key]?.isPaid)
      .map((m) => m.label);

    if (laterPaid.length > 0) return `Paid up to ${lastPaidMonth} (+ ${laterPaid.join(", ")})`;
    return `Paid up to ${lastPaidMonth}`;
  }

  const anyPaidMonths = ACADEMIC_MONTHS.filter((m) => monthStatus[m.key]?.isPaid).map((m) => m.label);
  if (anyPaidMonths.length > 0) return `Apr Unpaid (Paid: ${anyPaidMonths.join(", ")})`;
  return "No Payment Recorded";
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "register"; // "register" | "statement"
    const format = (searchParams.get("format") || "xlsx").toLowerCase(); // "xlsx" | "csv"
    const selectedClass = searchParams.get("selectedClass") || searchParams.get("class") || "All";
    const studentIdParam = searchParams.get("studentId");
    const searchQuery = (searchParams.get("search") || searchParams.get("q") || "").trim().toLowerCase();
    const onlyDefaulters = searchParams.get("onlyDefaulters") === "true";

    // ── Server-Side Authorization & Scope Resolution ─────────────────────────
    let studentWhere: any = {};

    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId },
        include: { students: { select: { id: true } } },
      });

      if (!parentProfile || parentProfile.students.length === 0) {
        return NextResponse.json({ error: "No student records linked to your account." }, { status: 403 });
      }

      const authorizedStudentIds = parentProfile.students.map((s: { id: string }) => s.id);

      // Parents cannot export the school-wide register
      if (type === "register" && selectedClass === "All" && !studentIdParam) {
        // Limit register view strictly to their own children
        studentWhere = { id: { in: authorizedStudentIds } };
      } else if (studentIdParam) {
        if (!authorizedStudentIds.includes(studentIdParam)) {
          return NextResponse.json(
            { error: "Forbidden. You cannot export records for students outside your family." },
            { status: 403 }
          );
        }
        studentWhere = { id: studentIdParam };
      } else {
        studentWhere = { id: { in: authorizedStudentIds } };
      }
    } else if (authUser.role === "TEACHER") {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: authUser.userId },
        include: { classes: { select: { id: true, name: true, section: true } } },
      });

      const assignedClassIds = teacherProfile?.classes.map((c: { id: string }) => c.id) || [];
      if (assignedClassIds.length === 0) {
        return NextResponse.json(
          { error: "Forbidden. You are not assigned to any class to export records." },
          { status: 403 }
        );
      }

      if (studentIdParam) {
        const targetStudent = await db.student.findUnique({
          where: { id: studentIdParam },
          select: { id: true, classId: true },
        });

        if (!targetStudent || !assignedClassIds.includes(targetStudent.classId)) {
          return NextResponse.json(
            { error: "Forbidden. You can only export records for students in your assigned class." },
            { status: 403 }
          );
        }
        studentWhere = { id: studentIdParam };
      } else {
        studentWhere = { classId: { in: assignedClassIds } };
      }
    } else if (authUser.role === "ADMIN" || authUser.role === "ACCOUNTANT") {
      if (studentIdParam) {
        studentWhere = { id: studentIdParam };
      } else if (selectedClass && selectedClass !== "All") {
        studentWhere = {
          OR: [
            { class: { name: selectedClass } },
            { class: { name: { startsWith: selectedClass } } },
          ],
        };
      }
    } else {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    // ── Fetch Authoritative Data from Database ────────────────────────────────
    const students: any[] = await db.student.findMany({
      where: studentWhere,
      include: {
        class: true,
        parentProfile: {
          include: {
            user: { select: { name: true, phone: true, email: true } },
          },
        },
        ledgerEntries: {
          where: { entryType: "CHARGE" },
          include: {
            receiptItems: {
              where: { receipt: { status: "ACTIVE" } },
              select: { amount: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { class: { name: "asc" } },
        { class: { section: "asc" } },
        { rollNumber: "asc" },
      ],
    });

    const schoolConfig = await db.schoolConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    const configData = (schoolConfig?.data as any) || {};
    const schoolName = configData.name || "School";
    const dateStr = new Date().toISOString().split("T")[0];

    // Filter by search query if provided
    const filteredStudents = students.filter((s: any) => {
      if (!searchQuery) return true;
      return (
        s.name.toLowerCase().includes(searchQuery) ||
        s.admissionNumber.toLowerCase().includes(searchQuery) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(searchQuery)) ||
        (s.fatherMobile && s.fatherMobile.includes(searchQuery))
      );
    });

    // ── Full Student Directory Master Export ─────────────────────────────────
    if (type === "directory" || type === "students") {
      const directoryRows = filteredStudents.map((s: any, idx: number) => {
        let totalFee = 0;
        let totalPaid = 0;

        s.ledgerEntries?.forEach((e: any) => {
          totalFee += e.amount;
          const p = e.receiptItems?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;
          totalPaid += p;
        });

        const totalDue = Math.max(0, totalFee - totalPaid);
        const feeStatus = totalDue <= 0 && totalFee > 0 ? "CLEARED" : totalPaid > 0 ? "PARTIALLY PAID" : totalDue > 0 ? "UNPAID" : "NO RECORD";

        const dobNumeric = formatExcelNumericDate(s.dob);
        const dobText = formatCanonicalDOB(s.dob) || dobNumeric;
        const admDateNumeric = formatExcelNumericDate(s.admissionDate);

        return {
          "S.No.": idx + 1,
          "Admission No": s.admissionNumber || "-",
          "Roll No": s.rollNumber || "-",
          "Student Name": s.name || "-",
          "Class": s.class?.name || "-",
          "Section": s.class?.section || "-",
          "Class & Section": `${s.class?.name || ""}-${s.class?.section || ""}`,
          "Gender": s.gender || "-",
          "Date of Birth (DD-MM-YYYY)": dobNumeric,
          "DOB (Readable)": dobText,
          "Admission Date (DD-MM-YYYY)": admDateNumeric,
          "Status": s.status || "ACTIVE",
          "Category": s.category || "General",
          "Billing Type / RTE": s.isRte ? "RTE (100% Waiver)" : "Standard",
          "Father Name": s.fatherName || s.parentProfile?.user?.name || "-",
          "Father Mobile": s.fatherMobile || s.parentProfile?.user?.phone || "-",
          "Mother Name": s.motherName || "-",
          "Mother Mobile": s.motherMobile || "-",
          "Student Aadhaar": s.aadhaar ? `'${s.aadhaar}` : "-",
          "Father Aadhaar": s.fatherAadhaar ? `'${s.fatherAadhaar}` : "-",
          "Mother Aadhaar": s.motherAadhaar ? `'${s.motherAadhaar}` : "-",
          "Family ID": s.parentProfile?.familyCode || "-",
          "Address": s.parentProfile?.address || "-",
          "Parent Email": s.parentProfile?.user?.email || "-",
          "Religion": s.religion || "-",
          "Mother Tongue": s.motherTongue || "-",
          "Nationality": s.nationality || "Indian",
          "Disability / Special Needs": s.disability || "None",
          "Parent Occupation": s.parentOccupation || "-",
          "Annual Family Income": s.familyIncome || "-",
          "Emergency Contact Person": s.emergencyName || "-",
          "Emergency Contact Phone": s.emergencyPhone || "-",
          "Transport Mode": s.transportMode || "Self",
          "Bus Route": s.busRoute || "-",
          "Bus Stop": s.busStop || "-",
          "Previous School": s.prevSchoolName || "-",
          "Previous Class Passed": s.prevClassPassed || "-",
          "TC Number": s.tcNumber || "-",
          "Board Reg No": s.boardRegNo || "-",
          "Total Fee (Rs)": toRupees(totalFee),
          "Total Paid (Rs)": toRupees(totalPaid),
          "Remaining Due (Rs)": toRupees(totalDue),
          "Fee Status": feeStatus,
        };
      });

      const safeSchool = schoolName.replace(/[^a-zA-Z0-9]/g, "_");
      const classTag = selectedClass && selectedClass !== "All" ? `_Class_${selectedClass.replace(/[^a-zA-Z0-9]/g, "_")}` : "_All_Students";
      const filename = `${safeSchool}_Student_Directory${classTag}_${dateStr}.${format === "csv" ? "csv" : "xlsx"}`;

      if (format === "csv") {
        const ws = XLSX.utils.json_to_sheet(directoryRows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      // Class-wise summary
      const classMap = new Map<string, any[]>();
      for (const s of filteredStudents) {
        const key = `${s.class?.name || ""}-${s.class?.section || ""}`;
        if (!classMap.has(key)) classMap.set(key, []);
        classMap.get(key)!.push(s);
      }

      const classSummaryRows = Array.from(classMap.entries()).map(([clsKey, classStdList], idx) => {
        let boys = 0;
        let girls = 0;
        let rte = 0;
        let active = 0;
        let left = 0;
        for (const std of classStdList) {
          const g = (std.gender || "").toLowerCase();
          if (g.startsWith("f") || g === "girl") girls++;
          else if (g.startsWith("m") || g === "boy") boys++;
          if (std.isRte) rte++;
          if ((std.status || "ACTIVE") === "ACTIVE") active++;
          else left++;
        }
        return {
          "S.No.": idx + 1,
          "Class & Section": clsKey,
          "Total Enrolled": classStdList.length,
          "Active Students": active,
          "Left / Suspended": left,
          "Boys": boys,
          "Girls": girls,
          "RTE Students": rte,
        };
      });

      const wb = XLSX.utils.book_new();
      const wsDir = XLSX.utils.json_to_sheet(directoryRows);
      const wsSum = XLSX.utils.json_to_sheet(classSummaryRows);

      const setColWidths = (ws: XLSX.WorkSheet, data: any[]) => {
        if (!data || data.length === 0) return;
        const keys = Object.keys(data[0]);
        const colWidths: { [key: string]: number } = {};
        for (const k of keys) colWidths[k] = Math.max(k.length, 10);
        for (const row of data) {
          for (const k of keys) {
            const valStr = String(row[k] ?? "");
            colWidths[k] = Math.max(colWidths[k], Math.min(valStr.length, 45));
          }
        }
        ws["!cols"] = keys.map((k) => ({ wch: colWidths[k] + 3 }));
      };

      setColWidths(wsDir, directoryRows);
      setColWidths(wsSum, classSummaryRows);

      XLSX.utils.book_append_sheet(wb, wsDir, "Student Directory");
      XLSX.utils.book_append_sheet(wb, wsSum, "Class-Wise Summary");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── Single Student Statement Export ──────────────────────────────────────
    if (type === "statement" && filteredStudents.length === 1) {
      const student = filteredStudents[0];
      const receipts = await db.receipt.findMany({
        where: {
          studentId: student.id,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      });

      const duesRows = student.ledgerEntries.map((entry: any, idx: number) => {
        const paidRs = toRupees(entry.receiptItems.reduce((sum: number, item: any) => sum + item.amount, 0));
        const origRs = toRupees(entry.amount);
        const dueRs = Math.max(0, origRs - paidRs);

        return {
          "S.No.": idx + 1,
          "Fee Description": entry.description,
          "Date": entry.createdAt ? new Date(entry.createdAt).toISOString().split("T")[0] : "-",
          "Fee Amount (Rs)": origRs,
          "Paid Amount (Rs)": paidRs,
          "Remaining Due (Rs)": dueRs,
          "Status": dueRs <= 0 ? "PAID" : paidRs > 0 ? "PARTIALLY PAID" : "UNPAID",
        };
      });

      const receiptsRows = receipts.map((r: any, idx: number) => ({
        "S.No.": idx + 1,
        "Receipt No": r.receiptNumber,
        "Book / Offline Receipt No": r.manualReceiptNo || "-",
        "Date": r.createdAt.toISOString().split("T")[0],
        "Amount Paid (Rs)": toRupees(r.amountPaid),
        "Payment Mode": r.paymentMethod,
        "Transaction Ref": r.transactionReference || "-",
      }));

      const safeName = student.name.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Fee_Statement_${safeName}_${student.admissionNumber}_${dateStr}.${format === "csv" ? "csv" : "xlsx"}`;

      if (format === "csv") {
        const ws = XLSX.utils.json_to_sheet(duesRows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(duesRows), "Fee Ledger & Dues");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(receiptsRows), "Payment Receipts");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── Master Fee Register Export ───────────────────────────────────────────
    const registerRows = filteredStudents.map((s: any, idx: number) => {
      let totalFee = 0;
      let totalPaid = 0;

      const duesList = s.ledgerEntries.map((e: any) => {
        const p = e.receiptItems.reduce((sum: number, item: any) => sum + item.amount, 0);
        totalFee += e.amount;
        totalPaid += p;
        return {
          description: e.description,
          amount: e.amount,
          paidAmount: p,
        };
      });

      const totalDue = Math.max(0, totalFee - totalPaid);
      const isClear = totalDue <= 0;

      return {
        "S.No.": idx + 1,
        "Student Name": s.name,
        "Admission No": s.admissionNumber,
        "Roll No": s.rollNumber || "-",
        "Class": s.class?.name || "-",
        "Section": s.class?.section || "-",
        "Father Name": s.fatherName || s.parentProfile?.user?.name || "-",
        "Father Mobile": s.fatherMobile || s.parentProfile?.user?.phone || "-",
        "Total Fee (Rs)": toRupees(totalFee),
        "Paid Amount (Rs)": toRupees(totalPaid),
        "Remaining Due (Rs)": toRupees(totalDue),
        "Status": isClear ? "CLEAR" : "DUE",
        "Paid Up To": getPaidUpToMonth(duesList),
      };
    });

    const finalRows = onlyDefaulters ? registerRows.filter((r: any) => r.Status === "DUE") : registerRows;
    const safeSchool = schoolName.replace(/[^a-zA-Z0-9]/g, "_");
    const classTag = selectedClass && selectedClass !== "All" ? `_Class_${selectedClass.replace(/[^a-zA-Z0-9]/g, "_")}` : "_All_Students";
    const filename = `${safeSchool}_Fee_Register${classTag}_${dateStr}.${format === "csv" ? "csv" : "xlsx"}`;

    if (format === "csv") {
      const ws = XLSX.utils.json_to_sheet(finalRows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(finalRows);
    XLSX.utils.book_append_sheet(wb, ws, "Fee Register");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export API error:", error);
    const safeError = getSafeErrorMessage(error, "Failed to generate export file.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
