import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SINGLETON_ID = "singleton";
const mediaConfigPath = path.join(process.cwd(), "src/data/websiteMedia.json");

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/** Read bundled websiteMedia.json as initial seed fallback */
function getJsonMediaFallback() {
  try {
    if (fs.existsSync(mediaConfigPath)) {
      const data = fs.readFileSync(mediaConfigPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading website media config fallback:", err);
  }
  return { hero: {}, principal: {}, facilities: [], gallery: [], videos: [] };
}

export async function GET() {
  try {
    let mediaData: any = null;

    // 1. Try reading from PostgreSQL SchoolConfig table first
    try {
      const row = await db.schoolConfig.findUnique({ where: { id: SINGLETON_ID } });
      if (row && row.data && typeof row.data === "object" && (row.data as any).websiteMedia) {
        mediaData = (row.data as any).websiteMedia;
      }
    } catch (dbErr) {
      console.warn("Could not load website media from DB, falling back to JSON:", dbErr);
    }

    // 2. Fall back to local websiteMedia.json if DB has no media yet
    if (!mediaData) {
      mediaData = getJsonMediaFallback();
    }

    return NextResponse.json(mediaData, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Error serving website media:", error);
    return NextResponse.json({ error: "Failed to load website media" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const updatedMedia = await request.json();

    // 1. Persist in database under SchoolConfig.data.websiteMedia (Postgres JSON merge)
    try {
      const payload = { websiteMedia: updatedMedia };
      await db.$executeRawUnsafe(
        `INSERT INTO "SchoolConfig" ("id", "data", "updatedAt")
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT ("id") DO UPDATE SET
           "data" = "SchoolConfig"."data" || EXCLUDED."data",
           "updatedAt" = NOW()`,
        SINGLETON_ID,
        JSON.stringify(payload)
      );
    } catch (dbErr) {
      console.error("Failed to persist websiteMedia to DB:", dbErr);
    }

    // 2. Write to local websiteMedia.json if filesystem is writable
    try {
      fs.writeFileSync(mediaConfigPath, JSON.stringify(updatedMedia, null, 2), "utf-8");
    } catch (fsErr) {
      console.warn("Local websiteMedia.json write skipped (read-only FS):", fsErr);
    }

    return NextResponse.json({ success: true, data: updatedMedia }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("Error updating website media:", error);
    const safeError = getSafeErrorMessage(error, "Failed to update website media.");
    return NextResponse.json({ error: safeError }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

