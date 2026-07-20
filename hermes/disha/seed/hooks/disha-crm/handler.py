"""Seeded verbatim to $HERMES_HOME/hooks/disha-crm/handler.py by
control_plane/plugin_seed.py.

Logs message_out (a normal reply) and cron_ping (a proactive message
triggered by the scheduler — cron turns run with platform == "cron",
per HANDOVER.md §3.3 and confirmed by the earlier architecture
research pass) CRM events. Gateway hooks (this file) run automatically
with no plugins.enabled opt-in needed — see disha-events for the
generic-plugin half (voice detection, safety flags), which does need
that opt-in.
"""
from disha import crm_client


async def handle(event_type: str, context: dict) -> None:
    if event_type != "agent:end":
        return
    student_id = context.get("user_id")
    if not student_id:
        return
    response = (context.get("response") or "")[:200]
    platform = context.get("platform") or ""
    if platform == "cron":
        crm_client.log_event(student_id, "cron_ping", response or "(proactive message sent)")
    else:
        crm_client.log_event(student_id, "message_out", response or "(reply sent)")
