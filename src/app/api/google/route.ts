import { NextResponse } from "next/server";
import { syncStudentsToSheet, syncLedgerToSheet, backupDatabaseToDrive } from "@/lib/google";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, spreadsheetId, folderId } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
    }

    if (action === "SYNC_STUDENTS") {
      if (!spreadsheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 });
      }
      const result = await syncStudentsToSheet(spreadsheetId);
      return NextResponse.json(result);
    }

    if (action === "SYNC_LEDGER") {
      if (!spreadsheetId) {
        return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 });
      }
      const result = await syncLedgerToSheet(spreadsheetId);
      return NextResponse.json(result);
    }

    if (action === "BACKUP_DB") {
      if (!folderId) {
        return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
      }
      const result = await backupDatabaseToDrive(folderId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("Google integration error:", error);
    return NextResponse.json({ error: error.message || "Failed to process Google integration request" }, { status: 500 });
  }
}
