"""Wraps Hermes's own gateway service management.

We deliberately do NOT hand-roll process supervision here. Inside this
container `hermes gateway install/start/stop/restart` already dispatches
to the in-container S6ServiceManager (see hermes_cli.service_manager /
hermes_cli.gateway._dispatch_via_service_manager_if_s6), which registers
a supervised `gateway-<profile>` s6 service under /run/service/ that s6
auto-restarts on crash and that survives container restarts via
docker/cont-init.d/02-reconcile-profiles. We just call the CLI for
mutations (so we get all of its side effects — planned-stop markers,
desired-state persistence — for free) and read status directly off the
S6ServiceManager for a fast, structured check.
"""
from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

from .state import GATEWAY_LOG_DIR, CONTROL_STATE_PATH, PROFILE, ensure_dirs

HERMES_BIN = "hermes"
_SUBPROCESS_TIMEOUT = 30


class GatewayCommandError(RuntimeError):
    def __init__(self, action: str, returncode: int, output: str):
        self.action = action
        self.returncode = returncode
        self.output = output
        super().__init__(f"hermes gateway {action} failed ({returncode}): {output[:2000]}")


def _run_hermes(*args: str) -> str:
    try:
        result = subprocess.run(
            [HERMES_BIN, *args],
            capture_output=True,
            text=True,
            timeout=_SUBPROCESS_TIMEOUT,
        )
    except subprocess.TimeoutExpired as exc:
        raise GatewayCommandError(" ".join(args), -1, f"timed out: {exc}") from exc
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        _record_error(" ".join(args), output)
        raise GatewayCommandError(" ".join(args), result.returncode, output)
    return output


def _record_error(action: str, output: str) -> None:
    ensure_dirs()
    state = _read_state()
    state["last_error"] = {"action": action, "output": output[-4000:], "at": time.time()}
    _write_state(state)


def _read_state() -> dict:
    if CONTROL_STATE_PATH.exists():
        try:
            return json.loads(CONTROL_STATE_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _write_state(state: dict) -> None:
    ensure_dirs()
    CONTROL_STATE_PATH.write_text(json.dumps(state, indent=2))


def is_installed() -> bool:
    """Best-effort check for whether the gateway-<profile> s6 slot exists."""
    try:
        from hermes_cli.service_manager import detect_service_manager, get_service_manager
    except ImportError:
        return False
    if detect_service_manager() != "s6":
        return False
    mgr = get_service_manager()
    scandir: Path = getattr(mgr, "scandir", Path("/run/service"))
    return (scandir / f"gateway-{PROFILE}").exists()


def is_running() -> tuple[bool, int | None]:
    try:
        from hermes_cli.service_manager import detect_service_manager, get_service_manager
    except ImportError:
        return False, None
    if detect_service_manager() != "s6":
        return False, None
    mgr = get_service_manager()
    name = f"gateway-{PROFILE}"
    try:
        running = mgr.is_running(name)
    except Exception:
        return False, None
    pid = None
    if running:
        try:
            pid = mgr._supervised_pid(name)  # noqa: SLF001 - internal but stable, read-only
        except Exception:
            pid = None
    return running, pid


def install_if_needed() -> None:
    if not is_installed():
        _run_hermes("gateway", "install", "--no-start-now")
        state = _read_state()
        state["installed_at"] = time.time()
        _write_state(state)


def start() -> None:
    install_if_needed()
    _run_hermes("gateway", "start")
    state = _read_state()
    state["last_start_at"] = time.time()
    state["desired"] = "running"
    _write_state(state)


def stop() -> None:
    _run_hermes("gateway", "stop")
    state = _read_state()
    state["desired"] = "stopped"
    _write_state(state)


def restart() -> None:
    install_if_needed()
    _run_hermes("gateway", "restart")
    state = _read_state()
    state["last_start_at"] = time.time()
    state["desired"] = "running"
    _write_state(state)


def uptime_seconds() -> float | None:
    running, _ = is_running()
    if not running:
        return None
    state = _read_state()
    started = state.get("last_start_at")
    return (time.time() - started) if started else None


def last_error() -> dict | None:
    return _read_state().get("last_error")


_SECRET_PATTERNS = [
    r"(?i)(bot)?token[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_\-:]{15,}",
    r"\d{6,12}:[A-Za-z0-9_-]{30,}",  # telegram bot token shape
    r"(?i)(api[_-]?key|secret|authorization|password)[\"']?\s*[:=]\s*[\"']?\S{6,}",
    r"sk-[A-Za-z0-9]{10,}",
    r"Bearer\s+\S+",
]


def _redact(line: str) -> str:
    import re

    def _mask(match: "re.Match[str]") -> str:
        text = match.group(0)
        return text[:8] + "***REDACTED***" if len(text) > 8 else "***REDACTED***"

    for pattern in _SECRET_PATTERNS:
        line = re.sub(pattern, _mask, line)
    return line


def tail_logs(n: int = 200) -> list[str]:
    log_file = GATEWAY_LOG_DIR / "current"
    if not log_file.exists():
        return []
    try:
        lines = log_file.read_text(errors="replace").splitlines()
    except OSError:
        return []
    return [_redact(line) for line in lines[-n:]]
