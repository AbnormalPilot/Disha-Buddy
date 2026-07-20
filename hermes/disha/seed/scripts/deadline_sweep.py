#!/usr/bin/env python3
"""Daily deadline sweep (HANDOVER.md §3.3a) — seeded to
$HERMES_HOME/scripts/deadline_sweep.py and run by a --no-agent cron job
(registered by control_plane/cron_seed.py) at 08:00 Asia/Kolkata.

Design note on WHY this dynamically creates per-student cron jobs
instead of messaging students directly: `hermes cron add`'s --deliver
target (origin | local | platform:chat_id) is a single, static target
fixed at job-creation time — confirmed by reading
hermes_cli/subcommands/cron.py's argparse help text, there is no
mechanism for one job to fan out to N different recipients based on
runtime logic. So this sweep job runs with --deliver local (it never
messages anyone directly) and, for each affected student, shells out
to `hermes cron add` to create a one-off, immediately-firing job
targeted at that specific student — staying entirely within the
documented single-target delivery model instead of guessing at an
unconfirmed fan-out capability.

This --no-agent script runs OUTSIDE the sandboxed conversational
agent's toolset restrictions (no LLM in the loop at all — "the script
IS the job"), so subprocess/shell access here is fine even though the
main chat agent has the terminal toolset permanently disabled.
"""
from __future__ import annotations

import subprocess
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/opt/hermes")
from disha import crm_client, student_store  # noqa: E402

URGENCY_WINDOW_HOURS = 72


def _parse_exam_date(value: str) -> datetime | None:
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


def find_affected_students() -> list[dict]:
    """Students with an entrance_exams date landing within the urgency
    window. Cache-first per AGENTS.md's Data discipline — this only
    reads locally stored profile data (§2.2's student_profile.entrance_exams),
    no live DataBlue calls. Live counseling-round-closure checks (the
    other half of HANDOVER.md §3.3a) need a per-college live lookup and
    are a follow-up once real DataBlue credentials are available to
    build and test that path against real data.
    """
    now = datetime.now(timezone.utc)
    deadline = now + timedelta(hours=URGENCY_WINDOW_HOURS)
    affected = []
    for student_id, profile in student_store.iter_all_profiles():
        for exam in profile.get("entrance_exams") or []:
            if not isinstance(exam, dict):
                continue
            exam_date = _parse_exam_date(exam.get("date", ""))
            if exam_date and now <= exam_date <= deadline:
                affected.append({"student_id": student_id, "exam": exam})
    return affected


def schedule_one_off_ping(student_id: str, exam: dict) -> None:
    exam_name = exam.get("name", "your exam")
    prompt = (
        f"Send {student_id} a short, warm heads-up (Hinglish, Disha's "
        f"voice) that {exam_name} is coming up within the next 72 hours. "
        f"Reference what you already know about them if relevant. Keep it "
        f"to one or two lines — this is a nudge, not an essay."
    )
    result = subprocess.run(
        [
            "hermes", "cron", "add", "1m", prompt,
            "--deliver", f"telegram:{student_id}",
            "--repeat", "1",
            "--name", f"disha-deadline-ping-{student_id}-{exam_name}"[:64],
        ],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        print(f"  FAILED to schedule ping for {student_id}: {result.stderr}", file=sys.stderr)
        return
    crm_client.log_event(student_id, "deadline_alert", f"{exam_name} within 72h — ping scheduled")


def main() -> None:
    affected = find_affected_students()
    print(f"deadline_sweep: {len(affected)} student(s) within the {URGENCY_WINDOW_HOURS}h window")
    for item in affected:
        schedule_one_off_ping(item["student_id"], item["exam"])


if __name__ == "__main__":
    main()
