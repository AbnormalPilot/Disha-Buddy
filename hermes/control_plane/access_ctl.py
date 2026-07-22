"""Open-access toggle for the Telegram bot.

TELEGRAM_ALLOW_ALL_USERS is the per-platform allow-all flag checked FIRST
in gateway/authz_mixin.py's _is_user_authorized — before allowlists and
pairing — so "true" admits every Telegram sender and "false" falls back
to the default pairing/allowlist policy (existing pairing approvals keep
working). It lives in Hermes's .env, not config.yaml: the gateway reads
it via os.getenv, and set_env_var's docstring in config_writer explains
why `hermes config set` would misroute such keys into config.yaml.

The gateway process snapshots .env into os.environ at startup, so a
toggle only takes effect after a gateway restart — set_open() does that
automatically when the gateway is running.
"""
from __future__ import annotations

from . import gateway_ctl

ACCESS_ENV_KEY = "TELEGRAM_ALLOW_ALL_USERS"
# Mirrors the truthy set authz_mixin accepts for allow-all flags.
_TRUTHY = {"true", "1", "yes"}


def is_open() -> bool:
    # prefer_dotenv: a deliberate toggle edit to .env must win over a stale
    # value inherited by this control-plane process's own environment.
    from hermes_cli.config import get_env_value_prefer_dotenv

    value = get_env_value_prefer_dotenv(ACCESS_ENV_KEY) or ""
    return value.strip().lower() in _TRUTHY


def set_open(allow_all: bool) -> bool:
    """Persists the flag and applies it. Returns True if the gateway was
    restarted to pick it up (False when it wasn't running).

    Raises gateway_ctl.GatewayCommandError if the restart fails — the
    flag is already persisted then, so the next start still honors it.
    """
    from hermes_cli.config import save_env_value

    save_env_value(ACCESS_ENV_KEY, "true" if allow_all else "false")
    running, _pid = gateway_ctl.is_running()
    if running:
        gateway_ctl.restart()
        return True
    return False
