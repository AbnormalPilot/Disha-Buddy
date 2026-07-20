import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireIngestToken } from "@/lib/ingestAuth";

export async function POST(req: NextRequest) {
  const authError = requireIngestToken(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const profileJson = JSON.stringify(body.profile && typeof body.profile === "object" ? body.profile : {});

  db.prepare(
    `INSERT INTO students (id, name, username, profile_json, first_seen, last_active)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = COALESCE(excluded.name, students.name),
       username = COALESCE(excluded.username, students.username),
       profile_json = excluded.profile_json,
       last_active = excluded.last_active`,
  ).run(body.id, body.name ?? null, body.username ?? null, profileJson, now, now);

  return NextResponse.json({ ok: true });
}
