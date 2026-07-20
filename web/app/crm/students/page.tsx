"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StudentListItem } from "../types";

const POLL_MS = 10000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso + "Z").getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/students", { cache: "no-store" });
        if (!cancelled && res.ok) setStudents((await res.json()).students);
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
  }, []);

  if (!students) return <p className="text-sm text-neutral-500">Loading…</p>;

  if (students.length === 0) {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-900 p-8 text-center text-sm text-neutral-400">
        No students yet — message the bot on Telegram to see them here.
      </div>
    );
  }

  // Flagged rows sort to top (HANDOVER.md §6.2).
  const sorted = [...students].sort((a, b) => {
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
    return b.lastActive.localeCompare(a.lastActive);
  });

  return (
    <div className="overflow-x-auto rounded border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-xs text-neutral-500">
          <tr>
            <th className="px-4 py-2 font-medium">Student</th>
            <th className="px-4 py-2 font-medium">Class / stream</th>
            <th className="px-4 py-2 font-medium">Profile</th>
            <th className="px-4 py-2 font-medium">Last active</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.id}
              className={`border-t border-neutral-800 ${s.flagged ? "bg-red-950/40" : ""}`}
            >
              <td className="px-4 py-2">
                <Link href={`/crm/students/${s.id}`} className="text-neutral-200 hover:underline">
                  {s.name ?? s.username ?? s.id}
                </Link>
                {s.flagged && <span className="ml-2 text-xs text-red-400">⚠ flagged</span>}
              </td>
              <td className="px-4 py-2 text-neutral-400">
                {[s.classOrYear, s.stream].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="px-4 py-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${Math.round(s.completeness * 100)}%` }}
                  />
                </div>
              </td>
              <td className="px-4 py-2 text-neutral-400">{timeAgo(s.lastActive)}</td>
              <td className="px-4 py-2 text-neutral-400">{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
