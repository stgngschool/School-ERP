import { NextResponse } from "next/server";
import { syncAllDataToSheet, getConfiguredSpreadsheetId } from "@/lib/google";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const INTEGRATIONS_FILE = path.join(process.cwd(), "src/data/integrations.json");

async function handleSync(request: Request) {
  try {
    // 1. Authorization. H6 fix: do NOT trust the `x-vercel-cron` header or a
    //    `vercel-cron` User-Agent on their own — any external caller can spoof them
    //    to trigger a full (expensive) Google Sheets sync. The automated caller must
    //    present the shared CRON_SECRET. Vercel Cron automatically sends
    //    `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET env var is set,
    //    so this authenticates the real scheduled job while rejecting spoofed headers.
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("key");

    let isAuthorized = false;
    let isCron = false;

    if (cronSecret && cronSecret.length >= 8) {
      if (authHeader === `Bearer ${cronSecret}` || queryKey === cronSecret) {
        isAuthorized = true;
        isCron = true;
      }
    } else {
      // Secure default: without a configured secret, automated/anonymous callers are
      // never authorized. Set CRON_SECRET in the environment to enable Vercel Cron.
      console.warn(
        "[CRON API] CRON_SECRET is not configured; automated cron is disabled. Only authenticated ADMIN/ACCOUNTANT can trigger a manual sync."
      );
    }

    // 2. Allow an authenticated staff member (ADMIN/ACCOUNTANT) to trigger a manual sync.
    if (!isAuthorized) {
      const authUser = await getAuthUser(request);
      if (authUser && (authUser.role === "ADMIN" || authUser.role === "ACCOUNTANT")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
    }

    // 2. Resolve Active Google Spreadsheet ID from Database Configuration
    const spreadsheetId = await getConfiguredSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "No Google Spreadsheet ID configured. Please set it in School Settings." },
        { status: 400 }
      );
    }

    // ── EGRESS P1: Debounce accidental repeated MANUAL syncs so double/triple clicks
    // don't each trigger a full multi-MB database dump. The scheduled cron (authorized
    // via CRON_SECRET) is never rate-limited and always runs.
    if (!isCron) {
      const MANUAL_SYNC_COOLDOWN_MS = 2 * 60 * 1000;
      try {
        const cfgRow = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
        const lastSyncedStr = (cfgRow?.data as any)?.googleLastSynced;
        if (lastSyncedStr) {
          const elapsed = Date.now() - new Date(lastSyncedStr).getTime();
          if (elapsed >= 0 && elapsed < MANUAL_SYNC_COOLDOWN_MS) {
            return NextResponse.json({
              success: true,
              skipped: true,
              lastSynced: lastSyncedStr,
              message: `A Google Sheets sync ran ${Math.round(elapsed / 1000)}s ago. Skipped to conserve bandwidth — please retry in a couple of minutes.`,
            });
          }
        }
      } catch {
        // Non-fatal: if the cooldown check fails, allow the sync to proceed.
      }
    }

    // 3. Synchronize All 4 Google Sheets Modules
    const res = await syncAllDataToSheet(spreadsheetId);
    const nowIso = new Date().toISOString();

    // 4. Update lastSynced in PostgreSQL SchoolConfig singleton
    try {
      const schoolConfigRow = await db.schoolConfig.findUnique({ where: { id: "singleton" } });
      const cfgData = (schoolConfigRow?.data as any) || {};
      await db.schoolConfig.upsert({
        where: { id: "singleton" },
        update: {
          data: {
            ...cfgData,
            googleLastSynced: nowIso,
          },
        },
        create: {
          id: "singleton",
          data: {
            ...cfgData,
            googleLastSynced: nowIso,
          },
        },
      });
    } catch (dbErr: any) {
      console.warn("[CRON API] Notice updating SchoolConfig lastSynced timestamp:", dbErr.message);
    }

    // 5. Update local integrations.json if writable (local dev environment)
    try {
      if (fs.existsSync(INTEGRATIONS_FILE)) {
        const data = JSON.parse(fs.readFileSync(INTEGRATIONS_FILE, "utf-8"));
        const sheetConfig = data.find((i: any) => i.id === "google_sheets");
        if (sheetConfig) {
          sheetConfig.lastSynced = nowIso;
          if (sheetConfig.config) {
            sheetConfig.config.spreadsheetId = spreadsheetId;
          }
          sheetConfig.target = `Sheet: ${spreadsheetId}`;
          fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
        }
      }
    } catch {}

    console.log(
      `[CRON API] Daily Google Sheets sync completed! (${res.studentsCount} students, ${res.feeRegisterCount} fee registers, ${res.receiptsCount} receipts, ${res.marksCount} marks)`
    );

    return NextResponse.json({
      success: true,
      lastSynced: nowIso,
      spreadsheetId,
      studentsCount: res.studentsCount,
      feeRegisterCount: res.feeRegisterCount,
      receiptsCount: res.receiptsCount,
      marksCount: res.marksCount,
    });
  } catch (error: any) {
    console.error("[CRON API] Sync failed:", error.message);
    return NextResponse.json({ error: error.message || "Failed to run cron job" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
