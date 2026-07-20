"""Per-Telegram-student profile store, local to the hermes container.

This is what actually gets injected into a student's conversation (via
the disha-students memory provider's prefetch()). It's separate from the
CRM's copy (web-owned, /data/crm.sqlite, an ops/analytics mirror of
one-line event summaries) — this file is the source of truth for what a
student's context looks like. Every write here also fires a best-effort
mirror to the CRM via crm_client.upsert_student(), but the CRM being
briefly out of sync never blocks or corrupts what a student sees.

Schema follows the student_profile fields from HANDOVER.md §2.2 —
loosely: any of those keys, plus a free-text ``_notes`` catch-all for
things that don't fit a named field.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from pathlib import Path

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/data/hermes-home"))
DB_PATH = HERMES_HOME / "disha" / "students.sqlite"

_lock = threading.Lock()

_SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    telegram_user_id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT,
    profile_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT
);
"""

# Keys worth surfacing by name in the injected context, in a sensible
# reading order. Anything else in profile_json still gets included, just
# after these, in insertion order.
_PROFILE_KEY_ORDER = [
    "preferred_name", "class_or_year", "board", "expected_or_actual_percent",
    "stream", "entrance_exams", "budget_per_year_inr", "home_state",
    "home_district", "preferred_cities_or_stay_home", "family_constraints",
    "interests_free_text", "language_comfort", "category_if_volunteered",
]


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute(_SCHEMA)
    return conn


def get_profile(telegram_user_id: str) -> dict:
    if not telegram_user_id:
        return {}
    with _lock:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT profile_json FROM students WHERE telegram_user_id = ?",
                (telegram_user_id,),
            ).fetchone()
        finally:
            conn.close()
    if not row or not row[0]:
        return {}
    try:
        return json.loads(row[0])
    except json.JSONDecodeError:
        return {}


def merge_profile(
    telegram_user_id: str,
    delta: dict,
    *,
    name: str | None = None,
    username: str | None = None,
) -> dict:
    """Merges `delta` into the stored profile (shallow update, non-empty
    values only) and returns the resulting full profile."""
    if not telegram_user_id:
        return {}
    with _lock:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT profile_json FROM students WHERE telegram_user_id = ?",
                (telegram_user_id,),
            ).fetchone()
            current = {}
            if row and row[0]:
                try:
                    current = json.loads(row[0])
                except json.JSONDecodeError:
                    current = {}
            for key, value in delta.items():
                if value not in (None, "", [], {}):
                    current[key] = value
            conn.execute(
                """
                INSERT INTO students (telegram_user_id, name, username, profile_json, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'))
                ON CONFLICT(telegram_user_id) DO UPDATE SET
                    profile_json = excluded.profile_json,
                    name = COALESCE(excluded.name, students.name),
                    username = COALESCE(excluded.username, students.username),
                    updated_at = excluded.updated_at
                """,
                (telegram_user_id, name, username, json.dumps(current)),
            )
            conn.commit()
        finally:
            conn.close()
    return current


def format_for_context(profile: dict) -> str:
    """Formats a profile dict as short, plain-text context for injection
    into a turn via the memory provider's prefetch(). Deliberately terse —
    this gets prepended to every first-turn-of-session message."""
    if not profile:
        return ""
    lines = []
    seen = set()
    for key in _PROFILE_KEY_ORDER:
        if key in profile and profile[key] not in (None, "", [], {}):
            lines.append(f"- {key.replace('_', ' ')}: {profile[key]}")
            seen.add(key)
    for key, value in profile.items():
        if key not in seen and value not in (None, "", [], {}):
            lines.append(f"- {key.replace('_', ' ')}: {value}")
    if not lines:
        return ""
    return "Known facts about this student from previous conversations:\n" + "\n".join(lines)
