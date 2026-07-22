import { Pool } from "pg";

// Neon Postgres is the single source of truth for CRM data — shared by the
// whole team, no local volume needed. The connection string comes from
// DATABASE_URL (compose maps NEON_CONNECTION_STRING onto it). node-postgres
// honors the ?sslmode=require in Neon's URL.
const CONNECTION_STRING = process.env.DATABASE_URL ?? process.env.NEON_CONNECTION_STRING ?? "";

// A module-level singleton avoids re-opening a pool (and re-running the
// schema DDL) on every hot-reloaded request in dev. globalThis survives
// Next.js's module cache resets.
declare global {
  // eslint-disable-next-line no-var
  var __dishaPg: { pool: Pool; ready: Promise<unknown> } | undefined;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT,
    profile_json TEXT NOT NULL DEFAULT '{}',
    first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    type TEXT NOT NULL,
    summary TEXT,
    meta_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_events_student_id ON events(student_id);
  CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
`;

function getPg(): { pool: Pool; ready: Promise<unknown> } {
  if (!globalThis.__dishaPg) {
    // Deferred to first real use, not module load: `next build` statically
    // imports every route module to collect page data, which would need a
    // reachable database even during a local build.
    if (!CONNECTION_STRING) {
      throw new Error("DATABASE_URL (or NEON_CONNECTION_STRING) is not set");
    }
    const pool = new Pool({ connectionString: CONNECTION_STRING, max: 5 });
    globalThis.__dishaPg = { pool, ready: pool.query(SCHEMA) };
  }
  return globalThis.__dishaPg;
}

/** Run a parameterized query; resolves to the result rows. */
export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { pool, ready } = getPg();
  await ready;
  const res = await pool.query(text, params as never[]);
  return res.rows as T[];
}

// type: message_in|message_out|profile_update|
//       college_recommended|deadline_alert|live_lookup|cron_ping|flag|follow_up_ping
export const EVENT_TYPES = [
  "message_in",
  "message_out",
  "profile_update",
  "college_recommended",
  "deadline_alert",
  "live_lookup",
  "cron_ping",
  "flag",
  "follow_up_ping",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
