import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let events = await db.calendarEvent.findMany({
      orderBy: { day: "asc" },
    });

    // Auto-seed default events if empty
    if (events.length === 0) {
      const defaults = [
        {
          title: "School Live Concert Choir Charity Event 2026",
          day: 3,
          month: 1,
          year: 2026,
          weekday: "Wed",
          ticketsSold: "561 / 650",
          pct: "86%",
        },
        {
          title: "The Story Of Danau Toba (Musical Drama)",
          day: 28,
          month: 1,
          year: 2026,
          weekday: "Fri",
          ticketsSold: "650 / 650",
          pct: "100%",
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
  try {
    const body = await request.json();
    const { title, day, month, year, weekday, ticketsSold, pct } = body;

    if (!title || !day || !weekday) {
      return NextResponse.json({ error: "Title, day, and weekday are required." }, { status: 400 });
    }

    const event = await db.calendarEvent.create({
      data: {
        title,
        day: parseInt(day) || 1,
        month: parseInt(month) || 1,
        year: parseInt(year) || 2026,
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
