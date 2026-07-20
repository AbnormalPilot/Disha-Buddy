"""Fire-and-forget client for the web container's CRM ingest API.

Used by the memory provider (student profile mirror) and by CRM event
hooks (HANDOVER.md §2.2.1). Every call spawns a daemon thread and never
raises into the caller — a CRM outage must never block or crash a
student's conversation. Failed sends are appended to a disk-backed queue
and retried opportunistically on the next send() call (simple, no extra
process; fine at pilot scale).
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from pathlib import Path

import httpx

logger = logging.getLogger("disha.crm_client")

WEB_URL = os.environ.get("WEB_URL", "http://web:3000").rstrip("/")
CRM_INGEST_TOKEN = os.environ.get("CRM_INGEST_TOKEN", "")
HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/data/hermes-home"))
QUEUE_PATH = HERMES_HOME / "disha" / "crm_retry_queue.jsonl"

_TIMEOUT = 5.0
_queue_lock = threading.Lock()


def _post(path: str, payload: dict) -> bool:
    try:
        resp = httpx.post(
            f"{WEB_URL}{path}",
            json=payload,
            headers={"X-Ingest-Token": CRM_INGEST_TOKEN, "Content-Type": "application/json"},
            timeout=_TIMEOUT,
        )
        return resp.status_code < 400
    except httpx.HTTPError as exc:
        logger.warning("CRM POST %s failed: %s", path, exc)
        return False


def _enqueue(path: str, payload: dict) -> None:
    QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _queue_lock, open(QUEUE_PATH, "a") as f:
        f.write(json.dumps({"path": path, "payload": payload, "queued_at": time.time()}) + "\n")


def _drain_queue() -> None:
    if not QUEUE_PATH.exists():
        return
    with _queue_lock:
        try:
            lines = QUEUE_PATH.read_text().splitlines()
        except OSError:
            return
        try:
            QUEUE_PATH.unlink()
        except OSError:
            pass
    remaining = []
    for line in lines:
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not _post(item["path"], item["payload"]):
            remaining.append(line)
    if remaining:
        with _queue_lock, open(QUEUE_PATH, "a") as f:
            f.write("\n".join(remaining) + "\n")


def send(path: str, payload: dict) -> None:
    """Fire-and-forget POST to the CRM API. Never raises."""

    def _run() -> None:
        try:
            _drain_queue()
            if not _post(path, payload):
                _enqueue(path, payload)
        except Exception:
            logger.exception("CRM send() background thread crashed for %s", path)

    threading.Thread(target=_run, daemon=True, name="crm-send").start()


def log_event(student_id: str, event_type: str, summary: str, meta: dict | None = None) -> None:
    """type: one of message_in|message_out|voice_note|profile_update|
    college_recommended|deadline_alert|live_lookup|cron_ping|flag
    (see HANDOVER.md §6.2's events table)."""
    if not student_id:
        return
    send(
        "/api/events",
        {"student_id": student_id, "type": event_type, "summary": summary, "meta": meta or {}},
    )


def upsert_student(
    student_id: str,
    *,
    name: str | None = None,
    username: str | None = None,
    profile: dict | None = None,
) -> None:
    if not student_id:
        return
    send(
        "/api/students/upsert",
        {"id": student_id, "name": name, "username": username, "profile": profile or {}},
    )
