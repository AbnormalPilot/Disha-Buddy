import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [student] = await q<any>(`SELECT * FROM students WHERE id = $1`, [params.id]);
  if (!student) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const events = await q<any>(
    `SELECT * FROM events WHERE student_id = $1 ORDER BY ts DESC LIMIT 200`,
    [params.id],
  );

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      username: student.username,
      profile: JSON.parse(student.profile_json || "{}"),
      firstSeen: student.first_seen,
      lastActive: student.last_active,
      status: student.status,
    },
    events: events.map((e) => ({
      id: Number(e.id),
      ts: e.ts,
      type: e.type,
      summary: e.summary,
      meta: JSON.parse(e.meta_json || "{}"),
    })),
  });
}
