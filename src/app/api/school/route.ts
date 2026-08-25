import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// ── SCH-01: School configuration is now persisted in the SchoolConfig DB table.
// The local src/data/school.json is used ONLY as a one-time seed fallback for
// first-run / migration scenarios — never written to in production.
//
// GET: returns the DB row; falls back to school.json if the row is absent (first
//      deploy), and upserts it so subsequent reads are fast.
// POST: upserts the DB row (admin only). Never touches the filesystem.

const SINGLETON_ID = "singleton";

/** Read the bundled school.json as the initial seed value. */
function readJsonFallback(): Record<string, unknown> {
  try {
    const configPath = path.join(process.cwd(), "src/data/school.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch {
    // Ignore — read-only FS on Vercel is fine here because we never write
  }
  return {};
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    let configData: Record<string, unknown>;
    const row = await db.schoolConfig.findUnique({ where: { id: SINGLETON_ID } });

    if (row && row.data && typeof row.data === "object") {
      configData = row.data as Record<string, unknown>;
    } else {
      // First-run: no DB row yet — seed from bundled school.json and persist
      const fallback = readJsonFallback();
      await db.schoolConfig.upsert({
        where:  { id: SINGLETON_ID },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: { id: SINGLETON_ID, data: fallback as any },
        update: {},          // already exists race: do nothing
      });
      configData = fallback;
    }

    // ── SCH-03: Authenticated users receive full configuration.
    // Unauthenticated public requests receive only safe website/contact information.
    // Sensitive payment (upiId, upiMerchantName, late fees), UDISE, and exam split
    // configs are never exposed publicly.
    if (authUser) {
      return NextResponse.json(configData, {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    }

    // Public sanitized subset for website landing pages
    const publicData = {
      name: configData.name || "St. GNG School",
      address: configData.address || "",
      phone: configData.phone || "",
      alternatePhone: configData.alternatePhone || "",
      whatsappNumber: configData.whatsappNumber || "",
      schoolTimings: configData.schoolTimings || "",
      admissionSession: configData.admissionSession || "",
      admissionStatus: configData.admissionStatus || "",
      admissionClasses: configData.admissionClasses || "",
      marqueeText: configData.marqueeText || "",
      googleMapsUrl: configData.googleMapsUrl || "",
      youtubeUrl: configData.youtubeUrl || "",
      facebookUrl: configData.facebookUrl || "",
      instagramUrl: configData.instagramUrl || "",
      email: configData.email || "",
      enableTransport: configData.enableTransport ?? false,
    };

    return NextResponse.json(publicData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error reading school settings:", error);
    return NextResponse.json({ error: "Failed to read school settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid school configuration payload." }, { status: 400 });
    }

    // ── SCH-02: Atomic server-side JSONB merge in PostgreSQL.
    // Concatenates the incoming partial config onto the existing record atomically
    // with PostgreSQL row locking (INSERT ... ON CONFLICT DO UPDATE SET "data" = "SchoolConfig"."data" || EXCLUDED."data").
    // This guarantees that concurrent partial updates from multiple admins (e.g. updating late fee rules
    // while another updates school phone) preserve both changes without lost updates.
    const rows: any[] = await db.$queryRawUnsafe(
      `INSERT INTO "SchoolConfig" ("id", "data", "updatedAt")
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT ("id")
       DO UPDATE SET
         "data" = "SchoolConfig"."data" || EXCLUDED."data",
         "updatedAt" = NOW()
       RETURNING "data"`,
      SINGLETON_ID,
      JSON.stringify(body)
    );

    const mergedData = rows?.[0]?.data || body;

    // ── E-02: Structured Audit Logging
    await db.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "SCHOOL_CONFIG_UPDATED",
        entityType: "SchoolConfig",
        entityId: SINGLETON_ID,
        newValues: JSON.stringify({
          updatedFields: Object.keys(body),
          updatedAt: new Date().toISOString(),
        }),
      },
    }).catch((err) => console.error("Audit log error on school config:", err));

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error) {
    console.error("Error writing school settings:", error);
    return NextResponse.json({ error: "Failed to write school settings" }, { status: 500 });
  }
}

export const PUT = POST;
export const PATCH = POST;
