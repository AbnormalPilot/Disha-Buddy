"use client";

import { useEffect, useState } from "react";

// Open-access switch for the Telegram bot. Reads/writes the control
// plane's /access endpoint through the server-side proxy (the control
// token never reaches the browser — same pattern as the /hermes pages).
// Flipping it restarts the gateway, so the bot is unreachable for a few
// seconds after a change.
export default function AccessToggle() {
  const [allowAll, setAllowAll] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hermes/access", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!cancelled) setAllowAll(Boolean(data.allow_all));
      })
      .catch(() => {
        if (!cancelled) setError("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (allowAll === null || busy) return;
    const next = !allowAll;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hermes/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow_all: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setAllowAll(next);
    } catch {
      setError("failed — retry");
    } finally {
      setBusy(false);
    }
  }

  if (error && allowAll === null) {
    return <span className="text-xs text-zinc-400">access: {error}</span>;
  }

  const on = allowAll === true;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">
        {allowAll === null ? "…" : on ? "Open to everyone" : "Approved users only"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Open access"
        disabled={allowAll === null || busy}
        onClick={toggle}
        title="Open: anyone on Telegram can use the bot. Off: only approved (paired) users. Switching restarts the bot for a few seconds."
        className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
          on ? "bg-emerald-500" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
      {busy && <span className="text-xs text-zinc-400">applying…</span>}
      {error && allowAll !== null && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
