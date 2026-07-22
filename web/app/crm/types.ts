export interface StatsResponse {
  students: number;
  activeToday: number;
  messages: number;
  deadlineAlerts: number;
  flags: number;
  sparkline: { day: string; n: number }[];
  recentEvents: {
    id: number;
    ts: string;
    type: string;
    summary: string | null;
    studentId: string;
    studentName: string | null;
    studentUsername: string | null;
  }[];
}

export interface StudentListItem {
  id: string;
  name: string | null;
  username: string | null;
  stream: string | null;
  classOrYear: string | null;
  completeness: number;
  lastActive: string;
  firstSeen: string;
  status: string;
  flagged: boolean;
}

export interface StudentDetail {
  student: {
    id: string;
    name: string | null;
    username: string | null;
    profile: Record<string, unknown>;
    firstSeen: string;
    lastActive: string;
    status: string;
  };
  events: {
    id: number;
    ts: string;
    type: string;
    summary: string | null;
    meta: Record<string, unknown>;
  }[];
}

// Postgres timestamps arrive as ISO strings with an explicit zone; rows
// migrated from the old SQLite store were naive UTC ("YYYY-MM-DD HH:MM:SS")
// and need a Z appended. Handle both.
export function parseUtc(ts: string): Date {
  return new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts.replace(" ", "T") + "Z");
}

export const EVENT_ICONS: Record<string, string> = {
  message_in: "→",
  message_out: "←",
  profile_update: "\u{1F4DD}",
  college_recommended: "\u{1F3EB}",
  deadline_alert: "⏰",
  follow_up_ping: "\u{1F44B}",
  live_lookup: "\u{1F50D}",
  cron_ping: "\u{1F550}",
  flag: "⚠️",
};
