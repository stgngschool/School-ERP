import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { studentIds, nextSessionId, nextClassId } = await request.json();

    if (!Array.isArray(studentIds) || !nextSessionId || !nextClassId) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Process promotion in a transaction
    await db.$transaction(async (tx) => {
      for (const studentId of studentIds) {
        // Upsert student session for the new session
        const existingSession = await tx.studentSession.findUnique({
          where: {
            studentId_sessionId: {
              studentId,
              sessionId: nextSessionId
            }
          }
        });

        if (existingSession) {
          // If already enrolled in that session, just update class
          await tx.studentSession.update({
            where: { id: existingSession.id },
            data: { classId: nextClassId }
          });
        } else {
          // Create new enrollment
          await tx.studentSession.create({
            data: {
              studentId,
              sessionId: nextSessionId,
              classId: nextClassId,
            }
          });
        }

        // Update the cached current class on the student
        await tx.student.update({
          where: { id: studentId },
          data: { classId: nextClassId }
        });
      }
    });

    return NextResponse.json({ success: true, message: `Promoted ${studentIds.length} students successfully.` });
  } catch (error) {
    console.error("Promotion error:", error);
    return NextResponse.json({ error: "Failed to promote students" }, { status: 500 });
  }
}
