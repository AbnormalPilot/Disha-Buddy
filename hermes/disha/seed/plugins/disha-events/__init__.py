"""Seeded verbatim to $HERMES_HOME/plugins/disha-events/__init__.py by
control_plane/plugin_seed.py.

Fires CRM `message_in` / `voice_note` events for every inbound message
(HANDOVER.md §2.2.1 / §6.2's events schema).

Registered as a generic plugin hook (pre_gateway_dispatch), NOT a
gateway hook (~/.hermes/hooks/), because gateway hooks' agent:start
context doesn't include the raw MessageEvent.message_type field, and
that's the only reliable, pre-transcription signal for "was this a
voice note" — confirmed by reading gateway/run.py: line ~12798 checks
`event.message_type == MessageType.VOICE` internally, but the
agent:start hook_ctx dict built earlier in the same file (~line 11310)
never forwards that field. pre_gateway_dispatch receives the raw event
directly. Purely observational here — always returns None, never
skips or rewrites the message.

Generic plugins are opt-in (plugins.enabled in config.yaml) — unlike
the disha-students memory provider, which activates via memory.provider
and bypasses that gate entirely. control_plane/config_writer.py adds
"disha-events" to plugins.enabled on every /config save.
"""
import re

from disha import crm_client, student_store

_FLAG_PATTERN = re.compile(r"\[DISHA_FLAG:([^\]]+)\]\s*$")


def on_inbound_message(event, gateway=None, session_store=None, **kwargs):
    try:
        if getattr(event, "internal", False):
            return None
        source = getattr(event, "source", None)
        student_id = getattr(source, "user_id", None) if source else None
        if not student_id:
            return None

        message_type = getattr(event, "message_type", None)
        is_voice = getattr(message_type, "value", None) == "voice"
        text = event.text or ""

        crm_client.log_event(
            student_id,
            "message_in",
            text[:200] if text else "(voice note)",
            meta={"is_voice": is_voice, "length": len(text)},
        )
        if is_voice:
            crm_client.log_event(student_id, "voice_note", "voice note received")
    except Exception:
        pass  # never let CRM logging break message delivery
    return None


def on_final_response(response_text, session_id="", model="", platform="", **kwargs):
    """Detects the `[DISHA_FLAG:reason]` marker AGENTS.md instructs the
    model to append when a safety rail triggers (distress, guaranteed-
    admission ask refused, etc — see AGENTS.md's Safety rails section),
    strips it before the student sees it, and logs a `flag` CRM event.

    transform_llm_output doesn't pass sender_id/user_id directly
    (confirmed by reading its call site, agent/turn_finalizer.py) — only
    session_id — so the student is resolved via the session_map table
    the memory provider populates in initialize(). Returns None (leave
    text unchanged) whenever there's no marker, which is the common case.
    """
    if not response_text:
        return None
    match = _FLAG_PATTERN.search(response_text)
    if not match:
        return None
    try:
        reason = match.group(1).strip()
        cleaned = _FLAG_PATTERN.sub("", response_text).rstrip()
        student_id = student_store.get_user_id_for_session(session_id)
        if student_id:
            crm_client.log_event(student_id, "flag", reason)
        return cleaned
    except Exception:
        return None


def register(ctx) -> None:
    ctx.register_hook("pre_gateway_dispatch", on_inbound_message)
    ctx.register_hook("transform_llm_output", on_final_response)
