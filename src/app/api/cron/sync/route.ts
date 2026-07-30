import { NextResponse } from "next/server";
import { syncStudentsToSheet, syncLedgerToSheet } from "@/lib/google";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const INTEGRATIONS_FILE = path.join(process.cwd(), "src/data/integrations.json");

export async function GET(request: Request) {
  try {
    // Optionally secure this endpoint with a secret token from headers or query params
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    let countStudents = 0;
    let countTransactions = 0;

    if (fs.existsSync(INTEGRATIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(INTEGRATIONS_FILE, "utf-8"));
      const sheetConfig = data.find((i: any) => i.id === "google_sheets");

      if (sheetConfig && sheetConfig.config?.spreadsheetId) {
        const spreadsheetId = sheetConfig.config.spreadsheetId;
        const stdRes = await syncStudentsToSheet(spreadsheetId);
        const ledRes = await syncLedgerToSheet(spreadsheetId);

        sheetConfig.lastSynced = new Date().toISOString();
        fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");

        countStudents = stdRes.count || 0;
        countTransactions = ledRes.count || 0;
        console.log(`[CRON API] Google Sheets sync completed! (${countStudents} students, ${countTransactions} transactions)`);
      } else {
        console.log("[CRON API] Google Sheets is missing spreadsheetId. Skipping sync.");
      }
    }

    return NextResponse.json({ success: true, countStudents, countTransactions });
  } catch (error: any) {
    console.error("[CRON API] Sync failed:", error.message);
    return NextResponse.json({ error: "Failed to run cron job" }, { status: 500 });
  }
}
