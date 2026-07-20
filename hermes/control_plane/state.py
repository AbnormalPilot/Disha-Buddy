"""Shared paths and constants for the control plane."""
import os
from pathlib import Path

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/data/hermes-home"))
CONFIG_DIR = Path(os.environ.get("DISHA_CONFIG_DIR", "/data/config"))
WIZARD_CONFIG_PATH = CONFIG_DIR / "wizard.json"
CONTROL_STATE_PATH = CONFIG_DIR / "control_state.json"

# Hermes profiles default to "default" (== $HERMES_HOME itself) when a
# container runs a single profile, which is our whole architecture: one
# shared Telegram bot token, one profile, per-student isolation handled
# ourselves in disha/ rather than via Hermes's per-profile mechanism.
PROFILE = "default"
GATEWAY_LOG_DIR = HERMES_HOME / "logs" / "gateways" / PROFILE

CONTROL_TOKEN = os.environ.get("CONTROL_TOKEN", "")

SECRET_KEY_SUBSTRINGS = ("key", "token", "secret", "password", "authorization")


def ensure_dirs() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    HERMES_HOME.mkdir(parents=True, exist_ok=True)
