import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Without this, Next.js treats a param-less GET handler as statically
// prerenderable and calls it once at build time (touching the DB before
// /data even exists in the build environment).
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  const studentCount = (db.prepare(`SELECT COUNT(*) AS n FROM students`).get() as any).n;
  const activeToday = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM students WHERE last_active >= datetime('now', '-1 day')`)
      .get() as any
  ).n;
  const countByType = (type: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM events WHERE type = ?`).get(type) as any).n;

  const messages = countByType("message_in") + countByType("message_out");
  const deadlineAlerts = countByType("deadline_alert") + countByType("cron_ping");
  const flags = countByType("flag");

  const sparkline = db
    .prepare(
      `SELECT date(ts) AS day, COUNT(*) AS n
       FROM events
       WHERE ts >= datetime('now', '-7 day')
       GROUP BY date(ts)
       ORDER BY day ASC`,
    )
    .all() as { day: string; n: number }[];

  const recentEvents = db
    .prepare(
      `SELECT e.*, s.name AS student_name, s.username AS student_username
       FROM events e LEFT JOIN students s ON s.id = e.student_id
       ORDER BY e.ts DESC LIMIT 25`,
    )
    .all() as any[];

  return NextResponse.json({
    students: studentCount,
    activeToday,
    messages,
    deadlineAlerts,
    flags,
    sparkline,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      ts: e.ts,
      type: e.type,
      summary: e.summary,
      studentId: e.student_id,
      studentName: e.student_name,
      studentUsername: e.student_username,
    })),
  });
}
