import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireIngestToken } from "@/lib/ingestAuth";

export async function POST(req: NextRequest) {
  const authError = requireIngestToken(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const profileJson = JSON.stringify(body.profile && typeof body.profile === "object" ? body.profile : {});

  await q(
    `INSERT INTO students (id, name, username, profile_json, first_seen, last_active)
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (id) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, students.name),
       username = COALESCE(EXCLUDED.username, students.username),
       profile_json = EXCLUDED.profile_json,
       last_active = EXCLUDED.last_active`,
    [body.id, body.name ?? null, body.username ?? null, profileJson, now],
  );

  return NextResponse.json({ ok: true });
}
