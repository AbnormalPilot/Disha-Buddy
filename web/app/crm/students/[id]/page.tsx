"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { StudentDetail } from "../../types";
import { EVENT_ICONS } from "../../types";

const POLL_MS = 8000;

function formatTs(iso: string): string {
  return new Date(iso + "Z").toLocaleString();
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
    return <p className="text-sm text-neutral-500">No student found with id {params.id}.</p>;
  }
  if (!data) return <p className="text-sm text-neutral-500">Loading…</p>;

  const { student, events } = data;
  const profileEntries = Object.entries(student.profile).filter(([, v]) => v != null && v !== "");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
        <h1 className="text-lg font-semibold text-neutral-50">
          {student.name ?? student.username ?? student.id}
        </h1>
        <p className="text-xs text-neutral-500">
          {student.username && `@${student.username} · `}
          first seen {formatTs(student.firstSeen)} · last active {formatTs(student.lastActive)}
        </p>
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">Profile</h2>
        {profileEntries.length === 0 ? (
          <p className="text-xs text-neutral-600">No profile facts recorded yet — gaps are visible by design.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {profileEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-neutral-500">{key.replace(/_/g, " ")}</dt>
                <dd className="text-sm text-neutral-200">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">Event timeline</h2>
        <ol className="flex flex-col gap-3 border-l border-neutral-800 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-emerald-600" />
              <div className="flex items-center gap-2 text-sm">
                <span>{EVENT_ICONS[e.type] ?? "•"}</span>
                <span className="font-medium text-neutral-300">{e.type}</span>
                <span className="text-xs text-neutral-600">{formatTs(e.ts)}</span>
              </div>
              {e.summary && <p className="text-sm text-neutral-500">{e.summary}</p>}
            </li>
          ))}
          {events.length === 0 && <p className="text-xs text-neutral-600">No events yet.</p>}
        </ol>
      </div>
    </div>
  );
}
