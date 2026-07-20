"""Registers the two standing cron jobs (HANDOVER.md §3.3a/c) and seeds
the --script files they run.

Per-student jobs (§3.3b, exam-eve pings) are created dynamically by
memory_provider.py's _schedule_exam_eve_jobs() whenever a student's
exam date is learned — not here, since they're inherently per-student,
not standing/global jobs.

Idempotent: checks $HERMES_HOME/cron/jobs.json (the format `hermes cron
add` itself writes to, per the earlier architecture research) for a
job with the given name before creating it, so restarting the
container doesn't pile up duplicate jobs.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from .state import HERMES_HOME

_SEED_SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "disha" / "seed" / "scripts"
_JOBS_PATH = HERMES_HOME / "cron" / "jobs.json"

_DEADLINE_SWEEP_JOB = "disha-deadline-sweep"
_NIGHTLY_REFRESH_JOB = "disha-nightly-refresh"


def _existing_job_names() -> set[str]:
    if not _JOBS_PATH.exists():
        return set()
    try:
        data = json.loads(_JOBS_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return set()
    jobs = data.get("jobs", data) if isinstance(data, dict) else data
    if isinstance(jobs, dict):
        jobs = list(jobs.values())
    names = set()
    for job in jobs or []:
        if isinstance(job, dict) and job.get("name"):
            names.add(job["name"])
    return names


def seed_scripts() -> None:
    target_dir = HERMES_HOME / "scripts"
    target_dir.mkdir(parents=True, exist_ok=True)
    for src in _SEED_SCRIPTS_DIR.glob("*.py"):
        shutil.copy2(src, target_dir / src.name)


def seed_jobs() -> None:
    seed_scripts()
    existing = _existing_job_names()

    if _DEADLINE_SWEEP_JOB not in existing:
        subprocess.run(
            [
                "hermes", "cron", "add", "0 8 * * *", "",
                "--script", "deadline_sweep.py",
                "--no-agent",
                "--deliver", "local",
                "--name", _DEADLINE_SWEEP_JOB,
            ],
            capture_output=True, text=True, timeout=30,
        )

    if _NIGHTLY_REFRESH_JOB not in existing:
        subprocess.run(
            [
                "hermes", "cron", "add", "0 2 * * *", "",
                "--script", "nightly_refresh.py",
                "--no-agent",
                "--deliver", "local",
                "--name", _NIGHTLY_REFRESH_JOB,
            ],
            capture_output=True, text=True, timeout=30,
        )
