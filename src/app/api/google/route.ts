import { NextResponse } from "next/server";
import { syncStudentsToSheet, syncLedgerToSheet, backupDatabaseToDrive } from "@/lib/google";
import fs from "fs";
import path from "path";

const credsPath = path.join(process.cwd(), "src/data/google-credentials.json");

export async function GET() {
  try {
    if (fs.existsSync(credsPath)) {
      const data = fs.readFileSync(credsPath, "utf-8");
      const parsed = JSON.parse(data);
      return NextResponse.json({ hasCredentials: true, clientEmail: parsed.client_email });
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

    if (action === "SYNC_STUDENTS") {
      const cleanSheetId = extractId(spreadsheetId);
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 });
      }
      const result = await syncStudentsToSheet(cleanSheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_LEDGER") {
      const cleanSheetId = extractId(spreadsheetId);
      if (!cleanSheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 });
      }
      const result = await syncLedgerToSheet(cleanSheetId);
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
