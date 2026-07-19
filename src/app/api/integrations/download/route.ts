import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. Direct Real Database Backup JSON Download
    if (type === "backup") {
      const [users, students, classes, feeHeads, feeStructures, ledgerEntries, receipts, attendances] =
        await Promise.all([
          db.user.findMany(),
          db.student.findMany(),
          db.class.findMany(),
          db.feeHead.findMany(),
          db.feeStructure.findMany(),
          db.ledgerEntry.findMany(),
          db.receipt.findMany(),
          db.attendance.findMany(),
        ]);

      const backupContent = {
        meta: {
          school: "St. G.N.G. School",
          database: "PostgreSQL",
          exportedAt: new Date().toISOString(),
          statistics: {
            users: users.length,
            students: students.length,
            classes: classes.length,
            ledgerEntries: ledgerEntries.length,
            receipts: receipts.length,
          },
        },
        data: {
          users,
          students,
          classes,
          feeHeads,
          feeStructures,
          ledgerEntries,
          receipts,
          attendances,
        },
      };

      return new NextResponse(JSON.stringify(backupContent, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="St_GNG_School_DB_Backup_${dateStr}.json"`,
        },
      });
    }

    // 2. Direct Real CSV Export for Google Sheets
    if (type === "sheets") {
      const students = await db.student.findMany({
        include: { class: true },
        orderBy: { admissionNumber: "asc" },
      });

      const headers = ["Student ID,Admission No,Name,Class,Section,Father Name,Mobile,Status,RTE Status"];
      const rows = students.map(
        (s) =>
          `"${s.id}","${s.admissionNumber}","${s.name}","${s.class?.name || "-"}","${s.class?.section || "-"}","${
            s.fatherName || "-"
          }","${s.fatherMobile || s.motherMobile || "-"}","${s.status}","${s.isRte ? "YES" : "NO"}"`
      );

      const csvContent = [headers, ...rows].join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="St_GNG_School_Students_Sheets_${dateStr}.csv"`,
        },
      });
    }

    // 3. Direct Real iCalendar (.ics) Download for Google Calendar
    if (type === "calendar") {
      const notices = await db.notice.findMany({ take: 20 });
      const events = notices.map(
        (n, idx) => `BEGIN:VEVENT
UID:gng-event-${n.id}
SUMMARY:${n.title}
DESCRIPTION:${n.content.replace(/\n/g, " ")}
DTSTART:${dateStr.replace(/-/g, "")}T090000Z
DTEND:${dateStr.replace(/-/g, "")}T100000Z
END:VEVENT`
      );

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//St. GNG School//Finance OS Calendar//EN
${events.join("\n")}
END:VCALENDAR`;

      return new NextResponse(icsContent, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="St_GNG_School_Academic_Calendar_${dateStr}.ics"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid download type" }, { status: 400 });
  } catch (error: any) {
    console.error("Download route error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate download file" }, { status: 500 });
  }
}
