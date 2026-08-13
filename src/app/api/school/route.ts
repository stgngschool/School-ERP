import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthUser } from "@/lib/auth";

const configPath = path.join(process.cwd(), "src/data/school.json");

export async function GET() {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Error reading school settings:", error);
    return NextResponse.json({ error: "Failed to read school settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    fs.writeFileSync(configPath, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error("Error writing school settings:", error);
    return NextResponse.json({ error: "Failed to write school settings" }, { status: 500 });
  }
}
