#!/usr/bin/env node
// One-time migration: copies the old /data/crm.sqlite CRM store into Neon
// Postgres. Idempotent-by-refusal: aborts if the target already has rows,
// unless --force is passed (which still uses ON CONFLICT DO NOTHING for
// students, so re-running cannot clobber newer data).
//
// Usage (from web/):
//   NEON_CONNECTION_STRING=postgres://... node scripts/migrate-sqlite-to-neon.mjs [path/to/crm.sqlite] [--force]
import Database from "better-sqlite3";
import pg from "pg";

const args = process.argv.slice(2).filter((a) => a !== "--force");
const force = process.argv.includes("--force");
const SQLITE_PATH = args[0] ?? "../data/crm.sqlite";
const URL = process.env.DATABASE_URL ?? process.env.NEON_CONNECTION_STRING;
if (!URL) {
  console.error("Set NEON_CONNECTION_STRING (or DATABASE_URL) first.");
  process.exit(1);
}

// Old SQLite rows are a mix of naive-UTC "YYYY-MM-DD HH:MM:SS" (from
// datetime('now') defaults) and full ISO strings (from JS inserts).
// Normalize everything to ISO-with-Z so Postgres parses them as UTC.
function normTs(ts) {
  if (!ts) return new Date().toISOString();
  return /[zZ]$|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts.replace(" ", "T") + "Z";
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

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const pool = new pg.Pool({ connectionString: URL, max: 3 });

const students = sqlite.prepare("SELECT * FROM students ORDER BY first_seen").all();
const events = sqlite.prepare("SELECT * FROM events ORDER BY id").all();
console.log(`source: ${students.length} students, ${events.length} events (${SQLITE_PATH})`);

await pool.query(SCHEMA);

const { rows: [{ n }] } = await pool.query("SELECT COUNT(*)::int AS n FROM events");
if (n > 0 && !force) {
  console.error(`target already has ${n} events; pass --force to migrate anyway.`);
  await pool.end();
  process.exit(1);
}

for (const s of students) {
  await pool.query(
    `INSERT INTO students (id, name, username, profile_json, first_seen, last_active, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [s.id, s.name, s.username, s.profile_json ?? "{}", normTs(s.first_seen), normTs(s.last_active), s.status ?? "active"],
  );
}
for (const e of events) {
  await pool.query(
    `INSERT INTO events (student_id, ts, type, summary, meta_json) VALUES ($1, $2, $3, $4, $5)`,
    [e.student_id, normTs(e.ts), e.type, e.summary, e.meta_json ?? "{}"],
  );
}

const check = await pool.query(
  "SELECT (SELECT COUNT(*)::int FROM students) AS students, (SELECT COUNT(*)::int FROM events) AS events",
);
console.log(`target now: ${check.rows[0].students} students, ${check.rows[0].events} events`);
await pool.end();
sqlite.close();
console.log("done.");
