"use client";

import { useEffect, useState } from "react";
import { Button, TextInput, ValidateBadge } from "./ui";
import type { StatusResponse, ValidateAllResponse } from "./types";

interface PendingPairing {
  platform: string;
  code: string;
  user_id: string;
  user_name: string;
  age_minutes: number;
}

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`/api/hermes/${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

const POLL_MS = 8000;

function GatewayBadge({ state }: { state: StatusResponse["gateway"] }) {
  const styles = {
    running: "bg-emerald-950 text-emerald-300",
    stopped: "bg-neutral-800 text-neutral-300",
    error: "bg-red-950 text-red-300",
  }[state];
  return <span className={`rounded px-2 py-1 text-xs font-medium ${styles}`}>{state}</span>;
}

function formatUptime(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ControlRoom({
  initialStatus,
  onEditConfig,
}: {
  initialStatus: StatusResponse;
  onEditConfig: () => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [validation, setValidation] = useState<ValidateAllResponse | null>(null);
  const [pending, setPending] = useState<PendingPairing[]>([]);
  const [codeInputs, setCodeInputs] = useState<Record<number, string>>({});
  const [approving, setApproving] = useState<number | null>(null);

  async function refreshPending() {
    try {
      const res = await api("pairing/pending");
      setPending(res.pending);
    } catch {
      // transient poll failures are fine, next tick retries
    }
  }

  useEffect(() => {
    refreshPending();
    const interval = setInterval(async () => {
      try {
        setStatus(await api("status"));
      } catch {
        // transient poll failures are fine, next tick retries
      }
      refreshPending();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  async function approvePending(index: number) {
    const code = (codeInputs[index] ?? "").trim();
    if (!code) return;
    setApproving(index);
    setError(null);
    try {
      await api("pairing/approve", { method: "POST", body: JSON.stringify({ code }) });
      await refreshPending();
      setCodeInputs((c) => {
        const next = { ...c };
        delete next[index];
        return next;
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setApproving(null);
    }
  }

  async function refreshLogs() {
    try {
      const res = await api("logs?tail=200");
      setLogs(res.lines);
    } catch (err) {
      setError(String(err));
    }
  }

  async function revalidate() {
    setRevalidating(true);
    setError(null);
    try {
      setValidation(await api("validate-stored", { method: "POST" }));
    } catch (err) {
      setError(String(err));
    } finally {
      setRevalidating(false);
    }
  }

  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setStatus(await api("status"));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <GatewayBadge state={status.gateway} />
            {status.bot_username && <span className="text-sm text-neutral-300">@{status.bot_username}</span>}
          </div>
          <span className="text-xs text-neutral-500">
            uptime {formatUptime(status.uptime_seconds)} · model {status.model ?? "—"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={revalidate} disabled={revalidating}>
            {revalidating ? "Checking…" : "Re-run validation"}
          </Button>
          <Button variant="secondary" onClick={onEditConfig}>
            Edit configuration
          </Button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2 rounded border border-amber-800 bg-amber-950 p-4">
          <h3 className="text-sm font-medium text-amber-200">
            Waiting for approval ({pending.length})
          </h3>
          <p className="text-xs text-amber-400">
            Someone messaged the bot for the first time. Ask them for the pairing code shown in
            their chat and enter it below — they won&apos;t get a real reply until you approve.
          </p>
          {pending.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-40 truncate text-xs text-amber-200">
                {p.user_name || p.user_id} · {p.age_minutes}m ago
              </span>
              <TextInput
                placeholder="Enter their code"
                value={codeInputs[i] ?? ""}
                onChange={(e) => setCodeInputs((c) => ({ ...c, [i]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && approvePending(i)}
                className="flex-1"
              />
              <Button
                onClick={() => approvePending(i)}
                disabled={approving === i || !(codeInputs[i] ?? "").trim()}
              >
                {approving === i ? "…" : "Approve"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {validation && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(validation).map(([key, result]) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs font-medium capitalize text-neutral-400">{key}</span>
              <ValidateBadge result={result} />
            </div>
          ))}
        </div>
      )}

      {status.last_error && (
        <div className="rounded border border-red-900 bg-red-950 p-3 text-xs text-red-300">
          <p className="font-medium">{status.last_error.action}</p>
          <pre className="mt-1 whitespace-pre-wrap">{status.last_error.output}</pre>
        </div>
      )}

      {error && <div className="rounded bg-red-950 p-3 text-xs text-red-300">{error}</div>}

      <div className="flex gap-3">
        <Button onClick={() => action(() => api("gateway/start", { method: "POST" }))} disabled={busy || status.gateway === "running"}>
          Start
        </Button>
        <Button
          variant="danger"
          onClick={() => action(() => api("gateway/stop", { method: "POST" }))}
          disabled={busy || status.gateway !== "running"}
        >
          Stop
        </Button>
        <Button
          variant="secondary"
          onClick={() => action(() => api("gateway/restart", { method: "POST" }))}
          disabled={busy}
        >
          Restart
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-200">Gateway logs</h3>
          <Button variant="secondary" onClick={refreshLogs}>
            Refresh
          </Button>
        </div>
        <pre className="max-h-96 overflow-y-auto rounded border border-neutral-800 bg-black p-3 text-xs text-neutral-400">
          {logs.length ? logs.join("\n") : "No logs fetched yet — click Refresh."}
        </pre>
      </div>
    </div>
  );
}
