import { NextRequest, NextResponse } from "next/server";

const CRM_INGEST_TOKEN = process.env.CRM_INGEST_TOKEN ?? "";

export function requireIngestToken(req: NextRequest): NextResponse | null {
  const token = req.headers.get("X-Ingest-Token");
  if (!CRM_INGEST_TOKEN || token !== CRM_INGEST_TOKEN) {
    return NextResponse.json({ error: "invalid or missing X-Ingest-Token" }, { status: 401 });
  }
  return null;
}
