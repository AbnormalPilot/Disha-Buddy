"""Wraps Hermes's own DM pairing store (gateway/pairing.py) so the
/hermes control room can approve waiting students without a terminal —
closing the one gap left in the "no CLI" operator experience (the
wizard/gateway lifecycle already had no CLI step; ad-hoc pairing
approval was the last thing still requiring `docker exec ... hermes
pairing approve ...`).

Also fixes a related rough edge: Hermes shows a one-time "no home
channel is set" nudge to every user's first message on a platform
until TELEGRAM_HOME_CHANNEL is set (gateway/run.py, cron/scheduler.py's
_HOME_TARGET_ENV_VARS) — which, left unset, means EVERY new student's
first "hi" gets an internal system notice before Disha ever replies.
Our own cron jobs never rely on the home-channel delivery fallback
(they always specify an explicit --deliver target), so we don't need a
real value for our own functionality — but approving someone here is
the first point where we have a genuine, real chat_id to use, so we
set it opportunistically on the first approval if nothing's set yet.
"""
from __future__ import annotations

from gateway.pairing import PairingStore

from .config_writer import set_env_var

_HOME_CHANNEL_ENV = "TELEGRAM_HOME_CHANNEL"


def _store() -> PairingStore:
    # No `profile=` — this deployment always runs the single "default"
    # profile (== HERMES_HOME itself), matching the rest of control_plane.
    return PairingStore()


def list_pending() -> list[dict]:
    return _store().list_pending("telegram")


def approve(code: str) -> dict | None:
    """Approves a pairing code. Returns {user_id, user_name} on success,
    None if the code is invalid/expired/locked out."""
    result = _store().approve_code("telegram", code)
    if result and result.get("user_id"):
        _set_home_channel_if_unset(result["user_id"])
    return result


def _set_home_channel_if_unset(chat_id: str) -> None:
    """See config_writer.set_env_var's docstring for why this can't go
    through `hermes config set`.

    Takes effect on the gateway's next restart, not instantly — a running
    process already has its environment loaded and won't pick up a
    same-file .env change until it restarts. That's an acceptable
    trade-off for a one-time cosmetic nudge; forcibly restarting a live
    gateway as a side effect of approving one pairing request would be
    far more disruptive than it's worth.
    """
    from hermes_cli.config import get_env_value

    if get_env_value(_HOME_CHANNEL_ENV):
        return
    try:
        set_env_var(_HOME_CHANNEL_ENV, str(chat_id))
    except Exception:
        pass  # best-effort — a missed home-channel set is a minor nudge, not a functional break
