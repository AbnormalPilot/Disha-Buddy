import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const student = db.prepare(`SELECT * FROM students WHERE id = ?`).get(params.id) as any;
  if (!student) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const events = db
    .prepare(`SELECT * FROM events WHERE student_id = ? ORDER BY ts DESC LIMIT 200`)
    .all(params.id) as any[];

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
      id: e.id,
      ts: e.ts,
      type: e.type,
      summary: e.summary,
      meta: JSON.parse(e.meta_json || "{}"),
    })),
  });
}
