import { NextRequest, NextResponse } from "next/server";
import { q, EVENT_TYPES } from "@/lib/db";
import { requireIngestToken } from "@/lib/ingestAuth";

export async function POST(req: NextRequest) {
  const authError = requireIngestToken(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.student_id !== "string" || typeof body.type !== "string") {
    return NextResponse.json({ error: "student_id and type are required" }, { status: 400 });
  }
  if (!EVENT_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `unknown event type: ${body.type}` }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Privacy rule (HANDOVER.md §6.2): this is an ops view, not surveillance
  // — store one-line summaries only, never full transcripts. We don't
  // enforce a length cap here (that's the sender's responsibility, per
  // crm_client.log_event's [:200] truncation) but we never accept a
  // "transcript" field.
  const summary: string | null = typeof body.summary === "string" ? body.summary.slice(0, 500) : null;
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};

  await q(
    `INSERT INTO events (student_id, ts, type, summary, meta_json) VALUES ($1, $2, $3, $4, $5)`,
    [body.student_id, now, body.type, summary, JSON.stringify(meta)],
  );

  // Ensure a student row exists even if upsert_student() hasn't fired yet
  // (e.g. a message_in event racing the profile mirror) — an event with no
  // owning student would be an orphan in the dashboard.
  await q(
    `INSERT INTO students (id, first_seen, last_active) VALUES ($1, $2, $2)
     ON CONFLICT (id) DO UPDATE SET last_active = EXCLUDED.last_active`,
    [body.student_id, now],
  );

  return NextResponse.json({ ok: true });
}
