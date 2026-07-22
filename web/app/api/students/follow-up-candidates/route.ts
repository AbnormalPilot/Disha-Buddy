import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireIngestToken } from "@/lib/ingestAuth";

export const dynamic = "force-dynamic";

// Selection policy for the daily engagement follow-up sweep (the hermes
// container's follow_up_sweep.py calls this; the web app is the only
// process that talks to the database). The anti-pushy guards live in
// this query, deterministically:
//   * only students idle 3..21 days (fresher = no nudge needed;
//     staler = they've left, pinging again is spam)
//   * max one follow-up per student per 7 days (follow_up_ping events)
//   * skip anyone deadline-alerted in the last 3 days (already touched)
//   * skip anyone safety-flagged in the last 14 days (a re-engagement
//     ping is the wrong tool there)
//   * hard cap of 15 per run
export async function GET(req: NextRequest) {
  const authError = requireIngestToken(req);
  if (authError) return authError;

  const candidates = await q<any>(
    `SELECT s.id, s.name, s.profile_json,
            floor(extract(epoch FROM (now() - s.last_active)) / 86400)::int AS idle_days
     FROM students s
     WHERE s.status = 'active'
       AND s.last_active BETWEEN now() - interval '21 days' AND now() - interval '3 days'
       AND NOT EXISTS (
             SELECT 1 FROM events e
             WHERE e.student_id = s.id AND e.type = 'follow_up_ping'
               AND e.ts > now() - interval '7 days')
       AND NOT EXISTS (
             SELECT 1 FROM events e
             WHERE e.student_id = s.id AND e.type = 'deadline_alert'
               AND e.ts > now() - interval '3 days')
       AND NOT EXISTS (
             SELECT 1 FROM events e
             WHERE e.student_id = s.id AND e.type = 'flag'
               AND e.ts > now() - interval '14 days')
     ORDER BY s.last_active ASC
     LIMIT 15`,
  );

  return NextResponse.json({ candidates });
}
