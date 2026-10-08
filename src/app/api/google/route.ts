import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { 
  syncStudentsToSheet, 
  syncStudentDirectoryToSheet,
  syncStudentFeeRegisterToSheet,
  syncLedgerToSheet, 
  syncMarksToSheet, 
  syncReceiptsToSheet, 
  syncAllDataToSheet, 
  backupDatabaseToDrive,
  getConfiguredSpreadsheetId
} from "@/lib/google";
import fs from "fs";
import path from "path";

const credsPath = path.join(process.cwd(), "src/data/google-credentials.json");

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let clientEmail: string | undefined;
    if (fs.existsSync(credsPath)) {
      const data = fs.readFileSync(credsPath, "utf-8");
      const parsed = JSON.parse(data);
      clientEmail = parsed.client_email;
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      clientEmail = parsed.client_email;
    }

    if (clientEmail) {
      return NextResponse.json({ hasCredentials: true, clientEmail });
    }
    return NextResponse.json({ hasCredentials: false });
  } catch (err) {
    return NextResponse.json({ hasCredentials: false });
  }
}

function extractId(input: string): string {
  if (!input) return "";
  let match = input.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return input.trim();
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, spreadsheetId, folderId, serviceAccountJson } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
    }

    if (action === "SAVE_CREDENTIALS") {
      if (!serviceAccountJson) {
        return NextResponse.json({ error: "Missing serviceAccountJson content" }, { status: 400 });
      }
      try {
        const parsed = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        if (!parsed.client_email || !parsed.private_key) {
          return NextResponse.json({ error: "JSON is missing 'client_email' or 'private_key'." }, { status: 400 });
        }
        fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2), "utf-8");
        return NextResponse.json({ success: true, clientEmail: parsed.client_email });
      } catch (err: any) {
        return NextResponse.json({ error: "Invalid JSON format: " + err.message }, { status: 400 });
      }
    }

    const cleanSheetId = extractId(spreadsheetId) || (await getConfiguredSpreadsheetId());

    if (action === "SYNC_DIRECTORY") {
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId. Please configure it in School Settings." }, { status: 400 });
      }
      const result = await syncStudentDirectoryToSheet(cleanSheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_FEE_REGISTER") {
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId. Please configure it in School Settings." }, { status: 400 });
      }
      const result = await syncStudentFeeRegisterToSheet(cleanSheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_STUDENTS") {
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId. Please configure it in School Settings." }, { status: 400 });
      }
      const result = await syncStudentsToSheet(cleanSheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_RECEIPTS") {
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId. Please configure it in School Settings." }, { status: 400 });
      }
      const result = await syncReceiptsToSheet(cleanSheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_LEDGER") {
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId. Please configure it in School Settings." }, { status: 400 });
      }
      const result = await syncLedgerToSheet(cleanSheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_MARKS") {
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId. Please configure it in School Settings." }, { status: 400 });
      }
      const result = await syncMarksToSheet(cleanSheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_ALL") {
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId. Please configure it in School Settings." }, { status: 400 });
      }
      const result = await syncAllDataToSheet(cleanSheetId);
      const nowIso = new Date().toISOString();
      try {
        const { db } = await import("@/lib/db");
        const schoolConfigRow = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
        const cfgData = (schoolConfigRow?.data as any) || {};
        await db.schoolConfig.upsert({
          where: { id: "singleton" },
          update: { data: { ...cfgData, googleLastSynced: nowIso } },
          create: { id: "singleton", data: { ...cfgData, googleLastSynced: nowIso } },
        });
      } catch (err: any) {
        console.warn("[GOOGLE API] Notice updating SchoolConfig lastSynced timestamp:", err.message);
      }
      return NextResponse.json(result);
    }

    if (action === "BACKUP_DB") {
      const cleanFolderId = extractId(folderId);
      if (!cleanFolderId) {
        return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
      }
      const result = await backupDatabaseToDrive(cleanFolderId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("Google integration error:", error);
    let msg = error.message || "Failed to process Google integration request";
    if (msg.includes("DECODER routines::unsupported") || msg.includes("ERR_OSSL_UNSUPPORTED")) {
      msg = "⚠ Invalid or truncated Google Private Key. Please generate a fresh JSON key from Google Cloud Console.";
    } else if (msg.includes("storage quota") || msg.includes("Service Accounts do not have storage quota")) {
      msg = "⚠ Google Quota Constraint: Google Service Accounts cannot upload files directly to personal Gmail Drive folders (0MB quota). For personal Gmail accounts, use 'Sync Students' or 'Sync Financials' (Google Sheets) above, or upload to a Google Workspace Shared Drive folder.";
    } else if (msg.includes("File not found") || msg.includes("permission") || msg.includes("404")) {
      msg = "⚠ Access Permission Required: Please open your Google Drive folder (or Sheet), click 'Share' button, and add 'school-finance-connector@school-finance-os.iam.gserviceaccount.com' with Editor permission.";
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
