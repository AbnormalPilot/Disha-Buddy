"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { StudentDetail } from "../../types";
import { EVENT_ICONS, parseUtc } from "../../types";

const POLL_MS = 8000;

function formatTs(iso: string): string {
  return parseUtc(iso).toLocaleString();
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/students/${params.id}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) setData(await res.json());
      } catch {
        // transient poll failure — next tick retries
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [params.id]);

  if (notFound) {
    return <p className="text-sm text-zinc-500">No student found with id {params.id}.</p>;
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        <div className="h-32 animate-pulse rounded-lg border border-zinc-200 bg-white" />
      </div>
    );
  }

  const { student, events } = data;
  const profileEntries = Object.entries(student.profile).filter(([, v]) => v != null && v !== "");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">
          {student.name ?? student.username ?? student.id}
        </h1>
        <p className="text-xs text-zinc-500">
          {student.username && `@${student.username} · `}
          first seen {formatTs(student.firstSeen)} · last active {formatTs(student.lastActive)}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">Profile</h2>
        {profileEntries.length === 0 ? (
          <p className="text-xs text-zinc-400">No profile facts recorded yet. Gaps are visible by design.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {profileEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-zinc-500">{key.replace(/_/g, " ")}</dt>
                <dd className="text-sm text-zinc-800">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">Event timeline</h2>
        <ol className="flex flex-col gap-3 border-l border-zinc-200 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
              <div className="flex items-center gap-2 text-sm">
                <span>{EVENT_ICONS[e.type] ?? "•"}</span>
                <span className="font-medium text-zinc-700">{e.type}</span>
                <span className="text-xs text-zinc-400">{formatTs(e.ts)}</span>
              </div>
              {e.summary && <p className="text-sm text-zinc-500">{e.summary}</p>}
            </li>
          ))}
          {events.length === 0 && <p className="text-xs text-zinc-400">No events yet.</p>}
        </ol>
      </div>
    </div>
  );
}
