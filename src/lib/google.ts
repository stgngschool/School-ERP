import { google } from "googleapis";
import { Readable } from "stream";
import { db as prisma } from "./db";

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
export async function syncStudentsToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Ensure "Student Directory" tab exists
  await ensureSheetTab(sheets, spreadsheetId, "Student Directory");

  // 2. Fetch students with full relations and ledger records
  const students = await prisma.student.findMany({
    include: {
      class: true,
      parentProfile: {
        include: {
          user: true,
        },
      },
      concession: true,
      ledgerEntries: true,
    },
    orderBy: [
      { class: { name: "asc" } },
      { class: { section: "asc" } },
      { admissionNumber: "asc" },
    ],
  });

  // 3. Define comprehensive headers
  const headers = [
    "Student ID",
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
      std.id,
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
      std.dob ? std.dob.toISOString().split("T")[0] : "-",
      std.admissionDate ? std.admissionDate.toISOString().split("T")[0] : "-",
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

  // Try updating "Student Directory" tab, or fallback to Sheet1 if needed
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
  } catch {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Sheet1!A1:Z10000",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }

  return { success: true, count: students.length };
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

  // Fetch all ledger entries with student, class, feeHead and creator user
  const entries = await prisma.ledgerEntry.findMany({
    include: {
      student: {
        include: {
          class: true,
        },
      },
      feeHead: true,
      createdBy: true,
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
    entry.createdAt.toISOString().replace("T", " ").substring(0, 19),
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
 * Backup the entire Postgres database as JSON and upload it to a Google Drive Folder
 * @param folderId Target Google Drive Folder ID
 */
export async function backupDatabaseToDrive(folderId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]);
  const drive = google.drive({ version: "v3", auth });

  // 1. Pull data from all main models
  const [
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
  ] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.class.findMany(),
    prisma.student.findMany(),
    prisma.attendance.findMany(),
    prisma.homework.findMany(),
    prisma.leaveRequest.findMany(),
    prisma.notice.findMany(),
    prisma.feeHead.findMany(),
    prisma.feeStructure.findMany(),
    prisma.ledgerEntry.findMany(),
    prisma.receipt.findMany(),
  ]);

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
