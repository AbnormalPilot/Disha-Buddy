"""Per-Telegram-student memory provider.

Registered with Hermes as an external `MemoryProvider`
(agent/memory_provider.py) via a thin shim seeded onto the data volume
at $HERMES_HOME/plugins/disha-students/__init__.py — see
control_plane/persona.py's seed_memory_provider_if_absent() and
disha/docker/main-hermes-run's .pth setup for why this file can be
imported from there.

Why a custom provider instead of the built-in MEMORY.md/USER.md: this
product runs ONE shared Telegram bot / one Hermes profile for many
students (see HANDOVER.md §2's architecture decision), and Hermes's
built-in memory is scoped per-profile — every student would share the
same MEMORY.md/USER.md, leaking one student's facts into another's
session. The MemoryProvider ABC's "Single Provider Rule" means
activating this one (via `memory.provider: disha-students` in
config.yaml) fully supersedes the built-in memory tool rather than
running alongside it.

Injection mechanism: prefetch() is called before each turn and its
return value is injected into that turn's context (confirmed by reading
agent/memory_provider.py's docstring and the MemoryManager call sites).
sync_turn() is called after each turn to persist — here, that means
asking a small one-shot agent to extract a structured profile delta
(HANDOVER.md §2.2's student_profile schema) from the just-completed
exchange, merging it into disha/student_store.py, and mirroring to the
CRM via disha/crm_client.py.
"""
from __future__ import annotations

import json
import logging
import re
import subprocess
import threading
from typing import Any

from agent.memory_provider import MemoryProvider

from disha import crm_client, student_store

logger = logging.getLogger("disha.memory_provider")

_EXTRACTION_PROMPT_TEMPLATE = """You just had this exchange with a student:

Student: {user_content}
Disha: {assistant_content}

Extract ONLY genuinely new, factual details the student shared about themselves in
their message above — things like their name, class/year, board, marks/percentage,
stream, entrance exams and dates, budget, home state/district, city preference,
family constraints, interests, or language comfort. Do not infer or guess — only
things they actually stated.

Reply with ONLY a JSON object of the new facts (using these exact keys where
applicable: preferred_name, class_or_year, board, expected_or_actual_percent,
stream, entrance_exams, budget_per_year_inr, home_state, home_district,
preferred_cities_or_stay_home, family_constraints, interests_free_text,
language_comfort). Omit keys with nothing new to add. If nothing new was shared,
reply with exactly: {{}}

Do not include any text other than the JSON object."""


def _extract_json_object(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _run_extraction(telegram_user_id: str, user_content: str, assistant_content: str) -> None:
    """Runs in a background thread (see sync_turn's threading contract).
    Spawns a one-shot agent using the gateway's own resolved model/
    credentials — same pattern as the built-in BOOT.md hook tutorial —
    so this authenticates correctly against whatever provider the
    operator configured, custom endpoints included."""
    try:
        from gateway.run import _resolve_gateway_model, _resolve_runtime_agent_kwargs
        from run_agent import AIAgent

        prompt = _EXTRACTION_PROMPT_TEMPLATE.format(
            user_content=user_content[:2000], assistant_content=assistant_content[:2000]
        )
        agent = AIAgent(
            model=_resolve_gateway_model(),
            **_resolve_runtime_agent_kwargs(),
            platform="gateway",
            quiet_mode=True,
            skip_context_files=True,
            skip_memory=True,
            max_iterations=1,
        )
        result = agent.run_conversation(prompt)
        response = (result.get("final_response", "") or "").strip()
        delta = _extract_json_object(response)
        if not delta:
            return
        profile = student_store.merge_profile(telegram_user_id, delta)
        crm_client.upsert_student(telegram_user_id, profile=profile)
        crm_client.log_event(
            telegram_user_id, "profile_update", f"learned: {', '.join(delta.keys())}", meta=delta
        )
        if "entrance_exams" in delta:
            _schedule_exam_eve_jobs(telegram_user_id, delta["entrance_exams"])
    except Exception:
        logger.exception("profile extraction failed for student %s", telegram_user_id)


def _schedule_exam_eve_jobs(telegram_user_id: str, entrance_exams) -> None:
    """HANDOVER.md §3.3b: per-student exam-eve good-luck + next-day
    "how did it go?". Runs in the same background thread as extraction
    (sync_turn's threading contract already covers this — no separate
    thread needed). Uses subprocess, which is fine here: this executes
    from the memory-provider's background thread, not the sandboxed
    conversational agent loop, so it isn't affected by the terminal
    toolset being disabled for students.
    """
    if not isinstance(entrance_exams, list):
        return
    for exam in entrance_exams:
        if not isinstance(exam, dict) or not exam.get("date") or not exam.get("name"):
            continue
        exam_name = exam["name"]
        exam_date = exam["date"]  # YYYY-MM-DD, as the extraction prompt requests
        job_base = f"disha-exam-{telegram_user_id}-{exam_name}"[:60]
        try:
            subprocess.run(
                [
                    "hermes", "cron", "add",
                    f"1 18 {_day_before(exam_date)}",
                    (
                        f"Send {telegram_user_id} a short, warm good-luck message "
                        f"(Hinglish, Disha's voice) for {exam_name} tomorrow."
                    ),
                    "--deliver", f"telegram:{telegram_user_id}",
                    "--repeat", "1",
                    "--name", f"{job_base}-eve",
                ],
                capture_output=True, text=True, timeout=30,
            )
            subprocess.run(
                [
                    "hermes", "cron", "add",
                    f"1 20 {_day_of(exam_date)}",
                    (
                        f"Send {telegram_user_id} a short, warm check-in (Hinglish, "
                        f"Disha's voice) asking how {exam_name} went today."
                    ),
                    "--deliver", f"telegram:{telegram_user_id}",
                    "--repeat", "1",
                    "--name", f"{job_base}-followup",
                ],
                capture_output=True, text=True, timeout=30,
            )
        except Exception:
            logger.exception("failed to schedule exam-eve jobs for %s / %s", telegram_user_id, exam_name)


def _day_before(iso_date: str) -> str:
    from datetime import datetime, timedelta

    d = datetime.strptime(iso_date, "%Y-%m-%d") - timedelta(days=1)
    return d.strftime("%d %m *")  # cron day/month fields, matching "M H day month *"


def _day_of(iso_date: str) -> str:
    from datetime import datetime

    d = datetime.strptime(iso_date, "%Y-%m-%d")
    return d.strftime("%d %m *")


class DishaStudentMemory(MemoryProvider):
    @property
    def name(self) -> str:
        return "disha-students"

    def is_available(self) -> bool:
        return True

    def initialize(self, session_id: str, **kwargs: Any) -> None:
        self._session_id = session_id
        self._user_id = kwargs.get("user_id") or ""
        self._platform = kwargs.get("platform") or ""
        # Only operate for real student-facing turns — cron system prompts
        # and subagent contexts have no student to key off of, and writing
        # there would corrupt real student profiles (see the ABC's own
        # warning in agent/memory_provider.py's initialize() docstring).
        agent_context = kwargs.get("agent_context") or "primary"
        self._active = agent_context == "primary" and bool(self._user_id)
        if self._active:
            # Lets the transform_llm_output hook (disha-events plugin,
            # safety-flag detection) resolve student_id from session_id,
            # since that hook isn't given user_id directly.
            student_store.set_session_mapping(session_id, self._user_id)

    def get_tool_schemas(self) -> list[dict]:
        return []

    def handle_tool_call(self, tool_name: str, args: dict, **kwargs: Any) -> str:
        raise NotImplementedError(f"disha-students exposes no tools (got {tool_name!r})")

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        if not self._active:
            return ""
        profile = student_store.get_profile(self._user_id)
        return student_store.format_for_context(profile)

    def sync_turn(
        self,
        user_content: str,
        assistant_content: str,
        *,
        session_id: str = "",
        messages: list[dict] | None = None,
    ) -> None:
        if not self._active or not user_content.strip():
            return
        threading.Thread(
            target=_run_extraction,
            args=(self._user_id, user_content, assistant_content),
            daemon=True,
            name="disha-profile-extract",
        ).start()

    def on_session_switch(
        self,
        new_session_id: str,
        *,
        parent_session_id: str = "",
        reset: bool = False,
        rewound: bool = False,
        **kwargs: Any,
    ) -> None:
        self._session_id = new_session_id


def register(ctx) -> None:
    ctx.register_memory_provider(DishaStudentMemory())
