import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthUser } from "@/lib/auth";

const mediaConfigPath = path.join(process.cwd(), "src/data/websiteMedia.json");

function getMediaData() {
  try {
    if (fs.existsSync(mediaConfigPath)) {
      const data = fs.readFileSync(mediaConfigPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading website media config:", err);
  }
  return { hero: {}, principal: {}, facilities: [], gallery: [] };
}

export async function GET() {
  try {
    const media = getMediaData();
    const response = NextResponse.json(media);
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    console.error("Error serving website media:", error);
    return NextResponse.json({ error: "Failed to load website media" }, { status: 500 });
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
    const updatedMedia = await request.json();
    fs.writeFileSync(mediaConfigPath, JSON.stringify(updatedMedia, null, 2), "utf-8");
    return NextResponse.json({ success: true, data: updatedMedia });
  } catch (error: any) {
    console.error("Error writing website media:", error);
    return NextResponse.json({ error: error.message || "Failed to update website media" }, { status: 500 });
  }
}
