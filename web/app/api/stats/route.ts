import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// Without this, Next.js treats a param-less GET handler as statically
// prerenderable and calls it once at build time (touching the DB before
// env is even available in the build environment).
export const dynamic = "force-dynamic";

export async function GET() {
  const [counts] = await q<any>(
    `SELECT
       (SELECT COUNT(*)::int FROM students) AS students,
       (SELECT COUNT(*)::int FROM students WHERE last_active >= now() - interval '1 day') AS active_today,
       (SELECT COUNT(*)::int FROM events WHERE type IN ('message_in', 'message_out')) AS messages,
       (SELECT COUNT(*)::int FROM events WHERE type IN ('deadline_alert', 'cron_ping')) AS deadline_alerts,
       (SELECT COUNT(*)::int FROM events WHERE type = 'flag') AS flags`,
  );

  const sparkline = await q<{ day: string; n: number }>(
    `SELECT to_char(ts, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
     FROM events
     WHERE ts >= now() - interval '7 days'
     GROUP BY 1
     ORDER BY 1 ASC`,
  );

  const recentEvents = await q<any>(
    `SELECT e.*, s.name AS student_name, s.username AS student_username
     FROM events e LEFT JOIN students s ON s.id = e.student_id
     ORDER BY e.ts DESC LIMIT 25`,
  );

  return NextResponse.json({
    students: counts.students,
    activeToday: counts.active_today,
    messages: counts.messages,
    deadlineAlerts: counts.deadline_alerts,
    flags: counts.flags,
    sparkline,
    recentEvents: recentEvents.map((e) => ({
      id: Number(e.id),
      ts: e.ts,
      type: e.type,
      summary: e.summary,
      studentId: e.student_id,
      studentName: e.student_name,
      studentUsername: e.student_username,
    })),
  });
}
