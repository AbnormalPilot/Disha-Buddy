#!/usr/bin/env python3
"""Daily engagement follow-up sweep — seeded to
$HERMES_HOME/scripts/follow_up_sweep.py and run by a --no-agent cron job
(registered by control_plane/cron_seed.py) at 18:30 Asia/Kolkata, when
students are typically free after school/coaching.

Same fan-out architecture as deadline_sweep.py: this script never
messages anyone itself. It selects students who genuinely warrant a
check-in, then creates a one-off agent cron job per student
(--deliver telegram:<id>), so the actual message is written by the
agent with that student's memory in context.

Selection (and every anti-pushy guard: idle 3..21 days only, one
follow-up per student per week, skip recently-alerted and
recently-flagged students, 15-per-run cap) lives in the web app's
GET /api/students/follow-up-candidates — the web app is the only
process that talks to the database (Neon Postgres), so this script
just asks it who qualifies and schedules the per-student agent jobs.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone

import httpx

sys.path.insert(0, "/opt/hermes")
from disha import crm_client  # noqa: E402

# Profile keys whose absence is worth a gentle question (one at a time).
PROFILE_GAPS = [
    ("marks", "their 12th/board marks or expected percentage"),
    ("stream", "which stream they're in (PCM/PCB/commerce/arts)"),
    ("budget", "their yearly budget for college"),
    ("preferred_locations", "where they'd want to study"),
]


def _select_candidates() -> list[dict]:
    try:
        resp = httpx.get(
            f"{crm_client.WEB_URL}/api/students/follow-up-candidates",
            headers={"X-Ingest-Token": crm_client.CRM_INGEST_TOKEN},
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json().get("candidates", [])
    except (httpx.HTTPError, ValueError) as exc:
        print(f"follow_up_sweep: candidate fetch failed: {exc}", file=sys.stderr)
        return []


def _reason_for(profile: dict, idle_days: int) -> str:
    """One concrete, checkable reason per ping. The agent gets the reason,
    not a blank 'engage this user' directive — that's what keeps the
    message specific instead of generic re-engagement spam."""
    for key, description in PROFILE_GAPS:
        if not profile.get(key):
            return (
                f"You still don't know {description}. If it comes up "
                f"naturally, ask about that one thing (just that one)."
            )
    exams = profile.get("entrance_exams") or []
    if exams:
        names = ", ".join(
            e.get("name", "") for e in exams if isinstance(e, dict) and e.get("name")
        )
        if names:
            return (
                f"They have {names} coming up. Ask how prep is going, "
                f"or share one genuinely useful, dated fact if you have one."
            )
    return (
        "No specific gap — just check in on whatever mattered in your "
        "last conversation with them."
    )


def schedule_follow_up(student: dict) -> None:
    profile = {}
    try:
        profile = json.loads(student.get("profile_json") or "{}")
    except json.JSONDecodeError:
        pass
    idle_days = int(student.get("idle_days") or 0)
    month = datetime.now(timezone.utc).strftime("%B")
    prompt = (
        f"Follow up with student {student['id']} in Disha's voice (Hinglish is "
        f"fine, match how they usually write). They last chatted {idle_days} days "
        f"ago; it's {month}, so be aware of where the admission cycle is. "
        f"{_reason_for(profile, idle_days)} "
        f"Hard rules: 1-2 lines max, at most one question, warm and casual, "
        f"never mention this is scheduled or automated, no guilt-tripping about "
        f"the silence, and no made-up facts, dates, or deadlines."
    )
    result = subprocess.run(
        [
            "hermes", "cron", "add", "1m", prompt,
            "--deliver", f"telegram:{student['id']}",
            "--repeat", "1",
            "--name", f"disha-follow-up-{student['id']}"[:64],
        ],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        print(f"  FAILED to schedule follow-up for {student['id']}: {result.stderr}", file=sys.stderr)
        return
    crm_client.log_event(
        student["id"], "follow_up_ping", f"follow-up scheduled after {idle_days}d idle"
    )


def main() -> None:
    candidates = _select_candidates()
    print(f"follow_up_sweep: {len(candidates)} student(s) selected for follow-up")
    for student in candidates:
        schedule_follow_up(student)


if __name__ == "__main__":
    main()
