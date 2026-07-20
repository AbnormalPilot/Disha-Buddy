from __future__ import annotations

import time

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from . import config_writer, gateway_ctl, validators
from .auth import require_control_token
from .config_writer import WizardPayload
from .state import ensure_dirs

app = FastAPI(title="Disha Buddy control plane")
_BOOT_TIME = time.time()


class ConfigRequest(BaseModel):
    telegram_bot_token: str | None = None
    telegram_allowed_users: list[str] = []

    llm_provider: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None

    transcription_provider: str | None = None
    transcription_api_key: str | None = None
    voice_enabled: bool = True

    datablue_api_key: str | None = None
    persona_extra_instructions: str | None = None


@app.on_event("startup")
async def _startup() -> None:
    ensure_dirs()
    # Config on the volume survives container restarts, so setup is
    # genuinely one-time: if a previous run already configured and
    # started the gateway, bring it back up without operator action.
    if config_writer.is_configured():
        state = gateway_ctl._read_state()  # noqa: SLF001
        if state.get("desired") == "running":
            try:
                gateway_ctl.start()
            except gateway_ctl.GatewayCommandError:
                pass  # surfaced via GET /status -> last_error


@app.get("/status")
async def status(_: None = Depends(require_control_token)) -> dict:
    payload = config_writer.load_wizard_payload()
    configured = config_writer.is_configured()
    running, pid = gateway_ctl.is_running()
    installed = gateway_ctl.is_installed()

    if running:
        gateway_state = "running"
    elif installed or configured:
        gateway_state = "stopped"
    else:
        gateway_state = "stopped"

    last_err = gateway_ctl.last_error()
    if last_err and not running:
        gateway_state = "error"

    return {
        "configured": configured,
        "gateway": gateway_state,
        "pid": pid,
        "uptime_seconds": gateway_ctl.uptime_seconds(),
        "control_plane_uptime_seconds": time.time() - _BOOT_TIME,
        "model": payload.llm_model if payload else None,
        "bot_username": None,
        "last_error": last_err,
    }


@app.post("/config")
async def set_config(body: ConfigRequest, _: None = Depends(require_control_token)) -> dict:
    payload = WizardPayload(**body.model_dump())
    try:
        applied = config_writer.apply_wizard_payload(payload)
    except config_writer.ConfigWriteError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"ok": True, "applied_keys": applied}


@app.get("/config")
async def get_config(_: None = Depends(require_control_token)) -> dict:
    payload = config_writer.load_wizard_payload()
    if payload is None:
        return {"configured": False}
    return {"configured": True, **payload.redacted()}


@app.post("/validate")
async def validate(body: ConfigRequest, _: None = Depends(require_control_token)) -> dict:
    payload = WizardPayload(**body.model_dump())
    return await validators.validate_all(payload)


@app.post("/gateway/start")
async def gateway_start(_: None = Depends(require_control_token)) -> dict:
    if not config_writer.is_configured():
        raise HTTPException(status_code=400, detail="not configured yet — POST /config first")
    try:
        gateway_ctl.start()
    except gateway_ctl.GatewayCommandError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/gateway/stop")
async def gateway_stop(_: None = Depends(require_control_token)) -> dict:
    try:
        gateway_ctl.stop()
    except gateway_ctl.GatewayCommandError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/gateway/restart")
async def gateway_restart(_: None = Depends(require_control_token)) -> dict:
    try:
        gateway_ctl.restart()
    except gateway_ctl.GatewayCommandError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"ok": True}


@app.get("/logs")
async def logs(tail: int = 200, _: None = Depends(require_control_token)) -> dict:
    tail = max(1, min(tail, 2000))
    return {"lines": gateway_ctl.tail_logs(tail)}
