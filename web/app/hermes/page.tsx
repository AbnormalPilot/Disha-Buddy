import HermesClient from "./HermesClient";
import type { StatusResponse } from "./types";

async function getStatus(): Promise<StatusResponse> {
  const base = process.env.HERMES_CONTROL_URL ?? "http://hermes:8300";
  const token = process.env.CONTROL_TOKEN ?? "";
  const res = await fetch(`${base}/status`, {
    headers: { "X-Control-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`control plane returned ${res.status}`);
  }
  return res.json();
}

export default async function HermesPage() {
  let status: StatusResponse | null = null;
  let error: string | null = null;
  try {
    status = await getStatus();
  } catch (err) {
    error = String(err);
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-8">
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold text-neutral-50">Hermes setup &amp; control</h1>
      </div>
      {error && (
        <div className="mx-auto max-w-2xl rounded border border-red-900 bg-red-950 p-4 text-sm text-red-300">
          Couldn&apos;t reach the control plane: {error}
        </div>
      )}
      {status && <HermesClient initialStatus={status} />}
    </main>
  );
}
