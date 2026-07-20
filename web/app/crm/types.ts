export interface StatsResponse {
  students: number;
  activeToday: number;
  messages: number;
  voiceNotes: number;
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

export const EVENT_ICONS: Record<string, string> = {
  message_in: "→",
  message_out: "←",
  voice_note: "\u{1F3A4}",
  profile_update: "\u{1F4DD}",
  college_recommended: "\u{1F3EB}",
  deadline_alert: "⏰",
  live_lookup: "\u{1F50D}",
  cron_ping: "\u{1F550}",
  flag: "⚠️",
};
