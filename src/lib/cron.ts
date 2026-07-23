import cron from "node-cron";
import fs from "fs";
import path from "path";
import { syncStudentsToSheet, syncLedgerToSheet } from "./google";

const INTEGRATIONS_FILE = path.join(process.cwd(), "src/data/integrations.json");

let cronStarted = false;

export function initDailyCronJob() {
  if (cronStarted) return;
  cronStarted = true;

  // Run every day at 00:00 midnight (0 0 * * *)
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Running scheduled daily Google Sheets synchronization...");
    try {
      if (fs.existsSync(INTEGRATIONS_FILE)) {
        const data = JSON.parse(fs.readFileSync(INTEGRATIONS_FILE, "utf-8"));
        const sheetConfig = data.find((i: any) => i.id === "google_sheets");

        if (sheetConfig && sheetConfig.config?.spreadsheetId) {
          const spreadsheetId = sheetConfig.config.spreadsheetId;
          const stdRes = await syncStudentsToSheet(spreadsheetId);
          const ledRes = await syncLedgerToSheet(spreadsheetId);

          sheetConfig.lastSynced = new Date().toISOString();
          fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");

          console.log(`[CRON] Daily Google Sheets sync completed! (${stdRes.count} students, ${ledRes.count} transactions)`);
        } else {
          console.log("[CRON] Google Sheets is missing spreadsheetId. Skipping daily sync.");
        }
      }
    } catch (err: any) {
      console.error("[CRON] Scheduled Google Sheets sync failed:", err.message);
    }
  });

  console.log("[CRON] Daily Google Sheets sync cron job initialized (Runs automatically at 00:00 midnight).");
}
