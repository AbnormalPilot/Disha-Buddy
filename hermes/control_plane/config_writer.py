"""Translates the /hermes wizard payload into Hermes's own config store.

We deliberately don't hand-write config.yaml / .env ourselves. Hermes
ships `hermes config set KEY VAL`, which already knows the schema and
auto-routes secrets to .env vs everything else to config.yaml (see
website/docs/user-guide/configuration.md). We just call it. This also
means a future upstream config-schema change mostly stays compatible
with us for free.

Provider mapping note: this fork's model.provider enum doesn't include
a plain "openai" value (see hermes_cli/models.py _PROVIDER_ALIASES) —
direct OpenAI access goes through provider "custom" with an explicit
base_url. We fold that mapping in here so the wizard can still offer a
plain "OpenAI" choice without the operator needing to know that.
"""
from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass, field

from .state import WIZARD_CONFIG_PATH, ensure_dirs

HERMES_BIN = "hermes"
_SUBPROCESS_TIMEOUT = 20

PROVIDER_BASE_URL = {
    "openai": "https://api.openai.com/v1",
}
PROVIDER_HERMES_NAME = {
    "openai": "custom",
    "openrouter": "openrouter",
    "anthropic": "anthropic",
    "nous": "nous-api",
    "custom": "custom",
}
# Built-in providers resolve credentials from a dedicated env var, NOT from
# model.api_key in config.yaml — confirmed by reading
# hermes_cli/config.py's clear_model_endpoint_credentials(): "model.api_key
# is valid only for explicit custom endpoint assignments. Built-in
# providers resolve credentials from env vars, auth.json, or the credential
# pool." Providers without an entry here (custom, and our "openai" ->
# custom mapping) fall back to model.api_key, which IS honored for those.
PROVIDER_API_KEY_ENV = {
    "openrouter": "OPENROUTER_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "nous": "NOUS_API_KEY",
}

TRANSCRIPTION_PROVIDERS = {"groq", "openai", "mistral", "xai", "local"}


class ConfigWriteError(RuntimeError):
    def __init__(self, key: str, returncode: int, output: str):
        self.key = key
        self.returncode = returncode
        self.output = output
        super().__init__(f"hermes config set {key} failed ({returncode}): {output[:1000]}")


def _set_disabled_toolsets(toolsets: list[str]) -> None:
    """Sets agent.disabled_toolsets as a real YAML list.

    `hermes config set` can't do this: its value parser only coerces
    bool/int/float (hermes_cli/config.py:set_config_value), so a JSON-
    looking string like '["terminal"]' is stored as a literal string, not
    a list. Its nested-path form (agent.disabled_toolsets.0 ...) can't
    create a list from scratch either — `_set_nested`'s own docstring says
    "we do not grow lists... the referenced index must already exist".
    So for this one list-typed, safety-critical key (it's how we
    permanently block shell/terminal access for a minors-facing product)
    we do a direct read-modify-write using Hermes's own YAML helpers —
    the same ones set_config_value uses internally — instead of shelling
    out to a CLI that can't express the value we need.
    """
    from hermes_cli.config import ensure_hermes_home, get_config_path
    from utils import atomic_yaml_write, fast_safe_load

    config_path = get_config_path()
    user_config: dict = {}
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            user_config = fast_safe_load(f) or {}
    agent_cfg = user_config.setdefault("agent", {})
    if not isinstance(agent_cfg, dict):
        agent_cfg = {}
        user_config["agent"] = agent_cfg
    agent_cfg["disabled_toolsets"] = list(toolsets)
    ensure_hermes_home()
    atomic_yaml_write(config_path, user_config, sort_keys=False)


def _clear_stale_model_api_key() -> None:
    """Removes a leftover inline model.api_key/api_mode when switching to a
    named provider (openrouter/anthropic/nous) that authenticates via env
    var instead. Reuses hermes_cli.config.clear_model_endpoint_credentials
    — the exact function upstream wrote for this scenario ("leaving these
    fields behind keeps secrets in config.yaml and can contaminate later
    custom resolution paths"). Only touches the file when there's actually
    something to clear.
    """
    from hermes_cli.config import clear_model_endpoint_credentials, get_config_path
    from utils import atomic_yaml_write, fast_safe_load

    config_path = get_config_path()
    if not config_path.exists():
        return
    with open(config_path, encoding="utf-8") as f:
        user_config = fast_safe_load(f) or {}
    model_cfg = user_config.get("model")
    if not isinstance(model_cfg, dict) or ("api_key" not in model_cfg and "api_mode" not in model_cfg):
        return
    clear_model_endpoint_credentials(model_cfg, clear_api_key=True, clear_api_mode=True, clear_base_url=False)
    atomic_yaml_write(config_path, user_config, sort_keys=False)


def _config_set(key: str, value: str) -> None:
    try:
        result = subprocess.run(
            [HERMES_BIN, "config", "set", key, value],
            capture_output=True,
            text=True,
            timeout=_SUBPROCESS_TIMEOUT,
        )
    except subprocess.TimeoutExpired as exc:
        raise ConfigWriteError(key, -1, f"timed out: {exc}") from exc
    if result.returncode != 0:
        raise ConfigWriteError(key, result.returncode, (result.stdout or "") + (result.stderr or ""))


@dataclass
class WizardPayload:
    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None

    llm_provider: str | None = None  # openai | openrouter | anthropic | nous | custom
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None  # only required/used when llm_provider == "custom"

    transcription_provider: str | None = None  # groq | openai | mistral | xai | local
    transcription_api_key: str | None = None
    voice_enabled: bool = True

    datablue_api_key: str | None = None

    persona_extra_instructions: str | None = None

    telegram_allowed_users: list[str] = field(default_factory=list)

    def redacted(self) -> dict:
        d = self.__dict__.copy()
        for k in ("telegram_bot_token", "llm_api_key", "transcription_api_key", "datablue_api_key"):
            if d.get(k):
                d[k] = d[k][:4] + "***REDACTED***"
        return d


def load_wizard_payload() -> WizardPayload | None:
    if not WIZARD_CONFIG_PATH.exists():
        return None
    try:
        raw = json.loads(WIZARD_CONFIG_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return None
    return WizardPayload(**{k: v for k, v in raw.items() if k in WizardPayload.__dataclass_fields__})


def _persist_wizard_payload(payload: WizardPayload) -> None:
    ensure_dirs()
    # Secrets DO get written here (not just to Hermes's .env) so the wizard
    # can re-populate its own fields (masked) on repeat visits without
    # re-parsing Hermes's config.yaml/.env format. Never served to the
    # browser unmasked - see control_plane/app.py's /status response.
    WIZARD_CONFIG_PATH.write_text(json.dumps(payload.__dict__, indent=2))
    WIZARD_CONFIG_PATH.chmod(0o600)


def apply_wizard_payload(payload: WizardPayload) -> list[str]:
    """Writes the payload into Hermes's config store. Returns the list of
    config keys that were set (for a validation/debug trail); raises
    ConfigWriteError on the first failure."""
    applied: list[str] = []

    def setk(key: str, value: str | None) -> None:
        if value is None or value == "":
            return
        _config_set(key, value)
        applied.append(key)

    setk("TELEGRAM_BOT_TOKEN", payload.telegram_bot_token)
    if payload.telegram_allowed_users:
        setk("TELEGRAM_ALLOWED_USERS", ",".join(payload.telegram_allowed_users))

    if payload.llm_provider:
        hermes_provider = PROVIDER_HERMES_NAME.get(payload.llm_provider, payload.llm_provider)
        setk("model.provider", hermes_provider)
        base_url = payload.llm_base_url or PROVIDER_BASE_URL.get(payload.llm_provider)
        setk("model.base_url", base_url)
        env_key = PROVIDER_API_KEY_ENV.get(payload.llm_provider)
        if env_key:
            setk(env_key, payload.llm_api_key)
            _clear_stale_model_api_key()
        else:
            setk("model.api_key", payload.llm_api_key)
        setk("model.default", payload.llm_model)

    if payload.transcription_provider:
        setk("stt.provider", payload.transcription_provider)
        setk("stt.enabled", "true" if payload.voice_enabled else "false")
        key_env = {
            "groq": "GROQ_API_KEY",
            "openai": "VOICE_TOOLS_OPENAI_KEY",
            "mistral": "MISTRAL_API_KEY",
            "xai": "XAI_API_KEY",
        }.get(payload.transcription_provider)
        if key_env:
            setk(key_env, payload.transcription_api_key)

    if payload.datablue_api_key:
        # NOT registered as an mcp_servers.* entry yet: DataBlue's real API
        # (confirmed live 2026-07-20) only exposes a plain REST endpoint —
        # POST /v1/scrape with Authorization: Bearer — no /mcp or /v1/mcp
        # endpoint exists (both 404). Registering a guessed MCP URL here
        # would make the gateway log connection errors on every boot for
        # no benefit. The real integration (task 7 — DataBlue MCP live
        # lookup) most likely needs a small first-party MCP wrapper around
        # this REST API rather than a hosted MCP endpoint DataBlue provides
        # directly. For now we just persist the key as an env var so
        # scripts/crawl_colleges.py (also task 7) can use it.
        setk("DATABLUE_API_KEY", payload.datablue_api_key)

    # Safety: minors-facing product, no shell/terminal access, ever.
    _set_disabled_toolsets(["terminal"])
    applied.append("agent.disabled_toolsets")

    _persist_wizard_payload(payload)
    return applied


def is_configured() -> bool:
    payload = load_wizard_payload()
    if payload is None:
        return False
    return bool(payload.telegram_bot_token and payload.llm_provider and payload.llm_api_key)
