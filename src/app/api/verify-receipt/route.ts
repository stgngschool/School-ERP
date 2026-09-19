import { NextResponse } from "next/server";
import db from "@/lib/db";
import { numberToIndianWords, isValidReceiptSecurityToken } from "@/lib/receipts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const token = searchParams.get("t")?.trim() || searchParams.get("token")?.trim() || "";

    if (!id) {
      return NextResponse.json(
        { verified: false, error: "Receipt identifier is required." },
        { status: 400 }
      );
    }

    // Strict Security Guard: Public verification requires cryptographic token to prevent IDOR enumeration
    if (!token) {
      return NextResponse.json(
        {
          verified: false,
          securityBlocked: true,
          error: "Security Access Blocked: Missing cryptographic verification token. Manual URL typing is prohibited. Please scan the authentic QR code printed on the physical voucher.",
        },
        { status: 403 }
      );
    }

    const receipt = await db.receipt.findFirst({
      where: {
        OR: [
          { receiptNumber: id },
          { manualReceiptNo: id },
          { id: id },
        ],
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        createdBy: {
          select: { name: true, role: true },
        },
        items: {
          include: {
            ledgerEntry: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json(
        {
          verified: false,
          error: `Receipt record "${id}" was not found in the official institutional ledger.`,
        },
        { status: 404 }
      );
    }

    // Cryptographic Token Validation: Prevents changing URL numbers (e.g. REC-2026-00093 -> REC-2026-00090)
    const isTokenValid = isValidReceiptSecurityToken(
      receipt.receiptNumber,
      token,
      receipt.manualReceiptNo
    );

    if (!isTokenValid) {
      return NextResponse.json(
        {
          verified: false,
          securityBlocked: true,
          error: "Security Violation: Cryptographic signature mismatch. Manual modification of receipt numbers in the web address is blocked to protect student confidentiality.",
        },
        { status: 403 }
      );
    }

    // Parse snapshot metadata from remarks
    let snapshot: any = {};
    if (receipt.remarks) {
      try {
        snapshot = JSON.parse(receipt.remarks);
      } catch {
        snapshot = {};
      }
    }

    // Fetch school institutional identity from SchoolConfig
    let schoolData: any = {};
    try {
      const configRow = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
      if (configRow?.data && typeof configRow.data === "object") {
        schoolData = configRow.data;
      }
    } catch {
      schoolData = {};
    }

    // Resolve student list across single and multi-child vouchers
    let studentsList = snapshot.studentsList;
    if (!studentsList || studentsList.length === 0) {
      const studentMap = new Map<string, any>();
      if (receipt.student) {
        studentMap.set(receipt.student.id, {
          id: receipt.student.id,
          name: receipt.student.name,
          classSection: receipt.student.class
            ? `${receipt.student.class.name}-${receipt.student.class.section}`
            : "",
          rollNo: receipt.student.rollNumber || "",
          admissionNo: receipt.student.admissionNumber || "",
        });
      }
      for (const it of receipt.items) {
        const s = it.ledgerEntry?.student;
        if (s && !studentMap.has(s.id)) {
          studentMap.set(s.id, {
            id: s.id,
            name: s.name,
            classSection: s.class ? `${s.class.name}-${s.class.section}` : "",
            rollNo: s.rollNumber || "",
            admissionNo: s.admissionNumber || "",
          });
        }
      }
      studentsList = Array.from(studentMap.values());
    }

    // Resolve father/guardian name
    const fatherName =
      snapshot.fatherName ||
      receipt.student?.fatherName ||
      receipt.items.find((i: any) => i.ledgerEntry?.student?.fatherName)?.ledgerEntry?.student?.fatherName ||
      "";

    // Format IST Date
    const istDate = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(receipt.createdAt);

    const mappedItems = (snapshot.items && snapshot.items.length > 0 ? snapshot.items : receipt.items).map((i: any, idx: number) => {
      const liveItem = receipt.items[idx];
      const sName =
        i.studentPrefix ||
        i.studentName ||
        (i.studentId ? studentsList.find((s: any) => s.id === i.studentId)?.name : null) ||
        liveItem?.ledgerEntry?.student?.name ||
        (studentsList.length > idx ? studentsList[idx]?.name : undefined);

      const rawName = i.name || liveItem?.ledgerEntry?.description || "Fee Payment";
      return {
        name: rawName,
        studentPrefix: sName,
        amount: i.amount !== undefined ? i.amount : liveItem?.amount || 0,
        originalAmount: i.originalAmount !== undefined ? i.originalAmount : liveItem?.amount || 0,
        discount: i.discount || 0,
        balance: i.balance || 0,
      };
    });

    return NextResponse.json(
      {
        verified: true,
        status: receipt.status || "CLEARED",
        verifiedAt: istDate,
        school: {
          name: schoolData.name || "St. GNG School",
          address: schoolData.address || "Salarpur, Rasulgarh, Varanasi - 221007",
          phone: schoolData.phone || "9452824318",
          email: schoolData.email || "stgng2005@gmail.com",
          udiseCode: schoolData.udiseCode || "09670707502",
        },
        receipt: {
          id: receipt.id,
          receiptNo: receipt.receiptNumber,
          manualReceiptNo: receipt.manualReceiptNo || snapshot.manualReceiptNo || null,
          date: istDate,
          createdIso: receipt.createdAt.toISOString(),
          amount: receipt.amountPaid,
          amountInWords:
            snapshot.amountInWords || numberToIndianWords(receipt.amountPaid),
          subtotal:
            snapshot.subtotal !== undefined ? snapshot.subtotal : receipt.amountPaid,
          discount: snapshot.discount || 0,
          arrears: snapshot.arrears !== undefined ? snapshot.arrears : 0,
          paymentMethod: receipt.paymentMethod,
          transactionRef: receipt.transactionReference || "",
          upiId: snapshot.upiId || null,
          upiMerchantName: snapshot.upiMerchantName || null,
          fatherName: fatherName || "",
          students: studentsList,
          items: mappedItems,
          collectedBy: receipt.createdBy?.name || "Official Finance Desk",
          collectedByRole: receipt.createdBy?.role || "ADMIN",
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: any) {
    console.error("Receipt verification API error:", error);
    return NextResponse.json(
      { verified: false, error: "Internal server error verifying receipt." },
      { status: 500 }
    );
  }
}
