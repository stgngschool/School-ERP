import { NextResponse } from "next/server";
import { syncStudentsToSheet, syncLedgerToSheet } from "@/lib/google";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const INTEGRATIONS_FILE = path.join(process.cwd(), "src/data/integrations.json");

export async function GET() {
  try {
    if (!fs.existsSync(INTEGRATIONS_FILE)) {
      return NextResponse.json({ error: "Integrations configuration file not found." }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(INTEGRATIONS_FILE, "utf-8"));
    const sheetConfig = data.find((i: any) => i.id === "google_sheets");

    if (!sheetConfig || !sheetConfig.config?.spreadsheetId) {
      return NextResponse.json(
        { error: "Google Sheets integration is not configured or missing spreadsheetId." },
        { status: 400 }
      );
    }

    const spreadsheetId = sheetConfig.config.spreadsheetId;
    const stdRes = await syncStudentsToSheet(spreadsheetId);
    const ledRes = await syncLedgerToSheet(spreadsheetId);

    // Update lastSynced timestamp
    const now = new Date().toISOString();
    sheetConfig.lastSynced = now;
    sheetConfig.status = "CONNECTED";
    fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: `Daily Cron Sync complete for Google Sheet: ${spreadsheetId}`,
      syncedStudents: stdRes.count,
      syncedTransactions: ledRes.count,
      lastSynced: now,
    });
  } catch (error: any) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ error: error.message || "Daily cron sync failed." }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
