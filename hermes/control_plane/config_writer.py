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
    "gemini": "gemini",
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
    "gemini": "GEMINI_API_KEY",
    "nous": "NOUS_API_KEY",
}

class ConfigWriteError(RuntimeError):
    def __init__(self, key: str, returncode: int, output: str):
        self.key = key
        self.returncode = returncode
        self.output = output
        super().__init__(f"hermes config set {key} failed ({returncode}): {output[:1000]}")


def _set_yaml_value(path_parts: list[str], value) -> None:
    """Sets a dotted-path key directly in config.yaml, bypassing
    `hermes config set` entirely. Two distinct bugs in that command make
    this necessary, both found by testing against the real CLI rather
    than assuming the docs cover every case:

    1. List values: its value parser only coerces bool/int/float
       (hermes_cli/config.py:set_config_value), so a JSON-looking string
       like '["terminal"]' is stored as a literal string, not a list.
       The nested-path form (a.b.0 ...) can't create a list from scratch
       either — `_set_nested`'s own docstring says "we do not grow
       lists... the referenced index must already exist".
    2. Nested keys shaped like `*.env.SOMETHING_API_KEY`: the secret-vs-
       config routing check does `key.upper().endswith(('_API_KEY',
       '_TOKEN'))` against the WHOLE dotted path, not just the final
       segment. `mcp_servers.datablue.env.DATABLUE_API_KEY` matches that
       suffix, gets routed to save_env_value() with the entire dotted
       string as the literal env var name, and blows up with "Invalid
       environment variable name" — env vars can't contain dots. Any
       mcp_servers.<name>.env.<KEY_ENDING_IN_API_KEY_OR_TOKEN> path hits
       this, not just DataBlue's.

    Uses the same YAML helpers set_config_value uses internally
    (atomic_yaml_write, fast_safe_load), so behavior otherwise matches.
    """
    from hermes_cli.config import ensure_hermes_home, get_config_path
    from utils import atomic_yaml_write, fast_safe_load

    config_path = get_config_path()
    user_config: dict = {}
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            user_config = fast_safe_load(f) or {}
    node = user_config
    for part in path_parts[:-1]:
        child = node.get(part)
        if not isinstance(child, dict):
            child = {}
            node[part] = child
        node = child
    node[path_parts[-1]] = value
    ensure_hermes_home()
    atomic_yaml_write(config_path, user_config, sort_keys=False)


def _set_yaml_list(path_parts: list[str], value: list) -> None:
    _set_yaml_value(path_parts, list(value))


def _set_disabled_toolsets(toolsets: list[str]) -> None:
    _set_yaml_list(["agent", "disabled_toolsets"], toolsets)


def _enable_plugin(name: str) -> None:
    """Adds `name` to plugins.enabled without clobbering other entries —
    general plugins (unlike our memory provider) are opt-in
    (website/docs/user-guide/features/plugins.md's "Plugins are opt-in").
    """
    from hermes_cli.config import get_config_path
    from utils import fast_safe_load

    config_path = get_config_path()
    current: list = []
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            loaded = fast_safe_load(f) or {}
        plugins_cfg = loaded.get("plugins")
        if isinstance(plugins_cfg, dict) and isinstance(plugins_cfg.get("enabled"), list):
            current = plugins_cfg["enabled"]
    if name not in current:
        current = current + [name]
    _set_yaml_list(["plugins", "enabled"], current)


def _clear_stale_custom_credentials(*, clear_base_url: bool) -> None:
    """Removes leftover inline model.api_key/api_mode (and optionally
    base_url) when switching to a named provider (openrouter/anthropic/
    gemini/nous) that authenticates via env var and its own built-in
    base_url instead. Reuses hermes_cli.config.clear_model_endpoint_credentials
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
    if not isinstance(model_cfg, dict):
        return
    stale_keys = {"api_key", "api_mode"} | ({"base_url"} if clear_base_url else set())
    if not stale_keys & model_cfg.keys():
        return
    clear_model_endpoint_credentials(
        model_cfg, clear_api_key=True, clear_api_mode=True, clear_base_url=clear_base_url
    )
    atomic_yaml_write(config_path, user_config, sort_keys=False)


def _clear_model_default() -> None:
    """Removes model.default from config.yaml so Hermes's own runtime
    fallback (cli_agent_setup_mixin -> get_default_model_for_provider)
    picks the model for the configured provider. Used when the wizard is
    given a provider but no model AND we can't resolve a catalog default
    ourselves — leaving the previous provider's model behind sends e.g.
    "anthropic/claude-opus-4.6" to the Gemini API, which 404s on every
    message (found live: wizard switch to Gemini with llm_model unset).
    """
    from hermes_cli.config import get_config_path
    from utils import atomic_yaml_write, fast_safe_load

    config_path = get_config_path()
    if not config_path.exists():
        return
    with open(config_path, encoding="utf-8") as f:
        user_config = fast_safe_load(f) or {}
    model_cfg = user_config.get("model")
    if not isinstance(model_cfg, dict) or "default" not in model_cfg:
        return
    del model_cfg["default"]
    atomic_yaml_write(config_path, user_config, sort_keys=False)


def _default_model_for_wizard_provider(wizard_provider: str) -> str:
    """Best-effort catalog default for a wizard provider id ("gemini",
    "nous", "openai", ...), or "" when the catalog has no entry (custom
    endpoints). Uses the same cost-safe resolver as Hermes's own runtime
    fallback so the two can never disagree.
    """
    try:
        from hermes_cli.models import get_default_model_for_provider, normalize_provider
        return get_default_model_for_provider(normalize_provider(wizard_provider))
    except Exception:
        return ""


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


def set_env_var(key: str, value: str) -> None:
    """Writes directly to .env via hermes_cli.config.save_env_value(),
    bypassing `hermes config set` entirely.

    Found by testing, not by reading: `hermes config set`'s secret-vs-
    config routing (set_config_value in hermes_cli/config.py) only sends
    a key to .env when it looks like a credential — an explicit allowlist
    plus an endswith(('_API_KEY', '_TOKEN')) check. Runtime settings that
    are consumed via plain os.getenv() but AREN'T credential-shaped —
    confirmed for TELEGRAM_ALLOWED_USERS (gateway/authz_mixin.py) and
    TELEGRAM_HOME_CHANNEL (gateway/run.py, cron/scheduler.py's
    _HOME_TARGET_ENV_VARS) — fall through to config.yaml instead, as a
    bare top-level key, where the gateway's os.getenv() check never
    finds them. Confirmed live: `hermes config set TELEGRAM_ALLOWED_USERS
    "123,456"` produced `TELEGRAM_ALLOWED_USERS: 123,456` in config.yaml,
    no .env entry at all — meaning the wizard's allowlist field has been
    silently inert since it was built. Use this for any such key instead.
    """
    from hermes_cli.config import save_env_value

    save_env_value(key, value)


@dataclass
class WizardPayload:
    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None

    llm_provider: str | None = None  # openai | openrouter | anthropic | nous | custom
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None  # only required/used when llm_provider == "custom"

    datablue_api_key: str | None = None

    persona_extra_instructions: str | None = None

    telegram_allowed_users: list[str] = field(default_factory=list)

    def redacted(self) -> dict:
        d = self.__dict__.copy()
        for k in ("telegram_bot_token", "llm_api_key", "datablue_api_key"):
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
        # Not setk() — see set_env_var's docstring. hermes config set
        # would silently misroute this into config.yaml, where the
        # gateway's os.getenv() check never sees it.
        set_env_var("TELEGRAM_ALLOWED_USERS", ",".join(payload.telegram_allowed_users))
        applied.append("TELEGRAM_ALLOWED_USERS")

    if payload.llm_provider:
        hermes_provider = PROVIDER_HERMES_NAME.get(payload.llm_provider, payload.llm_provider)
        setk("model.provider", hermes_provider)
        env_key = PROVIDER_API_KEY_ENV.get(payload.llm_provider)
        if env_key:
            # Named/built-in provider: hermes already knows its correct
            # base_url internally (see PROVIDER_HERMES_NAME's docstring).
            # We must NOT set model.base_url ourselves here — a stale one
            # from a PREVIOUS custom/openai config silently overrides
            # hermes's own resolution instead of erroring, which is
            # exactly what happened in testing (a leftover OpenRouter
            # base_url survived a switch to Gemini and would have sent
            # every Gemini request to openrouter.ai). Clear both inline
            # credential fields the custom path might have left behind.
            setk(env_key, payload.llm_api_key)
            _clear_stale_custom_credentials(clear_base_url=True)
        else:
            # "custom" (and "openai", which we map onto hermes's "custom"
            # provider) has no dedicated env var or built-in base_url —
            # both must be supplied inline.
            base_url = payload.llm_base_url or PROVIDER_BASE_URL.get(payload.llm_provider)
            setk("model.base_url", base_url)
            setk("model.api_key", payload.llm_api_key)
        # A stale model.default from a previous provider must never survive
        # a provider switch — "anthropic/claude-opus-4.6" sent to the Gemini
        # API 404s on every message (same failure class as the stale
        # base_url above, found live). If the operator didn't pick a model,
        # write the provider's cost-safe catalog default; if the catalog
        # doesn't know the provider (custom endpoints), drop the key so
        # Hermes's runtime fallback resolves it instead.
        model_default = payload.llm_model or _default_model_for_wizard_provider(payload.llm_provider)
        if model_default:
            setk("model.default", model_default)
        else:
            _clear_model_default()
            applied.append("model.default (cleared)")

    # Product scope is text-only for now (Hindi/English/Hinglish, no voice
    # notes) — fixed default, not a wizard field, same pattern as
    # disabled_toolsets below.
    setk("stt.enabled", "false")

    # Students must never see ops chrome (found live: "⏳ Working — 3 min —
    # iteration 1/60" and "⚠️ Gateway shutting down" reached a student chat).
    # Quiet every progress/status surface; keep interim assistant messages so
    # Disha can still talk naturally mid-task. Values route through
    # display_config._normalise, which accepts these string forms.
    setk("display.tool_progress", "off")
    setk("display.long_running_notifications", "false")
    setk("display.busy_ack_detail", "false")
    setk("display.cleanup_progress", "true")
    setk("display.background_process_notifications", "off")
    # Restart pings (e.g. from the CRM open-access toggle) are ops detail.
    _set_yaml_value(["telegram", "gateway_restart_notification"], False)
    applied.append("telegram.gateway_restart_notification")

    if payload.datablue_api_key:
        # DataBlue ships an official stdio MCP server (npm package
        # @datablue/mcp), NOT a hosted HTTP MCP endpoint — confirmed via
        # their docs (docs.datablue.dev/mcp) on 2026-07-20, after an
        # earlier pass here wrongly guessed at a hosted /v1/mcp URL (404,
        # removed). Registered exactly per their documented client-config
        # example and the mcp_servers stdio shape in cli-config.yaml.example.
        # npx/Node 22 are already in the image (Dockerfile's node_source
        # stage), so no extra install step is needed.
        setk("DATABLUE_API_KEY", payload.datablue_api_key)
        setk("mcp_servers.datablue.command", "npx")
        # NOT the plain `npx @datablue/mcp@latest` from their docs: the
        # package's dist/index.js only calls main() when argv[1] equals
        # import.meta.url, and under an npx bin shim argv[1] is the
        # .bin/datablue-mcp SYMLINK while import.meta.url is the resolved
        # real file — the guard fails and the process exits 0 without ever
        # serving MCP ("Connection closed" on every gateway start, found
        # live 2026-07-22, @datablue/mcp 1.2.0). Resolving the symlink and
        # handing the real file to node directly makes the guard pass.
        _set_yaml_list(
            ["mcp_servers", "datablue", "args"],
            [
                "--yes",
                "--prefer-online",
                "-p",
                "@datablue/mcp@latest",
                "sh",
                "-c",
                'exec node "$(readlink -f "$(command -v datablue-mcp)")"',
            ],
        )
        # Not setk() — see _set_yaml_value's docstring, bug #2.
        _set_yaml_value(["mcp_servers", "datablue", "env", "DATABLUE_API_KEY"], payload.datablue_api_key)

    # Safety: minors-facing product, no shell/terminal access, ever.
    _set_disabled_toolsets(["terminal"])
    applied.append("agent.disabled_toolsets")

    # Per-student memory isolation: the built-in MEMORY.md/USER.md are
    # profile-wide, and this is one shared bot/profile for many students
    # (see HANDOVER.md §2's architecture decision) — activating our own
    # provider replaces the built-in one entirely rather than running
    # alongside it (MemoryProvider's "Single Provider Rule"). Always set,
    # not a wizard field — this isn't an operator choice.
    setk("memory.provider", "disha-students")

    # CRM event logging (voice detection + safety-flag stripping) lives in
    # a generic plugin, which — unlike the memory provider — is opt-in.
    _enable_plugin("disha-events")
    applied.append("plugins.enabled")

    # India-focused product — cron schedules (08:00 deadline sweep, etc.,
    # see cron_seed.py) are written in IST and need this to fire at the
    # right wall-clock time rather than server-local (usually UTC).
    setk("timezone", "Asia/Kolkata")

    _persist_wizard_payload(payload)
    return applied


def is_configured() -> bool:
    payload = load_wizard_payload()
    if payload is None:
        return False
    return bool(payload.telegram_bot_token and payload.llm_provider and payload.llm_api_key)
