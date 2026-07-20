import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DATABASE_PATH ?? "/data/crm.sqlite";

// A module-level singleton avoids re-opening the file (and re-running the
// schema DDL) on every hot-reloaded request in dev, and on every serverless
// invocation in prod. globalThis survives Next.js's module cache resets.
declare global {
  // eslint-disable-next-line no-var
  var __dishaDb: Database.Database | undefined;
}

function init(): Database.Database {
  // Deferred to first real use, not module load: `next build` statically
  // imports every route module to collect page data, which would run this
  // against the default /data path (unwritable/nonexistent outside the
  // container) even during a local build with no DATABASE_PATH set.
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT,
      username TEXT,
      profile_json TEXT NOT NULL DEFAULT '{}',
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_active TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      type TEXT NOT NULL,
      summary TEXT,
      meta_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_events_student_id ON events(student_id);
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__dishaDb) {
    globalThis.__dishaDb = init();
  }
  return globalThis.__dishaDb;
}

// type: message_in|message_out|voice_note|profile_update|
//       college_recommended|deadline_alert|live_lookup|cron_ping|flag
export const EVENT_TYPES = [
  "message_in",
  "message_out",
  "voice_note",
  "profile_update",
  "college_recommended",
  "deadline_alert",
  "live_lookup",
  "cron_ping",
  "flag",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
