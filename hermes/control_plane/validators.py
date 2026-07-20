"""Live validation checks for each wizard field, run against the real
provider APIs so the operator finds a bad key/token during setup, not
after `docker compose up` when a student's message silently fails.
"""
from __future__ import annotations

import httpx

from .config_writer import PROVIDER_BASE_URL, WizardPayload

_TIMEOUT = httpx.Timeout(10.0)


async def validate_telegram(bot_token: str | None) -> dict:
    if not bot_token:
        return {"ok": False, "message": "no bot token provided"}
    url = f"https://api.telegram.org/bot{bot_token}/getMe"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url)
    except httpx.HTTPError as exc:
        return {"ok": False, "message": f"network error: {exc}"}
    if resp.status_code != 200:
        return {"ok": False, "message": f"Telegram rejected the token (HTTP {resp.status_code})"}
    data = resp.json()
    if not data.get("ok"):
        return {"ok": False, "message": data.get("description", "getMe returned ok=false")}
    username = data["result"].get("username")
    return {"ok": True, "message": f"bot @{username} reachable", "bot_username": username}


async def validate_llm(provider: str | None, api_key: str | None, base_url: str | None, model: str | None) -> dict:
    if not provider or not api_key:
        return {"ok": False, "message": "provider and API key are required"}
    resolved_base_url = base_url or PROVIDER_BASE_URL.get(provider)
    if provider == "anthropic":
        resolved_base_url = resolved_base_url or "https://api.anthropic.com/v1"
        headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
        url = f"{resolved_base_url.rstrip('/')}/models"
    elif provider == "openrouter":
        # OpenRouter's /models is a public catalog and returns 200 for ANY
        # bearer value, fake or real — confirmed by hand against the live
        # API. /auth/key is the endpoint that actually requires a valid key
        # (also confirmed live: 401 "Missing Authentication header" for a
        # garbage key).
        resolved_base_url = resolved_base_url or "https://openrouter.ai/api/v1"
        headers = {"Authorization": f"Bearer {api_key}"}
        url = f"{resolved_base_url.rstrip('/')}/auth/key"
    else:
        resolved_base_url = resolved_base_url or "https://openrouter.ai/api/v1"
        headers = {"Authorization": f"Bearer {api_key}"}
        url = f"{resolved_base_url.rstrip('/')}/models"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        return {"ok": False, "message": f"network error reaching {resolved_base_url}: {exc}"}
    if resp.status_code in (401, 403):
        return {"ok": False, "message": f"provider rejected the API key (HTTP {resp.status_code})"}
    if resp.status_code >= 400:
        return {"ok": False, "message": f"provider returned HTTP {resp.status_code}: {resp.text[:300]}"}
    return {"ok": True, "message": f"{provider} reachable at {resolved_base_url}"}


async def validate_transcription(provider: str | None, api_key: str | None) -> dict:
    if not provider:
        return {"ok": False, "message": "no transcription provider selected"}
    if provider == "local":
        return {"ok": True, "message": "local (faster-whisper) needs no external key"}
    if not api_key:
        return {"ok": False, "message": "API key required for this provider"}
    endpoints = {
        "groq": ("https://api.groq.com/openai/v1/models", {"Authorization": f"Bearer {api_key}"}),
        "openai": ("https://api.openai.com/v1/models", {"Authorization": f"Bearer {api_key}"}),
        "mistral": ("https://api.mistral.ai/v1/models", {"Authorization": f"Bearer {api_key}"}),
        "xai": ("https://api.x.ai/v1/models", {"Authorization": f"Bearer {api_key}"}),
    }
    if provider not in endpoints:
        return {"ok": False, "message": f"unknown transcription provider {provider!r}"}
    url, headers = endpoints[provider]
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        return {"ok": False, "message": f"network error: {exc}"}
    if resp.status_code in (401, 403):
        return {"ok": False, "message": f"provider rejected the API key (HTTP {resp.status_code})"}
    if resp.status_code >= 400:
        return {"ok": False, "message": f"provider returned HTTP {resp.status_code}"}
    return {"ok": True, "message": f"{provider} transcription key valid"}


async def validate_datablue(api_key: str | None) -> dict:
    if not api_key:
        return {"ok": False, "message": "no DataBlue API key provided"}
    # Confirmed live against the real API (2026-07-20): POST /v1/scrape with
    # no auth -> 401 "Missing authentication credentials"; with a garbage
    # Authorization: Bearer -> 401 "Invalid or expired token" (so Bearer is
    # the right scheme, and that distinct message is what a bad key looks
    # like). An empty body against a REAL key is expected to fail body
    # validation (422, missing "url" or similar), not auth — so anything
    # other than 401/403 here means the key itself was accepted, which is
    # all this check needs to prove. This intentionally still costs zero
    # scrape credits since the request never resolves to a real scrape.
    url = "https://api.datablue.dev/v1/scrape"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(url, headers={"Authorization": f"Bearer {api_key}"}, json={})
    except httpx.HTTPError as exc:
        return {"ok": False, "message": f"network error: {exc}"}
    if resp.status_code in (401, 403):
        return {"ok": False, "message": f"DataBlue rejected the API key (HTTP {resp.status_code})"}
    return {"ok": True, "message": "DataBlue key accepted"}


async def validate_all(payload: WizardPayload) -> dict:
    return {
        "telegram": await validate_telegram(payload.telegram_bot_token),
        "llm": await validate_llm(payload.llm_provider, payload.llm_api_key, payload.llm_base_url, payload.llm_model),
        "transcription": await validate_transcription(payload.transcription_provider, payload.transcription_api_key),
        "datablue": await validate_datablue(payload.datablue_api_key),
    }
