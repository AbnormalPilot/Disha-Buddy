import { NextRequest, NextResponse } from "next/server";

const CONTROL_URL = process.env.HERMES_CONTROL_URL ?? "http://hermes:8300";
const CONTROL_TOKEN = process.env.CONTROL_TOKEN ?? "";

// Proxies /api/hermes/* to the control plane inside the hermes container,
// attaching X-Control-Token server-side so the token never reaches the
// browser (see HANDOVER.md §6.1).
async function proxy(req: NextRequest, params: { path: string[] }) {
  const target = `${CONTROL_URL}/${params.path.join("/")}${req.nextUrl.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: { "X-Control-Token": CONTROL_TOKEN, "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }
  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: `control plane unreachable: ${String(err)}` }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params);
}
