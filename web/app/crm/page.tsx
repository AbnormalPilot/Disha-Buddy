"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StatsResponse } from "./types";
import { EVENT_ICONS } from "./types";

const POLL_MS = 8000;

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-2xl font-semibold text-neutral-50">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function Sparkline({ data }: { data: { day: string; n: number }[] }) {
  if (!data.length) return <div className="text-xs text-neutral-600">No activity yet</div>;
  const max = Math.max(...data.map((d) => d.n), 1);
  return (
    <div className="flex h-16 items-end gap-1">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.n}`}>
          <div
            className="w-full rounded-t bg-emerald-600"
            style={{ height: `${Math.max((d.n / max) * 100, 4)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso + "Z").getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CrmDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!cancelled && res.ok) setStats(await res.json());
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

  if (!stats) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (stats.students === 0) {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-900 p-8 text-center text-sm text-neutral-400">
        No students yet — message the bot on Telegram to see activity here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Students" value={stats.students} />
        <StatCard label="Active today" value={stats.activeToday} />
        <StatCard label="Messages" value={stats.messages} />
        <StatCard label="Alerts sent" value={stats.deadlineAlerts} />
        <StatCard label="Flags" value={stats.flags} />
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">Last 7 days</h2>
        <Sparkline data={stats.sparkline} />
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">Live activity</h2>
        <ul className="flex flex-col divide-y divide-neutral-800">
          {stats.recentEvents.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-5 text-center">{EVENT_ICONS[e.type] ?? "•"}</span>
              <Link href={`/crm/students/${e.studentId}`} className="text-neutral-300 hover:underline">
                {e.studentName ?? e.studentUsername ?? e.studentId}
              </Link>
              <span className="flex-1 truncate text-neutral-500">{e.summary}</span>
              <span className="whitespace-nowrap text-xs text-neutral-600">{timeAgo(e.ts)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
