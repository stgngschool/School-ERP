import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import db from "@/lib/db";
import { validateCsrfOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let events = await db.calendarEvent.findMany({
take: 100,
      orderBy: { day: "asc" },
    });

    // Auto-seed default events if empty (M-06 & L-08: realistic events & dynamic current year)
    if (events.length === 0) {
      const currentYear = new Date().getFullYear();
      const defaults = [
        {
          title: "Unit Test - 1 Examinations",
          day: 15,
          month: 7,
          year: currentYear,
          weekday: "Mon",
          ticketsSold: "All Classes",
          pct: "100%",
        },
        {
          title: "Annual Sports Day & Prize Distribution",
          day: 10,
          month: 11,
          year: currentYear,
          weekday: "Sat",
          ticketsSold: "Campus Grounds",
          pct: "90%",
        },
      ];

      for (const ev of defaults) {
        await db.calendarEvent.create({ data: ev });
      }

      events = await db.calendarEvent.findMany({
        orderBy: { day: "asc" },
      });
    }

    return NextResponse.json(events);
  } catch (error: any) {
    console.error("Fetch events error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // ── H-11: Validate CSRF Origin
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin (CSRF verification failed)." }, { status: 403 });
  }

  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, day, month, year, weekday, ticketsSold, pct } = body;

    if (!title || !day || !weekday) {
      return NextResponse.json({ error: "Title, day, and weekday are required." }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const event = await db.calendarEvent.create({
      data: {
        title,
        day: parseInt(day) || 1,
        month: parseInt(month) || 1,
        year: parseInt(year) || currentYear,
        weekday,
        ticketsSold: ticketsSold || "0 / 400",
        pct: pct || "0%",
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Failed to create calendar event" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // ── H-11: Validate CSRF Origin
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin (CSRF verification failed)." }, { status: 403 });
  }

  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "ADMIN" && authUser.role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden. Admin or Accountant access required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
    }

    await db.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Failed to delete calendar event" }, { status: 500 });
  }
}
