import { google } from "googleapis";
import { db as prisma } from "./db";

// Authenticate with Google APIs using Service Account JSON credentials
function getGoogleAuth(scopes: string[]) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKeyRaw) {
    throw new Error("Missing Google Service Account credentials in environment variables.");
  }

  // Format newlines in private key
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes,
  });
}

/**
 * Synchronize the entire student list from PostgreSQL to a Google Sheet
 * @param spreadsheetId Google Spreadsheet ID (from URL)
 */
export async function syncStudentsToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Fetch students and include class information
  const students = await prisma.student.findMany({
    include: {
      class: true,
    },
    orderBy: {
      admissionNumber: "asc",
    },
  });

  // 2. Define headers and rows
  const headers = [
    "ID",
    "Name",
    "Admission Number",
    "Roll Number",
    "Class",
    "Section",
    "Father's Name",
    "Mother's Name",
    "Parent Mobile",
    "Status",
    "Is RTE",
  ];

  const rows = students.map((std) => [
    std.id,
    std.name,
    std.admissionNumber,
    std.rollNumber || "-",
    std.class?.name || "-",
    std.class?.section || "-",
    std.fatherName || "-",
    std.motherName || "-",
    std.fatherMobile || std.motherMobile || "-",
    std.status,
    std.isRte ? "YES" : "NO",
  ]);

  const values = [headers, ...rows];

  // 3. Clear existing content in Sheet1
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Sheet1!A1:Z10000",
  });

  // 4. Write new content
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

  return { success: true, count: students.length };
}

/**
 * Synchronize the financial transactions ledger to a Google Sheet
 * @param spreadsheetId Google Spreadsheet ID
 */
export async function syncLedgerToSheet(spreadsheetId: string) {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Fetch all ledger entries
  const entries = await prisma.ledgerEntry.findMany({
    include: {
      student: {
        include: {
          class: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 2. Define headers and rows
  const headers = [
    "Entry ID",
    "Student Name",
    "Admission No",
    "Class",
    "Description",
    "Entry Type",
    "Amount (INR)",
    "Created At",
  ];

  const rows = entries.map((entry) => [
    entry.id,
    entry.student?.name || "-",
    entry.student?.admissionNumber || "-",
    entry.student?.class ? `${entry.student.class.name}-${entry.student.class.section}` : "-",
    entry.description,
    entry.entryType,
    (entry.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 }), // Convert Paisa to Rupees
    entry.createdAt.toISOString(),
  ]);

  const values = [headers, ...rows];

  // 3. Clear sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Sheet1!A1:Z100000",
  });

  // 4. Update sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

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
    prisma.user.findMany(),
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

  // 3. Upload to Google Drive
  const media = {
    mimeType: "application/json",
    body: backupContent,
  };

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: "application/json",
    },
    media,
    fields: "id, name",
  });

  return {
    success: true,
    fileId: response.data.id,
    fileName: response.data.name,
    stats: backupObject.statistics,
  };
}
