import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    // Fetch student with all relationships
    const student = await db.student.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            classTeacher: {
              include: {
                user: true,
              },
            },
          },
        },
        parentProfile: {
          include: {
            user: true,
          },
        },
        concession: true,
        marks: true,
        attendance: {
          orderBy: { date: "desc" },
        },
        leaveRequests: {
          orderBy: { startDate: "desc" },
        },
        ledgerEntries: {
          include: {
            feeHead: true,
            createdBy: true,
          },
          orderBy: { createdAt: "desc" },
        },
        receipts: {
          include: {
            createdBy: true,
            items: {
              include: {
                ledgerEntry: {
                  include: {
                    feeHead: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Format output
    const formatted = {
      id: student.id,
      name: student.name,
      admissionNo: student.admissionNumber,
      rollNo: student.rollNumber || "",
      dob: student.dob ? student.dob.toISOString().split("T")[0] : "",
      aadhaar: student.aadhaar || "",
      disability: student.disability || "",
      fatherName: student.fatherName || "",
      motherName: student.motherName || "",
      fatherMobile: student.fatherMobile || "",
      motherMobile: student.motherMobile || "",
      fatherAadhaar: student.fatherAadhaar || "",
      category: student.category || "",
      religion: student.religion || "",
      motherTongue: student.motherTongue || "",
      nationality: student.nationality || "",
      admissionDate: student.admissionDate ? student.admissionDate.toISOString().split("T")[0] : "",
      boardRegNo: student.boardRegNo || "",
      prevSchoolName: student.prevSchoolName || "",
      prevClassPassed: student.prevClassPassed || "",
      tcNumber: student.tcNumber || "",
      parentOccupation: student.parentOccupation || "",
      familyIncome: student.familyIncome || "",
      emergencyName: student.emergencyName || "",
      emergencyPhone: student.emergencyPhone || "",
      motherAadhaar: student.motherAadhaar || "",
      transportMode: student.transportMode || "",
      busRoute: student.busRoute || "",
      busStop: student.busStop || "",
      isRte: student.isRte,
      status: student.status,
      photoUrl: student.photoUrl || "",
      
      class: student.class ? {
        id: student.class.id,
        name: student.class.name,
        section: student.class.section,
        classTeacher: student.class.classTeacher ? {
          id: student.class.classTeacher.id,
          name: student.class.classTeacher.user.name,
          email: student.class.classTeacher.user.email,
          phone: student.class.classTeacher.user.phone || "",
        } : null,
      } : null,
      
      parent: student.parentProfile ? {
        id: student.parentProfile.id,
        name: student.parentProfile.user.name,
        email: student.parentProfile.user.email,
        phone: student.parentProfile.user.phone || "",
        address: student.parentProfile.address || "",
        familyCode: student.parentProfile.familyCode,
      } : null,

      concession: student.concession ? {
        id: student.concession.id,
        name: student.concession.name,
        percentage: student.concession.percentage,
        feeHeadName: student.concession.feeHeadName,
      } : null,

      marks: student.marks.map((m) => ({
        id: m.id,
        subject: m.subject,
        examName: m.examName,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        writtenExam: m.writtenExam,
        notebook: m.notebook,
        subjectEnrichment: m.subjectEnrichment,
        practical: m.practical,
        breakdown: m.breakdown,
        remarks: m.remarks || "",
        createdAt: m.createdAt,
      })),

      attendance: student.attendance.map((att) => ({
        id: att.id,
        date: att.date.toISOString().split("T")[0],
        status: att.status,
        markedBy: att.markedBy,
        createdAt: att.createdAt,
      })),

      leaveRequests: student.leaveRequests.map((leave) => ({
        id: leave.id,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        reason: leave.reason,
        status: leave.status,
        remarks: leave.remarks || "",
        createdAt: leave.createdAt,
      })),

      ledgerEntries: student.ledgerEntries.map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        amount: entry.amount, // in Paisa
        description: entry.description,
        feeHead: entry.feeHead ? {
          id: entry.feeHead.id,
          name: entry.feeHead.name,
          frequency: entry.feeHead.frequency,
        } : null,
        createdBy: entry.createdBy.name,
        createdAt: entry.createdAt,
      })),

      receipts: student.receipts.map((rec) => ({
        id: rec.id,
        receiptNumber: rec.receiptNumber,
        paymentMethod: rec.paymentMethod,
        transactionReference: rec.transactionReference || "",
        amountPaid: rec.amountPaid, // in Paisa
        status: rec.status,
        remarks: rec.remarks || "",
        createdBy: rec.createdBy.name,
        createdAt: rec.createdAt,
        items: rec.items.map((item) => ({
          id: item.id,
          amount: item.amount,
          feeHead: item.ledgerEntry.feeHead?.name || "Other Dues",
          description: item.ledgerEntry.description,
        })),
      })),
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch single student profile error:", error);
    return NextResponse.json({ error: "Failed to fetch student profile" }, { status: 500 });
  }
}
