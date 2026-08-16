import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    // Fetch student with optimized scoped relationships
    const student = await db.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        rollNumber: true,
        gender: true,
        dob: true,
        aadhaar: true,
        disability: true,
        fatherName: true,
        motherName: true,
        fatherMobile: true,
        motherMobile: true,
        fatherAadhaar: true,
        category: true,
        religion: true,
        motherTongue: true,
        nationality: true,
        admissionDate: true,
        boardRegNo: true,
        prevSchoolName: true,
        prevClassPassed: true,
        tcNumber: true,
        parentOccupation: true,
        familyIncome: true,
        emergencyName: true,
        emergencyPhone: true,
        motherAadhaar: true,
        transportMode: true,
        busRoute: true,
        busStop: true,
        isRte: true,
        status: true,
        photoUrl: true,
        parentProfileId: true,
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            classTeacher: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        parentProfile: {
          select: {
            id: true,
            familyCode: true,
            address: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        concession: {
          select: {
            id: true,
            name: true,
            percentage: true,
            feeHeadName: true,
          },
        },
        marks: {
          select: {
            id: true,
            subject: true,
            examName: true,
            marksObtained: true,
            maxMarks: true,
            writtenExam: true,
            notebook: true,
            subjectEnrichment: true,
            practical: true,
            breakdown: true,
            remarks: true,
            createdAt: true,
          },
        },
        attendance: {
          take: 120, // Scoped to recent attendance to prevent massive egress
          orderBy: { date: "desc" },
          select: {
            id: true,
            date: true,
            status: true,
            markedBy: true,
            createdAt: true,
          },
        },
        leaveRequests: {
          take: 50,
          orderBy: { startDate: "desc" },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            reason: true,
            status: true,
            remarks: true,
            createdAt: true,
          },
        },
        ledgerEntries: {
          take: 100,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            entryType: true,
            amount: true,
            description: true,
            createdAt: true,
            feeHead: {
              select: {
                id: true,
                name: true,
                frequency: true,
              },
            },
            createdBy: {
              select: {
                name: true,
              },
            },
          },
        },
        receipts: {
          take: 50,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            receiptNumber: true,
            paymentMethod: true,
            transactionReference: true,
            amountPaid: true,
            status: true,
            remarks: true,
            createdAt: true,
            createdBy: {
              select: {
                name: true,
              },
            },
            items: {
              select: {
                id: true,
                amount: true,
                ledgerEntry: {
                  select: {
                    description: true,
                    feeHead: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (authUser.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: authUser.userId }
      });
      if (!parentProfile || student.parentProfileId !== parentProfile.id) {
        return NextResponse.json({ error: "Unauthorized access to this student profile." }, { status: 403 });
      }
    }

    // Format output
    const formatted = {
      id: student.id,
      name: student.name,
      admissionNo: student.admissionNumber,
      rollNo: student.rollNumber || "",
      gender: student.gender || "",
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
