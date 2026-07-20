async function getStatus() {
  const base = process.env.HERMES_CONTROL_URL ?? "http://hermes:8300";
  const token = process.env.CONTROL_TOKEN ?? "";
  try {
    const res = await fetch(`${base}/status`, {
      headers: { "X-Control-Token": token },
      cache: "no-store",
    });
    if (!res.ok) return { error: `control plane returned ${res.status}` };
    return await res.json();
  } catch (err) {
    return { error: `control plane unreachable: ${String(err)}` };
  }
}

export default async function HermesPage() {
  const status = await getStatus();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Hermes setup &amp; control</h1>
      <p className="text-sm text-neutral-500">
        The full wizard (Telegram / LLM / voice / DataBlue / persona steps) lands in the next
        build pass. This page currently proves the control-plane connection end to end.
      </p>
      <pre className="overflow-x-auto rounded bg-neutral-900 p-4 text-xs text-neutral-100">
        {JSON.stringify(status, null, 2)}
      </pre>
    </main>
  );
}
