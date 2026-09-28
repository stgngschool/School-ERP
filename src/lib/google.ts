import { google } from "googleapis";
import { Readable } from "stream";
import { db as prisma } from "./db";
import { formatCanonicalDOB, getISTDateString } from "./dateUtils";

// Bulletproof Google Service Account private key sanitizer
function formatPrivateKey(rawKey: string): string {
  if (!rawKey) return "";
  let key = rawKey.trim();

  // Strip surrounding quotes if present
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.substring(1, key.length - 1);
  }

  // Replace escaped \n strings with real newlines
  key = key.replace(/\\n/g, "\n");

  // Remove any carriage return \r
  key = key.replace(/\r/g, "");

  // Ensure header and footer exist cleanly
  if (!key.startsWith("-----BEGIN PRIVATE KEY-----")) {
    const beginIdx = key.indexOf("-----BEGIN PRIVATE KEY-----");
    if (beginIdx !== -1) {
      key = key.substring(beginIdx);
    }
  }

  if (!key.endsWith("-----END PRIVATE KEY-----")) {
    const endIdx = key.indexOf("-----END PRIVATE KEY-----");
    if (endIdx !== -1) {
      key = key.substring(0, endIdx + "-----END PRIVATE KEY-----".length);
    }
  }

  return key.trim();
}

import fs from "fs";
import path from "path";

const credsPath = path.join(process.cwd(), "src/data/google-credentials.json");

// Authenticate with Google APIs using Service Account JSON credentials
function getGoogleAuth(scopes: string[]) {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  // 1. Check local saved credentials file first if present
  try {
    if (fs.existsSync(credsPath)) {
      const fileData = fs.readFileSync(credsPath, "utf-8");
      const parsedJson = JSON.parse(fileData);
      if (parsedJson.client_email) email = parsedJson.client_email;
      if (parsedJson.private_key) privateKeyRaw = parsedJson.private_key;
    }
  } catch (e) {}

  // 2. Support full JSON credential block if provided in env
  if ((!email || !privateKeyRaw) && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsedJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (parsedJson.client_email) email = parsedJson.client_email;
      if (parsedJson.private_key) privateKeyRaw = parsedJson.private_key;
    } catch (e) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  if (!email || !privateKeyRaw) {
    throw new Error("Missing Google Service Account credentials. Please paste your Google Service Account JSON key below.");
  }

  const privateKey = formatPrivateKey(privateKeyRaw);

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes,
  });
}

// Helper to automatically create a missing tab/sheet in Google Spreadsheet
async function ensureSheetTab(sheets: any, spreadsheetId: string, title: string) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(
      (s: any) => s.properties?.title?.trim().toLowerCase() === title.trim().toLowerCase()
    );

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title,
                },
              },
            },
          ],
        },
      });
    }
  } catch (err) {
    console.warn(`Tab check/creation notice for "${title}":`, err);
  }
}

/**
 * Synchronize the entire detailed student directory to Google Sheets
 * @param spreadsheetId Google Spreadsheet ID (from URL)
 */
const ACADEMIC_MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

function analyzeStudentMonthlyFees(std: any) {
  const charges = (std.ledgerEntries || []).filter((e: any) => e.entryType === "CHARGE");
  const discounts = (std.ledgerEntries || []).filter((e: any) => e.entryType === "DISCOUNT");

  // Map discounts by description
  const discountMap = new Map<string, number>();
  for (const d of discounts) {
    const key = (d.description || "").toLowerCase().trim();
    discountMap.set(key, (discountMap.get(key) || 0) + Math.abs(d.amount));
  }

  // Monthly breakdown map
  const monthStatusMap: Record<string, { status: string; isPaid: boolean; duePaisa: number; chargePaisa: number }> = {};
  let detectedMonthlyFeePaisa = 0;

  for (const m of ACADEMIC_MONTHS) {
    const mLower = m.toLowerCase();
    // Find charge matching this month name
    const charge = charges.find((c: any) => (c.description || "").toLowerCase().includes(mLower));

    if (!charge) {
      monthStatusMap[m] = { status: "-", isPaid: false, duePaisa: 0, chargePaisa: 0 };
      continue;
    }

    if (!detectedMonthlyFeePaisa) {
      detectedMonthlyFeePaisa = charge.amount;
    }

    const paidPaisa = (charge.receiptItems || []).reduce((sum: number, ri: any) => sum + ri.amount, 0);

    let discPaisa = 0;
    for (const [discDesc, dAmount] of discountMap.entries()) {
      if (discDesc.includes(mLower)) {
        discPaisa += dAmount;
      }
    }

    const outstandingPaisa = Math.max(0, charge.amount - discPaisa - paidPaisa);
    const isFullyCovered = outstandingPaisa <= 0;

    let displayStatus = "UNPAID";
    if (std.isRte) {
      displayStatus = "RTE FREE";
    } else if (isFullyCovered) {
      displayStatus = "PAID";
    } else if (paidPaisa > 0) {
      displayStatus = `PARTIAL (Due: ₹${(outstandingPaisa / 100).toFixed(0)})`;
    } else {
      displayStatus = `UNPAID (₹${(charge.amount / 100).toFixed(0)})`;
    }

    monthStatusMap[m] = {
      status: displayStatus,
      isPaid: isFullyCovered || std.isRte,
      duePaisa: outstandingPaisa,
      chargePaisa: charge.amount,
    };
  }

  // Determine "Fees Paid Up To"
  let paidUpTo = "No Fees Paid";
  let lastPaidMonth = "";
  let breakInStreak = false;

  for (const m of ACADEMIC_MONTHS) {
    const info = monthStatusMap[m];
    if (info && info.chargePaisa > 0) {
      if (info.isPaid && !breakInStreak) {
        lastPaidMonth = m;
      } else if (!info.isPaid) {
        breakInStreak = true;
      }
    }
  }

  if (lastPaidMonth) {
    if (lastPaidMonth === "March") {
      paidUpTo = "March (Full Year Clear)";
    } else {
      paidUpTo = `Paid up to: ${lastPaidMonth}`;
    }
  } else if (std.isRte) {
    paidUpTo = "RTE 100% Free Waiver";
  }

  // Determine Unpaid Months
  const unpaidMonthsList: string[] = [];
  for (const m of ACADEMIC_MONTHS) {
    const info = monthStatusMap[m];
    if (info && info.chargePaisa > 0 && !info.isPaid) {
      unpaidMonthsList.push(m);
    }
  }

  let unpaidMonthsDisplay = "None (All Dues Cleared)";
  if (unpaidMonthsList.length > 0) {
    unpaidMonthsDisplay = `${unpaidMonthsList.join(", ")} (${unpaidMonthsList.length} Months Due)`;
  }

  return {
    monthlyFeePaisa: detectedMonthlyFeePaisa,
    monthStatusMap,
    paidUpTo,
    unpaidMonthsDisplay,
    unpaidCount: unpaidMonthsList.length,
  };
}

/**
 * Synchronize the entire detailed Student Master Directory to Google Sheets (Tab: "Student Directory")
 * @param spreadsheetId Google Spreadsheet ID (from URL)
 */
export async function syncStudentDirectoryToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Ensure "Student Directory" tab exists
  await ensureSheetTab(sheets, spreadsheetId, "Student Directory");

  // 2. Fetch students with full master relations
  const students = await prisma.student.findMany({
    include: {
      class: true,
      parentProfile: {
        include: {
          user: true,
        },
      },
      concession: true,
      ledgerEntries: {
        select: {
          entryType: true,
          amount: true,
        },
      },
    },
    orderBy: [
      { class: { name: "asc" } },
      { class: { section: "asc" } },
      { admissionNumber: "asc" },
    ],
  });

  const headers = [
    "Admission Number",
    "Roll Number",
    "Full Name",
    "Class",
    "Section",
    "Father's Name",
    "Mother's Name",
    "Father Mobile",
    "Mother Mobile",
    "Parent Email",
    "Family Code",
    "Residential Address",
    "Date of Birth",
    "Admission Date",
    "Aadhaar Number",
    "Category",
    "Religion",
    "RTE Waiver",
    "Concession Category",
    "Transport Mode",
    "Bus Route & Stop",
    "Total Charges (₹)",
    "Total Payments (₹)",
    "Total Discounts (₹)",
    "Outstanding Dues (₹)",
    "Status",
  ];

  const rows = students.map((std) => {
    let totalChargesPaisa = 0;
    let totalPaymentsPaisa = 0;
    let totalDiscountsPaisa = 0;

    for (const entry of std.ledgerEntries) {
      if (entry.entryType === "CHARGE" || entry.entryType === "FINE") {
        totalChargesPaisa += entry.amount;
      } else if (entry.entryType === "PAYMENT") {
        totalPaymentsPaisa += Math.abs(entry.amount);
      } else if (entry.entryType === "DISCOUNT") {
        totalDiscountsPaisa += Math.abs(entry.amount);
      }
    }

    const outstandingPaisa = Math.max(0, totalChargesPaisa - totalDiscountsPaisa - totalPaymentsPaisa);

    return [
      std.admissionNumber,
      std.rollNumber || "-",
      std.name,
      std.class?.name || "-",
      std.class?.section || "-",
      std.fatherName || "-",
      std.motherName || "-",
      std.fatherMobile || std.parentProfile?.user?.phone || "-",
      std.motherMobile || "-",
      std.parentProfile?.user?.email || "-",
      std.parentProfile?.familyCode || "-",
      std.parentProfile?.address || "-",
      std.dob ? formatCanonicalDOB(std.dob) : "-",
      std.admissionDate ? getISTDateString(std.admissionDate) : "-",
      std.aadhaar || "-",
      std.category || "-",
      std.religion || "-",
      std.isRte ? "YES (100% Free)" : "NO",
      std.concession ? `${std.concession.name} (${std.concession.percentage}%)` : "None",
      std.transportMode || "Self / Walk",
      std.busRoute ? `${std.busRoute} - ${std.busStop || ""}` : "-",
      (totalChargesPaisa / 100).toFixed(2),
      (totalPaymentsPaisa / 100).toFixed(2),
      (totalDiscountsPaisa / 100).toFixed(2),
      (outstandingPaisa / 100).toFixed(2),
      std.status,
    ];
  });

  const values = [headers, ...rows];

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "'Student Directory'!A1:Z10000",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Student Directory'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch (err: any) {
    console.warn("[Google Sheets] Student Directory tab update notice:", err.message);
  }

  return { success: true, count: students.length };
}

/**
 * Synchronize the Month-by-Month Student Fee Register to Google Sheets (Tab: "Student Fee Register")
 * @param spreadsheetId Google Spreadsheet ID (from URL)
 */
export async function syncStudentFeeRegisterToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Ensure "Student Fee Register" tab exists
  await ensureSheetTab(sheets, spreadsheetId, "Student Fee Register");

  // 2. Fetch students with relations, concessions, and ledger entries with receipt item links
  const students = await prisma.student.findMany({
    include: {
      class: true,
      parentProfile: {
        include: {
          user: true,
        },
      },
      concession: true,
      ledgerEntries: {
        select: {
          id: true,
          entryType: true,
          amount: true,
          description: true,
          receiptItems: {
            select: {
              amount: true,
            },
          },
        },
      },
    },
    orderBy: [
      { class: { name: "asc" } },
      { class: { section: "asc" } },
      { admissionNumber: "asc" },
    ],
  });

  // 3. Define human-friendly headers
  const headers = [
    "Admission No",
    "Roll No",
    "Student Name",
    "Class",
    "Section",
    "Father's Name",
    "Mobile Number",
    "Monthly Fee (₹)",
    "Fees Paid Up To",
    "Unpaid Months (Baki Mahine)",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "January",
    "February",
    "March",
    "Total Annual Fee (₹)",
    "Total Paid (₹)",
    "Total Concession (₹)",
    "Net Balance Due (₹)",
    "Account Status",
  ];

  const rows = students.map((std) => {
    let totalChargesPaisa = 0;
    let totalPaymentsPaisa = 0;
    let totalDiscountsPaisa = 0;

    for (const entry of std.ledgerEntries) {
      if (entry.entryType === "CHARGE" || entry.entryType === "FINE") {
        totalChargesPaisa += entry.amount;
      } else if (entry.entryType === "PAYMENT") {
        totalPaymentsPaisa += Math.abs(entry.amount);
      } else if (entry.entryType === "DISCOUNT") {
        totalDiscountsPaisa += Math.abs(entry.amount);
      }
    }

    const netDuePaisa = Math.max(0, totalChargesPaisa - totalDiscountsPaisa - totalPaymentsPaisa);
    const analysis = analyzeStudentMonthlyFees(std);

    let accountStatus = "🟢 All Clear";
    if (netDuePaisa > 0) {
      if (analysis.unpaidCount >= 2) {
        accountStatus = `🔴 Overdue (${analysis.unpaidCount} Months)`;
      } else {
        accountStatus = `🟡 Due (₹${(netDuePaisa / 100).toFixed(0)})`;
      }
    }

    return [
      std.admissionNumber,
      std.rollNumber || "-",
      std.name,
      std.class?.name || "-",
      std.class?.section || "-",
      std.fatherName || "-",
      std.fatherMobile || std.parentProfile?.user?.phone || "-",
      analysis.monthlyFeePaisa > 0 ? (analysis.monthlyFeePaisa / 100).toFixed(0) : "-",
      analysis.paidUpTo,
      analysis.unpaidMonthsDisplay,
      analysis.monthStatusMap["April"]?.status || "-",
      analysis.monthStatusMap["May"]?.status || "-",
      analysis.monthStatusMap["June"]?.status || "-",
      analysis.monthStatusMap["July"]?.status || "-",
      analysis.monthStatusMap["August"]?.status || "-",
      analysis.monthStatusMap["September"]?.status || "-",
      analysis.monthStatusMap["October"]?.status || "-",
      analysis.monthStatusMap["November"]?.status || "-",
      analysis.monthStatusMap["December"]?.status || "-",
      analysis.monthStatusMap["January"]?.status || "-",
      analysis.monthStatusMap["February"]?.status || "-",
      analysis.monthStatusMap["March"]?.status || "-",
      (totalChargesPaisa / 100).toFixed(2),
      (totalPaymentsPaisa / 100).toFixed(2),
      (totalDiscountsPaisa / 100).toFixed(2),
      (netDuePaisa / 100).toFixed(2),
      accountStatus,
    ];
  });

  const values = [headers, ...rows];

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "'Student Fee Register'!A1:AA10000",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Student Fee Register'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch (err: any) {
    console.warn("[Google Sheets] Student Fee Register tab update notice:", err.message);
  }

  return { success: true, count: students.length };
}

/**
 * Convenience wrapper to synchronize both Student Directory and Student Fee Register
 */
export async function syncStudentsToSheet(spreadsheetId: string) {
  const dirRes = await syncStudentDirectoryToSheet(spreadsheetId);
  const feeRes = await syncStudentFeeRegisterToSheet(spreadsheetId);
  return { success: true, count: dirRes.count, feeRegisterCount: feeRes.count };
}

/**
 * Synchronize all financial transactions to Google Sheets with detailed breakdowns
 * @param spreadsheetId Google Spreadsheet ID
 */
export async function syncLedgerToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Ensure "Ledger Transactions" tab exists
  await ensureSheetTab(sheets, spreadsheetId, "Ledger Transactions");

  // Fetch all ledger entries with minimal selective columns (avoids 40+ student columns per row)
  const entries = await prisma.ledgerEntry.findMany({
    select: {
      id: true,
      createdAt: true,
      entryType: true,
      description: true,
      amount: true,
      referenceId: true,
      student: {
        select: {
          name: true,
          admissionNumber: true,
          class: {
            select: {
              name: true,
              section: true,
            },
          },
        },
      },
      feeHead: {
        select: {
          name: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const headers = [
    "Transaction ID",
    "Date & Time",
    "Student Name",
    "Admission Number",
    "Class & Section",
    "Fee Head",
    "Transaction Type",
    "Description",
    "Amount (₹)",
    "Reference / Receipt No",
    "Recorded By User",
  ];

  const rows = entries.map((entry) => [
    entry.id,
    `${getISTDateString(entry.createdAt)} ${entry.createdAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })}`,
    entry.student?.name || "-",
    entry.student?.admissionNumber || "-",
    entry.student?.class ? `${entry.student.class.name}-${entry.student.class.section}` : "-",
    entry.feeHead?.name || "General",
    entry.entryType,
    entry.description,
    (entry.amount / 100).toFixed(2),
    entry.referenceId || "-",
    entry.createdBy?.name ? `${entry.createdBy.name} (${entry.createdBy.role})` : "System",
  ]);

  const values = [headers, ...rows];

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "'Ledger Transactions'!A1:Z100000",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Ledger Transactions'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Sheet1!A1:Z100000",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }

  return { success: true, count: entries.length };
}

/**
 * Synchronize all student examination marks to Google Sheets in detailed breakdown
 * @param spreadsheetId Google Spreadsheet ID
 */
export async function syncMarksToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Ensure "Examination Marks" tab exists
  await ensureSheetTab(sheets, spreadsheetId, "Examination Marks");

  // 2. Fetch all marks with selective student and class details
  const marks = await prisma.mark.findMany({
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
      updatedAt: true,
      session: {
        select: {
          name: true,
        },
      },
      student: {
        select: {
          name: true,
          admissionNumber: true,
          rollNumber: true,
          class: {
            select: {
              name: true,
              section: true,
            },
          },
        },
      },
    },
    orderBy: [
      { student: { class: { name: "asc" } } },
      { student: { class: { section: "asc" } } },
      { student: { rollNumber: "asc" } },
      { student: { name: "asc" } },
      { examName: "asc" },
      { subject: "asc" },
    ],
  });

  const calculateGrade = (pct: number) => {
    if (pct >= 91) return "A1";
    if (pct >= 81) return "A2";
    if (pct >= 71) return "B1";
    if (pct >= 61) return "B2";
    if (pct >= 51) return "C1";
    if (pct >= 41) return "C2";
    if (pct >= 33) return "D";
    return "E (Needs Improvement)";
  };

  const headers = [
    "Academic Session",
    "Class",
    "Section",
    "Roll No",
    "Student Name",
    "Admission No",
    "Examination",
    "Subject",
    "Marks Obtained",
    "Max Marks",
    "Percentage (%)",
    "Grade",
    "Written Exam",
    "Notebook",
    "Subject Enrichment",
    "Practical",
    "Remarks / Status",
    "Last Updated (IST)",
  ];

  const rows = marks.map((m) => {
    const isAbsent = (m.remarks || "").toUpperCase().includes("ABSENT");
    const pct = m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0;
    const grade = isAbsent ? "AB (Absent)" : calculateGrade(pct);

    let formattedDate = "-";
    try {
      formattedDate = `${getISTDateString(m.updatedAt)} ${m.updatedAt.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
      })}`;
    } catch {
      formattedDate = m.updatedAt ? m.updatedAt.toISOString() : "-";
    }

    return [
      m.session?.name || "2026-2027",
      m.student?.class?.name || "-",
      m.student?.class?.section || "-",
      m.student?.rollNumber || "-",
      m.student?.name || "-",
      m.student?.admissionNumber || "-",
      m.examName,
      m.subject,
      isAbsent ? "ABSENT" : m.marksObtained,
      m.maxMarks,
      isAbsent ? "-" : `${pct.toFixed(1)}%`,
      grade,
      m.writtenExam !== null ? m.writtenExam : "-",
      m.notebook !== null ? m.notebook : "-",
      m.subjectEnrichment !== null ? m.subjectEnrichment : "-",
      m.practical !== null ? m.practical : "-",
      m.remarks || "-",
      formattedDate,
    ];
  });

  const values = [headers, ...rows];

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "'Examination Marks'!A1:Z100000",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Examination Marks'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch (err: any) {
    console.warn("[Google Sheets] Examination Marks tab update notice:", err.message);
  }

  return { success: true, count: marks.length };
}

/**
 * Synchronize all fee receipts & vouchers to Google Sheets
 * @param spreadsheetId Google Spreadsheet ID
 */
export async function syncReceiptsToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Ensure "Fee Receipts Register" tab exists
  await ensureSheetTab(sheets, spreadsheetId, "Fee Receipts Register");

  // 2. Fetch all receipts with relations
  const receipts = await prisma.receipt.findMany({
    select: {
      id: true,
      receiptNumber: true,
      manualReceiptNo: true,
      paymentMethod: true,
      transactionReference: true,
      amountPaid: true,
      status: true,
      remarks: true,
      createdAt: true,
      student: {
        select: {
          name: true,
          admissionNumber: true,
          fatherName: true,
          class: {
            select: {
              name: true,
              section: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          name: true,
          role: true,
        },
      },
      items: {
        select: {
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
    orderBy: {
      createdAt: "desc",
    },
  });

  const headers = [
    "Receipt Number",
    "Manual / Offline Book No",
    "Date & Time (IST)",
    "Student Name",
    "Admission Number",
    "Class & Section",
    "Father's Name",
    "Amount Paid (₹)",
    "Payment Mode",
    "Transaction Ref / UTR",
    "Status",
    "Collected By",
    "Fee Heads & Items Covered",
    "Remarks / Note",
  ];

  const rows = receipts.map((r) => {
    let formattedDate = "-";
    try {
      formattedDate = `${getISTDateString(r.createdAt)} ${r.createdAt.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
      })}`;
    } catch {
      formattedDate = r.createdAt ? r.createdAt.toISOString() : "-";
    }

    // Parse remarks JSON snapshot if available
    let remarksNote = "-";
    let snapshotItemsSummary = "";
    if (r.remarks) {
      try {
        const parsed = JSON.parse(r.remarks);
        if (parsed.items && Array.isArray(parsed.items)) {
          snapshotItemsSummary = parsed.items
            .map((it: any) => `${it.name || "Item"}: ₹${((it.amount || 0) / 100).toFixed(0)}`)
            .join("; ");
        }
        if (parsed.arrears !== undefined) {
          remarksNote = `Remaining Arrears: ₹${((parsed.arrears || 0) / 100).toFixed(2)}`;
        }
      } catch {
        remarksNote = r.remarks;
      }
    }

    if (!snapshotItemsSummary && r.items && r.items.length > 0) {
      snapshotItemsSummary = r.items
        .map((it) => {
          const desc = it.ledgerEntry?.description?.replace("Payment for: ", "") || it.ledgerEntry?.feeHead?.name || "Fee";
          return `${desc}: ₹${((it.amount || 0) / 100).toFixed(0)}`;
        })
        .join("; ");
    }

    return [
      r.receiptNumber,
      r.manualReceiptNo || "-",
      formattedDate,
      r.student?.name || "Family Multi-Student",
      r.student?.admissionNumber || "-",
      r.student?.class ? `${r.student.class.name}-${r.student.class.section}` : "-",
      r.student?.fatherName || "-",
      (r.amountPaid / 100).toFixed(2),
      r.paymentMethod,
      r.transactionReference || "-",
      r.status,
      r.createdBy?.name ? `${r.createdBy.name} (${r.createdBy.role})` : "System",
      snapshotItemsSummary || "General Fee Payment",
      remarksNote,
    ];
  });

  const values = [headers, ...rows];

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "'Fee Receipts Register'!A1:Z100000",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Fee Receipts Register'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch (err: any) {
    console.warn("[Google Sheets] Fee Receipts Register tab update notice:", err.message);
  }

  return { success: true, count: receipts.length };
}

/**
 * Synchronize clean, actionable modules (Student Directory, Fee Register, Receipts, Marks) into Google Sheets
 * @param spreadsheetId Google Spreadsheet ID
 */
export async function syncAllDataToSheet(spreadsheetId: string) {
  const dirRes = await syncStudentDirectoryToSheet(spreadsheetId);
  const feeRes = await syncStudentFeeRegisterToSheet(spreadsheetId);
  const recRes = await syncReceiptsToSheet(spreadsheetId);
  const mrkRes = await syncMarksToSheet(spreadsheetId);

  return {
    success: true,
    studentsCount: dirRes.count,
    feeRegisterCount: feeRes.count,
    receiptsCount: recRes.count,
    marksCount: mrkRes.count,
  };
}

/**
 * Resolves the currently configured Google Spreadsheet ID from PostgreSQL SchoolConfig singleton
 */
export async function getConfiguredSpreadsheetId(): Promise<string | null> {
  try {
    const schoolConfigRow = await prisma.schoolConfig.findUnique({ where: { id: "singleton" } });
    const cfgData = (schoolConfigRow?.data as any) || {};
    if (cfgData.googleSpreadsheetId && typeof cfgData.googleSpreadsheetId === "string" && cfgData.googleSpreadsheetId.trim()) {
      return cfgData.googleSpreadsheetId.trim();
    }
  } catch (err) {}

  // Fallback to integrations.json if exists
  try {
    const integrationsPath = path.join(process.cwd(), "src/data/integrations.json");
    if (fs.existsSync(integrationsPath)) {
      const data = JSON.parse(fs.readFileSync(integrationsPath, "utf-8"));
      const sheetConfig = data.find((i: any) => i.id === "google_sheets");
      if (sheetConfig?.config?.spreadsheetId?.trim()) {
        return sheetConfig.config.spreadsheetId.trim();
      }
    }
  } catch (err) {}

  return null;
}

/**
 * Background auto-sync is disabled to ensure ZERO Supabase egress during daytime operations.
 * Data is only synchronized on-demand via the Manual Sync Button or automatically at Midnight Cron (00:00).
 */
export function triggerBackgroundSync(_type: "MARKS" | "BILLING" | "STUDENTS" | "ALL") {
  // Deliberate no-op: Zero daytime egress
  return;
}



/**
 * Backup the entire Postgres database as JSON and upload it to a Google Drive Folder
 * @param folderId Target Google Drive Folder ID
 */
export async function backupDatabaseToDrive(folderId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]);
  const drive = google.drive({ version: "v3", auth });

  // 1. Pull data from all main models
  // 1. Pull data from all main models sequentially to avoid OOM
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      name: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const classes = await prisma.class.findMany();
  const students = await prisma.student.findMany();
  const attendances = await prisma.attendance.findMany();
  const homeworks = await prisma.homework.findMany();
  const leaveRequests = await prisma.leaveRequest.findMany();
  const notices = await prisma.notice.findMany();
  const feeHeads = await prisma.feeHead.findMany();
  const feeStructures = await prisma.feeStructure.findMany();
  const ledgerEntries = await prisma.ledgerEntry.findMany();
  const receipts = await prisma.receipt.findMany();

  // 2. Package into a backup format
  const backupObject = {
    timestamp: new Date().toISOString(),
    version: "1.0",
    database: "PostgreSQL (Supabase)",
    statistics: {
      users: users.length,
      classes: classes.length,
      students: students.length,
      ledgerEntries: ledgerEntries.length,
      receipts: receipts.length,
    },
    data: {
      users,
      classes,
      students,
      attendances,
      homeworks,
      leaveRequests,
      notices,
      feeHeads,
      feeStructures,
      ledgerEntries,
      receipts,
    },
  };

  const backupContent = JSON.stringify(backupObject, null, 2);
  const dateString = new Date().toISOString().replace(/T/, "_").replace(/\..+/, "").replace(/:/g, "-");
  const fileName = `SchoolFinanceOS_Backup_${dateString}.json`;

  // 3. Upload to Google Drive using Readable stream
  const media = {
    mimeType: "application/json",
    body: Readable.from([backupContent]),
  };

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: "application/json",
    },
    media,
    supportsAllDrives: true,
    supportsTeamDrives: true,
    fields: "id, name",
  });

  return {
    success: true,
    fileId: response.data.id,
    fileName: response.data.name,
    stats: backupObject.statistics,
  };
}
