"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StudentListItem } from "../types";
import { parseUtc } from "../types";

const POLL_MS = 10000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - parseUtc(iso).getTime();
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

  if (!students) {
    return <div className="h-40 animate-pulse rounded-lg border border-zinc-200 bg-white" />;
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
        No students yet. Message the bot on Telegram to see them here.
      </div>
    );
  }

  // Flagged rows sort to top (HANDOVER.md §6.2).
  const sorted = [...students].sort((a, b) => {
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
    return b.lastActive.localeCompare(a.lastActive);
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Student</th>
            <th className="px-4 py-2.5 font-medium">Class / stream</th>
            <th className="px-4 py-2.5 font-medium">Profile</th>
            <th className="px-4 py-2.5 font-medium">Last active</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((s) => (
            <tr
              key={s.id}
              className={`transition-colors hover:bg-zinc-50 ${s.flagged ? "bg-red-50 hover:bg-red-50" : ""}`}
            >
              <td className="px-4 py-2.5">
                <Link href={`/crm/students/${s.id}`} className="font-medium text-zinc-800 hover:underline">
                  {s.name ?? s.username ?? s.id}
                </Link>
                {s.flagged && <span className="ml-2 text-xs font-medium text-red-600">⚠ flagged</span>}
              </td>
              <td className="px-4 py-2.5 text-zinc-500">
                {[s.classOrYear, s.stream].filter(Boolean).join(" · ") || "-"}
              </td>
              <td className="px-4 py-2.5">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.round(s.completeness * 100)}%` }}
                  />
                </div>
              </td>
              <td className="px-4 py-2.5 text-zinc-500">{timeAgo(s.lastActive)}</td>
              <td className="px-4 py-2.5 text-zinc-500">{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
